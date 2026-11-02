/* Sổ Đề Nghị Chi – Module 1: lớp lưu dữ liệu tối thiểu cho form nhập liệu.
 * Đọc danh bạ nhân viên (do module Nhân viên sở hữu, ở đây chỉ ĐỌC) và
 * thêm/sửa đề nghị chi trong localStorage. Mọi hàm trả {ok:true,...} hoặc
 * {ok:false, error} với error ∈ blocked · full · corrupt · invalid · notfound ·
 * locked · forbidden.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./entry-model.js'));
  else root.DncStore = factory(root.DncModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';

  var KEY_NV = 'dnc:v1:nhanVien';
  var KEY_DN = 'dnc:v1:deNghi';

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function isQuota(e) {
    return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 || e.code === 1014);
  }

  function create(opts) {
    opts = opts || {};
    var storage = opts.storage;
    var now = opts.now || function () { return Date.now(); };
    var uid = opts.uid || function () { return Math.random().toString(36).slice(2, 8); };

    function readList(key) {
      var raw;
      try { raw = storage.getItem(key); } catch (e) { return { ok: false, error: 'blocked' }; }
      if (raw == null || raw === '') return { ok: true, data: [] };
      var data;
      try { data = JSON.parse(raw); } catch (e) { return { ok: false, error: 'corrupt' }; }
      if (!Array.isArray(data)) return { ok: false, error: 'corrupt' };
      return { ok: true, data: data };
    }

    function writeList(key, list) {
      try { storage.setItem(key, JSON.stringify(list)); } catch (e) {
        return { ok: false, error: isQuota(e) ? 'full' : 'blocked' };
      }
      return { ok: true };
    }

    function newId(list) {
      var id;
      do { id = 'dn_' + now().toString(36) + '_' + uid(); } while (list.some(function (x) { return x && x.id === id; }));
      return id;
    }

    /* Nhân viên đang hoạt động (+ includeId dù đã ngưng, dùng khi sửa khoản cũ). */
    function listNhanVien(o) {
      var includeId = o && o.includeId;
      var r = readList(KEY_NV);
      if (!r.ok) return r;
      var seen = {};
      var out = [];
      r.data.forEach(function (x) {
        if (!x || typeof x !== 'object' || !x.id || !x.hoTen) return;
        var id = String(x.id);
        if (seen[id]) return;
        if (x.hoatDong === false && id !== includeId) return;
        seen[id] = true;
        out.push({ id: id, ma: x.ma ? String(x.ma) : '', hoTen: String(x.hoTen), hoatDong: x.hoatDong !== false });
      });
      return { ok: true, data: out };
    }

    function listDeNghi() {
      var r = readList(KEY_DN);
      return r.ok ? { ok: true, data: clone(r.data) } : r;
    }

    function get(id) {
      var r = readList(KEY_DN);
      if (!r.ok) return r;
      for (var i = 0; i < r.data.length; i++) {
        if (r.data[i] && r.data[i].id === id) return { ok: true, item: clone(r.data[i]) };
      }
      return { ok: false, error: 'notfound' };
    }

    function toRaw(v) {
      v = v || {};
      return {
        nhanVienId: v.nhanVienId, nhaCungCap: v.nhaCungCap, danhMuc: v.danhMuc,
        soLuong: v.soLuong == null ? '' : String(v.soLuong),
        donGia: v.donGia == null ? '' : String(v.donGia),
        ngay: v.ngay, ghiChu: v.ghiChu
      };
    }

    function add(value, o) {
      var actorId = o && o.actorId;
      var nv = listNhanVien();
      if (!nv.ok) return nv;
      var res = M.validate(toRaw(value), {
        today: M.todayStr(new Date(now())),
        nhanVienIds: nv.data.map(function (x) { return x.id; })
      });
      if (!res.ok) return { ok: false, error: 'invalid', errors: res.errors };
      if (actorId && res.value.nhanVienId !== actorId) return { ok: false, error: 'forbidden' };
      var cur = readList(KEY_DN);
      if (!cur.ok) return cur;
      var item = Object.assign({ id: newId(cur.data) }, res.value, {
        trangThai: 'cho_duyet',
        lyDoTuChoi: null,
        ngayTao: new Date(now()).toISOString(),
        ngayXuLy: null
      });
      var w = writeList(KEY_DN, cur.data.concat([item]));
      if (!w.ok) return w;
      return { ok: true, item: clone(item) };
    }

    function update(id, value, o) {
      var actorId = o && o.actorId;
      var cur = readList(KEY_DN);
      if (!cur.ok) return cur;
      var idx = -1;
      for (var i = 0; i < cur.data.length; i++) if (cur.data[i] && cur.data[i].id === id) { idx = i; break; }
      if (idx < 0) return { ok: false, error: 'notfound' };
      var old = cur.data[idx];
      if (old.trangThai !== 'cho_duyet') return { ok: false, error: 'locked' };
      if (actorId && old.nhanVienId !== actorId) return { ok: false, error: 'forbidden' };
      var nv = listNhanVien({ includeId: old.nhanVienId });
      if (!nv.ok) return nv;
      var res = M.validate(toRaw(value), {
        today: M.todayStr(new Date(now())),
        nhanVienIds: nv.data.map(function (x) { return x.id; })
      });
      if (!res.ok) return { ok: false, error: 'invalid', errors: res.errors };
      if (actorId && res.value.nhanVienId !== actorId) return { ok: false, error: 'forbidden' };
      var next = Object.assign({}, old, res.value, { ngayCapNhat: new Date(now()).toISOString() });
      var list = cur.data.slice();
      list[idx] = next;
      var w = writeList(KEY_DN, list);
      if (!w.ok) return w;
      return { ok: true, item: clone(next) };
    }

    return { listNhanVien: listNhanVien, listDeNghi: listDeNghi, get: get, add: add, update: update };
  }

  return { create: create, KEY_NV: KEY_NV, KEY_DN: KEY_DN };
});
