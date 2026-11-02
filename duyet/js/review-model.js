/* Sổ Đề Nghị Chi – Module 2: Duyệt đề nghị
 * Logic thuần (không DOM, không storage): lọc hàng đợi, tổng hợp, tháng, định dạng, kiểm tra lý do từ chối.
 * Độc lập với module Nhập liệu: chỉ dùng chung hợp đồng dữ liệu `dnc:v1:deNghi` (xem README).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DncReviewModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CHO = 'cho_duyet', DUYET = 'da_duyet', TU_CHOI = 'tu_choi';

  var DANH_MUC = [
    { id: 'van_phong_pham', ten: 'Văn phòng phẩm' },
    { id: 'vat_tu', ten: 'Vật tư' },
    { id: 'thiet_bi', ten: 'Thiết bị' },
    { id: 'van_chuyen', ten: 'Vận chuyển' },
    { id: 'tiep_khach', ten: 'Tiếp khách' },
    { id: 'dich_vu', ten: 'Dịch vụ' },
    { id: 'khac', ten: 'Khác' }
  ];

  var LIMITS = { LY_DO_MAX: 300, WAIT_DAYS: 3, MONTH_MIN: '2000-01' };
  var QUICK_REASONS = ['Vượt ngân sách', 'Chưa rõ nhu cầu', 'Giá chưa hợp lý', 'Cần thêm thông tin'];

  function str(x) { return x == null ? '' : String(x); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function charLen(s) { return Array.from(s).length; }

  function danhMucTen(id) {
    for (var i = 0; i < DANH_MUC.length; i++) if (DANH_MUC[i].id === id) return DANH_MUC[i].ten;
    return 'Khác';
  }

  /* ---------- Số & tiền ---------- */
  function groupDigits(d) { return str(d).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function formatVND(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    return (n < 0 ? '-' : '') + groupDigits(String(Math.abs(Math.round(n)))) + ' ₫';
  }
  function formatSoLuong(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 0) return '—';
    var milli = Math.round(n * 1000);
    var f = pad(milli % 1000, 3).replace(/0+$/, '');
    return groupDigits(String(Math.floor(milli / 1000))) + (f ? ',' + f : '');
  }
  /* Thành tiền = số lượng × đơn giá, làm tròn nửa lên về đồng. NaN nếu dữ liệu hỏng. */
  function thanhTienOf(item) {
    if (!item || typeof item.soLuong !== 'number' || typeof item.donGia !== 'number') return NaN;
    if (!isFinite(item.soLuong) || !isFinite(item.donGia) || item.soLuong < 0 || item.donGia < 0) return NaN;
    if (item.donGia % 1 !== 0 || item.donGia > 1e12) return NaN;
    var milli = Math.round(item.soLuong * 1000);
    if (milli > 1e12) return NaN;
    return Number((BigInt(milli) * BigInt(item.donGia) + 500n) / 1000n);
  }
  function sumThanhTien(list) {
    var t = 0n;
    list.forEach(function (it) {
      var v = thanhTienOf(it);
      if (isFinite(v)) t += BigInt(v);
    });
    return Number(t);
  }

  /* ---------- Ngày / tháng ---------- */
  function todayStr(now) {
    var d = now || new Date();
    return pad(d.getFullYear(), 4) + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }
  function isValidDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
    if (!m) return false;
    var y = +m[1], mo = +m[2], da = +m[3];
    if (y < 1 || mo < 1 || mo > 12 || da < 1) return false;
    var d = new Date(0);
    d.setUTCFullYear(y, mo - 1, da);
    return d.getUTCFullYear() === y && d.getUTCMonth() === mo - 1 && d.getUTCDate() === da;
  }
  function monthOf(dateStr) { return isValidDate(dateStr) ? dateStr.slice(0, 7) : null; }
  function isValidMonth(m) {
    var x = /^(\d{4})-(\d{2})$/.exec(str(m));
    return !!x && +x[1] >= 1 && +x[2] >= 1 && +x[2] <= 12;
  }
  function shiftMonth(m, delta) {
    if (!isValidMonth(m)) return m;
    var y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + delta;
    y += Math.floor(mo / 12);
    mo = ((mo % 12) + 12) % 12;
    return pad(y, 4) + '-' + pad(mo + 1, 2);
  }
  function monthLabel(m) { return isValidMonth(m) ? 'Tháng ' + (+m.slice(5, 7)) + '/' + m.slice(0, 4) : ''; }
  function formatDate(d) { return isValidDate(d) ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '—'; }

  /* Số ngày một khoản đã chờ (tính từ ngày gửi). Từ WAIT_DAYS ngày trở lên → nhãn "Chờ N ngày". */
  function waitInfo(item, today) {
    var t = item && item.ngayTao ? new Date(item.ngayTao) : null;
    if (!t || isNaN(t.getTime()) || !isValidDate(today)) return null;
    var c = todayStr(t);
    var a = Date.UTC(+c.slice(0, 4), +c.slice(5, 7) - 1, +c.slice(8, 10));
    var b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
    var days = Math.round((b - a) / 86400000);
    if (days < LIMITS.WAIT_DAYS) return null;
    return { days: days, label: 'Chờ ' + days + ' ngày' };
  }

  /* ---------- Hàng đợi ---------- */
  function isPending(it) { return !!it && typeof it === 'object' && it.trangThai === CHO; }

  function compareQueue(a, b) {
    if (a.ngay !== b.ngay) return str(a.ngay) < str(b.ngay) ? -1 : 1;
    if (str(a.ngayTao) !== str(b.ngayTao)) return str(a.ngayTao) < str(b.ngayTao) ? -1 : 1;
    return str(a.id) < str(b.id) ? -1 : str(a.id) > str(b.id) ? 1 : 0;
  }

  /* Khoản Chờ duyệt, lọc theo tháng (ngày đề nghị) / nhân viên / danh mục; cũ nhất trước. */
  function filterQueue(items, f) {
    f = f || {};
    return (items || []).filter(function (it) {
      if (!isPending(it) || !it.id) return false;
      if (f.month && monthOf(it.ngay) !== f.month) return false;
      if (f.nhanVienId && it.nhanVienId !== f.nhanVienId) return false;
      if (f.danhMuc && it.danhMuc !== f.danhMuc) return false;
      return true;
    }).sort(compareQueue);
  }
  function countPending(items) { return (items || []).filter(function (it) { return isPending(it) && it.id; }).length; }
  function summarize(list) { return { count: list.length, total: sumThanhTien(list) }; }

  /* ---------- Lý do từ chối ---------- */
  function validateLyDo(input) {
    var s = str(input).replace(/\r\n?/g, '\n').trim();
    if (!s) return { ok: false, code: 'required', message: 'Hãy nhập lý do từ chối' };
    if (charLen(s) > LIMITS.LY_DO_MAX) {
      return { ok: false, code: 'max', message: 'Tối đa ' + LIMITS.LY_DO_MAX + ' ký tự (đang nhập ' + charLen(s) + ')' };
    }
    return { ok: true, value: s };
  }

  /* ---------- Chữ cái đại diện của nhân viên ---------- */
  function initial(name) {
    var words = str(name).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    return Array.from(words[words.length - 1])[0].toUpperCase();
  }
  function colorIndex(key) {
    var h = 0, s = str(key);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 7) + 1;
  }

  return {
    TRANG_THAI: { CHO: CHO, DUYET: DUYET, TU_CHOI: TU_CHOI },
    DANH_MUC: DANH_MUC, LIMITS: LIMITS, QUICK_REASONS: QUICK_REASONS,
    danhMucTen: danhMucTen, groupDigits: groupDigits, formatVND: formatVND, formatSoLuong: formatSoLuong,
    thanhTienOf: thanhTienOf, sumThanhTien: sumThanhTien,
    todayStr: todayStr, isValidDate: isValidDate, monthOf: monthOf, isValidMonth: isValidMonth,
    shiftMonth: shiftMonth, monthLabel: monthLabel, formatDate: formatDate, waitInfo: waitInfo,
    isPending: isPending, filterQueue: filterQueue, countPending: countPending, summarize: summarize,
    validateLyDo: validateLyDo, charLen: charLen, initial: initial, colorIndex: colorIndex
  };
});
