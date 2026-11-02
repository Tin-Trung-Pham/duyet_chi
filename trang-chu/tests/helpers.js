/* Công cụ dùng chung cho test module Khung ứng dụng. */
(function (g) {
  var K = DncAppModel.KEYS;
  function FakeStorage() { this.m = {}; this.failSet = false; this.failGet = false; this.sets = 0; }
  FakeStorage.prototype.getItem = function (k) { if (this.failGet) throw new Error('SecurityError'); return Object.prototype.hasOwnProperty.call(this.m, k) ? this.m[k] : null; };
  FakeStorage.prototype.setItem = function (k, v) { if (this.failSet) { var e = new Error('SecurityError'); e.name = 'SecurityError'; throw e; } this.sets++; this.m[k] = String(v); };
  FakeStorage.prototype.removeItem = function (k) { delete this.m[k]; };
  g.FakeStorage = FakeStorage;

  g.TODAY = '2026-11-02';
  g.EMPS = function () {
    return [
      { id: 'nv1', ma: 'NV001', hoTen: 'Nguyễn Văn An', hoatDong: true },
      { id: 'nv2', ma: 'NV002', hoTen: 'Trần Thị Bình', hoatDong: true },
      { id: 'nv3', ma: 'NV003', hoTen: 'Lê Hoàng Cường', hoatDong: true },
      { id: 'nv4', ma: 'NV004', hoTen: 'Phạm Thu Dung', hoatDong: false }
    ];
  };
  var seq = 0;
  g.req = function (o) {
    seq++;
    return { id: o.id || 'r' + seq, nhanVienId: o.nv || 'nv1', nhaCungCap: 'Món ' + seq, danhMuc: 'khac', soLuong: o.sl == null ? 1 : o.sl, donGia: o.dg == null ? 100000 : o.dg,
      ngay: o.ngay || '2026-11-01', ghiChu: '', trangThai: o.tt || 'cho_duyet', lyDoTuChoi: null, ngayTao: '2026-11-01T02:00:00.000Z', ngayXuLy: o.tt && o.tt !== 'cho_duyet' ? '2026-11-01T05:00:00.000Z' : null };
  };
  /* Tháng 11: nv1 chờ 720.000 + duyệt 450.000; nv2 duyệt 1.950.000 + từ chối 900.000 + chờ 100.000; tháng 10: chờ 300.000 (nv3) */
  g.REQS = function () {
    return [
      req({ id: 'q1', nv: 'nv1', tt: 'cho_duyet', dg: 720000 }), req({ id: 'q2', nv: 'nv1', tt: 'da_duyet', sl: 10, dg: 45000 }),
      req({ id: 'q3', nv: 'nv2', tt: 'da_duyet', sl: 3, dg: 650000 }), req({ id: 'q4', nv: 'nv2', tt: 'tu_choi', dg: 900000 }), req({ id: 'q5', nv: 'nv2', tt: 'cho_duyet', dg: 100000 }),
      req({ id: 'q6', nv: 'nv3', tt: 'cho_duyet', dg: 300000, ngay: '2026-10-20' })
    ];
  };

  g.makeStorage = function (o) {
    o = o || {};
    var st = new FakeStorage();
    if (o.nhanVien !== null) st.m[K.NV] = JSON.stringify(o.nhanVien || EMPS());
    if (o.deNghi !== null) st.m[K.DN] = JSON.stringify(o.deNghi || REQS());
    if (o.ack !== false) st.m[K.ACK] = '1';
    if (o.session) st.m[K.SESSION] = JSON.stringify(o.session);
    return st;
  };

  /* Bộ điều hợp địa chỉ trong bộ nhớ (đồng bộ, ghi lại lịch sử). */
  g.memNav = function (initial) {
    var path = initial || '/', ls = [], n = { sets: [] };
    n.get = function () { return path; };
    n.set = function (p, o) { path = p; n.sets.push({ path: p, replace: !!(o && o.replace) }); ls.slice().forEach(function (f) { f(); }); };
    n.listen = function (cb) { ls.push(cb); return function () { ls = ls.filter(function (f) { return f !== cb; }); }; };
    n.push = function (p) { path = p; ls.slice().forEach(function (f) { f(); }); }; // người dùng gõ địa chỉ / bấm Quay lại
    n.listeners = function () { return ls.length; };
    return n;
  };

  /* Module giả để kiểm tra khung độc lập với 4 module thật. */
  g.stubModules = function (log) {
    var m = {};
    ['nhap-lieu', 'duyet', 'thong-ke', 'nhan-vien'].forEach(function (name) {
      m[name] = { mount: function (el, ctx) {
        log.mounts.push({ name: name, ctx: ctx, el: el });
        el.innerHTML = '<h1 class="stub-h">Màn ' + name + '</h1><button type="button" class="stub-b">nút</button>';
        return { destroy: function () { log.destroys.push(name); el.innerHTML = ''; } };
      } };
    });
    return m;
  };

  var mounted = [];
  g.mountApp = function (o) {
    o = o || {};
    var storage = o.storage || makeStorage(o);
    var box = document.createElement('div'); document.body.appendChild(box);
    var nav = o.nav || memNav(o.path || '/');
    var log = { mounts: [], destroys: [] };
    var modules = o.modules === 'real' ? DncAppModules.real(storage) : (o.modules || stubModules(log));
    var app = DncApp.start(box, { storage: storage, nav: nav, modules: modules, today: o.today || TODAY });
    var h = { box: box, app: app, storage: storage, nav: nav, log: log };
    h.q = function (s) { return box.querySelector(s); };
    h.qa = function (s) { return Array.prototype.slice.call(box.querySelectorAll(s)); };
    h.text = function (s) { var e = box.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    h.route = function () { return h.app.getState().route; };
    h.navItems = function () { return h.qa('.app-nav-item').map(function (a) { return a.getAttribute('data-nav'); }); };
    h.navLabels = function () { return h.qa('.app-nav-item .app-nav-label').map(function (a) { return a.textContent; }); };
    h.own = function (s) { return box.querySelector(':scope > ' + s); };
    h.banner = function () { var b = h.own('[data-role="banner"]'); return b && !b.hidden ? b.getAttribute('data-kind') : null; };
    h.toastText = function () { var t = h.own('[data-role="toast"]'); return t && t.classList.contains('is-show') ? t.textContent : ''; };
    h.badge = function () { var b = h.q('[data-role="nav-badge"]'); return b && !b.hidden ? b.textContent : ''; };
    h.link = function (name) { return h.q('.app-nav-item[data-nav="' + name + '"]'); };
    h.menu = function () { return h.q('[data-role="menu-overlay"]'); };
    h.session = function () { return DncAppModel.readSession(storage); };
    h.pickRole = function (scope, role) { var r = (scope || box).querySelector('input[type=radio][value="' + role + '"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); };
    h.pickWho = function (scope, id) { var s = (scope || box).querySelector('[data-role="who"]'); s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); };
    h.enterAs = function (role, id) { h.pickRole(h.q('.app-role'), role); if (id) h.pickWho(h.q('.app-role'), id); h.q('[data-act="enter"]').click(); };
    h.openMenu = function () { h.q('.app-chip').click(); };
    h.dataChanged = function (src) { document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: src || 'test' } })); };
    h.destroy = function () { try { app.destroy(); } catch (e) { /* đã hủy */ } if (box.parentNode) box.parentNode.removeChild(box); };
    mounted.push(h);
    return h;
  };
  g.cleanupApps = function () { mounted.splice(0).forEach(function (h) { h.destroy(); }); };
  g.itApp = function (name, fn) { it(name, async function () { try { await fn(); } finally { cleanupApps(); } }); };

  g.cssVar = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
  g.effBg = function (el) {
    while (el) { var c = getComputedStyle(el).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; el = el.parentElement; }
    return getComputedStyle(document.body).backgroundColor;
  };
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function parse(css) {
    var hx = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(css).trim());
    if (hx) return [parseInt(hx[1], 16), parseInt(hx[2], 16), parseInt(hx[3], 16)];
    var cm = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(css);
    if (cm) return [Math.round(cm[1] * 255), Math.round(cm[2] * 255), Math.round(cm[3] * 255)];
    var m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(css);
    if (!m) throw new Error('Không đọc được màu: ' + css);
    return [+m[1], +m[2], +m[3]];
  }
  g.contrast = function (fg, bg) {
    var a = parse(fg), b = parse(bg);
    var L1 = 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]), L2 = 0.2126 * lin(b[0]) + 0.7152 * lin(b[1]) + 0.0722 * lin(b[2]);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
})(window);
