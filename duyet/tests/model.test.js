/* Test logic thuần: review-model.js */
(function () {
  var R = DncReviewModel;

  describe('thanhTienOf & định dạng', function () {
    [[{ soLuong: 10, donGia: 45000 }, 450000], [{ soLuong: 2.5, donGia: 1 }, 3], [{ soLuong: 0.333, donGia: 3 }, 1],
      [{ soLuong: 1.1, donGia: 30000 }, 33000], [{ soLuong: 0.001, donGia: 499 }, 0], [{ soLuong: 0.001, donGia: 500 }, 1],
      [{ soLuong: 1000000, donGia: 1e9 }, 1e15], [{ soLuong: 12.5, donGia: 1850000 }, 23125000], [{ soLuong: 0, donGia: 5 }, 0]
    ].forEach(function (c) {
      it('thanhTienOf ' + JSON.stringify(c[0]) + ' = ' + c[1], function () { assert.equal(R.thanhTienOf(c[0]), c[1]); });
    });
    [null, undefined, {}, { soLuong: '10', donGia: 5 }, { soLuong: 1, donGia: '5' }, { soLuong: NaN, donGia: 5 }, { soLuong: 1, donGia: Infinity },
      { soLuong: -1, donGia: 5 }, { soLuong: 1, donGia: -5 }, { soLuong: 1, donGia: 1.5 }, { soLuong: 1e15, donGia: 5 }].forEach(function (b, i) {
      it('dữ liệu hỏng #' + i + ' → NaN, không ném lỗi', function () { assert.ok(Number.isNaN(R.thanhTienOf(b))); });
    });
    it('formatVND', function () {
      assert.equal(R.formatVND(0), '0 ₫'); assert.equal(R.formatVND(1234567), '1.234.567 ₫');
      assert.equal(R.formatVND(NaN), '—'); assert.equal(R.formatVND(undefined), '—'); assert.equal(R.formatVND('5'), '—');
      assert.equal(R.formatVND(1e15), '1.000.000.000.000.000 ₫'); assert.equal(R.formatVND(-1500), '-1.500 ₫');
    });
    it('formatSoLuong', function () {
      assert.equal(R.formatSoLuong(10), '10'); assert.equal(R.formatSoLuong(2.5), '2,5'); assert.equal(R.formatSoLuong(0.001), '0,001');
      assert.equal(R.formatSoLuong(1234.5), '1.234,5'); assert.equal(R.formatSoLuong(NaN), '—'); assert.equal(R.formatSoLuong(-1), '—');
      assert.equal(R.formatSoLuong('3'), '—');
    });
    it('sumThanhTien cộng chính xác, bỏ qua khoản dữ liệu hỏng', function () {
      assert.equal(R.sumThanhTien([]), 0);
      assert.equal(R.sumThanhTien([{ soLuong: 1, donGia: 1000 }, { soLuong: 2, donGia: 500 }, { soLuong: 'x', donGia: 5 }]), 2000);
      var big = { soLuong: 1000000, donGia: 1e9 };
      assert.equal(R.sumThanhTien([big, big, big]), 3e15);
    });
    it('danhMucTen: đúng tên, id lạ → Khác', function () {
      assert.equal(R.danhMucTen('thiet_bi'), 'Thiết bị'); assert.equal(R.danhMucTen('xyz'), 'Khác'); assert.equal(R.danhMucTen(undefined), 'Khác');
      assert.equal(R.DANH_MUC.length, 7);
    });
  });

  describe('ngày & tháng', function () {
    it('todayStr dùng giờ địa phương', function () {
      assert.equal(R.todayStr(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
    });
    [['2026-02-28', true], ['2024-02-29', true], ['2026-02-29', false], ['2026-04-31', false], ['', false], [null, false], ['2026-1-1', false]].forEach(function (c) {
      it('isValidDate(' + JSON.stringify(c[0]) + ')', function () { assert.equal(R.isValidDate(c[0]), c[1]); });
    });
    it('monthOf', function () {
      assert.equal(R.monthOf('2026-11-02'), '2026-11'); assert.equal(R.monthOf('2026-02-30'), null); assert.equal(R.monthOf(undefined), null);
    });
    it('shiftMonth qua biên năm, nhiều tháng, âm', function () {
      assert.equal(R.shiftMonth('2026-11', 1), '2026-12'); assert.equal(R.shiftMonth('2026-12', 1), '2027-01');
      assert.equal(R.shiftMonth('2026-01', -1), '2025-12'); assert.equal(R.shiftMonth('2026-01', -13), '2024-12');
      assert.equal(R.shiftMonth('2026-06', 0), '2026-06'); assert.equal(R.shiftMonth('2026-06', 24), '2028-06');
      assert.equal(R.shiftMonth('hỏng', 1), 'hỏng');
    });
    it('monthLabel, formatDate', function () {
      assert.equal(R.monthLabel('2026-11'), 'Tháng 11/2026'); assert.equal(R.monthLabel('2026-01'), 'Tháng 1/2026'); assert.equal(R.monthLabel('x'), '');
      assert.equal(R.formatDate('2026-11-02'), '02/11/2026'); assert.equal(R.formatDate('xx'), '—');
    });
    it('isValidMonth', function () {
      assert.equal(R.isValidMonth('2026-12'), true); assert.equal(R.isValidMonth('2026-13'), false); assert.equal(R.isValidMonth('2026-00'), false);
    });
  });

  describe('waitInfo (nhãn "Chờ N ngày" từ 3 ngày)', function () {
    function w(createdLocal) { return R.waitInfo({ ngayTao: createdLocal.toISOString() }, '2026-11-02'); }
    it('cùng ngày / 1 / 2 ngày → không nhãn', function () {
      assert.equal(w(new Date(2026, 10, 2, 1, 0)), null);
      assert.equal(w(new Date(2026, 10, 1, 23, 59)), null);
      assert.equal(w(new Date(2026, 9, 31, 0, 1)), null);
    });
    it('đúng 3 ngày → "Chờ 3 ngày"', function () {
      var r = w(new Date(2026, 9, 30, 23, 59));
      assert.equal(r.days, 3); assert.equal(r.label, 'Chờ 3 ngày');
    });
    it('tính theo ngày lịch (không theo giờ): 23:59 hôm kia vs 00:01 hôm nay', function () {
      assert.equal(w(new Date(2026, 10, 1, 0, 1)), null);
    });
    it('nhiều ngày, qua tháng', function () { assert.equal(w(new Date(2026, 9, 12, 10, 0)).label, 'Chờ 21 ngày'); });
    it('thiếu/hỏng ngayTao hoặc today → null; ngày tạo ở tương lai → null', function () {
      assert.equal(R.waitInfo({}, '2026-11-02'), null);
      assert.equal(R.waitInfo({ ngayTao: 'không phải ngày' }, '2026-11-02'), null);
      assert.equal(R.waitInfo({ ngayTao: new Date().toISOString() }, 'xx'), null);
      assert.equal(R.waitInfo(null, '2026-11-02'), null);
      assert.equal(w(new Date(2026, 10, 9, 10, 0)), null);
    });
  });

  describe('filterQueue / summarize', function () {
    var A = item({ id: 'a', ngay: '2026-11-02', ngayTao: '2026-11-02T01:00:00.000Z', nhanVienId: 'nv1', danhMuc: 'thiet_bi' });
    var B = item({ id: 'b', ngay: '2026-11-01', ngayTao: '2026-11-01T05:00:00.000Z', nhanVienId: 'nv2', danhMuc: 'vat_tu' });
    var C = item({ id: 'c', ngay: '2026-11-01', ngayTao: '2026-11-01T03:00:00.000Z', nhanVienId: 'nv1', danhMuc: 'vat_tu' });
    var D = item({ id: 'd', ngay: '2026-10-31', trangThai: 'da_duyet' });
    var E = item({ id: 'e', ngay: '2026-10-15', trangThai: 'cho_duyet' });
    var F = item({ id: 'f', ngay: '2026-11-01', trangThai: 'tu_choi' });
    var all = [A, B, C, D, E, F];
    function ids(l) { return l.map(function (x) { return x.id; }); }
    it('chỉ lấy Chờ duyệt', function () { assert.deepEqual(ids(R.filterQueue(all, {})).sort(), ['a', 'b', 'c', 'e']); });
    it('sắp xếp cũ nhất trước: ngày, rồi giờ gửi, rồi id', function () {
      assert.deepEqual(ids(R.filterQueue(all, {})), ['e', 'c', 'b', 'a']);
    });
    it('lọc theo tháng đề nghị', function () {
      assert.deepEqual(ids(R.filterQueue(all, { month: '2026-11' })), ['c', 'b', 'a']);
      assert.deepEqual(ids(R.filterQueue(all, { month: '2026-10' })), ['e']);
      assert.deepEqual(ids(R.filterQueue(all, { month: '2026-09' })), []);
    });
    it('lọc theo nhân viên / danh mục / kết hợp', function () {
      assert.deepEqual(ids(R.filterQueue(all, { month: '2026-11', nhanVienId: 'nv1' })), ['c', 'a']);
      assert.deepEqual(ids(R.filterQueue(all, { month: '2026-11', danhMuc: 'vat_tu' })), ['c', 'b']);
      assert.deepEqual(ids(R.filterQueue(all, { month: '2026-11', nhanVienId: 'nv1', danhMuc: 'vat_tu' })), ['c']);
      assert.deepEqual(ids(R.filterQueue(all, { nhanVienId: 'nv_khong_co' })), []);
    });
    it('bỏ qua phần tử rác (null, thiếu id, không phải object)', function () {
      assert.deepEqual(ids(R.filterQueue([null, 5, 'x', {}, { trangThai: 'cho_duyet' }, A], {})), ['a']);
      assert.deepEqual(R.filterQueue(null, {}), []);
      assert.deepEqual(R.filterQueue(undefined), []);
    });
    it('ngày lỗi không khớp bất kỳ tháng nào nhưng vẫn nằm trong hàng đợi không lọc tháng', function () {
      var bad = item({ id: 'bad', ngay: 'xx' });
      assert.deepEqual(ids(R.filterQueue([bad], { month: '2026-11' })), []);
      assert.deepEqual(ids(R.filterQueue([bad], {})), ['bad']);
    });
    it('không làm thay đổi mảng đầu vào', function () {
      var arr = [A, B, C]; var copy = arr.slice();
      R.filterQueue(arr, {});
      assert.deepEqual(arr.map(function (x) { return x.id; }), copy.map(function (x) { return x.id; }));
    });
    it('countPending đếm cả các tháng', function () { assert.equal(R.countPending(all), 4); assert.equal(R.countPending(null), 0); });
    it('summarize: số khoản và tổng tiền', function () {
      var s = R.summarize([item({ soLuong: 2, donGia: 1000 }), item({ soLuong: 1, donGia: 500 })]);
      assert.equal(s.count, 2); assert.equal(s.total, 2500);
      assert.deepEqual(R.summarize([]), { count: 0, total: 0 });
    });
  });

  describe('validateLyDo', function () {
    it('rỗng / chỉ khoảng trắng / null → bắt buộc', function () {
      ['', '   ', '\n\t ', null, undefined].forEach(function (v) {
        var r = R.validateLyDo(v); assert.equal(r.ok, false); assert.equal(r.code, 'required'); assert.equal(r.message, 'Hãy nhập lý do từ chối');
      });
    });
    it('hợp lệ: cắt khoảng trắng hai đầu, giữ xuống dòng (\\r\\n → \\n)', function () {
      assert.equal(R.validateLyDo('  Giá cao  ').value, 'Giá cao');
      assert.equal(R.validateLyDo('a\r\nb').value, 'a\nb');
    });
    it('đúng 300 ký tự: ok; 301: lỗi; emoji tính 1 ký tự', function () {
      assert.ok(R.validateLyDo('a'.repeat(300)).ok);
      var r = R.validateLyDo('a'.repeat(301)); assert.equal(r.ok, false); assert.equal(r.code, 'max'); assert.match(r.message, /300/);
      assert.ok(R.validateLyDo('😀'.repeat(300)).ok);
      assert.equal(R.validateLyDo('😀'.repeat(301)).ok, false);
    });
    it('khoảng trắng thừa không tính vào giới hạn', function () { assert.ok(R.validateLyDo('  ' + 'a'.repeat(300) + '  ').ok); });
    it('giữ nguyên ký tự HTML (thoát ký tự thuộc tầng hiển thị)', function () { assert.equal(R.validateLyDo('<b>x</b>').value, '<b>x</b>'); });
    it('có đủ 4 lý do gợi ý, mỗi cái đều hợp lệ', function () {
      assert.equal(R.QUICK_REASONS.length, 4);
      R.QUICK_REASONS.forEach(function (q) { assert.ok(R.validateLyDo(q).ok, q); });
    });
  });

  describe('initial & colorIndex', function () {
    it('lấy chữ cái đầu của từ cuối, in hoa', function () {
      assert.equal(R.initial('Nguyễn Văn An'), 'A'); assert.equal(R.initial('trần thị bình'), 'B'); assert.equal(R.initial('  Lê  Cường '), 'C');
      assert.equal(R.initial('Đức'), 'Đ'); assert.equal(R.initial('An'), 'A');
    });
    it('rỗng → ?; emoji không bị cắt đôi', function () {
      assert.equal(R.initial(''), '?'); assert.equal(R.initial(null), '?'); assert.equal(R.initial('   '), '?');
      assert.equal(R.initial('😀 Tèo').length, 1);
      assert.equal(R.initial('Tèo 😀'), '😀');
    });
    it('colorIndex ổn định, trong 1..7, ổn với chuỗi lạ', function () {
      for (var i = 0; i < 200; i++) { var c = R.colorIndex('nv' + i); assert.ok(c >= 1 && c <= 7 && Number.isInteger(c), String(c)); }
      assert.equal(R.colorIndex('nv1'), R.colorIndex('nv1'));
      assert.ok(R.colorIndex('') >= 1); assert.ok(R.colorIndex(null) >= 1);
    });
  });
})();
