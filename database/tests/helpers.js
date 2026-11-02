/* Công cụ dùng chung: storage giả, "máy chủ giả" mô phỏng API, môi trường giao diện, tương phản. */
(function (g) {
  var K = { NV: 'dnc:v1:nhanVien', DN: 'dnc:v1:deNghi', SESSION: 'dnc:v1:session', ACK: 'dnc:v1:ui:ack' };
  g.K = K;
  function FakeStorage() { this.m = {}; this.failSet = false; this.failGet = false; }
  FakeStorage.prototype.getItem = function (k) { if (this.failGet) throw new Error('SecurityError'); return Object.prototype.hasOwnProperty.call(this.m, k) ? this.m[k] : null; };
  FakeStorage.prototype.setItem = function (k, v) { if (this.failSet) throw new Error('SecurityError'); this.m[k] = String(v); };
  FakeStorage.prototype.removeItem = function (k) { delete this.m[k]; };
  g.FakeStorage = FakeStorage;

  g.clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  g.MGR = { vaiTro: 'quan_ly' };
  g.EMP1 = { vaiTro: 'nhan_vien', nhanVienId: 'nv1' };
  g.EMPS = function () {
    return [{ id: 'nv1', ma: 'NV001', hoTen: 'Nguyễn Văn An', hoatDong: true }, { id: 'nv2', ma: 'NV002', hoTen: 'Trần Thị Bình', hoatDong: true },
      { id: 'nv3', ma: 'NV003', hoTen: 'Lê Hoàng Cường', hoatDong: true }, { id: 'nv4', ma: 'NV004', hoTen: 'Phạm Thu Dung', hoatDong: false }];
  };
  var rseq = 0;
  g.req = function (o) {
    rseq++;
    return { id: o.id || 'r' + rseq, nhanVienId: o.nv || 'nv1', nhaCungCap: 'Món ' + rseq, danhMuc: o.dm || 'thiet_bi', soLuong: o.sl == null ? 1 : o.sl, donGia: o.dg == null ? 100000 : o.dg,
      ngay: o.ngay || '2026-11-01', ghiChu: '', trangThai: o.tt || 'cho_duyet', lyDoTuChoi: null, ngayTao: o.ngayTao || '2026-11-01T02:00:00.000Z', ngayXuLy: null };
  };

  /* Dữ liệu mẫu GIỐNG HỆT products.db (server/db.py SEED). */
  g.SEED = [
    ['NV001', 'Nguyễn Văn An', 4850000, '2026-10-28T02:15:00Z', 'Thiết bị', 'da_duyet'], ['NV002', 'Trần Thị Bình', 450000, '2026-10-29T03:30:00Z', 'Văn phòng phẩm', 'da_duyet'],
    ['NV003', 'Lê Hoàng Cường', 1250000, '2026-10-30T07:45:00Z', 'Vận chuyển', 'cho_duyet'], ['NV001', 'Nguyễn Văn An', 120000000, '2026-11-01T01:00:00Z', 'Thiết bị', 'cho_duyet'],
    ['NV004', 'Phạm Thu Dung', 650000, '2026-11-01T04:20:00Z', 'Dịch vụ', 'tu_choi'], ['NV005', 'Đỗ Minh Khôi', 2400000, '2026-11-01T08:05:00Z', 'Tiếp khách', 'da_duyet'],
    ['NV002', 'Trần Thị Bình', 135500000, '2026-11-02T02:00:00Z', 'Vật tư', 'da_duyet'], ['NV003', 'Lê Hoàng Cường', 99999999, '2026-11-02T03:10:00Z', 'Dịch vụ', 'cho_duyet'],
    ['NV005', 'Đỗ Minh Khôi', 100000000, '2026-11-02T05:40:00Z', 'Thiết bị', 'da_duyet']
  ];
  g.seedRows = function () {
    return g.SEED.map(function (r, i) { return { id: i + 1, ma_nhan_vien: r[0], ten_nhan_vien: r[1], so_tien: r[2], thoi_gian: r[3], phan_loai_chi: r[4], trang_thai: r[5], ma_de_nghi: null }; });
  };

  /* Máy chủ giả: mô phỏng API (đúng định dạng, mã trạng thái và kiểm tra hợp lệ chính). */
  g.fakeApi = function (initial) {
    var rows = (initial || seedRows()).map(clone), nextId = rows.reduce(function (m, r) { return Math.max(m, r.id); }, 0) + 1;
    var api = { rows: rows, calls: [], down: false, html: false, status: 0, delay: 0, base: 'http://fake/api/' };
    var CATS = ['Văn phòng phẩm', 'Vật tư', 'Thiết bị', 'Vận chuyển', 'Tiếp khách', 'Dịch vụ', 'Khác'], ST = ['cho_duyet', 'da_duyet', 'tu_choi'];
    function respond(status, body) {
      var text = typeof body === 'string' ? body : JSON.stringify(body);
      return { ok: status >= 200 && status < 300, status: status, text: function () { return Promise.resolve(text); } };
    }
    function validate(d) {
      var e = {};
      if (!d || typeof d !== 'object') return { _: 'object' };
      if (typeof d.ma_nhan_vien !== 'string' || !d.ma_nhan_vien.trim() || d.ma_nhan_vien.length > 20) e.ma_nhan_vien = 'x';
      if (typeof d.ten_nhan_vien !== 'string' || !d.ten_nhan_vien.trim() || d.ten_nhan_vien.length > 60) e.ten_nhan_vien = 'x';
      if (!Number.isInteger(d.so_tien) || d.so_tien < 0) e.so_tien = 'x';
      if (typeof d.thoi_gian !== 'string' || isNaN(new Date(d.thoi_gian).getTime())) e.thoi_gian = 'x';
      if (CATS.indexOf(d.phan_loai_chi) < 0) e.phan_loai_chi = 'x';
      if (ST.indexOf(d.trang_thai == null ? 'cho_duyet' : d.trang_thai) < 0) e.trang_thai = 'x';
      return e;
    }
    function upsert(d) {
      var row = null;
      if (d.ma_de_nghi != null) rows.forEach(function (r) { if (r.ma_de_nghi === d.ma_de_nghi) row = r; });
      var vals = { ma_nhan_vien: d.ma_nhan_vien.trim(), ten_nhan_vien: d.ten_nhan_vien, so_tien: d.so_tien, thoi_gian: d.thoi_gian, phan_loai_chi: d.phan_loai_chi, trang_thai: d.trang_thai || 'cho_duyet' };
      if (row) { Object.assign(row, vals); return { row: row, created: false }; }
      row = Object.assign({ id: nextId++, ma_de_nghi: d.ma_de_nghi == null ? null : d.ma_de_nghi }, vals); rows.push(row); return { row: row, created: true };
    }
    api.fetch = function (url, init) {
      init = init || {};
      var method = (init.method || 'GET').toUpperCase(), path = url.replace(api.base, ''), body = init.body ? JSON.parse(init.body) : undefined;
      api.calls.push({ method: method, path: path, body: body, headers: init.headers });
      var run = function () {
        if (api.down) return Promise.reject(new TypeError('Failed to fetch'));
        if (api.html) return Promise.resolve(respond(404, '<!doctype html><title>404</title>'));
        if (api.status) return Promise.resolve(respond(api.status, { error: 'server_error', message: 'Lỗi máy chủ giả' }));
        if (method === 'GET' && path === 'health') return Promise.resolve(respond(200, { ok: true, db: 'products.db', count: rows.length }));
        if (method === 'GET' && path.indexOf('products') === 0 && path.indexOf('products/') !== 0) {
          var m = /trang_thai=([^&]+)/.exec(path), f = m ? decodeURIComponent(m[1]) : null;
          if (f && ST.indexOf(f) < 0) return Promise.resolve(respond(400, { error: 'invalid', message: 'bad filter' }));
          var items = rows.filter(function (r) { return !f || r.trang_thai === f; }).slice().sort(function (a, b) { return a.thoi_gian < b.thoi_gian ? 1 : a.thoi_gian > b.thoi_gian ? -1 : b.id - a.id; }).map(clone);
          return Promise.resolve(respond(200, { items: items, meta: { count: items.length } }));
        }
        if (method === 'POST' && path === 'products') {
          var er = validate(body); if (Object.keys(er).length) return Promise.resolve(respond(400, { error: 'invalid', message: 'Dữ liệu không hợp lệ', details: er }));
          var u = upsert(body); return Promise.resolve(respond(u.created ? 201 : 200, { item: clone(u.row), created: u.created }));
        }
        if (method === 'POST' && path === 'products/bulk') {
          if (!body || !Array.isArray(body.items)) return Promise.resolve(respond(400, { error: 'invalid', message: 'items', details: { items: 'x' } }));
          var errs = {}; body.items.forEach(function (d, i) { var e = validate(d); Object.keys(e).forEach(function (k) { errs['items[' + i + '].' + k] = 'x'; }); });
          if (Object.keys(errs).length) return Promise.resolve(respond(400, { error: 'invalid', message: 'Dữ liệu không hợp lệ', details: errs }));
          var c = 0, up = 0; body.items.forEach(function (d) { var r = upsert(d); if (r.created) c++; else up++; });
          return Promise.resolve(respond(200, { created: c, updated: up }));
        }
        var pm = /^products\/(\d+)$/.exec(path);
        if (method === 'PATCH' && pm) {
          var row = rows.filter(function (r) { return r.id === +pm[1]; })[0];
          if (!row) return Promise.resolve(respond(404, { error: 'not_found', message: 'Không tìm thấy' }));
          if (!body || ST.indexOf(body.trang_thai) < 0) return Promise.resolve(respond(400, { error: 'invalid', message: 'trang_thai' }));
          row.trang_thai = body.trang_thai; return Promise.resolve(respond(200, { item: clone(row) }));
        }
        return Promise.resolve(respond(404, { error: 'not_found', message: 'Không có đường dẫn API này' }));
      };
      return api.delay ? new Promise(function (res) { setTimeout(function () { res(run()); }, api.delay); }) : run();
    };
    api.client = function () { return DncDb.createClient({ fetch: api.fetch, base: api.base }); };
    api.byReq = function (id) { return rows.filter(function (r) { return r.ma_de_nghi === id; })[0]; };
    api.bulkCalls = function () { return api.calls.filter(function (c) { return c.path === 'products/bulk'; }); };
    return api;
  };

  /* Chờ điều kiện đúng (thời gian thật, cho test gọi mạng thật). */
  g.until = async function (fn, ms) {
    var end = Date.now() + (ms || 4000);
    while (Date.now() < end) { var v = await fn(); if (v) return v; await tick(25); }
    return await fn();
  };

  /* ---- Giao diện panel ---- */
  var mounted = [];
  g.mountPanel = function (o) {
    o = o || {};
    var api = o.api || fakeApi(o.rows), box = document.createElement('div'); document.body.appendChild(box);
    var ctrl = DncDbPanel.mount(box, { client: o.client || api.client(), sync: o.sync, session: o.session === undefined ? MGR : o.session });
    var h = { box: box, ctrl: ctrl, api: api };
    h.q = function (s) { return box.querySelector(s); };
    h.qa = function (s) { return Array.prototype.slice.call(box.querySelectorAll(s)); };
    h.text = function (s) { var e = box.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    h.ids = function () { return h.qa('tbody tr[data-id]').map(function (r) { return +r.getAttribute('data-id'); }); };
    h.row = function (id) { return box.querySelector('tbody tr[data-id="' + id + '"]'); };
    h.filter = function (k) { h.q('[data-filter="' + k + '"]').click(); };
    h.sort = function (k) { var s = h.q('[data-role="sort"]'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true })); };
    h.destroy = function () { ctrl.destroy(); if (box.parentNode) box.parentNode.removeChild(box); };
    mounted.push(h);
    return h;
  };
  g.cleanupPanels = function () { mounted.splice(0).forEach(function (h) { try { h.destroy(); } catch (e) { /* đã hủy */ } }); };
  g.itPanel = function (name, fn) { it(name, async function () { try { await fn(); } finally { cleanupPanels(); } }); };

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

/* Bộ điều hợp địa chỉ trong bộ nhớ (dùng cho test tích hợp với khung ứng dụng). */
window.memNav = function (initial) {
  var path = initial || '/', ls = [], n = {};
  n.get = function () { return path; };
  n.set = function (p) { path = p; ls.slice().forEach(function (f) { f(); }); };
  n.listen = function (cb) { ls.push(cb); return function () { ls = ls.filter(function (f) { return f !== cb; }); }; };
  return n;
};
