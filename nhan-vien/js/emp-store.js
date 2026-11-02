/* Sổ Đề Nghị Chi – Module 4: lớp lưu cho danh bạ nhân viên.
 * Module này SỞ HỮU khóa `dnc:v1:nhanVien` (đọc/ghi) và chỉ ĐỌC `dnc:v1:deNghi` (để thống kê và để chặn xóa).
 * Chỉ vai trò Quản lý được ghi (actor.vaiTro === 'quan_ly'). Mỗi thao tác ghi đúng một lần.
 * Trả {ok:true,...} hoặc {ok:false, error} với error ∈
 *   forbidden · invalid (kèm errors) · notfound · hasRequests (kèm count) · conflict · blocked · full · corrupt
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./emp-model.js'));
  else root.DncEmpStore = factory(root.DncEmpModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';

  var KEY_NV = 'dnc:v1:nhanVien';
  var KEY_DN = 'dnc:v1:deNghi';

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function isQuota(e) {
    return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  }
  function isEmp(x) { return !!x && typeof x === 'object' && !Array.isArray(x) && x.id != null && x.id !== '' && !!x.hoTen; }

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
    function gate(actor) { return actor && actor.vaiTro === 'quan_ly' ? { ok: true } : { ok: false, error: 'forbidden' }; }
    function stamp() { return new Date(now()).toISOString(); }
    function indexOf(list, id) {
      for (var i = 0; i < list.length; i++) if (isEmp(list[i]) && String(list[i].id) === String(id)) return i;
      return -1;
    }
    function view(x) { return { id: String(x.id), ma: x.ma ? String(x.ma) : '', hoTen: String(x.hoTen), hoatDong: x.hoatDong !== false, ngayTao: x.ngayTao || null, ngayCapNhat: x.ngayCapNhat || null }; }
    function others(list, selfId) {
      return list.filter(isEmp).filter(function (x) { return String(x.id) !== String(selfId); }).map(function (x) { return { id: String(x.id), ma: x.ma ? String(x.ma) : '', hoTen: String(x.hoTen) }; });
    }
    function newId(list) {
      var id;
      do { id = 'nv_' + now().toString(36) + '_' + uid(); } while (indexOf(list, id) >= 0);
      return id;
    }

    /* Danh bạ (hợp lệ, không trùng id) — dùng cho giao diện. */
    function list() {
      var r = readList(KEY_NV);
      if (!r.ok) return r;
      var seen = {}, out = [];
      r.data.forEach(function (x) {
        if (!isEmp(x)) return;
        var id = String(x.id);
        if (seen[id]) return;
        seen[id] = true;
        out.push(view(x));
      });
      return { ok: true, data: out };
    }

    /* Thống kê đề nghị theo nhân viên (chỉ đọc). */
    function requestStats() {
      var r = readList(KEY_DN);
      if (!r.ok) return r;
      return { ok: true, data: M.requestStats(r.data) };
    }

    function add(input, actor) {
      var g = gate(actor); if (!g.ok) return g;
      var cur = readList(KEY_NV); if (!cur.ok) return cur;
      var v = M.validate(input, { others: others(cur.data) });
      if (!v.ok) return { ok: false, error: 'invalid', errors: v.errors };
      var t = stamp();
      var item = { id: newId(cur.data), ma: v.value.ma, hoTen: v.value.hoTen, hoatDong: true, ngayTao: t, ngayCapNhat: t };
      var w = writeList(KEY_NV, cur.data.concat([item]));
      if (!w.ok) return w;
      return { ok: true, item: view(item) };
    }

    function update(id, input, actor) {
      var g = gate(actor); if (!g.ok) return g;
      var cur = readList(KEY_NV); if (!cur.ok) return cur;
      var i = indexOf(cur.data, id);
      if (i < 0) return { ok: false, error: 'notfound' };
      var v = M.validate(input, { others: others(cur.data, id), selfId: id });
      if (!v.ok) return { ok: false, error: 'invalid', errors: v.errors };
      var hoatDong = input && typeof input.hoatDong === 'boolean' ? input.hoatDong : cur.data[i].hoatDong !== false;
      var next = Object.assign({}, cur.data[i], { ma: v.value.ma, hoTen: v.value.hoTen, hoatDong: hoatDong, ngayCapNhat: stamp() });
      var l = cur.data.slice(); l[i] = next;
      var w = writeList(KEY_NV, l);
      if (!w.ok) return w;
      return { ok: true, item: view(next) };
    }

    /* Xóa: chỉ khi chưa có đề nghị nào tham chiếu. Trả token để hoàn tác. */
    function remove(id, actor) {
      var g = gate(actor); if (!g.ok) return g;
      var cur = readList(KEY_NV); if (!cur.ok) return cur;
      var i = indexOf(cur.data, id);
      if (i < 0) return { ok: false, error: 'notfound' };
      var rs = requestStats(); if (!rs.ok) return rs; // không kiểm tra được thì không cho xóa
      var n = M.statsOf(rs.data, String(cur.data[i].id)).count;
      if (n > 0) return { ok: false, error: 'hasRequests', count: n };
      var removed = cur.data[i];
      var l = cur.data.slice(); l.splice(i, 1);
      var w = writeList(KEY_NV, l);
      if (!w.ok) return w;
      return { ok: true, item: view(removed), undo: { record: clone(removed), index: i } };
    }

    /* Hoàn tác xóa: chèn lại đúng vị trí cũ, trừ khi mã/id đã bị chiếm. */
    function restore(token, actor) {
      var g = gate(actor); if (!g.ok) return g;
      if (!token || !isEmp(token.record)) return { ok: false, error: 'invalid', errors: {} };
      var cur = readList(KEY_NV); if (!cur.ok) return cur;
      if (indexOf(cur.data, token.record.id) >= 0) return { ok: false, error: 'conflict' };
      var v = M.validate({ ma: token.record.ma, hoTen: token.record.hoTen }, { others: others(cur.data) });
      if (!v.ok && v.errors.ma && /đã được dùng/.test(v.errors.ma)) return { ok: false, error: 'conflict' };
      var l = cur.data.slice();
      var at = Math.max(0, Math.min(token.index | 0, l.length));
      l.splice(at, 0, token.record);
      var w = writeList(KEY_NV, l);
      if (!w.ok) return w;
      return { ok: true, item: view(token.record) };
    }

    return { list: list, requestStats: requestStats, add: add, update: update, remove: remove, restore: restore };
  }

  return { create: create, KEY_NV: KEY_NV, KEY_DN: KEY_DN };
});
