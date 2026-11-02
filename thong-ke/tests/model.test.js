/* Test logic thuần: stats-model.js. Đáp án của DS() được tính tay (xem chú thích trong helpers.js). */
(function () {
  var S = DncStatsModel;
  function rows(items) { return S.prepare(items || DS()).rows; }
  function approx(a, b, eps, msg) { assert.ok(Math.abs(a - b) <= (eps || 1e-9), (msg || '') + ' ' + a + ' ≠ ' + b); }

  describe('định dạng', function () {
    [[0, '0'], [7, '7'], [999, '999'], [1000, '1 k'], [1500, '1,5 k'], [850000, '850 k'], [999499, '999,5 k'], [999999, '1 tr'], [1000000, '1 tr'],
      [1250000, '1,3 tr'], [6550000, '6,6 tr'], [6775000, '6,8 tr'], [45000000, '45 tr'], [999999999, '1 tỷ'], [1e9, '1 tỷ'], [1250000000, '1,25 tỷ'],
      [2400000000, '2,4 tỷ'], [-1500, '-1,5 k'], [-2000000, '-2 tr']].forEach(function (c) {
      it('formatCompact(' + c[0] + ') = ' + c[1], function () { assert.equal(S.formatCompact(c[0]), c[1]); });
    });
    it('formatCompact: giá trị không hợp lệ → —', function () {
      [NaN, Infinity, null, undefined, '5'].forEach(function (v) { assert.equal(S.formatCompact(v), '—'); });
    });
    it('formatVND', function () {
      assert.equal(S.formatVND(0), '0 ₫'); assert.equal(S.formatVND(1234567), '1.234.567 ₫'); assert.equal(S.formatVND(-1500), '-1.500 ₫');
      assert.equal(S.formatVND(NaN), '—'); assert.equal(S.formatVND(null), '—'); assert.equal(S.formatVND(1e15), '1.000.000.000.000.000 ₫');
    });
    it('formatPct / formatDelta dùng dấu phẩy và dấu trừ đúng', function () {
      assert.equal(S.formatPct(12.5), '12,5%'); assert.equal(S.formatPct(12), '12%'); assert.equal(S.formatPct(0), '0%'); assert.equal(S.formatPct(100), '100%');
      assert.equal(S.formatPct(NaN), '—'); assert.equal(S.formatPct(null), '—');
      assert.equal(S.formatDelta(12.5), '+12,5%'); assert.equal(S.formatDelta(-3), '−3%'); assert.equal(S.formatDelta(0), '0%');
      assert.equal(S.formatDelta(142.5), '+142,5%'); assert.equal(S.formatDelta(-100), '−100%'); assert.equal(S.formatDelta(null), '—');
    });
    it('formatSignedVND', function () {
      assert.equal(S.formatSignedVND(700000), '+700.000 ₫'); assert.equal(S.formatSignedVND(-1000000), '−1.000.000 ₫');
      assert.equal(S.formatSignedVND(0), '0 ₫'); assert.equal(S.formatSignedVND(NaN), '—');
    });
    it('formatHours', function () {
      assert.equal(S.formatHours(0.5), '< 1 giờ'); assert.equal(S.formatHours(1), '1 giờ'); assert.equal(S.formatHours(19.2), '19 giờ');
      assert.equal(S.formatHours(47.4), '47 giờ'); assert.equal(S.formatHours(48), '2 ngày'); assert.equal(S.formatHours(60), '2,5 ngày');
      assert.equal(S.formatHours(-1), '—'); assert.equal(S.formatHours(NaN), '—'); assert.equal(S.formatHours(null), '—');
    });
    it('danh mục: 7 mục, id lạ → Khác', function () {
      assert.equal(S.DANH_MUC.length, 7); assert.equal(S.danhMucTen('thiet_bi'), 'Thiết bị'); assert.equal(S.danhMucTen('xyz'), 'Khác');
      assert.equal(S.danhMucTen(undefined), 'Khác'); assert.equal(new Set(S.DANH_MUC.map(function (d) { return d.cat; })).size, 7);
    });
  });

  describe('tháng', function () {
    it('shiftMonth qua biên năm và nhiều tháng', function () {
      assert.equal(S.shiftMonth('2026-11', 1), '2026-12'); assert.equal(S.shiftMonth('2026-12', 1), '2027-01'); assert.equal(S.shiftMonth('2026-01', -1), '2025-12');
      assert.equal(S.shiftMonth('2026-01', -13), '2024-12'); assert.equal(S.shiftMonth('2026-06', 0), '2026-06'); assert.equal(S.shiftMonth('hỏng', 1), 'hỏng');
    });
    it('monthOf / monthLabel / monthShort / isValidMonth', function () {
      assert.equal(S.monthOf('2026-11-02'), '2026-11'); assert.equal(S.monthOf('2026-02-30'), null); assert.equal(S.monthOf(null), null);
      assert.equal(S.monthLabel('2026-11'), 'Tháng 11/2026'); assert.equal(S.monthLabel('2026-01'), 'Tháng 1/2026'); assert.equal(S.monthLabel('x'), '');
      assert.equal(S.monthShort('2026-11'), 'T11'); assert.equal(S.monthShort('2026-03'), 'T3');
      assert.equal(S.isValidMonth('2026-12'), true); assert.equal(S.isValidMonth('2026-13'), false); assert.equal(S.isValidMonth('2026-00'), false);
    });
    it('todayStr dùng giờ địa phương', function () { assert.equal(S.todayStr(new Date(2026, 0, 5, 23, 59)), '2026-01-05'); });
  });

  describe('prepare – làm sạch dữ liệu', function () {
    it('dữ liệu chuẩn: giữ đủ 11 khoản, không bỏ qua khoản nào', function () {
      var p = S.prepare(DS()); assert.equal(p.rows.length, 11); assert.equal(p.skipped, 0);
    });
    it('đổi tên trường đúng: tháng, số tiền = SL × đơn giá làm tròn', function () {
      var r = rows().filter(function (x) { return x.id === 'a2'; })[0];
      assert.equal(r.month, '2026-11'); assert.equal(r.amount, 450000); assert.equal(r.tt, 'da_duyet'); assert.equal(r.nv, 'nv2'); assert.equal(r.dm, 'van_phong_pham');
    });
    it('bỏ qua và đếm khoản hỏng', function () {
      var bad = [null, 5, 'x', [], {}, { id: 'a' },
        mk({ id: 'b1', tt: 'khong_ro' }), mk({ id: 'b2', ngay: '2026-02-30' }), Object.assign(mk({ id: 'b3' }), { ngay: '' }),
        Object.assign(mk({ id: 'b4' }), { soLuong: 'x' }), Object.assign(mk({ id: 'b5' }), { donGia: -1 }), Object.assign(mk({ id: 'b6' }), { donGia: 1.5 }),
        Object.assign(mk({ id: 'b7' }), { nhanVienId: '' }), Object.assign(mk({ id: 'b8' }), { soLuong: NaN }), Object.assign(mk({ id: 'b9' }), { soLuong: -2 }),
        mk({ id: 'ok' })];
      var p = S.prepare(bad);
      assert.deepEqual(p.rows.map(function (r) { return r.id; }), ['ok']); assert.equal(p.skipped, bad.length - 1);
    });
    it('id trùng: chỉ giữ khoản đầu, đếm khoản sau là lỗi', function () {
      var p = S.prepare([mk({ id: 'd' }), mk({ id: 'd', dg: 999 })]); assert.equal(p.rows.length, 1); assert.equal(p.skipped, 1); assert.equal(p.rows[0].amount, 100000);
    });
    it('đầu vào không phải mảng → rỗng, không ném lỗi', function () {
      [null, undefined, 'x', {}, 5].forEach(function (v) { var p = S.prepare(v); assert.equal(p.rows.length, 0); assert.equal(p.skipped, 0); });
    });
    it('danh mục lạ được tính vào Khác; ncc thiếu → chuỗi rỗng', function () {
      var r = S.prepare([Object.assign(mk({ id: 'z' }), { danhMuc: 'lạ', nhaCungCap: undefined })]).rows[0];
      assert.equal(r.dm, 'khac'); assert.equal(r.ncc, '');
    });
    it('amountOf: làm tròn nửa lên, giá trị hỏng → NaN', function () {
      assert.equal(S.amountOf({ soLuong: 2.5, donGia: 1 }), 3); assert.equal(S.amountOf({ soLuong: 0.333, donGia: 3 }), 1);
      assert.equal(S.amountOf({ soLuong: 1000000, donGia: 1e9 }), 1e15);
      [null, {}, { soLuong: '1', donGia: 1 }, { soLuong: 1, donGia: 1.2 }, { soLuong: 1e15, donGia: 5 }, { soLuong: Infinity, donGia: 1 }].forEach(function (b) { assert.ok(Number.isNaN(S.amountOf(b))); });
    });
  });

  describe('monthStats (tháng 11/2026)', function () {
    var R = rows();
    it('tổng quan toàn bộ', function () {
      var m = S.monthStats(R, '2026-11');
      assert.deepEqual(m.approved, { count: 4, total: 6775000 }); assert.deepEqual(m.pending, { count: 1, total: 720000 });
      assert.deepEqual(m.rejected, { count: 1, total: 1950000 }); assert.equal(m.count, 6);
      assert.equal(m.avgApproved, 1693750); assert.equal(m.approvalRate, 80); approx(m.avgProcessHours, 19.2, 1e-9);
      assert.deepEqual(m.largest, { id: 'a1', ncc: 'Máy in Canon', nv: 'nv1', amount: 4850000 });
    });
    it('lọc theo nhân viên', function () {
      var a = S.monthStats(R, '2026-11', { nhanVienId: 'nv1' });
      assert.deepEqual(a.approved, { count: 3, total: 6325000 }); assert.equal(a.count, 3); assert.equal(a.approvalRate, 100); approx(a.avgProcessHours, 26, 1e-9);
      var b = S.monthStats(R, '2026-11', { nhanVienId: 'nv2' });
      assert.deepEqual(b.approved, { count: 1, total: 450000 }); assert.deepEqual(b.rejected, { count: 1, total: 1950000 }); assert.equal(b.approvalRate, 50);
    });
    it('chỉ có khoản chờ: các chỉ số dựa trên Đã duyệt là null', function () {
      var c = S.monthStats(R, '2026-11', { nhanVienId: 'nv3' });
      assert.deepEqual(c.pending, { count: 1, total: 720000 }); assert.equal(c.approved.total, 0);
      assert.equal(c.avgApproved, null); assert.equal(c.largest, null); assert.equal(c.approvalRate, null); assert.equal(c.avgProcessHours, null);
    });
    it('tháng trống', function () {
      var e = S.monthStats(R, '2026-08');
      assert.equal(e.count, 0); assert.deepEqual(e.approved, { count: 0, total: 0 }); assert.equal(e.avgApproved, null); assert.equal(e.largest, null);
    });
    it('nhân viên không có trong dữ liệu → trống', function () { assert.equal(S.monthStats(R, '2026-11', { nhanVienId: 'khong_co' }).count, 0); });
    it('"lớn nhất": hòa số tiền thì lấy ngày sớm hơn, rồi id nhỏ hơn', function () {
      var t = rows([mk({ id: 'z2', ngay: '2026-11-03', dg: 500 }), mk({ id: 'z1', ngay: '2026-11-03', dg: 500 }), mk({ id: 'z0', ngay: '2026-11-04', dg: 500 })]);
      assert.equal(S.monthStats(t, '2026-11').largest.id, 'z1');
    });
    it('thời gian xử lý bỏ qua ngày xử lý < ngày gửi hoặc thiếu', function () {
      var x = mk({ id: 'q1', h: 10 }); x.ngayXuLy = new Date(new Date(x.ngayTao).getTime() - 3600000).toISOString();
      var y = mk({ id: 'q2', h: 4 }), z = mk({ id: 'q3', h: 4 }); z.ngayXuLy = null;
      approx(S.monthStats(rows([x, y, z]), '2026-11').avgProcessHours, 4, 1e-9);
    });
    it('không đụng tháng khác khi lọc tháng; không truyền tháng thì cộng tất cả', function () {
      assert.equal(S.monthStats(R, null).count, 11); assert.equal(S.monthStats(R, '2026-10').approved.total, 4400000);
    });
  });

  describe('so sánh & phần trăm', function () {
    it('compare: tăng, giảm, không đổi, mới, cả hai bằng 0', function () {
      var up = S.compare(150, 100); assert.equal(up.diff, 50); assert.equal(up.pct, 50); assert.equal(up.dir, 'up'); assert.equal(up.isNew, false);
      var dn = S.compare(50, 100); assert.equal(dn.diff, -50); assert.equal(dn.pct, -50); assert.equal(dn.dir, 'down');
      var sm = S.compare(100, 100); assert.equal(sm.diff, 0); assert.equal(sm.pct, 0); assert.equal(sm.dir, 'same');
      var nw = S.compare(100, 0); assert.equal(nw.pct, null); assert.equal(nw.isNew, true); assert.equal(nw.dir, 'up');
      var z = S.compare(0, 0); assert.equal(z.pct, null); assert.equal(z.isNew, false); assert.equal(z.dir, 'same');
      var gone = S.compare(0, 100); assert.equal(gone.pct, -100); assert.equal(gone.dir, 'down');
    });
    it('compare làm tròn 1 chữ số thập phân', function () { assert.equal(S.compare(4400000, 3000000).pct, 46.7); assert.equal(S.compare(1, 3).pct, -66.7); });
    it('percentsSumTo100: ví dụ cụ thể', function () {
      assert.deepEqual(S.percentsSumTo100([50, 50]), [50, 50]); assert.deepEqual(S.percentsSumTo100([1, 1, 1]), [34, 33, 33]);
      assert.deepEqual(S.percentsSumTo100([4850000, 1250000, 675000]), [72, 18, 10]); assert.deepEqual(S.percentsSumTo100([5]), [100]);
      assert.deepEqual(S.percentsSumTo100([0, 0]), [0, 0]); assert.deepEqual(S.percentsSumTo100([]), []); assert.deepEqual(S.percentsSumTo100([0, 7, 0]), [0, 100, 0]);
    });
    it('percentsSumTo100: 300 mảng ngẫu nhiên luôn cộng đúng 100 và lệch < 1 so với tỷ lệ thật', function () {
      var rnd = rng(12345);
      for (var t = 0; t < 300; t++) {
        var n = 1 + Math.floor(rnd() * 8), v = [];
        for (var i = 0; i < n; i++) v.push(rnd() < 0.2 ? 0 : Math.floor(rnd() * 1e7));
        var tot = v.reduce(function (a, b) { return a + b; }, 0), p = S.percentsSumTo100(v);
        if (tot === 0) { assert.ok(p.every(function (x) { return x === 0; })); continue; }
        assert.equal(p.reduce(function (a, b) { return a + b; }, 0), 100, JSON.stringify(v));
        p.forEach(function (x, i) { assert.ok(Math.abs(x - v[i] / tot * 100) < 1, JSON.stringify(v) + ' @' + i); assert.ok(Number.isInteger(x) && x >= 0); if (v[i] === 0) assert.equal(x, 0); });
      }
    });
  });

  describe('byCategory & pieSlices', function () {
    var R = rows();
    it('chi Đã duyệt theo danh mục, đủ 7 danh mục, giảm dần', function () {
      var c = S.byCategory(R, '2026-11');
      assert.equal(c.total, 6775000); assert.equal(c.count, 4); assert.equal(c.list.length, 7);
      assert.deepEqual(c.list.map(function (x) { return x.danhMuc + ':' + x.total; }),
        ['thiet_bi:4850000', 'van_chuyen:1250000', 'van_phong_pham:675000', 'vat_tu:0', 'tiep_khach:0', 'dich_vu:0', 'khac:0']);
      approx(c.list[0].share, 71.5867, 0.001); assert.equal(c.list[3].share, 0);
    });
    it('không tính khoản Chờ duyệt và Từ chối', function () {
      var c = S.byCategory(R, '2026-11'); var t = c.list.filter(function (x) { return x.danhMuc === 'tiep_khach' || x.danhMuc === 'dich_vu'; });
      assert.ok(t.every(function (x) { return x.total === 0; }));
    });
    it('tháng trống: tổng 0, mọi share = 0', function () {
      var c = S.byCategory(R, '2026-08'); assert.equal(c.total, 0); assert.ok(c.list.every(function (x) { return x.share === 0; }));
    });
    it('lọc theo nhân viên', function () {
      var c = S.byCategory(R, '2026-11', { nhanVienId: 'nv2' }); assert.equal(c.total, 450000); assert.equal(c.list[0].danhMuc, 'van_phong_pham');
    });
    it('pieSlices: bỏ danh mục 0, phần trăm nguyên cộng 100', function () {
      var s = S.pieSlices(S.byCategory(R, '2026-11'));
      assert.deepEqual(s.map(function (x) { return x.danhMuc + ':' + x.pct; }), ['thiet_bi:72', 'van_chuyen:18', 'van_phong_pham:10']);
      assert.equal(s.reduce(function (a, x) { return a + x.pct; }, 0), 100); approx(s.reduce(function (a, x) { return a + x.share; }, 0), 100, 1e-9);
    });
    it('pieSlices: tháng trống → rỗng', function () { assert.deepEqual(S.pieSlices(S.byCategory(R, '2026-08')), []); });
    it('pieSlices: phần < 3% gộp vào Khác (tạo mới), Khác luôn cuối', function () {
      var t = rows([mk({ id: 'p1', dm: 'thiet_bi', dg: 1000000 }), mk({ id: 'p2', dm: 'vat_tu', dg: 20000 }), mk({ id: 'p3', dm: 'dich_vu', dg: 10000 })]);
      var s = S.pieSlices(S.byCategory(t, '2026-11'));
      assert.deepEqual(s.map(function (x) { return x.danhMuc + ':' + x.total + ':' + x.pct; }), ['thiet_bi:1000000:97', 'khac:30000:3']);
    });
    it('pieSlices: gộp vào Khác đã có sẵn và cộng số khoản', function () {
      var t = rows([mk({ id: 'p1', dm: 'thiet_bi', dg: 1000000 }), mk({ id: 'p2', dm: 'khac', dg: 50000 }), mk({ id: 'p3', dm: 'vat_tu', dg: 20000 }), mk({ id: 'p4', dm: 'dich_vu', dg: 10000 })]);
      var s = S.pieSlices(S.byCategory(t, '2026-11'));
      assert.equal(s.length, 2); assert.equal(s[1].danhMuc, 'khac'); assert.equal(s[1].total, 80000); assert.equal(s[1].count, 3);
    });
    it('pieSlices: đúng 3% thì giữ nguyên, 2,99% thì gộp', function () {
      var keep = S.pieSlices(S.byCategory(rows([mk({ id: 'k1', dm: 'thiet_bi', dg: 970000 }), mk({ id: 'k2', dm: 'vat_tu', dg: 30000 })]), '2026-11'));
      assert.deepEqual(keep.map(function (x) { return x.danhMuc; }), ['thiet_bi', 'vat_tu']);
      var merge = S.pieSlices(S.byCategory(rows([mk({ id: 'k1', dm: 'thiet_bi', dg: 970100 }), mk({ id: 'k2', dm: 'vat_tu', dg: 29900 })]), '2026-11'));
      assert.deepEqual(merge.map(function (x) { return x.danhMuc; }), ['thiet_bi', 'khac']);
    });
    it('pieSlices: chỉ một danh mục nhỏ duy nhất vẫn hiện (100%)', function () {
      var s = S.pieSlices(S.byCategory(rows([mk({ id: 'o', dm: 'vat_tu', dg: 5 })]), '2026-11'));
      assert.equal(s.length, 1); assert.equal(s[0].pct, 100);
    });
  });

  describe('monthlySeries', function () {
    var R = rows();
    it('6 tháng cũ → mới, tháng trống bằng 0', function () {
      var s = S.monthlySeries(R, '2026-11', 6);
      assert.deepEqual(s.map(function (x) { return x.month; }), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
      assert.deepEqual(s.map(function (x) { return x.total; }), [0, 0, 0, 3000000, 4400000, 6775000]);
      assert.deepEqual(s.map(function (x) { return x.count; }), [0, 0, 0, 1, 4, 4]);
    });
    it('12 tháng qua biên năm', function () {
      var s = S.monthlySeries(R, '2026-02', 12);
      assert.equal(s.length, 12); assert.equal(s[0].month, '2025-03'); assert.equal(s[11].month, '2026-02'); assert.equal(s[9].month, '2025-12');
    });
    it('lọc theo nhân viên', function () {
      var s = S.monthlySeries(R, '2026-11', 3, { nhanVienId: 'nv2' });
      assert.deepEqual(s.map(function (x) { return x.total; }), [0, 1000000, 450000]);
    });
    it('n = 1 chỉ trả tháng đang chọn; chỉ tính Đã duyệt', function () {
      var s = S.monthlySeries(R, '2026-11', 1); assert.equal(s.length, 1); assert.equal(s[0].total, 6775000);
    });
  });

  describe('categoryComparison (tháng 11 so với tháng 10)', function () {
    var R = rows();
    var cc = S.categoryComparison(R, '2026-11');
    it('thứ tự và số liệu từng danh mục', function () {
      assert.deepEqual(cc.list.map(function (c) { return c.danhMuc; }), ['thiet_bi', 'van_chuyen', 'van_phong_pham', 'tiep_khach']);
      var by = {}; cc.list.forEach(function (c) { by[c.danhMuc] = c; });
      assert.deepEqual([by.thiet_bi.cur, by.thiet_bi.prev, by.thiet_bi.diff, by.thiet_bi.pct], [4850000, 2000000, 2850000, 142.5]);
      assert.deepEqual([by.van_chuyen.cur, by.van_chuyen.prev, by.van_chuyen.diff, by.van_chuyen.pct], [1250000, 1000000, 250000, 25]);
      assert.deepEqual([by.van_phong_pham.cur, by.van_phong_pham.prev, by.van_phong_pham.diff, by.van_phong_pham.pct], [675000, 400000, 275000, 68.8]);
      assert.deepEqual([by.tiep_khach.cur, by.tiep_khach.prev, by.tiep_khach.diff, by.tiep_khach.pct, by.tiep_khach.dir], [0, 1000000, -1000000, -100, 'down']);
    });
    it('tổng hai tháng và chênh lệch tổng', function () {
      assert.equal(cc.curTotal, 6775000); assert.equal(cc.prevTotal, 4400000); assert.equal(cc.total.diff, 2375000); assert.equal(cc.total.pct, 54); assert.equal(cc.total.dir, 'up');
    });
    it('danh mục chỉ có ở một tháng: "Mới" khi tháng trước = 0', function () {
      var m = S.categoryComparison(R, '2026-10'); // so với tháng 9 chỉ có dịch vụ
      var tb = m.list.filter(function (c) { return c.danhMuc === 'thiet_bi'; })[0];
      assert.equal(tb.isNew, true); assert.equal(tb.pct, null); assert.equal(tb.prev, 0);
      var dv = m.list.filter(function (c) { return c.danhMuc === 'dich_vu'; })[0];
      assert.equal(dv.cur, 0); assert.equal(dv.prev, 3000000); assert.equal(dv.dir, 'down');
    });
    it('không có danh mục nào trong cả hai tháng → danh sách rỗng', function () { assert.equal(S.categoryComparison(R, '2026-03').list.length, 0); });
    it('tổng các dòng = tổng của tháng (cả hai tháng)', function () {
      assert.equal(cc.list.reduce(function (a, c) { return a + c.cur; }, 0), cc.curTotal); assert.equal(cc.list.reduce(function (a, c) { return a + c.prev; }, 0), cc.prevTotal);
    });
    it('lọc theo nhân viên', function () {
      var m = S.categoryComparison(R, '2026-11', { nhanVienId: 'nv1' });
      assert.equal(m.curTotal, 6325000); assert.equal(m.prevTotal, 2000000);
    });
  });

  describe('byEmployee', function () {
    var R = rows();
    it('tháng 11: tổng số đề nghị, tiền theo trạng thái, tỷ trọng, từ trước đến nay', function () {
      var e = S.byEmployee(R, '2026-11', NV);
      assert.deepEqual(e.map(function (x) { return x.id; }), ['nv1', 'nv2', 'nv3']);
      var a = e[0]; assert.equal(a.ten, 'Nguyễn Văn An'); assert.equal(a.monthCount, 3); assert.deepEqual(a.approved, { count: 3, total: 6325000 });
      assert.deepEqual(a.pending, { count: 0, total: 0 }); assert.equal(a.allTimeCount, 5); approx(a.share, 93.358, 0.001);
      var b = e[1]; assert.equal(b.monthCount, 2); assert.deepEqual(b.approved, { count: 1, total: 450000 }); assert.deepEqual(b.rejected, { count: 1, total: 1950000 }); assert.equal(b.allTimeCount, 3);
      var c = e[2]; assert.equal(c.monthCount, 1); assert.deepEqual(c.pending, { count: 1, total: 720000 }); assert.equal(c.share, 0); assert.equal(c.allTimeCount, 2);
    });
    it('nhân viên đã ngưng chỉ xuất hiện khi có khoản trong tháng, kèm cờ ngung', function () {
      assert.equal(S.byEmployee(R, '2026-11', NV).some(function (x) { return x.id === 'nv4'; }), false);
      var oct = S.byEmployee(R, '2026-10', NV), d = oct.filter(function (x) { return x.id === 'nv4'; })[0];
      assert.ok(d); assert.equal(d.ngung, true); assert.equal(d.monthCount, 1); assert.equal(d.allTimeCount, 1);
    });
    it('nhân viên đang hoạt động không có khoản vẫn hiện với 0', function () {
      var e = S.byEmployee(R, '2026-08', NV); assert.equal(e.length, 3); assert.ok(e.every(function (x) { return x.monthCount === 0 && x.approved.total === 0 && x.share === 0; }));
    });
    it('mã nhân viên không có trong danh bạ → "Nhân viên không rõ"', function () {
      var e = S.byEmployee(rows([mk({ id: 'u', nv: 'ma_la' })]), '2026-11', []);
      assert.equal(e.length, 1); assert.equal(e[0].ten, 'Nhân viên không rõ'); assert.equal(e[0].ngung, false);
    });
    it('danh bạ rỗng/null không ném lỗi', function () {
      assert.deepEqual(S.byEmployee(R, '2026-08', null), []); assert.deepEqual(S.byEmployee(R, '2026-08', undefined), []);
    });
    it('sortEmployees: theo từng khóa, hai chiều, hòa thì theo tên', function () {
      var e = S.byEmployee(R, '2026-11', NV);
      assert.deepEqual(S.sortEmployees(e, 'approved', 'asc').map(function (x) { return x.id; }), ['nv3', 'nv2', 'nv1']);
      assert.deepEqual(S.sortEmployees(e, 'pending', 'desc').map(function (x) { return x.id; }), ['nv3', 'nv1', 'nv2']);
      assert.deepEqual(S.sortEmployees(e, 'monthCount', 'desc').map(function (x) { return x.id; }), ['nv1', 'nv2', 'nv3']);
      assert.deepEqual(S.sortEmployees(e, 'rejected', 'desc').map(function (x) { return x.id; }), ['nv2', 'nv3', 'nv1'], 'nv1 và nv3 cùng 0 → xếp theo tên (Lê trước Nguyễn)');
      assert.deepEqual(S.sortEmployees(e, 'allTime', 'desc').map(function (x) { return x.id; }), ['nv1', 'nv2', 'nv3']);
      assert.deepEqual(S.sortEmployees(e, 'khóa_lạ', 'desc').map(function (x) { return x.id; }), ['nv1', 'nv2', 'nv3'], 'khóa lạ → mặc định theo Đã duyệt');
    });
    it('sortEmployees không đổi mảng gốc', function () {
      var e = S.byEmployee(R, '2026-11', NV), ids = e.map(function (x) { return x.id; }); S.sortEmployees(e, 'approved', 'asc');
      assert.deepEqual(e.map(function (x) { return x.id; }), ids);
    });
    it('employeeTotals khớp tổng toàn tháng', function () {
      var t = S.employeeTotals(S.byEmployee(R, '2026-11', NV)), m = S.monthStats(R, '2026-11');
      assert.equal(t.monthCount, 6); assert.deepEqual(t.approved, m.approved); assert.deepEqual(t.pending, m.pending); assert.deepEqual(t.rejected, m.rejected); assert.equal(t.allTimeCount, 10);
    });
  });

  describe('topSuppliers', function () {
    var R = rows();
    it('gộp không phân biệt hoa thường, giảm dần theo tiền, chỉ Đã duyệt', function () {
      var t = S.topSuppliers(R, '2026-11');
      assert.deepEqual(t.map(function (x) { return x.name + ':' + x.total + ':' + x.count; }), ['Máy in Canon:4850000:1', 'Cước vận chuyển:1250000:1', 'Giấy A4:675000:2']);
    });
    it('giới hạn n (mặc định 5) và bỏ nội dung rỗng', function () {
      var many = []; for (var i = 0; i < 9; i++) many.push(mk({ id: 'm' + i, ncc: 'NCC ' + i, dg: 1000 * (i + 1) }));
      many.push(mk({ id: 'blank', ncc: '   ', dg: 9e8 }));
      var r = rows(many);
      assert.equal(S.topSuppliers(r, '2026-11').length, 5); assert.equal(S.topSuppliers(r, '2026-11', {}, 3).length, 3);
      assert.equal(S.topSuppliers(r, '2026-11')[0].name, 'NCC 8'); assert.ok(S.topSuppliers(r, '2026-11', {}, 20).every(function (x) { return x.name.trim() !== ''; }));
    });
    it('hòa số tiền thì xếp theo tên', function () {
      var t = S.topSuppliers(rows([mk({ id: 'h1', ncc: 'Beta', dg: 500 }), mk({ id: 'h2', ncc: 'Alpha', dg: 500 })]), '2026-11');
      assert.deepEqual(t.map(function (x) { return x.name; }), ['Alpha', 'Beta']);
    });
    it('khoảng trắng thừa được coi là cùng một tên', function () {
      var t = S.topSuppliers(rows([mk({ id: 's1', ncc: 'Giấy   A4', dg: 100 }), mk({ id: 's2', ncc: 'giấy a4 ', dg: 100 })]), '2026-11');
      assert.equal(t.length, 1); assert.equal(t[0].count, 2);
    });
    it('tháng trống và lọc nhân viên', function () {
      assert.deepEqual(S.topSuppliers(R, '2026-08'), []);
      assert.deepEqual(S.topSuppliers(R, '2026-11', { nhanVienId: 'nv2' }).map(function (x) { return x.name; }), ['Giấy A4']);
    });
  });

  describe('highlights (Điểm chính)', function () {
    var R = rows();
    it('tháng 11, Quản lý: đủ 5 nhận xét theo đúng thứ tự', function () {
      var h = S.highlights(R, '2026-11', {}, NV);
      assert.deepEqual(h.map(function (x) { return x.kind; }), ['top-category', 'mom', 'rise', 'top-employee', 'pending']);
      assert.equal(h[0].text, 'Chi nhiều nhất: Thiết bị – 71,6% (4.850.000 ₫)');
      assert.equal(h[1].text, 'Tổng chi Đã duyệt tăng 54% so với Tháng 10/2026');
      assert.equal(h[2].text, 'Tăng nhiều nhất so với tháng trước: Thiết bị (+2.850.000 ₫)');
      assert.equal(h[3].text, 'Nhân viên chi nhiều nhất: Nguyễn Văn An (6.325.000 ₫)');
      assert.equal(h[4].text, 'Còn 1 khoản chờ duyệt, tổng 720.000 ₫');
    });
    it('khi đã lọc một nhân viên: không có dòng "nhân viên chi nhiều nhất"', function () {
      var h = S.highlights(R, '2026-11', { nhanVienId: 'nv1' }, NV);
      assert.ok(h.every(function (x) { return x.kind !== 'top-employee'; }));
    });
    it('Nhân viên (không truyền danh bạ) cũng không có dòng đó', function () {
      assert.ok(S.highlights(R, '2026-11', { nhanVienId: 'nv1' }, null).every(function (x) { return x.kind !== 'top-employee'; }));
    });
    it('tháng không có đề nghị', function () {
      assert.deepEqual(S.highlights(R, '2026-08', {}, NV), [{ kind: 'empty', text: 'Tháng này chưa có đề nghị nào.' }]);
    });
    it('chỉ có khoản chờ: báo chưa có Đã duyệt, vẫn nêu số khoản chờ', function () {
      var h = S.highlights(R, '2026-11', { nhanVienId: 'nv3' }, NV);
      assert.deepEqual(h.map(function (x) { return x.kind; }), ['no-approved', 'pending']); assert.equal(h[0].text, 'Chưa có khoản Đã duyệt trong tháng.');
    });
    it('tháng trước chưa có khoản Đã duyệt: không so sánh phần trăm', function () {
      var h = S.highlights(R, '2026-09', {}, NV);
      assert.equal(h[1].kind, 'mom'); assert.equal(h[1].text, 'Tháng trước chưa có khoản Đã duyệt nên chưa so sánh được.');
      assert.ok(h.every(function (x) { return x.kind !== 'rise'; }));
    });
    it('tháng giảm: dùng từ "giảm"; danh mục mới trong tháng', function () {
      var r2 = rows([mk({ id: 'p', ngay: '2026-10-05', dm: 'thiet_bi', dg: 1000000 }), mk({ id: 'q', ngay: '2026-11-05', dm: 'vat_tu', dg: 400000 })]);
      var h = S.highlights(r2, '2026-11', {}, []);
      assert.equal(h.filter(function (x) { return x.kind === 'mom'; })[0].text, 'Tổng chi Đã duyệt giảm 60% so với Tháng 10/2026');
      assert.equal(h.filter(function (x) { return x.kind === 'rise'; })[0].text, 'Danh mục mới trong tháng: Vật tư (400.000 ₫)');
    });
    it('không đổi so với tháng trước', function () {
      var r2 = rows([mk({ id: 'p', ngay: '2026-10-05', dg: 1000 }), mk({ id: 'q', ngay: '2026-11-05', dg: 1000 })]);
      assert.equal(S.highlights(r2, '2026-11', {}, []).filter(function (x) { return x.kind === 'mom'; })[0].text, 'Tổng chi Đã duyệt không đổi so với Tháng 10/2026');
    });
    it('tháng 10: tăng 46,7% và danh mục mới', function () {
      var h = S.highlights(R, '2026-10', {}, NV);
      assert.equal(h[0].text, 'Chi nhiều nhất: Thiết bị – 45,5% (2.000.000 ₫)');
      assert.equal(h[1].text, 'Tổng chi Đã duyệt tăng 46,7% so với Tháng 9/2026');
      assert.equal(h[2].text, 'Danh mục mới trong tháng: Thiết bị (2.000.000 ₫)');
    });
  });

  describe('bất biến trên dữ liệu ngẫu nhiên (250 bộ dữ liệu)', function () {
    function gen(seed) {
      var rnd = rng(seed), n = Math.floor(rnd() * 60), items = [];
      var cats = S.DANH_MUC.map(function (d) { return d.id; }), sts = ['da_duyet', 'cho_duyet', 'tu_choi', 'da_duyet'];
      var emps = ['nv1', 'nv2', 'nv3', 'nv4', 'nv_la'];
      for (var i = 0; i < n; i++) {
        var mo = 1 + Math.floor(rnd() * 12), yr = rnd() < 0.2 ? 2025 : 2026, da = 1 + Math.floor(rnd() * 28);
        items.push(mk({ id: 'r' + seed + '_' + i, ngay: yr + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0'),
          nv: emps[Math.floor(rnd() * emps.length)], dm: cats[Math.floor(rnd() * cats.length)], tt: sts[Math.floor(rnd() * sts.length)],
          sl: Math.round((0.1 + rnd() * 20) * 1000) / 1000, dg: Math.floor(rnd() * 5e6), ncc: 'NCC ' + Math.floor(rnd() * 6), h: Math.floor(rnd() * 100) }));
      }
      return items;
    }
    it('các cách cộng khác nhau luôn khớp nhau', function () {
      for (var seed = 1; seed <= 250; seed++) {
        var R = S.prepare(gen(seed)).rows, month = '2026-' + String(1 + (seed % 12)).padStart(2, '0');
        var ms = S.monthStats(R, month), cat = S.byCategory(R, month);
        var ctx = 'seed ' + seed + ' ' + month;
        assert.equal(ms.approved.count + ms.pending.count + ms.rejected.count, ms.count, ctx);
        assert.equal(cat.list.reduce(function (a, c) { return a + c.total; }, 0), ms.approved.total, 'danh mục ' + ctx);
        assert.equal(cat.list.reduce(function (a, c) { return a + c.count; }, 0), ms.approved.count, ctx);
        var emps = S.byEmployee(R, month, NV), et = S.employeeTotals(emps);
        assert.equal(et.approved.total, ms.approved.total, 'nhân viên ' + ctx); assert.equal(et.monthCount, ms.count, ctx);
        assert.equal(et.pending.total, ms.pending.total, ctx); assert.equal(et.rejected.count, ms.rejected.count, ctx);
        var listed = {}; emps.forEach(function (e) { listed[e.id] = true; });
        assert.equal(et.allTimeCount, R.filter(function (r) { return listed[r.nv]; }).length, 'tổng mọi tháng của những người được liệt kê ' + ctx);
        var ser = S.monthlySeries(R, month, 6); assert.equal(ser[5].total, ms.approved.total, 'chuỗi ' + ctx);
        var cc = S.categoryComparison(R, month); assert.equal(cc.curTotal, ms.approved.total, ctx); assert.equal(cc.prevTotal, S.monthStats(R, S.shiftMonth(month, -1)).approved.total, ctx);
        var pie = S.pieSlices(cat);
        if (ms.approved.total > 0) {
          assert.equal(pie.reduce(function (a, s) { return a + s.pct; }, 0), 100, 'pct ' + ctx);
          assert.equal(pie.reduce(function (a, s) { return a + s.total; }, 0), ms.approved.total, 'pie ' + ctx);
          assert.ok(pie.every(function (s) { return s.total > 0; }), ctx);
        } else assert.equal(pie.length, 0, ctx);
        var sup = S.topSuppliers(R, month, {}, 100); assert.equal(sup.reduce(function (a, s) { return a + s.total; }, 0), ms.approved.total, 'nhà cung cấp ' + ctx);
        var sumEmp = 0; ['nv1', 'nv2', 'nv3', 'nv4', 'nv_la'].forEach(function (id) { sumEmp += S.monthStats(R, month, { nhanVienId: id }).approved.total; });
        assert.equal(sumEmp, ms.approved.total, 'lọc từng người ' + ctx);
      }
    });
  });
})();
