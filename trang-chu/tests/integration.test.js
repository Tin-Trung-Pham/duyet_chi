/* Test tích hợp: khung ứng dụng + 4 module THẬT chạy cùng nhau trên một kho dữ liệu. */
(function () {
  var A = DncAppModel, K = A.KEYS, T = A.todayStr();
  function ds() {
    return [
      req({ id: 'p1', nv: 'nv1', tt: 'cho_duyet', sl: 2, dg: 120000, ngay: T }), req({ id: 'p2', nv: 'nv2', tt: 'cho_duyet', sl: 1, dg: 4850000, ngay: T }),
      req({ id: 'a1', nv: 'nv1', tt: 'da_duyet', sl: 10, dg: 45000, ngay: T }), req({ id: 'r1', nv: 'nv2', tt: 'tu_choi', sl: 1, dg: 900000, ngay: T })
    ];
  }
  function real(o) { o = o || {}; o.modules = 'real'; o.today = T; if (!o.deNghi) o.deNghi = ds(); return mountApp(o); }
  function setVal(el, v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
  function reqs(h) { return JSON.parse(h.storage.m[K.DN]); }
  function emps(h) { return JSON.parse(h.storage.m[K.NV]); }

  describe('4 module thật chạy trong khung', function () {
    itApp('Quản lý mở từng màn bằng thanh điều hướng: đúng module, đúng tiêu đề, đúng dữ liệu', async function () {
      var h = real({ session: { vaiTro: 'quan_ly' } });
      h.link('duyet').click(); assert.equal(h.text('.dv-title'), 'Duyệt đề nghị'); assert.deepEqual(h.qa('.dv-row').map(function (r) { return r.getAttribute('data-id'); }).sort(), ['p1', 'p2']);
      h.link('thong-ke').click(); assert.equal(h.text('.dst-title'), 'Thống kê'); assert.equal(h.text('[data-role="kpi-approved"]'), '450.000 ₫'); assert.equal(h.q('.dv-title'), null, 'module Duyệt đã bị gỡ');
      h.link('nhan-vien').click(); assert.equal(h.text('.de-title'), 'Nhân viên'); assert.deepEqual(h.qa('tbody tr[data-id]').map(function (r) { return r.getAttribute('data-id'); }), ['nv1', 'nv2', 'nv3', 'nv4']);
      assert.equal(h.qa('[data-module]').length, 1);
    });
    itApp('Nhân viên mở màn Thêm: form của module Nhập liệu, người đề nghị bị khóa theo phiên', async function () {
      var h = real({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv2' } }); h.link('nhap-lieu').click();
      assert.equal(h.text('.dn-title'), 'Thêm đề nghị chi'); var sel = h.q('[data-field="nhanVienId"]'); assert.equal(sel.value, 'nv2'); assert.equal(sel.disabled, true);
    });
    itApp('Nhân viên xem Thống kê: chỉ số liệu của mình', async function () {
      var h = real({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv1' } }); h.link('thong-ke').click(); assert.equal(h.q('[data-card="emp-table"]'), null); assert.equal(h.text('[data-role="kpi-approved"]'), '450.000 ₫'); assert.equal(h.text('[data-role="kpi-pending"]'), '240.000 ₫');
    });
    itApp('chuyển qua lại nhiều lần giữa các màn không rò rỉ: mỗi lần chỉ một module, sự kiện dữ liệu không gây lỗi', async function () {
      var h = real({ session: { vaiTro: 'quan_ly' } }); ['duyet', 'thong-ke', 'nhan-vien', 'duyet', 'thong-ke', 'home', 'nhan-vien'].forEach(function (n) { h.link(n).click(); assert.equal(h.qa('[data-module]').length, n === 'home' ? 0 : 1, n); });
      h.dataChanged('test'); assert.equal(h.route(), 'nhan-vien'); assert.equal(h.qa('.de-title').length, 1);
    });
    itApp('địa chỉ không đúng vai trò với module thật: bị chặn bởi khung, module không bao giờ mount', async function () {
      var h = real({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv1' }, path: '/duyet' }); assert.equal(h.route(), 'home'); assert.equal(h.q('.dv-title'), null); assert.equal(h.toastText(), 'Trang này dành cho Quản lý.');
    });
    itApp('đặt lại dữ liệu hỏng khi đang ở module thật: khung báo lỗi ở banner, module hiện khối lỗi của nó', async function () {
      var st = makeStorage({ session: { vaiTro: 'quan_ly' } }); st.m[K.DN] = '{hỏng'; var h = mountApp({ storage: st, modules: 'real', today: T }); assert.equal(h.banner(), 'corrupt'); h.link('duyet').click();
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'corrupt'); assert.equal(h.banner(), 'corrupt'); h.q('[data-act="reset-open"]').click(); var i = h.q('[data-role="reset-input"]'); setVal(i, 'XÓA'); h.q('[data-act="reset-ok"]').click(); assert.equal(h.route(), 'vai-tro'); assert.equal(h.banner(), null);
    });
  });

  describe('luồng nghiệp vụ trọn vẹn xuyên 4 module', function () {
    itApp('Nhân viên gửi đề nghị → số khoản chờ trên Trang chủ tăng → Quản lý thấy huy hiệu → duyệt → thống kê đổi', async function () {
      var h = real({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv3' } });
      assert.equal(h.text('[data-role="kpi-pending"]'), '0 ₫');
      // 1. Nhân viên nv3 gửi đề nghị bằng form thật
      h.link('nhap-lieu').click(); setVal(h.q('[data-field="nhaCungCap"]'), 'Giấy A4 Hồng Hà'); h.q('input[type=radio][value="van_phong_pham"]').click(); setVal(h.q('[data-field="soLuong"]'), '10'); setVal(h.q('[data-field="donGia"]'), '45000');
      h.q('[data-act="submit"]').click(); await tick(20);
      var added = reqs(h).filter(function (x) { return x.nhaCungCap === 'Giấy A4 Hồng Hà'; })[0]; assert.ok(added, 'đề nghị đã được lưu'); assert.equal(added.nhanVienId, 'nv3'); assert.equal(added.trangThai, 'cho_duyet');
      // 2. Trang chủ của nhân viên phản ánh ngay
      h.link('home').click(); assert.equal(h.text('[data-role="kpi-pending"]'), '450.000 ₫'); assert.match(h.text('[data-kpi="pending"] .app-kpi-sub'), /^1 khoản/);
      // 3. Đổi sang Quản lý: thấy huy hiệu tăng từ 2 lên 3
      h.openMenu(); h.pickRole(h.menu(), 'quan_ly'); h.q('[data-act="apply"]').click(); assert.equal(h.badge(), '3');
      // 4. Duyệt đúng khoản đó trong module Duyệt thật
      h.link('duyet').click(); assert.ok(h.q('.dv-row[data-id="' + added.id + '"]')); h.q('.dv-row[data-id="' + added.id + '"] [data-act="approve"]').click(); await tick(20);
      assert.equal(reqs(h).filter(function (x) { return x.id === added.id; })[0].trangThai, 'da_duyet'); assert.equal(h.badge(), '2');
      // 5. Thống kê và Trang chủ cùng cập nhật: đã duyệt = 450.000 (a1) + 450.000 (mới)
      h.link('thong-ke').click(); assert.equal(h.text('[data-role="kpi-approved"]'), '900.000 ₫'); h.link('home').click(); assert.equal(h.text('[data-role="kpi-approved"]'), '900.000 ₫'); assert.equal(h.text('[data-role="kpi-pending"]'), '5.090.000 ₫');
    });
    itApp('Quản lý thêm nhân viên mới → nhân viên đó chọn được ở màn Chọn vai trò và gửi được đề nghị', async function () {
      var h = real({ session: { vaiTro: 'quan_ly' } }); h.link('nhan-vien').click(); h.q('.de-head [data-act="add"]').click(); setVal(h.q('[data-field="ma"]'), 'nv009'); setVal(h.q('[data-field="hoTen"]'), 'Hoàng Văn Kiên'); h.q('[data-dlg="save"]').click(); await tick(20);
      var nv = emps(h).filter(function (e) { return e.ma === 'NV009'; })[0]; assert.ok(nv); assert.equal(nv.hoatDong, true);
      h.openMenu(); h.pickRole(h.menu(), 'nhan_vien'); var opts = h.qa('.app-menu [data-role="who"] option').map(function (o) { return o.textContent; }); assert.ok(opts.indexOf('NV009 · Hoàng Văn Kiên') >= 0, opts.join('|'));
      h.pickWho(h.menu(), nv.id); h.q('[data-act="apply"]').click(); assert.equal(h.text('[data-role="chip-name"]'), 'Hoàng Văn Kiên');
      h.link('nhap-lieu').click(); setVal(h.q('[data-field="nhaCungCap"]'), 'Bút bi'); h.q('input[type=radio][value="khac"]').click(); setVal(h.q('[data-field="soLuong"]'), '1'); setVal(h.q('[data-field="donGia"]'), '5000'); h.q('[data-act="submit"]').click(); await tick(20);
      assert.equal(reqs(h).filter(function (x) { return x.nhanVienId === nv.id; }).length, 1);
    });
    itApp('Quản lý ngưng hoạt động nhân viên đang là phiên hiện tại ở tab khác → khung đưa người đó về Chọn vai trò', async function () {
      var h = real({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv1' } }); h.link('nhap-lieu').click(); assert.equal(h.route(), 'nhap-lieu');
      var all = emps(h); all.filter(function (e) { return e.id === 'nv1'; })[0].hoatDong = false; h.storage.m[K.NV] = JSON.stringify(all); window.dispatchEvent(new Event('storage'));
      assert.equal(h.route(), 'vai-tro'); assert.equal(h.session(), null); assert.equal(h.q('.dn-title'), null); assert.match(h.toastText(), /không còn hoạt động/, 'toast: ' + h.qa('[data-role="toast"]').map(function (t) { return t.className + '=' + t.textContent; }).join(' | '));
    });
    itApp('Quản lý từ chối rồi hoàn tác trong module Duyệt: huy hiệu và Trang chủ khớp', async function () {
      var h = real({ session: { vaiTro: 'quan_ly' } }); assert.equal(h.badge(), '2'); h.link('duyet').click(); h.q('.dv-row[data-id="p1"] [data-act="reject"]').click(); var ta = h.q('[data-role="reason"]'); setVal(ta, 'Giá chưa hợp lý'); h.q('[data-dlg="reject"]').click(); await tick(20);
      assert.equal(h.badge(), '1'); assert.equal(reqs(h).filter(function (x) { return x.id === 'p1'; })[0].trangThai, 'tu_choi'); h.q('[data-act="undo"]').click(); await tick(20); assert.equal(h.badge(), '2');
      h.link('home').click(); assert.equal(h.text('[data-role="kpi-pending"]'), '5.090.000 ₫');
    });
    itApp('xóa nhân viên chưa có đề nghị (module Nhân viên) không ảnh hưởng số liệu Trang chủ', async function () {
      var h = real({ session: { vaiTro: 'quan_ly' } }); h.link('nhan-vien').click(); h.q('tbody tr[data-id="nv3"] [data-act="edit"].de-btn').click(); h.q('[data-dlg="delete"]').click(); h.q('[data-kind="confirm"] [data-dlg="c-ok"]').click(); await tick(20);
      assert.equal(emps(h).some(function (e) { return e.id === 'nv3'; }), false); h.link('home').click(); assert.equal(h.text('[data-role="kpi-approved"]'), '450.000 ₫');
    });
    itApp('Hủy ở form Thêm đưa về Trang chủ (module báo lại cho khung)', async function () {
      var h = real({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv1' } }); h.link('nhap-lieu').click(); h.q('[data-act="cancel"]').click(); await tick(); assert.equal(h.route(), 'home');
    });
  });
})();
