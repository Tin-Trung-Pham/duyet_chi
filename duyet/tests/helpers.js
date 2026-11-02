/* Công cụ dùng chung cho test module Duyệt. */
(function (g) {
  function FakeStorage() { this.m = {}; this.failSet = null; this.failGet = false; this.sets = 0; }
  FakeStorage.prototype.getItem = function (k) {
    if (this.failGet) throw new Error('SecurityError');
    return Object.prototype.hasOwnProperty.call(this.m, k) ? this.m[k] : null;
  };
  FakeStorage.prototype.setItem = function (k, v) {
    if (this.failSet) throw this.failSet;
    this.sets++;
    this.m[k] = String(v);
  };
  g.FakeStorage = FakeStorage;
  g.quotaError = function () { var e = new Error('quota'); e.name = 'QuotaExceededError'; return e; };

  g.NV = [
    { id: 'nv1', ma: 'NV001', hoTen: 'Nguyễn Văn An', hoatDong: true },
    { id: 'nv2', ma: 'NV002', hoTen: 'Trần Thị Bình', hoatDong: true },
    { id: 'nv3', ma: 'NV003', hoTen: 'Lê Hoàng Cường', hoatDong: false }
  ];
  g.NOW = new Date(2026, 10, 2, 9, 30).getTime(); // 02/11/2026 09:30
  g.TODAY = '2026-11-02';
  g.MGR = { vaiTro: 'quan_ly' };
  g.EMP = { vaiTro: 'nhan_vien', nhanVienId: 'nv1' };

  var seq = 0;
  /* Đề nghị mẫu. ngayTao mặc định: 1 ngày trước "hôm nay" (giờ địa phương). */
  g.item = function (over) {
    seq++;
    var o = {
      id: 'dn' + seq, nhanVienId: 'nv1', nhaCungCap: 'Giấy A4 ' + seq, danhMuc: 'van_phong_pham', soLuong: 10, donGia: 45000,
      ngay: '2026-11-01', ghiChu: '', trangThai: 'cho_duyet', lyDoTuChoi: null,
      ngayTao: new Date(2026, 10, 1, 8, 0).toISOString(), ngayXuLy: null
    };
    for (var k in over) o[k] = over[k];
    return o;
  };

  g.makeStore = function (o) {
    o = o || {};
    var st = new FakeStorage();
    if (o.nhanVien !== null) st.m[DncReviewStore.KEY_NV] = JSON.stringify(o.nhanVien || NV);
    if (o.deNghi) st.m[DncReviewStore.KEY_DN] = JSON.stringify(o.deNghi);
    var clock = { t: NOW };
    var store = DncReviewStore.create({ storage: st, now: function () { return clock.t; } });
    return { storage: st, store: store, clock: clock };
  };
  g.read = function (env) { return JSON.parse(env.storage.m[DncReviewStore.KEY_DN] || '[]'); };

  /* ---- Môi trường giao diện ---- */
  var mounted = [];
  g.mountPage = function (o) {
    o = o || {};
    var env = o.env || makeStore(o);
    var box = document.createElement('div');
    document.body.appendChild(box);
    var calls = { changed: [], events: [], forbidden: 0 };
    var listener = function (e) { calls.events.push(e.detail); };
    document.addEventListener('dnc:data-changed', listener);
    var ctrl = DncReview.mount(box, {
      store: o.wrapStore ? o.wrapStore(env.store) : env.store,
      session: o.session === undefined ? MGR : o.session,
      today: TODAY, month: o.month,
      onChanged: function (a, ids) { calls.changed.push({ action: a, ids: ids }); },
      onForbidden: function () { calls.forbidden++; }
    });
    var h = { box: box, ctrl: ctrl, env: env, calls: calls };
    h.q = function (s) { return box.querySelector(s); };
    h.qa = function (s) { return Array.prototype.slice.call(box.querySelectorAll(s)); };
    h.rows = function () { return h.qa('.dv-row'); };
    h.row = function (id) { return box.querySelector('.dv-row[data-id="' + id + '"]'); };
    h.rowIds = function () { return h.rows().map(function (r) { return r.getAttribute('data-id'); }); };
    h.btn = function (id, act) { return h.row(id).querySelector('[data-act="' + act + '"]'); };
    h.dialog = function () { return h.q('[data-role="dialog-overlay"]'); };
    h.step = function () { var d = h.q('.dv-dialog'); return d ? d.getAttribute('data-step') : null; };
    h.toastText = function () { var t = h.q('[data-role="toast"]'); return t && t.classList.contains('is-show') ? t.textContent : ''; };
    h.banner = function () { var b = h.q('[data-role="banner"]'); return b && !b.hidden ? b.textContent : ''; };
    h.strip = function () { return h.q('[data-role="strip"]').textContent.replace(/\s+/g, ' ').trim(); };
    h.select = function (id, on) {
      var c = h.q('[data-sel="' + id + '"]');
      c.checked = on !== false;
      c.dispatchEvent(new Event('change', { bubbles: true }));
    };
    h.filter = function (which, val) {
      var s = h.q('[data-filter="' + which + '"]');
      s.value = val;
      s.dispatchEvent(new Event('change', { bubbles: true }));
    };
    h.typeReason = function (txt) {
      var ta = h.q('[data-role="reason"]');
      ta.focus();
      ta.value = txt;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    };
    h.destroy = function () { document.removeEventListener('dnc:data-changed', listener); ctrl.destroy(); if (box.parentNode) box.parentNode.removeChild(box); };
    mounted.push(h);
    return h;
  };
  g.cleanupPages = function () { mounted.splice(0).forEach(function (h) { try { h.destroy(); } catch (e) { /* đã hủy */ } }); };
  g.itPage = function (name, fn) {
    it(name, async function () { try { await fn(); } finally { cleanupPages(); } });
  };

  /* ---- Tương phản WCAG ---- */
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
