/* Sổ Đề Nghị Chi – Module 4: Nhân viên
 * Logic thuần (không DOM, không storage): kiểm tra mã/họ tên, tìm kiếm không dấu, lọc, sắp xếp,
 * tổng hợp theo nhân viên từ danh sách đề nghị. Chạy được trong trình duyệt và Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DncEmpModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LIMITS = { MA_MAX: 20, TEN_MAX: 60 };
  var MA_RE = /^[A-Z0-9][A-Z0-9._-]*$/;

  function str(x) { return x == null ? '' : String(x); }
  function charLen(s) { return Array.from(s).length; }

  /* ---------- Chuẩn hóa & kiểm tra ---------- */
  function normMa(s) { return str(s).trim().toUpperCase(); }
  function normTen(s) { return str(s).replace(/\s+/g, ' ').trim(); }

  /* input: { ma, hoTen }. ctx: { others: [{id, ma, hoTen}], selfId } — others dùng để kiểm tra mã trùng. */
  function validate(input, ctx) {
    input = input || {}; ctx = ctx || {};
    var errors = {}, v = {};
    var ma = normMa(input.ma);
    if (!ma) errors.ma = 'Nhập mã nhân viên';
    else if (charLen(ma) > LIMITS.MA_MAX) errors.ma = 'Tối đa ' + LIMITS.MA_MAX + ' ký tự (đang nhập ' + charLen(ma) + ')';
    else if (!MA_RE.test(ma)) errors.ma = 'Mã chỉ gồm chữ cái không dấu, số và các dấu . _ -';
    else {
      var clash = null;
      (ctx.others || []).forEach(function (o) {
        if (o && o.id !== ctx.selfId && normMa(o.ma) === ma && !clash) clash = o;
      });
      if (clash) errors.ma = 'Mã này đã được dùng bởi ' + (clash.hoTen || 'nhân viên khác');
      else v.ma = ma;
    }
    var ten = normTen(input.hoTen);
    if (!ten) errors.hoTen = 'Nhập họ và tên';
    else if (/[\u0000-\u001f\u007f]/.test(ten)) errors.hoTen = 'Họ tên có ký tự không hợp lệ';
    else if (charLen(ten) > LIMITS.TEN_MAX) errors.hoTen = 'Tối đa ' + LIMITS.TEN_MAX + ' ký tự (đang nhập ' + charLen(ten) + ')';
    else v.hoTen = ten;
    var ok = !errors.ma && !errors.hoTen;
    return { ok: ok, errors: errors, value: ok ? v : null };
  }

  /* ---------- Tìm kiếm không dấu ---------- */
  function fold(s) {
    return str(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
  }
  function matches(emp, q) {
    var tokens = fold(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    var hay = fold(emp.ma + ' ' + emp.hoTen);
    return tokens.every(function (t) { return hay.indexOf(t) >= 0; });
  }

  /* ---------- Tổng hợp theo nhân viên từ danh sách đề nghị ---------- */
  function amountOf(it) {
    if (!it || typeof it.soLuong !== 'number' || typeof it.donGia !== 'number') return NaN;
    if (!isFinite(it.soLuong) || !isFinite(it.donGia) || it.soLuong < 0 || it.donGia < 0) return NaN;
    if (it.donGia % 1 !== 0 || it.donGia > 1e12) return NaN;
    var milli = Math.round(it.soLuong * 1000);
    if (milli > 1e12) return NaN;
    return Number((BigInt(milli) * BigInt(it.donGia) + 500n) / 1000n);
  }
  /* Trả bảng tra id → { count, pending, rejected, approved:{count,total} }.
   * `count` đếm MỌI đề nghị tham chiếu nhân viên (kể cả dữ liệu lỗi) để quy tắc "không xóa" luôn an toàn;
   * số tiền chỉ cộng các khoản hợp lệ. */
  function requestStats(items) {
    var map = {}, sums = {};
    (Array.isArray(items) ? items : []).forEach(function (it) {
      if (!it || typeof it !== 'object' || it.nhanVienId == null || it.nhanVienId === '') return;
      var id = String(it.nhanVienId);
      var e = map[id] || (map[id] = { count: 0, pending: 0, rejected: 0, approved: { count: 0, total: 0 } });
      e.count++;
      if (it.trangThai === 'cho_duyet') e.pending++;
      else if (it.trangThai === 'tu_choi') e.rejected++;
      else if (it.trangThai === 'da_duyet') {
        e.approved.count++;
        var a = amountOf(it);
        if (isFinite(a)) sums[id] = (sums[id] || 0n) + BigInt(a);
      }
    });
    Object.keys(map).forEach(function (id) { map[id].approved.total = Number(sums[id] || 0n); });
    return map;
  }
  var EMPTY_STATS = { count: 0, pending: 0, rejected: 0, approved: { count: 0, total: 0 } };
  function statsOf(map, id) { return (map && map[id]) || EMPTY_STATS; }

  /* ---------- Lọc & sắp xếp ---------- */
  function filter(list, f) {
    f = f || {};
    return list.filter(function (e) {
      if (f.status === 'active' && !e.hoatDong) return false;
      if (f.status === 'inactive' && e.hoatDong) return false;
      return matches(e, f.q);
    });
  }
  function counts(list) {
    var active = list.filter(function (e) { return e.hoatDong; }).length;
    return { total: list.length, active: active, inactive: list.length - active };
  }
  /* Tên gọi (từ cuối) để sắp xếp A–Z theo cách người Việt: An, Bình, Cường… */
  function givenName(name) {
    var w = normTen(name).split(' ');
    return w[w.length - 1] || '';
  }
  function cmpVi(a, b) { return a.localeCompare(b, 'vi'); }
  var SORTS = {
    ten: function (a, b) { return cmpVi(givenName(a.hoTen), givenName(b.hoTen)) || cmpVi(a.hoTen, b.hoTen) || cmpVi(a.ma, b.ma); },
    ma: function (a, b) { return cmpVi(a.ma, b.ma) || cmpVi(a.hoTen, b.hoTen); },
    requests: function (a, b, m) { return statsOf(m, b.id).count - statsOf(m, a.id).count || SORTS.ten(a, b); },
    approved: function (a, b, m) { return statsOf(m, b.id).approved.total - statsOf(m, a.id).approved.total || SORTS.ten(a, b); }
  };
  function sort(list, key, statsMap) {
    var fn = SORTS[key] || SORTS.ten;
    return list.slice().sort(function (a, b) { return fn(a, b, statsMap) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
  }

  /* ---------- Định dạng ---------- */
  function groupDigits(d) { return str(d).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function formatVND(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    return (n < 0 ? '-' : '') + groupDigits(String(Math.abs(Math.round(n)))) + ' ₫';
  }
  function initial(name) {
    var w = normTen(name).split(' ').filter(Boolean);
    return w.length ? Array.from(w[w.length - 1])[0].toUpperCase() : '?';
  }
  function colorIndex(key) {
    var h = 0, s = str(key);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 7) + 1;
  }

  return {
    LIMITS: LIMITS, normMa: normMa, normTen: normTen, validate: validate, charLen: charLen,
    fold: fold, matches: matches, amountOf: amountOf, requestStats: requestStats, statsOf: statsOf,
    filter: filter, counts: counts, givenName: givenName, sort: sort, SORT_KEYS: Object.keys(SORTS),
    groupDigits: groupDigits, formatVND: formatVND, initial: initial, colorIndex: colorIndex
  };
});
