/* Công cụ dùng chung cho test module Nhân viên. */
(function (g) {
  function FakeStorage() { this.m = {}; this.failSet = null; this.failGet = false; this.sets = 0; }
  FakeStorage.prototype.getItem = function (k) {
    if (this.failGet) throw new Error('SecurityError');
    return Object.prototype.hasOwnProperty.call(this.m, k) ? this.m[k] : null;
  };
  FakeStorage.prototype.setItem = function (k, v) {
    if (this.failSet) throw this.failSet;
    this.sets++; this.m[k] = String(v);
  };
  g.FakeStorage = FakeStorage;
  g.quotaError = function () { var e = new Error('quota'); e.name = 'QuotaExceededError'; return e; };

  g.NOW = new Date(2026, 10, 2, 9, 30).getTime();
  g.MGR = { vaiTro: 'quan_ly' };
  g.EMP = { vaiTro: 'nhan_vien', nhanVienId: 'nv1' };

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
    return { id: o.id || 'r' + seq, nhanVienId: o.nv, nhaCungCap: 'Món ' + seq, danhMuc: 'khac', soLuong: o.sl == null ? 1 : o.sl, donGia: o.dg == null ? 100000 : o.dg,
      ngay: '2026-11-01', ghiChu: '', trangThai: o.tt || 'da_duyet', lyDoTuChoi: null, ngayTao: '2026-11-01T02:00:00.000Z', ngayXuLy: null };
  };
  /* nv1: 3 đề nghị (2 duyệt = 450.000 + 4.850.000, 1 chờ); nv2: 2 (1 duyệt 1.950.000, 1 từ chối); nv3: 0; nv4: 1 duyệt 400.000 */
  g.REQS = function () {
    return [
      req({ id: 'q1', nv: 'nv1', sl: 10, dg: 45000 }), req({ id: 'q2', nv: 'nv1', sl: 1, dg: 4850000 }), req({ id: 'q3', nv: 'nv1', tt: 'cho_duyet', dg: 720000 }),
      req({ id: 'q4', nv: 'nv2', sl: 3, dg: 650000 }), req({ id: 'q5', nv: 'nv2', tt: 'tu_choi', dg: 900000 }), req({ id: 'q6', nv: 'nv4', sl: 4, dg: 100000 })
    ];
  };

  g.makeEnv = function (o) {
    o = o || {};
    var st = new FakeStorage();
    if (o.nhanVien !== null) st.m[DncEmpStore.KEY_NV] = JSON.stringify(o.nhanVien || EMPS());
    if (o.deNghi !== null) st.m[DncEmpStore.KEY_DN] = JSON.stringify(o.deNghi || REQS());
    var clock = { t: NOW }, n = 0;
    var store = DncEmpStore.create({ storage: st, now: function () { return clock.t; }, uid: function () { return 'u' + (++n); } });
    return { storage: st, store: store, clock: clock };
  };
  g.readNV = function (env) { return JSON.parse(env.storage.m[DncEmpStore.KEY_NV] || '[]'); };

  /* ---- Giao diện ---- */
  var mounted = [];
  g.mountPage = function (o) {
    o = o || {};
    var env = o.env || makeEnv(o);
    var box = document.createElement('div');
    document.body.appendChild(box);
    var calls = { changed: [], events: [], forbidden: 0 };
    var listener = function (e) { calls.events.push(e.detail); };
    document.addEventListener('dnc:data-changed', listener);
    var ctrl = DncEmployees.mount(box, {
      store: o.wrapStore ? o.wrapStore(env.store) : env.store,
      session: o.session === undefined ? MGR : o.session,
      onChanged: function (a, id) { calls.changed.push({ action: a, id: id }); },
      onForbidden: function () { calls.forbidden++; }
    });
    var h = { box: box, ctrl: ctrl, env: env, calls: calls };
    h.q = function (s) { return box.querySelector(s); };
    h.qa = function (s) { return Array.prototype.slice.call(box.querySelectorAll(s)); };
    h.text = function (s) { var e = box.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    h.rows = function () { return h.qa('tbody tr[data-id]'); };
    h.ids = function () { return h.rows().map(function (r) { return r.getAttribute('data-id'); }); };
    h.names = function () { return h.rows().map(function (r) { return r.querySelector('[data-role="name"]').textContent; }); };
    h.row = function (id) { return box.querySelector('tbody tr[data-id="' + id + '"]'); };
    h.dialog = function () { var d = h.qa('[data-role="dialog-overlay"]'); return d[d.length - 1] || null; };
    h.dialogs = function () { return h.qa('[data-role="dialog-overlay"]').length; };
    h.step = function () { var d = h.dialog(); var x = d && d.querySelector('.de-dialog'); return x ? x.getAttribute('data-step') : null; };
    h.form = function () { return h.q('[data-step="form"]'); };
    h.f = function (n) { var f = h.form(); return f && f.querySelector('[data-field="' + n + '"]'); };
    h.err = function (n) { var f = h.form(); var p = f && f.querySelector('[data-err="' + n + '"]'); return p && !p.hidden ? p.textContent : ''; };
    h.type = function (n, v) { var el = h.f(n); el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    h.blur = function (n) { var el = h.f(n); el.focus(); el.blur(); };
    h.save = function () { return h.q('[data-dlg="save"]'); };
    h.formBanner = function () { var b = h.q('[data-role="form-banner"]'); return b && !b.hidden ? b.textContent : ''; };
    h.banner = function () { var b = h.q('[data-role="banner"]'); return b && !b.hidden ? b.textContent : ''; };
    h.toastText = function () { var t = h.q('[data-role="toast"]'); return t && t.classList.contains('is-show') ? t.textContent : ''; };
    h.search = function (v) { var s = h.q('[data-role="search"]'); s.focus(); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); };
    h.status = function (k) { h.q('[data-status="' + k + '"]').click(); };
    h.sort = function (k) { var s = h.q('[data-role="sort"]'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true })); };
    h.openAdd = function () { h.q('.de-head [data-act="add"]').click(); };
    h.openEdit = function (id) { h.row(id).querySelector('[data-act="edit"].de-btn').click(); };
    h.destroy = function () { document.removeEventListener('dnc:data-changed', listener); ctrl.destroy(); if (box.parentNode) box.parentNode.removeChild(box); };
    mounted.push(h);
    return h;
  };
  g.cleanupPages = function () { mounted.splice(0).forEach(function (h) { try { h.destroy(); } catch (e) { /* đã hủy */ } }); };
  g.itPage = function (name, fn) { it(name, async function () { try { await fn(); } finally { cleanupPages(); } }); };

  g.rng = function (seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
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
    var L1 = 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]);
    var L2 = 0.2126 * lin(b[0]) + 0.7152 * lin(b[1]) + 0.0722 * lin(b[2]);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
})(window);
