/* Công cụ dùng chung cho test module Thống kê. */
(function (g) {
  function FakeStorage() { this.m = {}; this.failGet = false; }
  FakeStorage.prototype.getItem = function (k) {
    if (this.failGet) throw new Error('SecurityError');
    return Object.prototype.hasOwnProperty.call(this.m, k) ? this.m[k] : null;
  };
  FakeStorage.prototype.setItem = function (k, v) { this.m[k] = String(v); };
  g.FakeStorage = FakeStorage;

  g.TODAY = '2026-11-02';
  g.MGR = { vaiTro: 'quan_ly' };
  g.emp = function (id) { return { vaiTro: 'nhan_vien', nhanVienId: id }; };

  g.NV = [
    { id: 'nv1', ma: 'NV001', hoTen: 'Nguyễn Văn An', hoatDong: true },
    { id: 'nv2', ma: 'NV002', hoTen: 'Trần Thị Bình', hoatDong: true },
    { id: 'nv3', ma: 'NV003', hoTen: 'Lê Hoàng Cường', hoatDong: true },
    { id: 'nv4', ma: 'NV004', hoTen: 'Phạm Thu Dung', hoatDong: false }
  ];

  var seq = 0;
  /* Khoản đề nghị. `h` = số giờ từ lúc gửi đến lúc xử lý (nếu đã xử lý). */
  g.mk = function (o) {
    seq++;
    var d = o.ngay || '2026-11-01';
    var created = o.created || new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), 9, 0);
    var x = {
      id: o.id || ('x' + seq), nhanVienId: o.nv || 'nv1', nhaCungCap: o.ncc || ('Món ' + seq), danhMuc: o.dm || 'van_phong_pham',
      soLuong: o.sl == null ? 1 : o.sl, donGia: o.dg == null ? 100000 : o.dg, ngay: d, ghiChu: '',
      trangThai: o.tt || 'da_duyet', lyDoTuChoi: null, ngayTao: created.toISOString(), ngayXuLy: null
    };
    if (x.trangThai !== 'cho_duyet') x.ngayXuLy = new Date(created.getTime() + (o.h == null ? 10 : o.h) * 3600000).toISOString();
    return x;
  };

  /* Bộ dữ liệu chuẩn có đáp án tính tay (xem README/test). */
  g.DS = function () {
    return [
      // Tháng 11/2026
      mk({ id: 'a1', ngay: '2026-11-01', nv: 'nv1', dm: 'thiet_bi', sl: 1, dg: 4850000, ncc: 'Máy in Canon', h: 24 }),
      mk({ id: 'a2', ngay: '2026-11-01', nv: 'nv2', dm: 'van_phong_pham', sl: 10, dg: 45000, ncc: 'Giấy A4', h: 12 }),
      mk({ id: 'a3', ngay: '2026-11-02', nv: 'nv1', dm: 'van_chuyen', sl: 1, dg: 1250000, ncc: 'Cước vận chuyển', h: 36 }),
      mk({ id: 'a4', ngay: '2026-11-02', nv: 'nv3', dm: 'tiep_khach', sl: 6, dg: 120000, ncc: 'Tiếp khách đối tác', tt: 'cho_duyet' }),
      mk({ id: 'a5', ngay: '2026-11-02', nv: 'nv2', dm: 'dich_vu', sl: 3, dg: 650000, ncc: 'Bảo trì điều hòa', tt: 'tu_choi', h: 6 }),
      mk({ id: 'a6', ngay: '2026-11-01', nv: 'nv1', dm: 'van_phong_pham', sl: 5, dg: 45000, ncc: 'giấy a4', h: 18 }),
      // Tháng 10/2026
      mk({ id: 'b1', ngay: '2026-10-15', nv: 'nv1', dm: 'thiet_bi', sl: 1, dg: 2000000, ncc: 'Máy in Canon' }),
      mk({ id: 'b2', ngay: '2026-10-20', nv: 'nv2', dm: 'van_chuyen', sl: 1, dg: 1000000 }),
      mk({ id: 'b3', ngay: '2026-10-21', nv: 'nv4', dm: 'van_phong_pham', sl: 4, dg: 100000 }),
      mk({ id: 'b4', ngay: '2026-10-25', nv: 'nv3', dm: 'tiep_khach', sl: 2, dg: 500000 }),
      // Tháng 9/2026
      mk({ id: 'c1', ngay: '2026-09-10', nv: 'nv1', dm: 'dich_vu', sl: 1, dg: 3000000 })
    ];
  };

  g.makeEnv = function (o) {
    o = o || {};
    var st = new FakeStorage();
    if (o.nhanVien !== null) st.m[DncStatsStore.KEY_NV] = JSON.stringify(o.nhanVien || NV);
    if (o.deNghi !== null) st.m[DncStatsStore.KEY_DN] = JSON.stringify(o.deNghi || DS());
    return { storage: st, store: DncStatsStore.create({ storage: st }) };
  };

  /* ---- Môi trường giao diện ---- */
  var mounted = [];
  g.mountStats = function (o) {
    o = o || {};
    var env = o.env || makeEnv(o);
    var box = document.createElement('div');
    document.body.appendChild(box);
    var calls = { forbidden: 0 };
    var ctrl = DncStats.mount(box, {
      store: env.store, session: o.session === undefined ? MGR : o.session, today: TODAY, month: o.month, range: o.range,
      onForbidden: function () { calls.forbidden++; }
    });
    var h = { box: box, ctrl: ctrl, env: env, calls: calls };
    h.q = function (s) { return box.querySelector(s); };
    h.qa = function (s) { return Array.prototype.slice.call(box.querySelectorAll(s)); };
    h.text = function (s) { var e = box.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    h.month = function () { return h.text('[data-role="month-label"]'); };
    h.highlights = function () { return h.qa('[data-role="highlights"] li').map(function (l) { return l.textContent; }); };
    h.kpi = function (k) { return h.text('[data-role="kpi-' + k + '"]'); };
    h.metric = function (k) { return h.text('[data-metric="' + k + '"] [data-role="metric-val"]'); };
    h.slices = function () { return h.qa('.dst-slice'); };
    h.legend = function () { return h.qa('[data-legend]').map(function (l) { return l.getAttribute('data-legend'); }); };
    h.cols = function () { return h.qa('.dst-col'); };
    h.cmpRows = function () { return h.qa('tr[data-cat]').map(function (r) { return r.getAttribute('data-cat'); }); };
    h.tableRows = function () { return h.qa('[data-card="emp-table"] tbody tr[data-nv]').map(function (r) { return r.getAttribute('data-nv'); }); };
    h.filter = function (id) { var s = h.q('[data-filter="nv"]'); s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); };
    h.tip = function () { var t = h.q('[data-role="tip"]'); return t && !t.hidden ? t.textContent : ''; };
    h.destroy = function () { ctrl.destroy(); if (box.parentNode) box.parentNode.removeChild(box); };
    mounted.push(h);
    return h;
  };
  g.cleanupStats = function () { mounted.splice(0).forEach(function (h) { try { h.destroy(); } catch (e) { /* đã hủy */ } }); };
  g.itStats = function (name, fn) {
    it(name, async function () { try { await fn(); } finally { cleanupStats(); } });
  };

  /* Bộ sinh số ngẫu nhiên có hạt giống (để test ngẫu nhiên tái lập được). */
  g.rng = function (seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
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
  /* Màu nền thực sự của một phần tử: đi ngược lên cha cho tới khi gặp nền không trong suốt. */
  g.effBg = function (el) {
    while (el) {
      var c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
      el = el.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  g.cssVar = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
})(window);
