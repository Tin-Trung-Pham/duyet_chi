/* Test logic thuần: entry-model.js */
(function () {
  var M = DncModel;

  function base(over) {
    var r = { nhanVienId: 'nv1', nhaCungCap: 'Giấy A4', danhMuc: 'van_phong_pham', soLuong: '10', donGia: '45.000', ngay: '2026-11-01', ghiChu: '' };
    for (var k in over) r[k] = over[k];
    return r;
  }
  var CTX = { today: '2026-11-02', nhanVienIds: ['nv1', 'nv2'] };

  describe('parseSoLuong', function () {
    var okCases = [
      ['1', 1000], ['10', 10000], ['0,5', 500], ['0.5', 500], [',5', 500], ['1,5', 1500], ['1.5', 1500],
      ['2,25', 2250], ['0,001', 1], ['007', 7000], ['  3  ', 3000], ['1000000', 1000000000], ['1000000,000', 1000000000],
      ['999999,999', 999999999]
    ];
    okCases.forEach(function (c) {
      it('nhận "' + c[0] + '" → ' + c[1] + ' phần nghìn', function () {
        var r = M.parseSoLuong(c[0]);
        assert.ok(r.ok, JSON.stringify(r));
        assert.equal(r.milli, c[1]);
      });
    });
    var badCases = [
      ['', 'required'], ['   ', 'required'], [null, 'required'], [undefined, 'required'],
      ['0', 'min'], ['0,0', 'min'], ['0,000', 'min'], ['-1', 'invalid'], ['abc', 'invalid'], ['1e3', 'invalid'],
      ['1,2345', 'decimals'], ['1,2,3', 'invalid'], ['1.000,5', 'invalid'], ['1 5', 'invalid'], ['١٢٣', 'invalid'],
      ['1000000,001', 'max'], ['1000001', 'max'], ['99999999', 'max'], ['+1', 'invalid'], ['1,', 'invalid'], ['NaN', 'invalid'], ['Infinity', 'invalid']
    ];
    badCases.forEach(function (c) {
      it('từ chối ' + JSON.stringify(c[0]) + ' (' + c[1] + ')', function () {
        var r = M.parseSoLuong(c[0]);
        assert.equal(r.ok, false);
        assert.equal(r.code, c[1]);
        assert.ok(r.message && r.message.length > 0);
      });
    });
  });

  describe('parseDonGia', function () {
    var okCases = [
      ['0', 0], ['1', 1], ['500', 500], ['1000', 1000], ['1.000', 1000], ['1,000', 1000], ['1 000', 1000],
      ['45.000', 45000], ['1.500.000', 1500000], ['1500000', 1500000], ['1.500.000đ', 1500000], ['1.500.000 ₫', 1500000],
      ['1.500.000 VND', 1500000], ['  2.000  ', 2000], ['000', 0], ['0012', 12], ['1.000.000.000', 1000000000], ['1000000000', 1000000000],
      ['1 500 000', 1500000]
    ];
    okCases.forEach(function (c) {
      it('nhận "' + c[0] + '" → ' + c[1], function () {
        var r = M.parseDonGia(c[0]);
        assert.ok(r.ok, JSON.stringify(r));
        assert.equal(r.value, c[1]);
      });
    });
    var badCases = [
      ['', 'required'], [' ', 'required'], [null, 'required'], ['₫', 'required'],
      ['-5', 'invalid'], ['1.5', 'invalid'], ['1,5', 'invalid'], ['1.50', 'invalid'], ['1.5000', 'invalid'], ['12.34.567', 'invalid'],
      ['1.500,000', 'invalid'], ['abc', 'invalid'], ['1e6', 'invalid'], ['1.000.00', 'invalid'], ['.500', 'invalid'], ['1..000', 'invalid'],
      ['1000000001', 'max'], ['1.000.000.001', 'max'], ['99999999999', 'max'], ['123456789012345678901234567890', 'max']
    ];
    badCases.forEach(function (c) {
      it('từ chối ' + JSON.stringify(c[0]) + ' (' + c[1] + ')', function () {
        var r = M.parseDonGia(c[0]);
        assert.equal(r.ok, false);
        assert.equal(r.code, c[1]);
      });
    });
  });

  describe('thanhTien (số lượng × đơn giá, làm tròn về đồng, nửa lên)', function () {
    var cases = [
      [1000, 45000, 45000], [10000, 45000, 450000], [1500, 10000, 15000], [500, 1, 1], [500, 3, 2], [1, 1000, 1],
      [1, 499, 0], [1, 500, 1], [333, 3, 1], [100, 3, 0], [2500, 1, 3], [0, 100, 0], [1000, 0, 0],
      [1000000000, 1000000000, 1000000000000000]
    ];
    cases.forEach(function (c) {
      it(c[0] + '/1000 × ' + c[1] + ' = ' + c[2], function () { assert.equal(M.thanhTien(c[0], c[1]), c[2]); });
    });
    it('không mất chính xác ở giá trị lớn (1.000.000 × 1.000.000.000 = 10^15)', function () {
      assert.equal(M.thanhTien(1000000000, 1000000000), 1e15);
      assert.ok(Number.isSafeInteger(M.thanhTien(1000000000, 1000000000)));
    });
    it('không dính sai số dấu phẩy động (0,1 × 3 và 1,1 × 3)', function () {
      assert.equal(M.thanhTien(100, 3), 0);
      assert.equal(M.thanhTien(1100, 3), 3);
      assert.equal(M.thanhTien(1100, 30000), 33000);
    });
    it('thanhTienOf tính từ bản ghi đã lưu (soLuong dạng số thập phân)', function () {
      assert.equal(M.thanhTienOf({ soLuong: 1.1, donGia: 30000 }), 33000);
      assert.equal(M.thanhTienOf({ soLuong: 0.333, donGia: 3 }), 1);
      assert.equal(M.thanhTienOf({ soLuong: 2.5, donGia: 1 }), 3);
    });
  });

  describe('định dạng', function () {
    it('formatVND', function () {
      assert.equal(M.formatVND(0), '0 ₫');
      assert.equal(M.formatVND(999), '999 ₫');
      assert.equal(M.formatVND(1000), '1.000 ₫');
      assert.equal(M.formatVND(1234567), '1.234.567 ₫');
      assert.equal(M.formatVND(1e15), '1.000.000.000.000.000 ₫');
      assert.equal(M.formatVND(-1500), '-1.500 ₫');
      assert.equal(M.formatVND(NaN), '—');
      assert.equal(M.formatVND(undefined), '—');
      assert.equal(M.formatVND('5'), '—');
    });
    it('groupDigits', function () {
      assert.equal(M.groupDigits(''), '');
      assert.equal(M.groupDigits('1'), '1');
      assert.equal(M.groupDigits('1234'), '1.234');
      assert.equal(M.groupDigits('1234567'), '1.234.567');
      assert.equal(M.groupDigits('123456'), '123.456');
    });
    it('formatSoLuong', function () {
      assert.equal(M.formatSoLuong(1000), '1');
      assert.equal(M.formatSoLuong(1500), '1,5');
      assert.equal(M.formatSoLuong(1), '0,001');
      assert.equal(M.formatSoLuong(10010), '10,01');
      assert.equal(M.formatSoLuong(1234500), '1.234,5');
      assert.equal(M.formatSoLuong(1234500, { plain: true }), '1234,5');
    });
    it('danh mục: 7 mục, id duy nhất, tên Việt, tra tên theo id', function () {
      assert.equal(M.DANH_MUC.length, 7);
      assert.equal(new Set(M.danhMucIds()).size, 7);
      assert.equal(M.danhMucTen('khac'), 'Khác');
      assert.equal(M.danhMucTen('van_phong_pham'), 'Văn phòng phẩm');
      assert.equal(M.danhMucTen('không_có'), '');
      assert.deepEqual(M.DANH_MUC.map(function (d) { return d.ten; }),
        ['Văn phòng phẩm', 'Vật tư', 'Thiết bị', 'Vận chuyển', 'Tiếp khách', 'Dịch vụ', 'Khác']);
    });
  });

  describe('ngày', function () {
    it('todayStr dùng giờ địa phương, có đệm số 0', function () {
      assert.equal(M.todayStr(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
      assert.equal(M.todayStr(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
    });
    [['2026-02-28', true], ['2024-02-29', true], ['2026-02-29', false], ['2100-02-29', false], ['2000-02-29', true],
      ['2026-04-31', false], ['2026-13-01', false], ['2026-00-10', false], ['2026-01-00', false], ['2026-1-1', false],
      ['26-01-01', false], ['2026/01/01', false], ['', false], [null, false], ['hôm nay', false], ['2026-01-01T00:00', false],
      ['0001-01-01', true], ['9999-12-31', true]].forEach(function (c) {
      it('isValidDate(' + JSON.stringify(c[0]) + ') = ' + c[1], function () { assert.equal(M.isValidDate(c[0]), c[1]); });
    });
  });

  describe('validate – trường hợp hợp lệ', function () {
    it('bản ghi chuẩn hợp lệ và được chuẩn hóa', function () {
      var r = M.validate(base({ nhaCungCap: '  Giấy   A4  ', ghiChu: '  cần gấp  ' }), CTX);
      assert.ok(r.ok, JSON.stringify(r.errors));
      assert.deepEqual(r.value, {
        nhanVienId: 'nv1', nhaCungCap: 'Giấy A4', danhMuc: 'van_phong_pham', soLuong: 10, donGia: 45000,
        ngay: '2026-11-01', ghiChu: 'cần gấp'
      });
      assert.equal(r.errors && Object.keys(r.errors).length, 0);
    });
    it('ghi chú rỗng được phép', function () { assert.ok(M.validate(base({ ghiChu: '' }), CTX).ok); });
    it('ghi chú thiếu (undefined) được phép và thành chuỗi rỗng', function () {
      var r = M.validate(base({ ghiChu: undefined }), CTX);
      assert.ok(r.ok); assert.equal(r.value.ghiChu, '');
    });
    it('đơn giá 0 được phép', function () { assert.ok(M.validate(base({ donGia: '0' }), CTX).ok); });
    it('ngày hôm nay được phép; ngày 01/01/2000 được phép', function () {
      assert.ok(M.validate(base({ ngay: '2026-11-02' }), CTX).ok);
      assert.ok(M.validate(base({ ngay: '2000-01-01' }), CTX).ok);
    });
    it('nhận số JS (không chỉ chuỗi) cho số lượng và đơn giá', function () {
      var r = M.validate(base({ soLuong: 2.5, donGia: 1500000 }), CTX);
      assert.ok(r.ok); assert.equal(r.value.soLuong, 2.5); assert.equal(r.value.donGia, 1500000);
    });
    it('không có nhanVienIds trong ctx thì chỉ kiểm tra không rỗng', function () {
      assert.ok(M.validate(base({ nhanVienId: 'bất kỳ' }), { today: '2026-11-02' }).ok);
    });
    it('giữ nguyên ký tự HTML (việc thoát ký tự thuộc tầng hiển thị)', function () {
      var r = M.validate(base({ nhaCungCap: '<b>x</b> & "y"' }), CTX);
      assert.ok(r.ok); assert.equal(r.value.nhaCungCap, '<b>x</b> & "y"');
    });
    it('tiếng Việt có dấu và emoji hợp lệ', function () {
      assert.ok(M.validate(base({ nhaCungCap: 'Cà phê tiếp khách ☕ Đà Lạt' }), CTX).ok);
    });
  });

  describe('validate – giới hạn biên', function () {
    it('nhà cung cấp đúng 120 ký tự: ok; 121: lỗi', function () {
      assert.ok(M.validate(base({ nhaCungCap: 'a'.repeat(120) }), CTX).ok);
      var r = M.validate(base({ nhaCungCap: 'a'.repeat(121) }), CTX);
      assert.equal(r.ok, false); assert.match(r.errors.nhaCungCap, /120/);
    });
    it('emoji tính là 1 ký tự (120 emoji ok, 121 lỗi)', function () {
      assert.ok(M.validate(base({ nhaCungCap: '😀'.repeat(120) }), CTX).ok);
      assert.equal(M.validate(base({ nhaCungCap: '😀'.repeat(121) }), CTX).ok, false);
    });
    it('khoảng trắng thừa không tính vào giới hạn', function () {
      assert.ok(M.validate(base({ nhaCungCap: '  ' + 'a'.repeat(120) + '   ' }), CTX).ok);
    });
    it('ghi chú đúng 500 ký tự: ok; 501: lỗi', function () {
      assert.ok(M.validate(base({ ghiChu: 'b'.repeat(500) }), CTX).ok);
      var r = M.validate(base({ ghiChu: 'b'.repeat(501) }), CTX);
      assert.equal(r.ok, false); assert.match(r.errors.ghiChu, /500/);
    });
    it('ghi chú nhiều dòng giữ xuống dòng, \\r\\n thành \\n', function () {
      var r = M.validate(base({ ghiChu: 'a\r\nb\rc' }), CTX);
      assert.ok(r.ok); assert.equal(r.value.ghiChu, 'a\nb\nc');
    });
    it('ngày hôm nay + 1 ngày: lỗi tương lai', function () {
      var r = M.validate(base({ ngay: '2026-11-03' }), CTX);
      assert.equal(r.ok, false); assert.match(r.errors.ngay, /tương lai/);
    });
    it('ngày 31/12/1999: lỗi trước 2000', function () {
      var r = M.validate(base({ ngay: '1999-12-31' }), CTX);
      assert.equal(r.ok, false); assert.match(r.errors.ngay, /2000/);
    });
    it('ngày không có thật (30/02): lỗi không hợp lệ', function () {
      var r = M.validate(base({ ngay: '2026-02-30' }), CTX);
      assert.equal(r.ok, false); assert.match(r.errors.ngay, /không hợp lệ/);
    });
  });

  describe('validate – lỗi từng trường', function () {
    [
      ['nhanVienId', '', 'Chọn người đề nghị'],
      ['nhanVienId', '   ', 'Chọn người đề nghị'],
      ['nhanVienId', 'nv_khong_co', 'không hợp lệ'],
      ['nhaCungCap', '', 'Nhập nhà cung cấp'],
      ['nhaCungCap', '   \n\t  ', 'Nhập nhà cung cấp'],
      ['nhaCungCap', undefined, 'Nhập nhà cung cấp'],
      ['danhMuc', '', 'Chọn danh mục'],
      ['danhMuc', 'xe_hoi', 'không hợp lệ'],
      ['danhMuc', 'VAN_PHONG_PHAM', 'không hợp lệ'],
      ['soLuong', '', 'Nhập số lượng'],
      ['soLuong', '0', 'lớn hơn 0'],
      ['soLuong', '-3', 'không hợp lệ'],
      ['soLuong', '1,2345', 'thập phân'],
      ['donGia', '', 'Nhập đơn giá'],
      ['donGia', '-1', 'số nguyên'],
      ['donGia', '1,5', 'số nguyên'],
      ['donGia', '2.000.000.000', 'tối đa'],
      ['ngay', '', 'Chọn ngày'],
      ['ngay', 'abc', 'không hợp lệ']
    ].forEach(function (c) {
      it(c[0] + ' = ' + JSON.stringify(c[1]) + ' → lỗi "' + c[2] + '"', function () {
        var over = {}; over[c[0]] = c[1];
        var r = M.validate(base(over), CTX);
        assert.equal(r.ok, false);
        assert.equal(r.value, null);
        assert.ok(r.errors[c[0]], 'phải có lỗi ở ' + c[0]);
        assert.match(r.errors[c[0]], new RegExp(c[2]));
        assert.equal(Object.keys(r.errors).length, 1, 'chỉ một trường lỗi, nhận ' + Object.keys(r.errors));
      });
    });
    it('form trống: báo lỗi đủ các trường bắt buộc, trừ ghi chú', function () {
      var r = M.validate({}, CTX);
      assert.equal(r.ok, false);
      assert.deepEqual(Object.keys(r.errors).sort(), ['danhMuc', 'donGia', 'ngay', 'nhaCungCap', 'nhanVienId', 'soLuong']);
    });
    it('validate(undefined) không ném lỗi', function () {
      var r = M.validate(undefined, undefined);
      assert.equal(r.ok, false);
    });
    it('FIELD_ORDER liệt kê đủ 7 trường theo thứ tự form', function () {
      assert.deepEqual(M.FIELD_ORDER, ['nhanVienId', 'nhaCungCap', 'danhMuc', 'soLuong', 'donGia', 'ngay', 'ghiChu']);
    });
  });

  describe('hasChanges', function () {
    var a = base({ donGia: '45.000', soLuong: '1,5' });
    it('giống nhau → false', function () { assert.equal(M.hasChanges(a, base({ donGia: '45.000', soLuong: '1,5' })), false); });
    it('chỉ khác khoảng trắng đầu/cuối hoặc nhiều khoảng trắng → false', function () {
      assert.equal(M.hasChanges(a, base({ donGia: '45.000', soLuong: ' 1,5 ', nhaCungCap: '  Giấy    A4 ' })), false);
    });
    it('khác dấu phân cách nghìn đơn giá / dấu thập phân số lượng → false', function () {
      assert.equal(M.hasChanges(a, base({ donGia: '45000', soLuong: '1.5' })), false);
    });
    it('đổi bất kỳ trường nào → true', function () {
      ['nhanVienId', 'nhaCungCap', 'danhMuc', 'ngay', 'ghiChu'].forEach(function (f) {
        var o = {}; o[f] = 'khác'; assert.equal(M.hasChanges(a, base(o)), true, f);
      });
      assert.equal(M.hasChanges(a, base({ soLuong: '2' })), true);
      assert.equal(M.hasChanges(a, base({ donGia: '46.000' })), true);
    });
    it('null/undefined không ném lỗi', function () { assert.equal(M.hasChanges(null, undefined), false); });
  });
})();
