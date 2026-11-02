/* Công cụ dùng chung cho test: storage giả, dữ liệu mẫu, môi trường form. */
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
  FakeStorage.prototype.removeItem = function (k) { delete this.m[k]; };
  g.FakeStorage = FakeStorage;

  g.quotaError = function () { var e = new Error('quota'); e.name = 'QuotaExceededError'; return e; };

  g.NV = [
    { id: 'nv1', ma: 'NV001', hoTen: 'Nguyễn Văn An', hoatDong: true },
    { id: 'nv2', ma: 'NV002', hoTen: 'Trần Thị Bình', hoatDong: true },
    { id: 'nv3', ma: 'NV003', hoTen: 'Lê Hoàng Cường', hoatDong: false }
  ];
  g.NOW = new Date(2026, 10, 2, 9, 30).getTime(); // 02/11/2026 09:30 (giờ địa phương)
  g.TODAY = '2026-11-02';

  g.makeStore = function (o) {
    o = o || {};
    var st = new FakeStorage();
    if (o.nhanVien !== null) st.setItem(DncStore.KEY_NV, JSON.stringify(o.nhanVien || NV));
    if (o.deNghi) st.setItem(DncStore.KEY_DN, JSON.stringify(o.deNghi));
    st.sets = 0;
    var n = 0;
    var store = DncStore.create({ storage: st, now: function () { return g.NOW; }, uid: function () { return 'u' + (++n); } });
    return { storage: st, store: store };
  };

  g.sample = function (over) {
    var r = { nhanVienId: 'nv1', nhaCungCap: 'Giấy A4', danhMuc: 'van_phong_pham', soLuong: 10, donGia: 45000, ngay: '2026-11-01', ghiChu: '' };
    for (var k in over) r[k] = over[k];
    return r;
  };

  /* ---- Môi trường giao diện ---- */
  var mounted = [];
  g.mountForm = function (o) {
    o = o || {};
    var env = o.env || makeStore(o);
    var box = document.createElement('div');
    box.style.cssText = 'width:420px;margin:0;';
    document.body.appendChild(box);
    var calls = { saved: [], cancel: 0, events: [] };
    var listener = function (e) { calls.events.push(e.detail); };
    document.addEventListener('dnc:data-changed', listener);
    var ctrl = DncEntry.mount(box, {
      store: o.wrapStore ? o.wrapStore(env.store) : env.store,
      session: o.session === undefined ? null : o.session,
      mode: o.mode, id: o.id, today: TODAY,
      onSaved: function (it) { calls.saved.push(it); },
      onCancel: o.noCancel ? null : function () { calls.cancel++; }
    });
    var h = { box: box, ctrl: ctrl, env: env, calls: calls };
    h.q = function (s) { return box.querySelector(s); };
    h.qa = function (s) { return Array.prototype.slice.call(box.querySelectorAll(s)); };
    h.f = function (name) { return box.querySelector('[data-field="' + name + '"]'); };
    h.err = function (name) { var p = box.querySelector('[data-err="' + name + '"]'); return p && !p.hidden ? p.textContent : ''; };
    h.type = function (name, val) {
      var el = h.f(name);
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    h.blur = function (name) {
      var el = h.f(name);
      el.focus();
      el.blur();
    };
    h.pick = function (id) {
      var r = box.querySelector('input[type=radio][value="' + id + '"]');
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    };
    h.choose = function (id) {
      var el = h.f('nhanVienId');
      el.value = id;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    h.fillValid = function (over) {
      over = over || {};
      if (!h.f('nhanVienId').disabled) h.choose(over.nv || 'nv1');
      h.type('nhaCungCap', over.ncc || 'Giấy A4 Hồng Hà');
      h.pick(over.dm || 'van_phong_pham');
      h.type('soLuong', over.sl || '10');
      h.type('donGia', over.dg || '45000');
      if (over.ngay) { h.f('ngay').value = over.ngay; h.f('ngay').dispatchEvent(new Event('change', { bubbles: true })); }
      if (over.gc != null) h.type('ghiChu', over.gc);
    };
    h.submit = function () { h.q('[data-act="submit"]').click(); };
    // Phát sự kiện submit thẳng lên form (như phím Enter), bỏ qua việc nút có bị vô hiệu hóa hay không.
    h.fireSubmit = function () {
      var ev = new Event('submit', { bubbles: true, cancelable: true });
      h.q('form').dispatchEvent(ev);
      return ev;
    };
    h.total = function () { return h.q('[data-role="total-val"]').textContent; };
    h.banner = function () { var b = h.q('[data-role="banner"]'); return b && !b.hidden ? b.textContent : ''; };
    h.toastText = function () { var t = h.q('[data-role="toast"]'); return t && t.classList.contains('is-show') ? t.textContent : ''; };
    h.dialog = function () { return h.q('[data-role="dialog-overlay"]'); };
    h.destroy = function () { document.removeEventListener('dnc:data-changed', listener); ctrl.destroy(); if (box.parentNode) box.parentNode.removeChild(box); };
    mounted.push(h);
    return h;
  };
  g.cleanupForms = function () { mounted.splice(0).forEach(function (h) { try { h.destroy(); } catch (e) { /* đã hủy */ } }); };

  /* Chạy bộ test có dọn dẹp sau mỗi ca */
  g.itForm = function (name, fn) {
    it(name, async function () { try { await fn(); } finally { cleanupForms(); } });
  };

  /* ---- Tương phản WCAG ---- */
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function parse(css) {
    var hx = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(css).trim());
    if (hx) return [parseInt(hx[1], 16), parseInt(hx[2], 16), parseInt(hx[3], 16)];
    var m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(css);
    if (!m) throw new Error('Không đọc được màu: ' + css);
    return [+m[1], +m[2], +m[3]];
  }
  g.contrast = function (fg, bg) {
    var a = parse(fg), b = parse(bg);
    var L1 = 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]);
    var L2 = 0.2126 * lin(b[0]) + 0.7152 * lin(b[1]) + 0.0722 * lin(b[2]);
    var hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  };
})(window);
