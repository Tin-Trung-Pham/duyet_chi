/* Sổ Đề Nghị Chi – Module 1: Nhập liệu chi
 * Logic thuần (không DOM, không storage): danh mục, phân tích/định dạng số,
 * tính thành tiền, kiểm tra hợp lệ. Chạy được trong trình duyệt và Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DncModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DANH_MUC = [
    { id: 'van_phong_pham', ten: 'Văn phòng phẩm', icon: 'pen', cat: 1 },
    { id: 'vat_tu', ten: 'Vật tư', icon: 'box', cat: 2 },
    { id: 'thiet_bi', ten: 'Thiết bị', icon: 'monitor', cat: 3 },
    { id: 'van_chuyen', ten: 'Vận chuyển', icon: 'truck', cat: 4 },
    { id: 'tiep_khach', ten: 'Tiếp khách', icon: 'coffee', cat: 5 },
    { id: 'dich_vu', ten: 'Dịch vụ', icon: 'spark', cat: 6 },
    { id: 'khac', ten: 'Khác', icon: 'dots', cat: 7 }
  ];

  var LIMITS = {
    NCC_MAX: 120,
    GHICHU_MAX: 500,
    SL_MAX: 1000000,
    SL_DECIMALS: 3,
    DONGIA_MAX: 1000000000,
    NGAY_MIN: '2000-01-01'
  };

  function str(x) { return x == null ? '' : String(x); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function charLen(s) { return Array.from(s).length; }

  function danhMucIds() { return DANH_MUC.map(function (d) { return d.id; }); }
  function danhMucTen(id) {
    for (var i = 0; i < DANH_MUC.length; i++) if (DANH_MUC[i].id === id) return DANH_MUC[i].ten;
    return '';
  }

  /* ---------- Ngày ---------- */
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

  /* ---------- Số lượng (tối đa 3 chữ số thập phân, trả về "phần nghìn") ---------- */
  function parseSoLuong(input) {
    var s = str(input).trim();
    if (!s) return { ok: false, code: 'required', message: 'Nhập số lượng' };
    if (/^[.,]/.test(s)) s = '0' + s;
    var m = /^(\d+)(?:[.,](\d+))?$/.exec(s);
    if (!m) return { ok: false, code: 'invalid', message: 'Số lượng không hợp lệ (chỉ nhập số, ví dụ 2 hoặc 1,5)' };
    var frac = m[2] || '';
    if (frac.length > LIMITS.SL_DECIMALS) {
      return { ok: false, code: 'decimals', message: 'Số lượng tối đa ' + LIMITS.SL_DECIMALS + ' chữ số thập phân' };
    }
    var intPart = m[1].replace(/^0+(?=\d)/, '');
    if (intPart.length > 7) return { ok: false, code: 'max', message: 'Số lượng tối đa 1.000.000' };
    var milli = Number(intPart) * 1000 + Number((frac + '000').slice(0, 3));
    if (milli <= 0) return { ok: false, code: 'min', message: 'Số lượng phải lớn hơn 0' };
    if (milli > LIMITS.SL_MAX * 1000) return { ok: false, code: 'max', message: 'Số lượng tối đa 1.000.000' };
    return { ok: true, milli: milli };
  }

  /* ---------- Đơn giá (số nguyên đồng, cho phép dấu chấm/phẩy/cách phân cách nghìn) ---------- */
  function parseDonGia(input) {
    var s = str(input).trim().replace(/\s*(₫|đ|vnd|vnđ)$/i, '').trim();
    if (!s) return { ok: false, code: 'required', message: 'Nhập đơn giá' };
    var digits;
    if (/^\d+$/.test(s)) {
      digits = s;
    } else if (/^\d{1,3}([.,  ])\d{3}(?:\1\d{3})*$/.test(s)) {
      digits = s.replace(/[.,  ]/g, '');
    } else {
      return { ok: false, code: 'invalid', message: 'Đơn giá phải là số nguyên đồng, ví dụ 1.500.000' };
    }
    digits = digits.replace(/^0+(?=\d)/, '');
    if (digits.length > 10 || Number(digits) > LIMITS.DONGIA_MAX) {
      return { ok: false, code: 'max', message: 'Đơn giá tối đa 1.000.000.000 ₫' };
    }
    return { ok: true, value: Number(digits) };
  }

  /* ---------- Thành tiền = số lượng × đơn giá, làm tròn về đồng (nửa lên) ---------- */
  function thanhTien(milli, donGia) {
    var p = BigInt(milli) * BigInt(donGia);
    return Number((p + 500n) / 1000n);
  }
  function thanhTienOf(item) {
    return thanhTien(Math.round(item.soLuong * 1000), item.donGia);
  }

  /* ---------- Định dạng ---------- */
  function groupDigits(digits) {
    return str(digits).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function formatVND(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    var neg = n < 0;
    return (neg ? '-' : '') + groupDigits(String(Math.abs(Math.round(n)))) + ' ₫';
  }
  function formatSoLuong(milli, opts) {
    var group = !(opts && opts.plain);
    var i = Math.floor(milli / 1000);
    var f = pad(milli % 1000, 3).replace(/0+$/, '');
    var is = String(i);
    return (group ? groupDigits(is) : is) + (f ? ',' + f : '');
  }

  /* ---------- Kiểm tra hợp lệ ---------- */
  function validate(raw, ctx) {
    raw = raw || {};
    ctx = ctx || {};
    var errors = {};
    var v = {};
    var today = ctx.today || todayStr();

    var nv = str(raw.nhanVienId).trim();
    if (!nv) errors.nhanVienId = 'Chọn người đề nghị';
    else if (ctx.nhanVienIds && ctx.nhanVienIds.indexOf(nv) < 0) {
      errors.nhanVienId = 'Người đề nghị không hợp lệ hoặc đã ngưng hoạt động';
    } else v.nhanVienId = nv;

    var ncc = str(raw.nhaCungCap).replace(/\s+/g, ' ').trim();
    if (!ncc) errors.nhaCungCap = 'Nhập nhà cung cấp hoặc nội dung mua';
    else if (charLen(ncc) > LIMITS.NCC_MAX) {
      errors.nhaCungCap = 'Tối đa ' + LIMITS.NCC_MAX + ' ký tự (đang nhập ' + charLen(ncc) + ')';
    } else v.nhaCungCap = ncc;

    var dm = str(raw.danhMuc).trim();
    if (!dm) errors.danhMuc = 'Chọn danh mục';
    else if (danhMucIds().indexOf(dm) < 0) errors.danhMuc = 'Danh mục không hợp lệ';
    else v.danhMuc = dm;

    var sl = parseSoLuong(raw.soLuong);
    if (!sl.ok) errors.soLuong = sl.message;
    else v.soLuong = sl.milli / 1000;

    var dg = parseDonGia(raw.donGia);
    if (!dg.ok) errors.donGia = dg.message;
    else v.donGia = dg.value;

    var ngay = str(raw.ngay).trim();
    if (!ngay) errors.ngay = 'Chọn ngày';
    else if (!isValidDate(ngay)) errors.ngay = 'Ngày không hợp lệ';
    else if (ngay < LIMITS.NGAY_MIN) errors.ngay = 'Ngày không được trước 01/01/2000';
    else if (ngay > today) errors.ngay = 'Ngày không được ở tương lai';
    else v.ngay = ngay;

    var gc = str(raw.ghiChu).replace(/\r\n?/g, '\n').trim();
    if (charLen(gc) > LIMITS.GHICHU_MAX) {
      errors.ghiChu = 'Tối đa ' + LIMITS.GHICHU_MAX + ' ký tự (đang nhập ' + charLen(gc) + ')';
    } else v.ghiChu = gc;

    var ok = Object.keys(errors).length === 0;
    return { ok: ok, errors: errors, value: ok ? v : null };
  }

  /* ---------- Phát hiện thay đổi chưa lưu ---------- */
  function normalizeRaw(r) {
    r = r || {};
    return {
      nhanVienId: str(r.nhanVienId).trim(),
      nhaCungCap: str(r.nhaCungCap).replace(/\s+/g, ' ').trim(),
      danhMuc: str(r.danhMuc).trim(),
      soLuong: str(r.soLuong).trim().replace(',', '.'),
      donGia: str(r.donGia).replace(/\D/g, ''),
      ngay: str(r.ngay).trim(),
      ghiChu: str(r.ghiChu).replace(/\r\n?/g, '\n').trim()
    };
  }
  function hasChanges(a, b) {
    var x = normalizeRaw(a), y = normalizeRaw(b);
    return Object.keys(x).some(function (k) { return x[k] !== y[k]; });
  }

  return {
    DANH_MUC: DANH_MUC,
    LIMITS: LIMITS,
    FIELD_ORDER: ['nhanVienId', 'nhaCungCap', 'danhMuc', 'soLuong', 'donGia', 'ngay', 'ghiChu'],
    danhMucIds: danhMucIds,
    danhMucTen: danhMucTen,
    todayStr: todayStr,
    isValidDate: isValidDate,
    parseSoLuong: parseSoLuong,
    parseDonGia: parseDonGia,
    thanhTien: thanhTien,
    thanhTienOf: thanhTienOf,
    groupDigits: groupDigits,
    formatVND: formatVND,
    formatSoLuong: formatSoLuong,
    charLen: charLen,
    validate: validate,
    hasChanges: hasChanges
  };
});
