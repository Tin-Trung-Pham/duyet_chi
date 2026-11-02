/* Test logic thuần: emp-model.js */
(function () {
  var M = DncEmpModel;
  function ids(l) { return l.map(function (x) { return x.id; }); }

  describe('validate – mã nhân viên', function () {
    [['NV001', 'NV001'], ['nv001', 'NV001'], ['  nv-002  ', 'NV-002'], ['a.b_c-9', 'A.B_C-9'], ['9', '9'], ['A', 'A'], ['x'.repeat(20), 'X'.repeat(20)], ['Nv003', 'NV003']].forEach(function (c) {
      it('nhận ' + JSON.stringify(c[0]) + ' → ' + c[1], function () {
        var r = M.validate({ ma: c[0], hoTen: 'An' }); assert.ok(r.ok, JSON.stringify(r.errors)); assert.equal(r.value.ma, c[1]);
      });
    });
    [['', 'Nhập mã nhân viên'], ['   ', 'Nhập mã nhân viên'], [null, 'Nhập mã nhân viên'], [undefined, 'Nhập mã nhân viên'],
      ['x'.repeat(21), 'Tối đa 20 ký tự'], ['NV 001', 'chỉ gồm chữ cái không dấu'], ['NVĐ1', 'chỉ gồm chữ cái không dấu'], ['nhân01', 'chỉ gồm chữ cái không dấu'],
      ['-NV1', 'chỉ gồm chữ cái không dấu'], ['.NV1', 'chỉ gồm chữ cái không dấu'], ['_1', 'chỉ gồm chữ cái không dấu'], ['NV/1', 'chỉ gồm chữ cái không dấu'],
      ['<b>', 'chỉ gồm chữ cái không dấu'], ['NV1;DROP', 'chỉ gồm chữ cái không dấu'], ['😀', 'chỉ gồm chữ cái không dấu'], ['NV1\n2', 'chỉ gồm chữ cái không dấu']].forEach(function (c) {
      it('từ chối ' + JSON.stringify(c[0]), function () {
        var r = M.validate({ ma: c[0], hoTen: 'An' }); assert.equal(r.ok, false); assert.equal(r.value, null); assert.match(r.errors.ma, new RegExp(c[1])); assert.equal(r.errors.hoTen, undefined);
      });
    });
    it('đúng 20 ký tự: ok; 21: lỗi có số ký tự đang nhập', function () {
      assert.ok(M.validate({ ma: 'A'.repeat(20), hoTen: 'An' }).ok);
      assert.equal(M.validate({ ma: 'A'.repeat(21), hoTen: 'An' }).errors.ma, 'Tối đa 20 ký tự (đang nhập 21)');
    });
    it('trùng mã: không phân biệt hoa/thường, nêu tên người đang dùng', function () {
      var others = [{ id: 'a', ma: 'NV001', hoTen: 'Nguyễn Văn An' }];
      assert.equal(M.validate({ ma: 'nv001', hoTen: 'X' }, { others: others }).errors.ma, 'Mã này đã được dùng bởi Nguyễn Văn An');
      assert.equal(M.validate({ ma: 'NV001', hoTen: 'X' }, { others: others }).ok, false);
    });
    it('không tính là trùng với chính mình (selfId); trùng với người khác vẫn bị bắt', function () {
      var others = [{ id: 'a', ma: 'NV001', hoTen: 'An' }, { id: 'b', ma: 'NV002', hoTen: 'Bình' }];
      assert.ok(M.validate({ ma: 'nv001', hoTen: 'An' }, { others: others, selfId: 'a' }).ok);
      assert.equal(M.validate({ ma: 'NV002', hoTen: 'An' }, { others: others, selfId: 'a' }).ok, false);
    });
    it('others rỗng/không hợp lệ không gây lỗi', function () {
      assert.ok(M.validate({ ma: 'A1', hoTen: 'x' }, { others: [null, undefined, {}, { id: 'z' }] }).ok);
      assert.ok(M.validate({ ma: 'A1', hoTen: 'x' }, {}).ok); assert.ok(M.validate({ ma: 'A1', hoTen: 'x' }).ok);
    });
    it('mã đã lưu có chữ thường vẫn được so sánh đúng', function () {
      assert.equal(M.validate({ ma: 'NV9', hoTen: 'x' }, { others: [{ id: 'a', ma: ' nv9 ', hoTen: 'Cũ' }] }).ok, false);
    });
  });

  describe('validate – họ tên', function () {
    it('gộp khoảng trắng thừa, cắt hai đầu, giữ tiếng Việt có dấu', function () {
      var r = M.validate({ ma: 'A1', hoTen: '  Nguyễn   Văn \t An  ' }); assert.ok(r.ok); assert.equal(r.value.hoTen, 'Nguyễn Văn An');
    });
    it('rỗng / khoảng trắng / null → lỗi', function () {
      ['', '   ', '\n\t', null, undefined].forEach(function (v) { assert.equal(M.validate({ ma: 'A1', hoTen: v }).errors.hoTen, 'Nhập họ và tên'); });
    });
    it('đúng 60 ký tự ok, 61 lỗi; emoji tính 1 ký tự', function () {
      assert.ok(M.validate({ ma: 'A1', hoTen: 'a'.repeat(60) }).ok);
      assert.equal(M.validate({ ma: 'A1', hoTen: 'a'.repeat(61) }).errors.hoTen, 'Tối đa 60 ký tự (đang nhập 61)');
      assert.ok(M.validate({ ma: 'A1', hoTen: '😀'.repeat(60) }).ok); assert.equal(M.validate({ ma: 'A1', hoTen: '😀'.repeat(61) }).ok, false);
    });
    it('ký tự điều khiển không hợp lệ', function () { assert.match(M.validate({ ma: 'A1', hoTen: 'An\u0007Bình' }).errors.hoTen, /không hợp lệ/); });
    it('cho phép trùng họ tên (mã mới là khóa duy nhất)', function () {
      assert.ok(M.validate({ ma: 'A2', hoTen: 'Nguyễn Văn An' }, { others: [{ id: 'a', ma: 'A1', hoTen: 'Nguyễn Văn An' }] }).ok);
    });
    it('giữ nguyên ký tự HTML (thoát ký tự thuộc tầng hiển thị)', function () { assert.equal(M.validate({ ma: 'A1', hoTen: '<b>An</b> & "Bình"' }).value.hoTen, '<b>An</b> & "Bình"'); });
    it('báo lỗi cả hai trường cùng lúc; validate(undefined) không ném lỗi', function () {
      var r = M.validate({ ma: '', hoTen: '' }); assert.deepEqual(Object.keys(r.errors).sort(), ['hoTen', 'ma']);
      assert.equal(M.validate(undefined).ok, false);
    });
  });

  describe('tìm kiếm không dấu', function () {
    var E = { ma: 'NV002', hoTen: 'Trần Thị Bình' };
    ['binh', 'BINH', 'Bình', 'bình', 'tran thi', 'thi tran', 'nv002', 'NV', '002', 'tran 002', 'ình', '  binh  ', ''].forEach(function (q) {
      it('"' + q + '" khớp Trần Thị Bình / NV002', function () { assert.equal(M.matches(E, q), true); });
    });
    ['xyz', 'binh xyz', 'nv003', 'trần văn', 'Đức'].forEach(function (q) { it('"' + q + '" không khớp', function () { assert.equal(M.matches(E, q), false); }); });
    it('chữ đ/Đ được bỏ dấu: "dung" khớp Phạm Thu Dung và "do" khớp Đỗ Minh Khôi', function () {
      assert.equal(M.matches({ ma: 'X', hoTen: 'Đỗ Minh Khôi' }, 'do minh'), true); assert.equal(M.matches({ ma: 'X', hoTen: 'Đỗ Minh Khôi' }, 'khoi'), true);
      assert.equal(M.matches({ ma: 'X', hoTen: 'Đặng Văn Dũng' }, 'dang van dung'), true);
    });
    it('người dùng gõ "đ" thường hoặc "Đ" hoa đều khớp tên có "Đ"/"đ" và cả khi gõ "d"', function () {
      var e = { ma: 'X', hoTen: 'Đỗ Minh Khôi' };
      ['đỗ minh', 'Đỗ', 'do minh', 'đ', 'DỖ'].forEach(function (q) { assert.equal(M.matches(e, q), true, q); });
      assert.equal(M.fold('đ'), 'd'); assert.equal(M.fold('Đ'), 'd'); assert.equal(M.matches({ ma: 'X', hoTen: 'Vũ Đức' }, 'đức'), true);
    });
    it('fold: bỏ dấu và về chữ thường', function () { assert.equal(M.fold('Nguyễn Đình Thắng'), 'nguyen dinh thang'); assert.equal(M.fold(null), ''); });
    it('dấu tổ hợp (NFD) cũng khớp', function () { assert.equal(M.matches({ ma: 'X', hoTen: 'Bình' }, 'binh'), true); });
  });

  describe('requestStats & statsOf', function () {
    var S = M.requestStats(REQS());
    it('đếm theo nhân viên: số đề nghị, chờ, từ chối, đã duyệt + tổng tiền', function () {
      assert.deepEqual(S.nv1, { count: 3, pending: 1, rejected: 0, approved: { count: 2, total: 5300000 } });
      assert.deepEqual(S.nv2, { count: 2, pending: 0, rejected: 1, approved: { count: 1, total: 1950000 } });
      assert.deepEqual(S.nv4, { count: 1, pending: 0, rejected: 0, approved: { count: 1, total: 400000 } });
      assert.equal(S.nv3, undefined);
    });
    it('statsOf trả bản rỗng cho người chưa có đề nghị', function () {
      assert.deepEqual(M.statsOf(S, 'nv3'), { count: 0, pending: 0, rejected: 0, approved: { count: 0, total: 0 } }); assert.equal(M.statsOf(null, 'x').count, 0);
    });
    it('khoản dữ liệu lỗi vẫn được ĐẾM (để không xóa nhầm) nhưng không cộng tiền', function () {
      var s = M.requestStats([{ id: 'a', nhanVienId: 'x', trangThai: 'da_duyet', soLuong: 'abc', donGia: 5 }, { id: 'b', nhanVienId: 'x', trangThai: 'la', soLuong: 1, donGia: 1 }, req({ nv: 'x', dg: 1000 })]);
      assert.equal(s.x.count, 3); assert.equal(s.x.approved.count, 2); assert.equal(s.x.approved.total, 1000);
    });
    it('bỏ qua phần tử rác và khoản không có nhân viên; mã số được chuyển thành chuỗi', function () {
      var s = M.requestStats([null, 5, 'x', [], {}, { nhanVienId: '' }, { nhanVienId: null }, { nhanVienId: 7, trangThai: 'cho_duyet' }]);
      assert.deepEqual(Object.keys(s), ['7']); assert.equal(s['7'].pending, 1);
    });
    it('đầu vào không phải mảng → rỗng', function () { [null, undefined, 'x', {}, 5].forEach(function (v) { assert.deepEqual(M.requestStats(v), {}); }); });
    it('cộng chính xác số lớn (không mất độ chính xác)', function () {
      var big = req({ nv: 'z', sl: 1000000, dg: 1e9 }); var s = M.requestStats([big, big, big]);
      assert.equal(s.z.approved.total, 3e15);
    });
    it('amountOf: làm tròn nửa lên, giá trị hỏng → NaN', function () {
      assert.equal(M.amountOf({ soLuong: 2.5, donGia: 1 }), 3); assert.ok(Number.isNaN(M.amountOf({ soLuong: 1, donGia: 1.5 }))); assert.ok(Number.isNaN(M.amountOf(null)));
    });
  });

  describe('lọc, đếm, sắp xếp', function () {
    var L = EMPS();
    it('counts', function () { assert.deepEqual(M.counts(L), { total: 4, active: 3, inactive: 1 }); assert.deepEqual(M.counts([]), { total: 0, active: 0, inactive: 0 }); });
    it('filter theo trạng thái', function () {
      assert.deepEqual(ids(M.filter(L, { status: 'active' })), ['nv1', 'nv2', 'nv3']); assert.deepEqual(ids(M.filter(L, { status: 'inactive' })), ['nv4']);
      assert.equal(M.filter(L, { status: 'all' }).length, 4); assert.equal(M.filter(L, {}).length, 4); assert.equal(M.filter(L).length, 4);
    });
    it('filter kết hợp tìm kiếm và trạng thái', function () {
      assert.deepEqual(ids(M.filter(L, { q: 'dung' })), ['nv4']); assert.deepEqual(ids(M.filter(L, { q: 'dung', status: 'active' })), []);
      assert.deepEqual(ids(M.filter(L, { q: 'nv00', status: 'active' })), ['nv1', 'nv2', 'nv3']);
    });
    it('givenName lấy từ cuối', function () { assert.equal(M.givenName('Nguyễn Văn An'), 'An'); assert.equal(M.givenName('  Bình '), 'Bình'); assert.equal(M.givenName(''), ''); });
    it('sắp xếp theo tên gọi A–Z (An, Bình, Cường, Dung)', function () {
      assert.deepEqual(ids(M.sort(L.slice().reverse(), 'ten')), ['nv1', 'nv2', 'nv3', 'nv4']);
    });
    it('cùng tên gọi thì xếp theo họ tên đầy đủ, rồi mã', function () {
      var l = [{ id: 'x', ma: 'B', hoTen: 'Nguyễn Văn An' }, { id: 'y', ma: 'A', hoTen: 'Lê Văn An' }, { id: 'z', ma: 'C', hoTen: 'Lê Văn An' }];
      assert.deepEqual(ids(M.sort(l, 'ten')), ['y', 'z', 'x']);
    });
    it('sắp xếp theo mã; khóa lạ → theo tên', function () {
      assert.deepEqual(ids(M.sort([{ id: 'b', ma: 'NV10', hoTen: 'B' }, { id: 'a', ma: 'NV02', hoTen: 'A' }], 'ma')), ['a', 'b']);
      assert.deepEqual(ids(M.sort(L, 'khong_co')), ['nv1', 'nv2', 'nv3', 'nv4']);
    });
    it('sắp xếp theo số đề nghị và tổng Đã duyệt (giảm dần, hòa thì theo tên)', function () {
      var st = M.requestStats(REQS());
      assert.deepEqual(ids(M.sort(L, 'requests', st)), ['nv1', 'nv2', 'nv4', 'nv3']);
      assert.deepEqual(ids(M.sort(L, 'approved', st)), ['nv1', 'nv2', 'nv4', 'nv3']);
      var st2 = M.requestStats([req({ nv: 'nv3', dg: 9000000 })]);
      assert.deepEqual(ids(M.sort(L, 'approved', st2)), ['nv3', 'nv1', 'nv2', 'nv4']);
    });
    it('sort không đổi mảng gốc và ổn định', function () {
      var c = L.slice(); M.sort(c, 'ma'); assert.deepEqual(ids(c), ids(L));
      var same = [{ id: '2', ma: 'A', hoTen: 'An' }, { id: '1', ma: 'A', hoTen: 'An' }]; assert.deepEqual(ids(M.sort(same, 'ten')), ['1', '2']);
    });
    it('hỗ trợ đủ 4 khóa sắp xếp', function () { assert.deepEqual(M.SORT_KEYS.slice().sort(), ['approved', 'ma', 'requests', 'ten']); });
  });

  describe('định dạng', function () {
    it('formatVND', function () { assert.equal(M.formatVND(0), '0 ₫'); assert.equal(M.formatVND(5300000), '5.300.000 ₫'); assert.equal(M.formatVND(NaN), '—'); assert.equal(M.formatVND(null), '—'); });
    it('initial: chữ đầu của tên gọi, in hoa, không cắt đôi emoji', function () {
      assert.equal(M.initial('Nguyễn Văn An'), 'A'); assert.equal(M.initial('đỗ minh khôi'), 'K'); assert.equal(M.initial(''), '?'); assert.equal(M.initial(null), '?'); assert.equal(M.initial('Tèo 😀'), '😀');
    });
    it('colorIndex ổn định trong 1..7', function () {
      for (var i = 0; i < 100; i++) { var c = M.colorIndex('nv' + i); assert.ok(c >= 1 && c <= 7 && Number.isInteger(c)); }
      assert.equal(M.colorIndex('a'), M.colorIndex('a')); assert.ok(M.colorIndex(null) >= 1);
    });
  });

  describe('bất biến trên dữ liệu ngẫu nhiên', function () {
    it('lọc là tập con, sắp xếp là hoán vị, đếm khớp, thống kê khớp (200 bộ)', function () {
      for (var seed = 1; seed <= 200; seed++) {
        var r = rng(seed), n = Math.floor(r() * 30), L = [], reqs = [];
        for (var i = 0; i < n; i++) L.push({ id: 'e' + i, ma: 'M' + Math.floor(r() * 50), hoTen: ['An', 'Bình', 'Đức', 'Lê Văn Cường', 'Ánh', 'Zô'][Math.floor(r() * 6)] + ' ' + i, hoatDong: r() < 0.7 });
        for (var j = 0; j < n * 3; j++) reqs.push(req({ nv: 'e' + Math.floor(r() * (n + 2)), tt: ['da_duyet', 'cho_duyet', 'tu_choi'][Math.floor(r() * 3)], dg: Math.floor(r() * 1e6) }));
        var st = M.requestStats(reqs), c = M.counts(L);
        assert.equal(c.total, c.active + c.inactive, 'seed ' + seed);
        ['ten', 'ma', 'requests', 'approved'].forEach(function (k) {
          var s = M.sort(L, k, st);
          assert.equal(s.length, L.length); assert.deepEqual(ids(s).slice().sort(), ids(L).slice().sort(), 'hoán vị ' + k + ' seed ' + seed);
        });
        ['all', 'active', 'inactive'].forEach(function (k) {
          var f = M.filter(L, { status: k }); f.forEach(function (e) { assert.ok(L.indexOf(e) >= 0); });
          if (k === 'active') assert.equal(f.length, c.active); if (k === 'inactive') assert.equal(f.length, c.inactive);
        });
        var total = 0; Object.keys(st).forEach(function (id) { total += st[id].count; });
        assert.equal(total, reqs.length, 'tổng đề nghị seed ' + seed);
        Object.keys(st).forEach(function (id) { assert.equal(st[id].count, st[id].pending + st[id].rejected + st[id].approved.count, 'seed ' + seed); });
      }
    });
  });
})();
