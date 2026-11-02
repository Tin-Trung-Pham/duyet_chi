/* Tích hợp: khung ứng dụng + 4 module thật + đồng bộ ghi song song + bảng tổng hợp. Chạy với máy chủ GIẢ (mọi chế độ)
 * và với máy chủ Python THẬT (live.test.js dùng lại cùng kịch bản khi trang được mở qua http). */
(function () {
  var active = [];
  function setVal(el, v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
  async function items(client) { var r = await client.list(); if (!r.ok) throw new Error('list lỗi: ' + r.message); return r.data.items; }
  function overCount(list) { return list.filter(function (r) { return r.so_tien > 100000000; }).length; }

  window.e2eScenario = async function (client) {
    var storage = new FakeStorage();
    storage.m[K.NV] = JSON.stringify(EMPS()); storage.m[K.DN] = '[]'; storage.m[K.ACK] = '1'; storage.m[K.SESSION] = JSON.stringify(EMP1);
    var sync = DncDb.createSync({ client: client, storage: storage, doc: document, win: window, retryMs: 0 });
    var box = document.createElement('div'); document.body.appendChild(box);
    var app = DncApp.start(box, {
      storage: storage, nav: memNav('/'), modules: DncAppModules.real(storage), today: DncAppModel.todayStr(),
      homeExtras: function (el, ctx) { return DncDbPanel.mount(el, { client: client, sync: sync, session: ctx.session }); }
    });
    active.push(function () { sync.stop(); app.destroy(); box.remove(); });
    await sync.start();
    var base = await items(client), baseOver = overCount(base), q = function (s) { return box.querySelector(s); };

    // 1) Nhân viên nhập đề nghị 120 triệu qua form thật → ghi vào CSDL
    app.navigate('/nhap-lieu');
    setVal(q('[data-field="nhaCungCap"]'), 'Máy chủ HP ProLiant'); q('input[type=radio][value="thiet_bi"]').click(); setVal(q('[data-field="soLuong"]'), '2'); setVal(q('[data-field="donGia"]'), '60000000'); q('[data-act="submit"]').click();
    var reqs = await until(function () { var l = JSON.parse(storage.m[K.DN]); return l.length ? l : null; }); assert.ok(reqs, 'đề nghị chưa vào localStorage'); var id1 = reqs[0].id;
    var row1 = await until(async function () { return (await items(client)).filter(function (r) { return r.ma_de_nghi === id1; })[0]; });
    assert.ok(row1, 'đề nghị chưa được ghi vào cơ sở dữ liệu');
    assert.deepEqual([row1.ma_nhan_vien, row1.ten_nhan_vien, row1.so_tien, row1.phan_loai_chi, row1.trang_thai], ['NV001', 'Nguyễn Văn An', 120000000, 'Thiết bị', 'cho_duyet']);
    assert.ok(Math.abs(new Date(row1.thoi_gian).getTime() - Date.now()) < 5 * 60 * 1000, 'thời gian ghi sai: ' + row1.thoi_gian);

    // 2) Đề nghị thứ hai (nhỏ) cũng được ghi
    app.navigate('/nhap-lieu');
    setVal(q('[data-field="nhaCungCap"]'), 'Giấy A4'); q('input[type=radio][value="van_phong_pham"]').click(); setVal(q('[data-field="soLuong"]'), '10'); setVal(q('[data-field="donGia"]'), '45000'); q('[data-act="submit"]').click();
    var id2 = (await until(function () { var l = JSON.parse(storage.m[K.DN]); return l.length >= 2 ? l : null; }))[1].id;
    var row2 = await until(async function () { return (await items(client)).filter(function (r) { return r.ma_de_nghi === id2; })[0]; });
    assert.equal(row2.so_tien, 450000); assert.equal(row2.phan_loai_chi, 'Văn phòng phẩm');
    assert.equal((await items(client)).length, base.length + 2);

    // 3) Quản lý: Trang chủ hiện TOÀN BỘ thông tin trong CSDL + cảnh báo > 100 triệu
    q('.app-chip').click(); var m = q('[data-role="menu-overlay"]'); var r = m.querySelector('input[type=radio][value="quan_ly"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); m.querySelector('[data-act="apply"]').click();
    var shown = await until(function () { return box.querySelectorAll('.db-table tbody tr[data-id]').length === base.length + 2 ? true : null; }); assert.ok(shown, 'bảng tổng hợp chưa hiện đủ ' + (base.length + 2) + ' dòng, đang có ' + box.querySelectorAll('.db-table tbody tr[data-id]').length);
    var all = await items(client), tr = box.querySelector('.db-table tbody tr[data-id="' + row1.id + '"]'); assert.ok(tr); assert.equal(tr.classList.contains('is-over'), true);
    assert.equal(q('[data-role="warn-title"]').textContent, 'Cảnh báo: có ' + (baseOver + 1) + ' khoản chi trên 100 triệu đồng'); assert.ok(q('[data-warn-id="' + row1.id + '"]').textContent.indexOf('120.000.000 ₫') >= 0);
    assert.equal(box.querySelector('.db-table tbody tr[data-id="' + row2.id + '"]').classList.contains('is-over'), false);

    // 4) Quản lý duyệt đề nghị 120 triệu → trạng thái trong CSDL đổi theo
    app.navigate('/duyet'); q('.dv-row[data-id="' + id1 + '"] [data-act="approve"]').click();
    var approved = await until(async function () { return (await items(client)).filter(function (x) { return x.ma_de_nghi === id1 && x.trang_thai === 'da_duyet'; })[0]; }); assert.ok(approved, 'trạng thái chưa được cập nhật trong CSDL');

    // 5) Trang chủ tự cập nhật huy hiệu trạng thái của khoản đó
    app.navigate('/');
    var badge = await until(function () { var t = box.querySelector('.db-table tbody tr[data-id="' + row1.id + '"] [data-status-badge]'); return t && t.getAttribute('data-status-badge') === 'da_duyet' ? t : null; }); assert.ok(badge, 'bảng chưa cập nhật trạng thái Đã duyệt');
    assert.equal(overCount(await items(client)), baseOver + 1, 'khoản đã duyệt vẫn bị cảnh báo vì vượt ngưỡng');
    return { id1: id1, id2: id2 };
  };

  describe('tích hợp: nhập → ghi CSDL → tổng hợp → duyệt (máy chủ giả)', function () {
    it('kịch bản đầy đủ xuyên 4 module, bộ đồng bộ và bảng tổng hợp', async function () {
      var api = fakeApi(); try { await e2eScenario(api.client()); } finally { active.splice(0).forEach(function (f) { f(); }); }
      assert.equal(api.rows.length, 11); assert.equal(api.rows.filter(function (r) { return r.ma_de_nghi; }).length, 2);
    });
    it('mất kết nối khi nhập: ứng dụng vẫn lưu localStorage bình thường, bảng báo chưa kết nối, sau đó tự đồng bộ bù', async function () {
      var api = fakeApi(); api.down = true; var storage = new FakeStorage(); storage.m[K.NV] = JSON.stringify(EMPS()); storage.m[K.DN] = '[]'; storage.m[K.ACK] = '1'; storage.m[K.SESSION] = JSON.stringify(EMP1);
      var client = api.client(), sync = DncDb.createSync({ client: client, storage: storage, doc: document, win: window, retryMs: 0 }), box = document.createElement('div'); document.body.appendChild(box);
      var app = DncApp.start(box, { storage: storage, nav: memNav('/'), modules: DncAppModules.real(storage), today: DncAppModel.todayStr(), homeExtras: function (el, ctx) { return DncDbPanel.mount(el, { client: client, sync: sync, session: ctx.session }); } });
      try {
        await sync.start(); app.navigate('/nhap-lieu'); setVal(box.querySelector('[data-field="nhaCungCap"]'), 'Bút'); box.querySelector('input[type=radio][value="khac"]').click(); setVal(box.querySelector('[data-field="soLuong"]'), '1'); setVal(box.querySelector('[data-field="donGia"]'), '5000'); box.querySelector('[data-act="submit"]').click();
        await until(function () { return JSON.parse(storage.m[K.DN]).length === 1 ? true : null; }); await sync.flush(); assert.equal(sync.getState().state, 'offline'); assert.equal(api.rows.length, 9, 'chưa ghi được vào CSDL');
        assert.equal(box.querySelector('.app-toast, [data-role="toast"]') !== null, true);
        api.down = false; await sync.reconcile(); assert.equal(api.rows.length, 10); assert.equal(sync.getState().state, 'synced');
      } finally { sync.stop(); app.destroy(); box.remove(); }
    });
    it('bảng Trang chủ chỉ hiện cho Quản lý: Nhân viên không bao giờ thấy và không gọi API đọc', async function () {
      var api = fakeApi(), storage = new FakeStorage(); storage.m[K.NV] = JSON.stringify(EMPS()); storage.m[K.DN] = '[]'; storage.m[K.ACK] = '1'; storage.m[K.SESSION] = JSON.stringify(EMP1);
      var client = api.client(), box = document.createElement('div'); document.body.appendChild(box);
      var app = DncApp.start(box, { storage: storage, nav: memNav('/'), modules: DncAppModules.real(storage), today: DncAppModel.todayStr(), homeExtras: function (el, ctx) { return DncDbPanel.mount(el, { client: client, session: ctx.session }); } });
      try { await tick(20); assert.equal(box.querySelector('.db-root, .db-panel'), null); assert.equal(api.calls.length, 0); } finally { app.destroy(); box.remove(); }
    });
  });
})();
