/* Sổ Đề Nghị Chi – Module 3: lớp đọc dữ liệu cho thống kê (CHỈ ĐỌC, không ghi gì).
 * Trả {ok:true,data} hoặc {ok:false,error} với error ∈ blocked · corrupt.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DncStatsStore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEY_NV = 'dnc:v1:nhanVien';
  var KEY_DN = 'dnc:v1:deNghi';

  function create(opts) {
    var storage = (opts || {}).storage;

    function readList(key) {
      var raw;
      try { raw = storage.getItem(key); } catch (e) { return { ok: false, error: 'blocked' }; }
      if (raw == null || raw === '') return { ok: true, data: [] };
      var data;
      try { data = JSON.parse(raw); } catch (e) { return { ok: false, error: 'corrupt' }; }
      if (!Array.isArray(data)) return { ok: false, error: 'corrupt' };
      return { ok: true, data: data };
    }

    /* Mọi nhân viên (kể cả đã ngưng) với cờ hoatDong. */
    function listNhanVien() {
      var r = readList(KEY_NV);
      if (!r.ok) return r;
      var seen = {}, out = [];
      r.data.forEach(function (x) {
        if (!x || typeof x !== 'object' || !x.id || !x.hoTen) return;
        var id = String(x.id);
        if (seen[id]) return;
        seen[id] = true;
        out.push({ id: id, ma: x.ma ? String(x.ma) : '', hoTen: String(x.hoTen), hoatDong: x.hoatDong !== false });
      });
      return { ok: true, data: out };
    }

    /* Trả bản sao thô của các đề nghị; việc loại bỏ khoản hỏng do DncStatsModel.prepare đảm nhiệm. */
    function listDeNghi() {
      var r = readList(KEY_DN);
      return r.ok ? { ok: true, data: JSON.parse(JSON.stringify(r.data)) } : r;
    }

    return { listNhanVien: listNhanVien, listDeNghi: listDeNghi };
  }

  return { create: create, KEY_NV: KEY_NV, KEY_DN: KEY_DN };
});
