(function () {
  var NOW = new Date(2026, 10, 3, 10, 0, 0).getTime();
  var D = DncSample.build(NOW);
  function todayStr() { return DncModel.todayStr(new Date(NOW)); }

  describe('Dữ liệu mẫu', function () {
    it('có đúng 10 nhân viên, mã và id không trùng', function () {
      assert.equal(D.nhanVien.length, 10);
      assert.equal(new Set(D.nhanVien.map(function (e) { return e.id; })).size, 10);
      assert.equal(new Set(D.nhanVien.map(function (e) { return e.ma; })).size, 10);
    });
    it('mọi nhân viên qua kiểm tra hợp lệ của module Nhân viên', function () {
      D.nhanVien.forEach(function (e) {
        var r = DncEmpModel.validate({ ma: e.ma, hoTen: e.hoTen }, { others: D.nhanVien.filter(function (o) { return o.id !== e.id; }), selfId: e.id });
        assert.ok(r.ok, e.ma + ' ' + JSON.stringify(r.errors));
      });
    });
    it('có nhiều đề nghị (≥ 80), id không trùng, mỗi nhân viên ≥ 3 đề nghị', function () {
      assert.ok(D.deNghi.length >= 80, 'n=' + D.deNghi.length);
      assert.equal(new Set(D.deNghi.map(function (x) { return x.id; })).size, D.deNghi.length);
      D.nhanVien.forEach(function (e) { assert.ok(D.deNghi.filter(function (x) { return x.nhanVienId === e.id; }).length >= 3, e.ma); });
    });
    it('mọi đề nghị qua kiểm tra hợp lệ của module Nhập liệu (ngày không ở tương lai)', function () {
      var ids = D.nhanVien.map(function (e) { return e.id; });
      D.deNghi.forEach(function (x) {
        var r = DncModel.validate({ nhanVienId: x.nhanVienId, nhaCungCap: x.nhaCungCap, danhMuc: x.danhMuc, soLuong: String(x.soLuong), donGia: String(x.donGia), ngay: x.ngay, ghiChu: x.ghiChu }, { today: todayStr(), nhanVienIds: ids });
        assert.ok(r.ok, x.id + ' ' + JSON.stringify(r.errors));
      });
    });
    it('đủ 3 trạng thái; từ chối luôn có lý do hợp lệ, chờ duyệt thì không', function () {
      ['cho_duyet', 'da_duyet', 'tu_choi'].forEach(function (s) { assert.ok(D.deNghi.filter(function (x) { return x.trangThai === s; }).length >= 8, s); });
      D.deNghi.forEach(function (x) {
        if (x.trangThai === 'tu_choi') assert.ok(DncReviewModel.validateLyDo(x.lyDoTuChoi).ok, x.id);
        else assert.equal(x.lyDoTuChoi, null, x.id);
        if (x.trangThai === 'cho_duyet') assert.equal(x.ngayXuLy, null, x.id);
        else assert.ok(x.ngayXuLy > x.ngayTao, x.id);
      });
    });
    it('trải trên ≥ 4 tháng khác nhau, đủ 7 danh mục', function () {
      assert.ok(new Set(D.deNghi.map(function (x) { return x.ngay.slice(0, 7); })).size >= 4);
      assert.equal(new Set(D.deNghi.map(function (x) { return x.danhMuc; })).size, 7);
    });
    it('có ≥ 3 khoản TRÊN 100 triệu, và khoản đúng 100 triệu / 99.990.000 không bị tính là vượt', function () {
      var amt = function (x) { return x.soLuong * x.donGia; };
      assert.ok(D.deNghi.filter(function (x) { return amt(x) > DncDb.THRESHOLD; }).length >= 3);
      assert.ok(D.deNghi.some(function (x) { return amt(x) === 100000000; }));
      assert.ok(D.deNghi.some(function (x) { return amt(x) === 99990000; }));
    });
    it('mọi đề nghị đổi được thành dòng products hợp lệ cho cơ sở dữ liệu', function () {
      D.deNghi.forEach(function (x) {
        var row = DncDb.rowFromRequest(x, D.nhanVien);
        assert.ok(row, x.id);
        assert.equal(row.so_tien, x.soLuong * x.donGia, x.id);
        assert.ok(row.ten_nhan_vien !== 'Nhân viên không rõ', x.id);
      });
    });
    it('xác định: cùng thời điểm cho ra cùng dữ liệu; thời điểm khác thì ngày lệch theo', function () {
      assert.deepEqual(DncSample.build(NOW), D);
      assert.notEqual(DncSample.build(NOW + 30 * 86400000)[ 'deNghi' ][0].ngay, D.deNghi[0].ngay);
    });
    it('Thống kê đọc được toàn bộ (không bỏ qua dòng nào)', function () {
      var st = DncStatsModel.prepare(D.deNghi);
      assert.equal(st.skipped, 0);
      assert.equal(st.rows.length, D.deNghi.length);
    });
  });
})();
