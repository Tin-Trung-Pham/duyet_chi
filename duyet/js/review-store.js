/* Sổ Đề Nghị Chi – Module 2: lớp lưu cho việc duyệt.
 * Đọc danh bạ nhân viên (chỉ đọc) và đổi trạng thái đề nghị trong `dnc:v1:deNghi`.
 * Chỉ vai trò Quản lý được phép (actor.vaiTro === 'quan_ly'). Mọi hàm ghi chỉ ghi MỘT lần (nguyên tử).
 * Trả {ok:true,...} hoặc {ok:false, error} với error ∈
 *   forbidden · invalid · notfound · processed · nothing · blocked · full · corrupt
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./review-model.js'));
  else root.DncReviewStore = factory(root.DncReviewModel);
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';

  var KEY_NV = 'dnc:v1:nhanVien';
  var KEY_DN = 'dnc:v1:deNghi';

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function isQuota(e) {
    return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  }

  function create(opts) {
    opts = opts || {};
    var storage = opts.storage;
    var now = opts.now || function () { return Date.now(); };

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
    function gate(actor) {
      return actor && actor.vaiTro === 'quan_ly' ? { ok: true } : { ok: false, error: 'forbidden' };
    }
    function indexOf(list, id) {
      for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return i;
      return -1;
    }
    function stamp() { return new Date(now()).toISOString(); }

    /* Mọi nhân viên (kể cả đã ngưng) để hiển thị tên trên khoản cũ. */
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

    function listDeNghi() {
      var r = readList(KEY_DN);
      if (!r.ok) return r;
      return { ok: true, data: clone(r.data.filter(function (x) { return x && typeof x === 'object' && x.id; })) };
    }

    /* Áp dụng thay đổi cho các khoản đang Chờ duyệt; ghi một lần. */
    function applyTo(ids, build, actor) {
      var g = gate(actor);
      if (!g.ok) return g;
      var cur = readList(KEY_DN);
      if (!cur.ok) return cur;
      var list = cur.data.slice();
      var done = [], skipped = [], entries = [];
      var seen = {};
      ids.forEach(function (id) {
        if (seen[id]) return;
        seen[id] = true;
        var i = indexOf(list, id);
        if (i < 0) { skipped.push({ id: id, reason: 'notfound' }); return; }
        if (list[i].trangThai !== R.TRANG_THAI.CHO) { skipped.push({ id: id, reason: 'processed' }); return; }
        var next = build(list[i]);
        list[i] = next;
        done.push(id);
        entries.push({ id: id, trangThai: next.trangThai, ngayXuLy: next.ngayXuLy });
      });
      if (!done.length) {
        var only = skipped.length === 1 ? skipped[0].reason : 'nothing';
        return { ok: false, error: only, skipped: skipped };
      }
      var w = writeList(KEY_DN, list);
      if (!w.ok) return w;
      var items = done.map(function (id) { return clone(list[indexOf(list, id)]); });
      return { ok: true, done: done, items: items, skipped: skipped, undo: { entries: entries } };
    }

    function approve(id, actor) {
      var ts = stamp();
      var r = applyTo([id], function (it) {
        return Object.assign({}, it, { trangThai: R.TRANG_THAI.DUYET, lyDoTuChoi: null, ngayXuLy: ts, nguoiXuLy: 'quan_ly' });
      }, actor);
      if (r.ok) r.item = r.items[0];
      return r;
    }

    function reject(id, lyDo, actor) {
      var g = gate(actor);
      if (!g.ok) return g;
      var v = R.validateLyDo(lyDo);
      if (!v.ok) return { ok: false, error: 'invalid', message: v.message };
      var ts = stamp();
      var r = applyTo([id], function (it) {
        return Object.assign({}, it, { trangThai: R.TRANG_THAI.TU_CHOI, lyDoTuChoi: v.value, ngayXuLy: ts, nguoiXuLy: 'quan_ly' });
      }, actor);
      if (r.ok) r.item = r.items[0];
      return r;
    }

    function approveMany(ids, actor) {
      var g = gate(actor);
      if (!g.ok) return g;
      if (!Array.isArray(ids) || !ids.length) return { ok: false, error: 'invalid', message: 'Chưa chọn khoản nào' };
      var ts = stamp();
      return applyTo(ids, function (it) {
        return Object.assign({}, it, { trangThai: R.TRANG_THAI.DUYET, lyDoTuChoi: null, ngayXuLy: ts, nguoiXuLy: 'quan_ly' });
      }, actor);
    }

    /* Hoàn tác: đưa về Chờ duyệt, chỉ với khoản chưa bị thay đổi kể từ lần xử lý đó. */
    function undo(token, actor) {
      var g = gate(actor);
      if (!g.ok) return g;
      if (!token || !Array.isArray(token.entries) || !token.entries.length) return { ok: false, error: 'invalid', message: 'Không có gì để hoàn tác' };
      var cur = readList(KEY_DN);
      if (!cur.ok) return cur;
      var list = cur.data.slice();
      var reverted = [], skipped = [];
      token.entries.forEach(function (e) {
        var i = indexOf(list, e.id);
        if (i < 0) { skipped.push(e.id); return; }
        var it = list[i];
        if (it.trangThai !== e.trangThai || it.ngayXuLy !== e.ngayXuLy) { skipped.push(e.id); return; }
        var next = Object.assign({}, it, { trangThai: R.TRANG_THAI.CHO, lyDoTuChoi: null, ngayXuLy: null });
        delete next.nguoiXuLy;
        list[i] = next;
        reverted.push(e.id);
      });
      if (!reverted.length) return { ok: false, error: 'nothing', skipped: skipped };
      var w = writeList(KEY_DN, list);
      if (!w.ok) return w;
      return { ok: true, reverted: reverted, skipped: skipped };
    }

    return { listNhanVien: listNhanVien, listDeNghi: listDeNghi, approve: approve, reject: reject, approveMany: approveMany, undo: undo };
  }

  return { create: create, KEY_NV: KEY_NV, KEY_DN: KEY_DN };
});
