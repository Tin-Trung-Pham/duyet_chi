/* Sổ Đề Nghị Chi – Dữ liệu mẫu: 10 nhân viên + ~90 đề nghị chi trải trên ~4 tháng (xác định, cùng `now` cho ra cùng dữ liệu).
 * DncSample.build(nowMs) → { nhanVien: [...], deNghi: [...] } đúng hợp đồng `dnc:v1:nhanVien` / `dnc:v1:deNghi`. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DncSample = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NHAN_VIEN = [
    ['NV001', 'Nguyễn Văn An'], ['NV002', 'Trần Thị Bích'], ['NV003', 'Lê Hoàng Cường'], ['NV004', 'Phạm Minh Đức'], ['NV005', 'Võ Thị Hồng'],
    ['NV006', 'Đặng Quốc Khánh'], ['NV007', 'Bùi Thị Lan'], ['NV008', 'Hoàng Gia Minh'], ['NV009', 'Đỗ Thị Ngọc Oanh'], ['NV010', 'Ngô Thanh Phong']
  ];
  /* [danhMuc, nhà cung cấp/nội dung, đơn giá tối thiểu, tối đa (bước 1.000), sl tối thiểu, sl tối đa] */
  var MAU = [
    ['van_phong_pham', 'Giấy A4 Double A – Công ty Hồng Hà', 70000, 95000, 5, 40],
    ['van_phong_pham', 'Bút bi, sổ tay, kẹp tài liệu – Thiên Long', 8000, 60000, 10, 120],
    ['van_phong_pham', 'Mực in HP 78A – Phong Vũ', 850000, 1400000, 1, 6],
    ['vat_tu', 'Dây điện, ổ cắm, đèn LED – Điện Quang', 45000, 380000, 5, 60],
    ['vat_tu', 'Sơn tường, dụng cụ sửa chữa – Home Center', 120000, 950000, 2, 25],
    ['vat_tu', 'Thùng carton, băng keo đóng gói – Bao bì Việt', 6000, 45000, 50, 500],
    ['thiet_bi', 'Laptop Dell Latitude – FPT Shop', 17000000, 32000000, 1, 4],
    ['thiet_bi', 'Màn hình LG 27 inch – Phong Vũ', 3500000, 6800000, 1, 6],
    ['thiet_bi', 'Máy in Canon LBP – Nguyễn Kim', 4200000, 9500000, 1, 3],
    ['van_chuyen', 'Giao hàng nhanh Grab Express', 45000, 320000, 1, 12],
    ['van_chuyen', 'Cước vận chuyển hàng – Viettel Post', 150000, 1900000, 1, 8],
    ['tiep_khach', 'Tiệc tiếp khách đối tác – Nhà hàng Hoa Sen', 1800000, 7500000, 1, 3],
    ['tiep_khach', 'Cà phê, trà bánh cho cuộc họp khách hàng', 250000, 900000, 1, 5],
    ['dich_vu', 'Phí duy trì phần mềm kế toán – MISA', 1500000, 9000000, 1, 4],
    ['dich_vu', 'Dịch vụ vệ sinh văn phòng định kỳ', 800000, 3500000, 1, 3],
    ['dich_vu', 'Cước internet cáp quang – VNPT', 700000, 2200000, 1, 3],
    ['khac', 'Quà tặng đối tác dịp lễ', 300000, 1800000, 1, 15],
    ['khac', 'Phí gửi xe, lệ phí hành chính', 20000, 500000, 1, 10]
  ];
  var GHI_CHU = ['', '', '', 'Cần gấp trong tuần', 'Theo báo giá đính kèm', 'Mua theo đề xuất của phòng ban', 'Đơn hàng định kỳ hằng tháng', 'Đã so sánh giá 3 nhà cung cấp'];
  var LY_DO = ['Vượt ngân sách quý, vui lòng đề nghị lại vào kỳ sau', 'Thiếu báo giá so sánh từ nhà cung cấp khác', 'Nội dung mua chưa rõ mục đích sử dụng', 'Trùng với đề nghị đã duyệt trước đó', 'Đơn giá cao hơn thị trường, cần thương lượng lại'];
  /* Khoản lớn cố định [chỉ số nhân viên, danhMuc, nội dung, soLuong, donGia, ngày lùi, trạng thái]: có cả khoản > 100 triệu và khoản sát ngưỡng. */
  var LON = [
    [2, 'thiet_bi', 'Máy chủ Dell PowerEdge R750 – Dell Việt Nam', 1, 135500000, 9, 'cho_duyet'],
    [5, 'thiet_bi', 'Hệ thống máy cắt CNC mini – Công ty Cơ khí An Phát', 1, 120000000, 31, 'da_duyet'],
    [8, 'dich_vu', 'Hợp đồng truyền thông quý IV – Agency Sao Việt', 1, 118000000, 3, 'cho_duyet'],
    [0, 'thiet_bi', 'Lô 5 laptop cho nhân viên mới – FPT Shop', 5, 24500000, 52, 'da_duyet'],
    [3, 'vat_tu', 'Vật tư xây dựng sửa chữa kho – VLXD Phú Thịnh', 1, 100000000, 17, 'da_duyet'],
    [6, 'thiet_bi', 'Máy photocopy công nghiệp Ricoh – Ricoh Việt Nam', 1, 99990000, 24, 'tu_choi']
  ];

  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function ymd(d) { return pad(d.getFullYear(), 4) + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }

  function build(nowMs) {
    var now = new Date(nowMs == null ? Date.now() : nowMs);
    var rnd = mulberry32(20261102);
    function int(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function pick(arr) { return arr[int(0, arr.length - 1)]; }

    var stamp = new Date(now.getTime() - 130 * 86400000).toISOString();
    var nhanVien = NHAN_VIEN.map(function (n, i) { return { id: 'nv_demo' + pad(i + 1, 2), ma: n[0], hoTen: n[1], hoatDong: true, ngayTao: stamp, ngayCapNhat: stamp }; });

    var items = [], seq = 0;
    function add(nv, dm, ncc, sl, gia, daysAgo, tt) {
      seq++;
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 9 + (seq % 8), (seq * 7) % 60, 0);
      var created = d.toISOString();
      var rec = {
        id: 'dn_demo' + pad(seq, 3), nhanVienId: nhanVien[nv].id, nhaCungCap: ncc, danhMuc: dm, soLuong: sl, donGia: gia,
        ngay: ymd(d), ghiChu: pick(GHI_CHU), trangThai: tt, lyDoTuChoi: null, ngayTao: created, ngayXuLy: null
      };
      if (tt !== 'cho_duyet') {
        rec.ngayXuLy = new Date(d.getTime() + int(1, 48) * 3600000).toISOString();
        rec.nguoiXuLy = 'quan_ly';
        if (tt === 'tu_choi') rec.lyDoTuChoi = pick(LY_DO);
      }
      items.push(rec);
    }
    LON.forEach(function (l) { add(l[0], l[1], l[2], l[3], l[4], l[5], l[6]); });
    for (var k = 0; k < 84; k++) {
      var m = pick(MAU), daysAgo = int(0, 118);
      var gia = Math.round(int(m[2], m[3]) / 1000) * 1000;
      var tt;
      if (daysAgo < 6) tt = 'cho_duyet';
      else if (daysAgo < 20) tt = rnd() < 0.5 ? 'cho_duyet' : (rnd() < 0.8 ? 'da_duyet' : 'tu_choi');
      else tt = rnd() < 0.8 ? 'da_duyet' : 'tu_choi';
      add(int(0, 9), m[0], m[1], int(m[4], m[5]), gia, daysAgo, tt);
    }
    items.sort(function (a, b) { return a.ngayTao < b.ngayTao ? -1 : a.ngayTao > b.ngayTao ? 1 : 0; });
    return { nhanVien: nhanVien, deNghi: items };
  }
  return { build: build, KEYS: { NV: 'dnc:v1:nhanVien', DN: 'dnc:v1:deNghi' } };
});
