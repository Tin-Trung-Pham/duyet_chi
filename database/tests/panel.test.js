/* Test bảng "Tổng hợp chi từ cơ sở dữ liệu" trên Trang chủ của Quản lý. */
(function () {
  function cs(el) { return getComputedStyle(el); }
  function vnd(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫'; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function localTime(iso) { var d = new Date(iso); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  async function ready(h) { await tick(); await tick(); return h; }
  async function panel(o) { return ready(mountPanel(o)); }
  function row(o) { return Object.assign({ id: 1, ma_nhan_vien: 'NV001', ten_nhan_vien: 'Nguyễn Văn An', so_tien: 1000, thoi_gian: '2026-11-01T01:00:00Z', phan_loai_chi: 'Khác', trang_thai: 'cho_duyet', ma_de_nghi: null }, o); }

  describe('chỉ Quản lý thấy bảng tổng hợp', function () {
    [['Nhân viên', EMP1], ['không có phiên', null], ['rỗng', {}], ['vai trò lạ', { vaiTro: 'admin' }]].forEach(function (c) {
      itPanel(c[0] + ': không hiển thị gì và KHÔNG gọi API', async function () {
        var h = await panel({ session: c[1] }); assert.equal(h.box.innerHTML, ''); assert.equal(h.api.calls.length, 0); assert.equal(h.ctrl.getState().allowed, false);
      });
    });
  });

  describe('hiển thị toàn bộ thông tin chi trong cơ sở dữ liệu', function () {
    itPanel('đang tải rồi hiện dữ liệu; chip kết nối nêu số khoản', async function () {
      var h = mountPanel(); assert.ok(h.q('[data-role="loading"]')); assert.equal(h.q('[data-role="conn"]').getAttribute('data-state'), 'loading'); await ready(h);
      assert.equal(h.q('[data-role="loading"]'), null); assert.equal(h.q('[data-role="conn"]').getAttribute('data-state'), 'ok'); assert.equal(h.text('[data-role="conn"]'), 'Đã kết nối products.db · 9 khoản');
    });
    itPanel('bảng có ĐỦ 9 dòng và đủ 7 cột (ID, Mã NV, Tên, Số tiền, Thời gian, Phân loại, Trạng thái)', async function () {
      var h = await panel(); assert.equal(h.qa('tbody tr[data-id]').length, 9); assert.deepEqual(h.qa('.db-table thead th').map(function (t) { return t.textContent; }), ['ID', 'Mã NV', 'Tên nhân viên', 'Số tiền', 'Thời gian', 'Phân loại chi', 'Trạng thái']);
      var r = h.row(4); assert.deepEqual([r.cells[0].textContent, r.cells[1].textContent, r.cells[2].textContent, r.querySelector('[data-role="amount"]').textContent, r.cells[4].textContent, r.cells[5].textContent, r.cells[6].textContent.trim()],
        ['4', 'NV001', 'Nguyễn Văn An', '120.000.000 ₫', localTime('2026-11-01T01:00:00Z'), 'Thiết bị', 'Chờ duyệt']);
    });
    itPanel('mọi dòng trong CSDL đều xuất hiện với đúng số tiền, mã, tên, phân loại, trạng thái', async function () {
      var h = await panel(), ST = { cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối' };
      h.api.rows.forEach(function (d) { var r = h.row(d.id); assert.ok(r, 'thiếu #' + d.id); assert.equal(r.cells[1].textContent, d.ma_nhan_vien); assert.equal(r.cells[2].textContent, d.ten_nhan_vien); assert.equal(r.querySelector('[data-role="amount"]').textContent, vnd(d.so_tien)); assert.equal(r.cells[5].textContent, d.phan_loai_chi); assert.equal(r.cells[6].textContent.trim(), ST[d.trang_thai]); });
    });
    itPanel('mặc định xếp mới nhất trước', async function () { assert.deepEqual((await panel()).ids(), [9, 8, 7, 6, 5, 4, 3, 2, 1]); });
    itPanel('sắp xếp theo số tiền (cao → thấp) và theo tên nhân viên A–Z', async function () {
      var h = await panel(); h.sort('amount'); assert.deepEqual(h.ids(), [7, 4, 9, 8, 1, 6, 3, 5, 2]); assert.equal(h.ctrl.getState().sort, 'amount'); assert.equal(document.activeElement, h.q('[data-role="sort"]'));
      h.sort('name'); assert.deepEqual(h.ids(), [9, 6, 8, 3, 4, 1, 5, 7, 2]); h.sort('newest'); assert.deepEqual(h.ids(), [9, 8, 7, 6, 5, 4, 3, 2, 1]);
    });
    itPanel('lọc theo trạng thái, đếm đúng, giữ cách sắp xếp', async function () {
      var h = await panel(); assert.deepEqual(h.qa('[data-filter]').map(function (b) { return b.textContent.replace(/\s+/g, ' '); }), ['Tất cả (9)', 'Chờ duyệt (3)', 'Đã duyệt (5)', 'Từ chối (1)']);
      h.filter('cho_duyet'); assert.deepEqual(h.ids(), [8, 4, 3]); assert.equal(h.q('[data-filter="cho_duyet"]').getAttribute('aria-pressed'), 'true'); assert.equal(h.q('[data-filter="all"]').getAttribute('aria-pressed'), 'false');
      h.sort('amount'); assert.deepEqual(h.ids(), [4, 8, 3]); h.filter('tu_choi'); assert.deepEqual(h.ids(), [5]); h.filter('all'); assert.equal(h.ids().length, 9);
    });
    itPanel('lọc ra rỗng: thông báo; bộ lọc không làm mất cảnh báo/biểu đồ (luôn tính trên toàn bộ)', async function () {
      var h = await panel({ rows: [row({ id: 1, trang_thai: 'da_duyet', so_tien: 200000000 })] }); h.filter('tu_choi');
      assert.equal(h.text('[data-role="filtered-empty"]'), 'Không có khoản chi nào ở trạng thái này.'); assert.ok(h.q('[data-role="warn"]')); assert.ok(h.q('[data-role="chart"]'));
    });
    itPanel('KPI: tổng khoản, tổng tiền, chờ duyệt, trên 100 triệu', async function () {
      var h = await panel(); assert.equal(h.text('[data-role="kpi-count"]'), '9'); assert.equal(h.text('[data-role="kpi-total"]'), '465.099.999 ₫'); assert.equal(h.text('[data-role="kpi-pending"]'), '3 khoản'); assert.equal(h.text('[data-kpi="pending"] .db-kpi-sub'), '221.249.999 ₫');
      assert.equal(h.text('[data-role="kpi-over"]'), '2 khoản');
    });
    itPanel('thời gian hiển thị theo giờ địa phương dd/MM/yyyy HH:mm; thời gian hỏng hiện —', async function () {
      var h = await panel({ rows: [row({ id: 1, thoi_gian: '2026-11-02T16:30:00Z' }), row({ id: 2, thoi_gian: 'không phải ngày' })] }); assert.equal(h.row(1).cells[4].textContent, localTime('2026-11-02T16:30:00Z')); assert.equal(h.row(2).cells[4].textContent, '—');
    });
    itPanel('CSDL trống: thông báo, không cảnh báo, KPI bằng 0', async function () {
      var h = await panel({ rows: [] }); assert.equal(h.text('[data-role="empty"]'), 'Cơ sở dữ liệu chưa có khoản chi nào.'); assert.equal(h.q('[data-role="warn"]'), null); assert.equal(h.text('[data-role="kpi-count"]'), '0'); assert.equal(h.text('[data-role="kpi-total"]'), '0 ₫'); assert.ok(h.q('[data-role="chart-empty"]')); assert.equal(h.text('[data-role="conn"]'), 'Đã kết nối products.db · 0 khoản');
    });
    itPanel('1.000 dòng hiển thị đủ, dưới 2 giây', async function () {
      var many = []; for (var i = 1; i <= 1000; i++) many.push(row({ id: i, so_tien: i * 1000, thoi_gian: '2026-11-01T00:00:00Z' })); var t0 = Date.now(); var h = await panel({ rows: many });
      assert.equal(h.qa('tbody tr[data-id]').length, 1000); assert.ok(Date.now() - t0 < 2000, (Date.now() - t0) + 'ms');
    });
  });

  describe('cảnh báo khi MỘT khoản chi trên 100 triệu', function () {
    itPanel('hiện cảnh báo (role alert) nêu số khoản và liệt kê từng khoản theo số tiền giảm dần', async function () {
      var h = await panel(), w = h.q('[data-role="warn"]'); assert.equal(w.getAttribute('role'), 'alert'); assert.equal(h.text('[data-role="warn-title"]'), 'Cảnh báo: có 2 khoản chi trên 100 triệu đồng');
      var li = h.qa('[data-warn-id]'); assert.deepEqual(li.map(function (x) { return x.getAttribute('data-warn-id'); }), ['7', '4']);
      assert.match(li[0].textContent, /135\.500\.000 ₫ · Trần Thị Bình \(NV002\) · Vật tư · Đã duyệt/); assert.match(li[1].textContent, /120\.000\.000 ₫ · Nguyễn Văn An \(NV001\) · Thiết bị · Chờ duyệt/);
    });
    itPanel('danh sách cảnh báo xếp theo SỐ TIỀN giảm dần, không phụ thuộc thứ tự thời gian', async function () {
      var h = await panel({ rows: [row({ id: 1, so_tien: 500000000, thoi_gian: '2026-10-01T00:00:00Z' }), row({ id: 2, so_tien: 150000000, thoi_gian: '2026-11-01T00:00:00Z' }), row({ id: 3, so_tien: 300000000, thoi_gian: '2026-10-15T00:00:00Z' }), row({ id: 4, so_tien: 300000000, thoi_gian: '2026-10-20T00:00:00Z' })] });
      assert.deepEqual(h.qa('[data-warn-id]').map(function (x) { return x.getAttribute('data-warn-id'); }), ['1', '3', '4', '2'], 'hòa số tiền thì theo id tăng dần');
    });
    itPanel('NGƯỠNG LÀ "LỚN HƠN" 100.000.000: đúng 100 triệu và 99.999.999 KHÔNG bị cảnh báo; 100.000.001 thì có', async function () {
      var h = await panel({ rows: [row({ id: 1, so_tien: 100000000 }), row({ id: 2, so_tien: 99999999 })] }); assert.equal(h.q('[data-role="warn"]'), null); assert.equal(h.qa('tr.is-over').length, 0); assert.equal(h.text('[data-role="kpi-over"]'), '0 khoản');
      var g = await panel({ rows: [row({ id: 1, so_tien: 100000001 }), row({ id: 2, so_tien: 100000000 })] }); assert.equal(g.text('[data-role="warn-title"]'), 'Cảnh báo: có 1 khoản chi trên 100 triệu đồng'); assert.deepEqual(g.qa('tr.is-over').map(function (r) { return r.getAttribute('data-id'); }), ['1']);
    });
    itPanel('cảnh báo áp cho MỌI trạng thái (cả Từ chối)', async function () {
      var h = await panel({ rows: [row({ id: 1, so_tien: 200000000, trang_thai: 'tu_choi' })] }); assert.ok(h.q('[data-role="warn"]')); assert.match(h.text('[data-warn-id="1"]'), /Từ chối/);
    });
    itPanel('dòng vượt ngưỡng trong bảng được đánh dấu bằng chữ + biểu tượng (không chỉ màu)', async function () {
      var h = await panel(); assert.deepEqual(h.qa('tr.is-over').map(function (r) { return +r.getAttribute('data-id'); }).sort(), [4, 7]);
      h.qa('tr.is-over').forEach(function (r) { var f = r.querySelector('[data-role="row-flag"]'); assert.equal(f.textContent.trim(), 'Trên 100 triệu'); assert.ok(f.querySelector('svg')); });
      assert.equal(h.row(9).querySelector('[data-role="row-flag"]'), null); assert.equal(h.row(8).querySelector('[data-role="row-flag"]'), null);
    });
    itPanel('làm mới sau khi có khoản mới > 100 triệu: cảnh báo và KPI cập nhật', async function () {
      var h = await panel(); assert.equal(h.ctrl.getState().overCount, 2); h.api.rows.push({ id: 10, ma_nhan_vien: 'NV009', ten_nhan_vien: 'Hoàng Văn Kiên', so_tien: 250000000, thoi_gian: '2026-11-03T00:00:00Z', phan_loai_chi: 'Thiết bị', trang_thai: 'cho_duyet', ma_de_nghi: 'z' });
      await h.ctrl.reload(); assert.equal(h.text('[data-role="warn-title"]'), 'Cảnh báo: có 3 khoản chi trên 100 triệu đồng'); assert.equal(h.qa('tbody tr[data-id]').length, 10); assert.equal(h.qa('[data-warn-id]')[0].getAttribute('data-warn-id'), '10'); assert.equal(h.text('[data-role="kpi-over"]'), '3 khoản');
    });
    itPanel('cảnh báo biến mất khi không còn khoản vượt ngưỡng', async function () {
      var h = await panel(); assert.ok(h.q('[data-role="warn"]')); h.api.rows.splice(0, h.api.rows.length, row({ id: 1, so_tien: 5000 })); await h.ctrl.reload();
      assert.equal(h.q('[data-role="warn"]'), null); assert.equal(h.text('[data-role="kpi-over"]'), '0 khoản'); assert.equal(h.text('[data-kpi="over"] .db-kpi-sub'), 'không có'); assert.equal(h.ctrl.getState().overCount, 0);
    });
  });

  describe('biểu đồ chi theo phân loại và trạng thái', function () {
    itPanel('mỗi phân loại một hàng, giảm dần theo tổng; tổng từng hàng đúng', async function () {
      var h = await panel(); assert.deepEqual(h.qa('.db-crow').map(function (r) { return r.getAttribute('data-cat'); }), ['Thiết bị', 'Vật tư', 'Dịch vụ', 'Tiếp khách', 'Vận chuyển', 'Văn phòng phẩm']);
      assert.deepEqual(h.qa('[data-role="cat-total"]').map(function (e) { return e.textContent; }), ['224.850.000 ₫', '135.500.000 ₫', '100.649.999 ₫', '2.400.000 ₫', '1.250.000 ₫', '450.000 ₫']);
    });
    itPanel('tổng các hàng biểu đồ = tổng KPI = tổng các dòng bảng', async function () {
      var h = await panel(), sum = h.qa('[data-role="cat-total"]').reduce(function (a, e) { return a + parseInt(e.textContent.replace(/\D/g, ''), 10); }, 0);
      assert.equal(sum, 465099999); assert.equal(h.api.rows.reduce(function (a, r) { return a + r.so_tien; }, 0), sum); assert.equal(h.text('[data-role="kpi-total"]'), '465.099.999 ₫');
    });
    itPanel('cột xếp chồng theo trạng thái: đúng số tiền và tỉ lệ độ dài', async function () {
      var h = await panel(), r = h.q('.db-crow[data-cat="Thiết bị"]'), segs = [].slice.call(r.querySelectorAll('.db-seg'));
      assert.deepEqual(segs.map(function (s) { return s.getAttribute('data-status') + ':' + s.getAttribute('data-amount'); }), ['cho_duyet:120000000', 'da_duyet:104850000']);
      var w0 = parseFloat(segs[0].getAttribute('width')), w1 = parseFloat(segs[1].getAttribute('width')); assert.ok(Math.abs(w0 - 120 / 224.85 * 100) < 0.01); assert.ok(Math.abs(w0 + w1 - 100) < 0.01, 'hàng lớn nhất đầy 100%'); assert.ok(Math.abs(parseFloat(segs[1].getAttribute('x')) - w0) < 0.01, 'đoạn nối tiếp nhau');
      var v = h.q('.db-crow[data-cat="Vật tư"]'); assert.ok(Math.abs(parseFloat(v.querySelector('.db-seg').getAttribute('width')) - 135.5 / 224.85 * 100) < 0.01);
    });
    itPanel('hàng chứa khoản > 100 triệu có nhãn cảnh báo kèm số khoản', async function () {
      var h = await panel(); assert.match(h.text('.db-crow[data-cat="Thiết bị"] [data-role="cat-flag"]'), /1 khoản > 100 triệu/); assert.ok(h.q('.db-crow[data-cat="Vật tư"] [data-role="cat-flag"]')); assert.equal(h.q('.db-crow[data-cat="Dịch vụ"] [data-role="cat-flag"]'), null);
    });
    itPanel('chú giải 3 trạng thái, bảng dữ liệu ẩn thị giác cho trình đọc màn hình, mỗi thanh có nhãn', async function () {
      var h = await panel(); assert.deepEqual(h.qa('.db-legend li').map(function (l) { return l.textContent; }), ['Chờ duyệt', 'Đã duyệt', 'Từ chối']); var t = h.q('.db-sr table'); assert.equal(t.rows.length, 7); assert.equal(t.rows[1].cells[4].textContent, '224.850.000 ₫'); assert.ok(t.caption.textContent.length > 0);
      h.qa('.db-cbar').forEach(function (s) { assert.ok(s.getAttribute('aria-label').indexOf('₫') > 0); assert.equal(s.getAttribute('role'), 'img'); });
    });
    itPanel('mỗi đoạn có chú giải (title) với phân loại, trạng thái, số tiền', async function () {
      var h = await panel(); assert.equal(h.q('.db-crow[data-cat="Thiết bị"] .db-seg[data-status="cho_duyet"] title').textContent, 'Thiết bị · Chờ duyệt · 120.000.000 ₫');
    });
  });

  describe('kết nối, lỗi và làm mới', function () {
    itPanel('chưa chạy server (mất mạng): thông báo hướng dẫn, không bảng, các chức năng khác không bị ảnh hưởng', async function () {
      var api = fakeApi(); api.down = true; var h = await panel({ api: api }); assert.equal(h.q('[data-role="conn"]').getAttribute('data-state'), 'offline'); assert.equal(h.text('[data-role="conn"]'), 'Chưa kết nối');
      assert.equal(h.q('[data-role="offline"]').getAttribute('role'), 'alert'); assert.match(h.text('[data-role="offline"]'), /python3 server\/server\.py/); assert.match(h.text('[data-role="offline"]'), /127\.0\.0\.1:8000\/trang-chu/); assert.equal(h.q('table'), null); assert.equal(h.q('[data-role="warn"]'), null);
    });
    itPanel('trả HTML (GitHub Pages) → cũng báo chưa kết nối', async function () { var api = fakeApi(); api.html = true; var h = await panel({ api: api }); assert.ok(h.q('[data-role="offline"]')); });
    itPanel('máy chủ lỗi 500 → nêu thông báo của máy chủ', async function () { var api = fakeApi(); api.status = 500; var h = await panel({ api: api }); assert.match(h.text('[data-role="offline"]'), /Máy chủ báo lỗi: Lỗi máy chủ giả/); });
    itPanel('bấm Làm mới sau khi bật server: hiện dữ liệu', async function () {
      var api = fakeApi(); api.down = true; var h = await panel({ api: api }); api.down = false; h.q('[data-act="reload"]').click(); await ready(h); assert.equal(h.qa('tbody tr[data-id]').length, 9); assert.equal(h.q('[data-role="offline"]'), null);
    });
    itPanel('mất kết nối khi làm mới: chuyển sang thông báo, không giữ dữ liệu cũ gây hiểu nhầm', async function () {
      var h = await panel(); h.api.down = true; await h.ctrl.reload(); assert.ok(h.q('[data-role="offline"]')); assert.equal(h.q('table'), null); assert.equal(h.ctrl.getState().phase, 'error');
    });
    itPanel('phản hồi cũ đến muộn KHÔNG ghi đè phản hồi mới hơn (chống tranh chấp)', async function () {
      var d1, d2, n = 0, client = { list: function () { n++; return n === 1 ? new Promise(function (r) { d1 = r; }) : new Promise(function (r) { d2 = r; }); } };
      var box = document.createElement('div'); document.body.appendChild(box); var ctrl = DncDbPanel.mount(box, { client: client, session: MGR }); ctrl.reload();
      d2({ ok: true, data: { items: [row({ id: 1 }), row({ id: 2 })] } }); await tick(); d1({ ok: true, data: { items: seedRows() } }); await tick();
      assert.equal(box.querySelectorAll('tbody tr[data-id]').length, 2); ctrl.destroy(); box.remove();
    });
    itPanel('khi bộ đồng bộ báo "synced" thì tự làm mới (sau 120ms, gộp nhiều lần)', async function () {
      var cb, sync = { onState: function (f) { cb = f; return function () { cb = null; }; } }; var h = await panel({ sync: sync }); var n = h.api.calls.length;
      cb({ state: 'syncing' }); cb({ state: 'synced', pushed: 1 }); cb({ state: 'synced', pushed: 2 }); await tick(250); assert.equal(h.api.calls.length, n + 1, 'gộp thành 1 lần tải');
      h.api.rows.push({ id: 10, ma_nhan_vien: 'N', ten_nhan_vien: 'Mới', so_tien: 5, thoi_gian: '2026-11-04T00:00:00Z', phan_loai_chi: 'Khác', trang_thai: 'cho_duyet', ma_de_nghi: 'k' }); cb({ state: 'syncing' }); cb({ state: 'synced', pushed: 1 }); await tick(250); assert.equal(h.qa('tbody tr[data-id]').length, 10);
    });
    itPanel('nhận sự kiện dnc:db-synced thì làm mới', async function () {
      var h = await panel(), n = h.api.calls.length; document.dispatchEvent(new CustomEvent('dnc:db-synced')); await tick(250); assert.equal(h.api.calls.length, n + 1);
    });
    itPanel('destroy: gỡ giao diện, hủy đăng ký, không gọi API nữa; phản hồi đến sau destroy bị bỏ qua', async function () {
      var cbs = 0, unsub = 0, sync = { onState: function () { cbs++; return function () { unsub++; }; } }; var h = await panel({ sync: sync }); assert.equal(cbs, 1);
      var n = h.api.calls.length; h.ctrl.destroy(); assert.equal(unsub, 1); assert.equal(h.box.innerHTML, ''); document.dispatchEvent(new CustomEvent('dnc:db-synced')); await tick(250); assert.equal(h.api.calls.length, n); assert.equal(h.ctrl.getState().destroyed, true);
      var late, c2 = { list: function () { return new Promise(function (r) { late = r; }); } }; var b = document.createElement('div'); document.body.appendChild(b); var k = DncDbPanel.mount(b, { client: c2, session: MGR }); k.destroy(); late({ ok: true, data: { items: seedRows() } }); await tick(); assert.equal(b.innerHTML, ''); b.remove();
    });
    itPanel('tên/mã/phân loại chứa HTML được thoát ký tự (XSS)', async function () {
      window.__xss = 0; var ev = '<img src=x onerror="window.__xss=1">'; var h = await panel({ rows: [row({ id: 1, ten_nhan_vien: ev + 'Tèo', ma_nhan_vien: ev, so_tien: 300000000, phan_loai_chi: ev })] }); await tick(20);
      assert.equal(window.__xss, 0); assert.equal(h.box.querySelectorAll('img').length, 0); assert.ok(h.row(1).cells[2].textContent.indexOf('<img') >= 0); assert.ok(h.q('[data-warn-id="1"]').textContent.indexOf('<img') >= 0);
    });
    itPanel('dữ liệu lạ từ máy chủ (items không phải mảng) không làm sập panel', async function () {
      var c = { list: function () { return Promise.resolve({ ok: true, data: { items: 'x' } }); } }; var h = await panel({ client: c }); assert.equal(h.ctrl.getState().count, 0); assert.ok(h.q('[data-role="empty"]'));
    });
  });

  describe('kiểu dáng theo DESIGN (mục 14) và trợ năng', function () {
    itPanel('tiêu đề 17px/600; KPI 22px/700; số đều nét; font hệ thống; thẻ bo 14px', async function () {
      var h = await panel(); var t = cs(h.q('.db-title')); assert.equal(t.fontSize, '17px'); assert.equal(t.fontWeight, '600'); var k = cs(h.q('[data-role="kpi-total"]')); assert.equal(k.fontSize, '22px'); assert.equal(k.fontWeight, '700'); assert.match(k.fontVariantNumeric, /tabular-nums/);
      assert.match(cs(h.box).fontFamily, /system-ui|-apple-system|Segoe UI|Roboto|Arial/); assert.equal(cs(h.q('.db-card')).borderTopLeftRadius, '14px'); assert.equal(cs(h.q('.db-kpi')).borderTopLeftRadius, '14px');
    });
    itPanel('cảnh báo dùng màu cảnh báo (pending-soft) có viền + biểu tượng; dòng vượt ngưỡng nền pending-soft', async function () {
      var h = await panel(), D = isDark(), w = h.q('[data-role="warn"]');
      assert.equal(cs(w).backgroundColor, D ? 'rgb(58, 44, 16)' : 'rgb(255, 241, 214)'); assert.equal(cs(w).borderTopColor, D ? 'rgb(242, 184, 78)' : 'rgb(138, 90, 0)'); assert.ok(w.querySelector('svg'));
      if (isDesktop()) assert.equal(cs(h.row(4).cells[2]).backgroundColor, D ? 'rgb(58, 44, 16)' : 'rgb(255, 241, 214)'); assert.equal(cs(h.q('[data-kpi="over"]')).borderLeftColor, D ? 'rgb(242, 184, 78)' : 'rgb(138, 90, 0)');
    });
    itPanel('huy hiệu và đoạn biểu đồ dùng đúng màu trạng thái duyệt (kèm biểu tượng + chữ)', async function () {
      var h = await panel(), D = isDark();
      var b = { cho_duyet: [D ? 'rgb(58, 44, 16)' : 'rgb(255, 241, 214)', D ? 'rgb(242, 184, 78)' : 'rgb(138, 90, 0)'], da_duyet: [D ? 'rgb(18, 55, 44)' : 'rgb(227, 245, 238)', D ? 'rgb(61, 213, 152)' : 'rgb(18, 128, 92)'], tu_choi: [D ? 'rgb(63, 27, 24)' : 'rgb(252, 232, 230)', D ? 'rgb(242, 118, 109)' : 'rgb(179, 38, 30)'] };
      Object.keys(b).forEach(function (s) { var e = h.q('[data-status-badge="' + s + '"]'); assert.equal(cs(e).backgroundColor, b[s][0], s); assert.equal(cs(e.querySelector('svg')).color, b[s][1], 'biểu tượng ' + s); assert.equal(cs(e).color, D ? 'rgb(236, 239, 244)' : 'rgb(20, 24, 31)', 'chữ dùng --text'); assert.ok(e.querySelector('svg')); assert.equal(cs(e).height, '24px'); assert.equal(cs(h.q('.db-seg[data-status="' + s + '"]')).fill, b[s][1], 'đoạn ' + s); });
    });
    itPanel('nút Làm mới, nút lọc, ô sắp xếp cao ≥ 40–44px', async function () {
      var h = await panel(); assert.ok(h.q('[data-act="reload"]').getBoundingClientRect().height >= 44); assert.ok(h.q('[data-role="sort"]').getBoundingClientRect().height >= 44); h.qa('[data-filter]').forEach(function (b) { assert.ok(b.getBoundingClientRect().height >= 40); });
    });
    itPanel('[điện thoại] mỗi khoản là một thẻ, không cuộn ngang; dòng vượt ngưỡng viền trái 4px', async function () {
      if (!isMobile()) skip();
      var h = await panel(); h.box.style.width = 'auto'; var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang'); assert.equal(cs(h.q('.db-table thead')).position, 'absolute'); assert.equal(cs(h.row(1)).display, 'grid');
      assert.equal(cs(h.row(4)).borderLeftWidth, '4px'); assert.equal(getComputedStyle(h.row(1).cells[3], '::before').content.replace(/"/g, ''), 'Số tiền'); assert.equal(getComputedStyle(h.row(1).cells[3], '::before').fontSize, '12px');
      var k = h.qa('.db-kpi').map(function (e) { return Math.round(e.getBoundingClientRect().top); }); assert.equal(new Set(k).size, 2, 'KPI lưới 2×2');
    });
    itPanel('[laptop] bảng thật 7 cột thẳng hàng với tiêu đề, không tràn; KPI 4 cột; biểu đồ 3 cột', async function () {
      if (!isDesktop()) skip();
      var h = await panel(); h.box.style.width = 'auto'; var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang'); assert.equal(cs(h.q('.db-table')).display, 'table');
      var th = h.qa('.db-table thead th'), td = h.row(1).cells; for (var i = 0; i < 7; i++) assert.ok(Math.abs(th[i].getBoundingClientRect().left - td[i].getBoundingClientRect().left) <= 2, 'cột ' + i);
      assert.equal(new Set(h.qa('.db-kpi').map(function (e) { return Math.round(e.getBoundingClientRect().top); })).size, 1); var c = h.q('.db-crow'); var n = c.querySelector('.db-cname').getBoundingClientRect(), b = c.querySelector('.db-cbar').getBoundingClientRect(), a = c.querySelector('.db-camt').getBoundingClientRect(); assert.ok(b.left >= n.right - 1 && a.left >= b.right - 1 && Math.abs(n.top - b.top) < 20, 'tên | thanh | tiền cùng hàng');
      var amt = h.row(4).querySelector('.db-c-amt'); assert.ok(amt.scrollWidth <= amt.clientWidth + 1, 'số tiền + nhãn không bị cắt');
    });
    itPanel('số tiền cực lớn không làm tràn khung', async function () {
      var h = await panel({ rows: [row({ id: 1, so_tien: 10000000000000 })] }); h.box.style.width = 'auto'; var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth); assert.equal(h.text('[data-role="kpi-total"]'), '10.000.000.000.000 ₫');
    });
    itPanel('cấu trúc trợ năng: tiêu đề gắn vùng, bảng có caption và scope, nhóm lọc có nhãn, biểu tượng ẩn, vùng cảnh báo', async function () {
      var h = await panel(); assert.ok(document.getElementById(h.q('section').getAttribute('aria-labelledby'))); assert.ok(h.q('table.db-table caption')); h.qa('.db-table thead th').forEach(function (t) { assert.equal(t.getAttribute('scope'), 'col'); });
      assert.equal(h.q('.db-seg-btns').getAttribute('role'), 'group'); assert.ok(h.q('.db-seg-btns').getAttribute('aria-label')); assert.ok(h.q('[data-act="reload"]').getAttribute('aria-label')); h.qa('svg').forEach(function (s) { if (s.closest('.db-cbar')) return; assert.equal(s.getAttribute('aria-hidden'), 'true'); });
      var b = h.q('[data-filter="all"]'); b.focus(); assert.equal(cs(b).outlineWidth, '2px');
    });
  });

  describe('tương phản màu (WCAG AA)', function () {
    function pair(name, fg, bg, min) { var r = contrast(fg, bg); assert.ok(r >= (min || 4.5), name + ': ' + r.toFixed(2) + ':1 (' + fg + ' trên ' + bg + ')'); }
    itPanel('chữ cảnh báo, nhãn vượt ngưỡng, huy hiệu, KPI, bảng, chip kết nối, ghi chú', async function () {
      var h = await panel(), card = cs(h.q('.db-card')).backgroundColor, w = h.q('[data-role="warn"]');
      pair('chữ cảnh báo', cs(h.q('[data-role="warn-title"]')).color, cs(w).backgroundColor); pair('danh sách cảnh báo', cs(h.q('.db-warn-list li')).color, cs(w).backgroundColor);
      var f = h.q('[data-role="row-flag"]'); pair('nhãn Trên 100 triệu', cs(f).color, cs(f).backgroundColor); var cf = h.q('[data-role="cat-flag"]'); pair('nhãn phân loại', cs(cf).color, cs(cf).backgroundColor);
      ['cho_duyet', 'da_duyet', 'tu_choi'].forEach(function (s) { var e = h.q('[data-status-badge="' + s + '"]'); pair('huy hiệu ' + s, cs(e).color, cs(e).backgroundColor); });
      pair('tiêu đề KPI', cs(h.q('.db-kpi-label')).color, cs(h.q('.db-kpi')).backgroundColor); pair('số KPI', cs(h.q('.db-kpi-val')).color, cs(h.q('.db-kpi')).backgroundColor); pair('phụ KPI', cs(h.q('.db-kpi-sub')).color, cs(h.q('.db-kpi')).backgroundColor);
      pair('tên phân loại', cs(h.q('.db-cname')).color, card); pair('tiền phân loại', cs(h.q('.db-camt')).color, card); pair('chú giải', cs(h.q('.db-legend li')).color, card);
      var tr = h.row(1); pair('ô bảng', cs(tr.cells[2]).color, effBg(tr.cells[2])); pair('tiêu đề cột', cs(h.q('.db-table th')).color, card); var rr = h.row(4); pair('ô dòng vượt ngưỡng', cs(rr.cells[2]).color, effBg(rr.cells[2]));
      pair('chip kết nối', cs(h.q('[data-role="conn"]')).color, cs(h.q('[data-role="conn"]')).backgroundColor); pair('nút lọc đang chọn', cs(h.q('[data-filter="all"]')).color, cs(h.q('[data-filter="all"]')).backgroundColor);
      pair('nút Làm mới', cs(h.q('[data-act="reload"]')).color, cs(h.q('[data-act="reload"]')).backgroundColor); pair('ô sắp xếp', cs(h.q('[data-role="sort"]')).color, cs(h.q('[data-role="sort"]')).backgroundColor);
    });
    itPanel('đồ họa biểu đồ đạt ≥ 3:1 trên nền thẻ; ghi chú chưa kết nối đạt AA', async function () {
      var h = await panel(), card = cs(h.q('.db-card')).backgroundColor; ['cho_duyet', 'da_duyet', 'tu_choi'].forEach(function (s) { pair('đoạn ' + s, cs(h.q('.db-seg[data-status="' + s + '"]')).fill, card, 3); }); pair('thanh nền', cs(h.q('.db-track')).fill, card, 1.05);
      var api = fakeApi(); api.down = true; var g = await panel({ api: api }), n = g.q('[data-role="offline"]'); pair('ghi chú offline', cs(n).color, cs(n).backgroundColor); pair('chip chưa kết nối', cs(g.q('[data-role="conn"]')).color, cs(g.q('[data-role="conn"]')).backgroundColor); var c = g.q('.db-note code'); pair('mã lệnh', cs(c).color, cs(c).backgroundColor);
    });
  });
})();
