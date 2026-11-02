/* Test logic thuần: app-model.js */
(function () {
  var A = DncAppModel, K = A.KEYS, MGR = { vaiTro: 'quan_ly' }, E1 = { vaiTro: 'nhan_vien', nhanVienId: 'nv1' };

  describe('parsePath', function () {
    [['', 'home', [], true], ['#', 'home', [], true], ['#/', 'home', [], true], ['/', 'home', [], true], [undefined, 'home', [], true], [null, 'home', [], true], ['/home', 'home', [], true],
      ['#/duyet', 'duyet', [], true], ['duyet', 'duyet', [], true], ['/duyet/', 'duyet', [], true], ['#/thong-ke', 'thong-ke', [], true], ['/nhan-vien', 'nhan-vien', [], true], ['/vai-tro', 'vai-tro', [], true],
      ['/nhap-lieu/sua/dn_1', 'nhap-lieu', ['sua', 'dn_1'], true], ['/nhap-lieu/sua/a%20b', 'nhap-lieu', ['sua', 'a b'], true], ['/duyet?x=1', 'duyet', [], true], ['/duyet/%E0%A4%A', 'duyet', ['%E0%A4%A'], true],
      ['/khong-co', 'home', [], false], ['/DUYET', 'home', [], false], ['/duyet.html', 'home', [], false], ['//duyet', 'duyet', [], true]].forEach(function (c) {
      it('parsePath(' + JSON.stringify(c[0]) + ') → ' + c[1] + (c[3] ? '' : ' (không có)'), function () {
        var r = A.parsePath(c[0]); assert.equal(r.name, c[1]); assert.deepEqual(r.params, c[2]); assert.equal(r.known, c[3]);
      });
    });
    it('path chuẩn hóa luôn bắt đầu bằng /', function () { assert.equal(A.parsePath('duyet').path, '/duyet'); assert.equal(A.parsePath('').path, '/'); assert.equal(A.parsePath('/nhap-lieu/sua/a b').path, '/nhap-lieu/sua/a%20b'); });
    it('buildPath đối xứng với parsePath', function () {
      assert.equal(A.buildPath('home'), '/'); assert.equal(A.buildPath('duyet'), '/duyet'); assert.equal(A.buildPath('nhap-lieu', ['sua', 'a b']), '/nhap-lieu/sua/a%20b'); assert.equal(A.buildPath('khong-co'), '/');
      var p = A.parsePath(A.buildPath('nhap-lieu', ['sua', 'x/y'])); assert.deepEqual(p.params, ['sua', 'x/y']);
    });
  });

  describe('bảo vệ trang theo vai trò', function () {
    it('chưa có phiên: mọi nơi → Chọn vai trò, trừ chính nó', function () {
      ['/', '/duyet', '/thong-ke', '/nhap-lieu', '/nhan-vien', '/linh-tinh'].forEach(function (p) { var r = A.resolve(p, null); assert.equal(r.action, 'redirect'); assert.equal(r.to, '/vai-tro'); assert.equal(r.reason, 'no-session'); });
      assert.equal(A.resolve('/vai-tro', null).action, 'show');
    });
    it('Quản lý vào được: Trang chủ, Thống kê, Duyệt, Nhân viên, Chọn vai trò; không vào Thêm', function () {
      ['/', '/thong-ke', '/duyet', '/nhan-vien', '/vai-tro'].forEach(function (p) { assert.equal(A.resolve(p, MGR).action, 'show', p); });
      var r = A.resolve('/nhap-lieu', MGR); assert.equal(r.action, 'redirect'); assert.equal(r.to, '/'); assert.equal(r.reason, 'forbidden'); assert.equal(r.route, 'nhap-lieu');
    });
    it('Nhân viên vào được: Trang chủ, Thống kê, Thêm; không vào Duyệt, Nhân viên', function () {
      ['/', '/thong-ke', '/nhap-lieu', '/nhap-lieu/sua/dn1', '/vai-tro'].forEach(function (p) { assert.equal(A.resolve(p, E1).action, 'show', p); });
      ['/duyet', '/nhan-vien'].forEach(function (p) { var r = A.resolve(p, E1); assert.equal(r.action, 'redirect'); assert.equal(r.reason, 'forbidden'); assert.equal(r.to, '/'); });
    });
    it('địa chỉ lạ khi đã có phiên → Trang chủ (reason unknown)', function () { assert.equal(A.resolve('/abc', MGR).reason, 'unknown'); assert.equal(A.resolve('/abc', MGR).to, '/'); });
    it('kết quả show mang theo tham số', function () { assert.deepEqual(A.resolve('/nhap-lieu/sua/dn7', E1).route.params, ['sua', 'dn7']); });
    it('vai trò lạ không vào được trang nào có hạn chế', function () { assert.equal(A.resolve('/thong-ke', { vaiTro: 'admin' }).action, 'redirect'); });
    it('thông báo bị chặn nêu đúng vai trò', function () {
      assert.equal(A.forbiddenMessage('duyet'), 'Trang này dành cho Quản lý.'); assert.equal(A.forbiddenMessage('nhap-lieu'), 'Trang này dành cho Nhân viên.'); assert.equal(A.forbiddenMessage('thong-ke'), 'Trang này dành cho Nhân viên / Quản lý.');
      assert.equal(A.forbiddenMessage('khong-co'), 'Bạn không có quyền vào trang này.');
    });
    it('tiêu đề tab: "Tên màn · Sổ Đề Nghị Chi"', function () { assert.equal(A.pageTitle('duyet'), 'Duyệt đề nghị · Sổ Đề Nghị Chi'); assert.equal(A.pageTitle('home'), 'Trang chủ · Sổ Đề Nghị Chi'); assert.equal(A.pageTitle('x'), 'Sổ Đề Nghị Chi · Sổ Đề Nghị Chi'); });
  });

  describe('thanh điều hướng theo vai trò (DESIGN 13.2)', function () {
    it('Nhân viên: Trang chủ · Thống kê · Thêm', function () {
      var n = A.navItems(E1); assert.deepEqual(n.map(function (x) { return x.name; }), ['home', 'thong-ke', 'nhap-lieu']); assert.deepEqual(n.map(function (x) { return x.label; }), ['Trang chủ', 'Thống kê', 'Thêm']);
    });
    it('Quản lý: Trang chủ · Thống kê · Duyệt · Nhân viên', function () {
      var n = A.navItems(MGR); assert.deepEqual(n.map(function (x) { return x.name; }), ['home', 'thong-ke', 'duyet', 'nhan-vien']); assert.deepEqual(n.map(function (x) { return x.path; }), ['/', '/thong-ke', '/duyet', '/nhan-vien']);
    });
    it('không có phiên / vai trò lạ → rỗng; mọi mục đều được phép với vai trò đó', function () {
      assert.deepEqual(A.navItems(null), []); assert.deepEqual(A.navItems({ vaiTro: 'x' }), []);
      [E1, MGR].forEach(function (s) { A.navItems(s).forEach(function (i) { assert.equal(A.resolve(i.path, s).action, 'show', i.name); }); });
    });
  });

  describe('phiên làm việc', function () {
    it('normalizeSession: chỉ nhận dạng hợp lệ, bỏ trường thừa', function () {
      assert.deepEqual(A.normalizeSession({ vaiTro: 'quan_ly', nhanVienId: 'x', rac: 1 }), { vaiTro: 'quan_ly' });
      assert.deepEqual(A.normalizeSession({ vaiTro: 'nhan_vien', nhanVienId: 'nv1' }), { vaiTro: 'nhan_vien', nhanVienId: 'nv1' });
      [null, undefined, 5, 'x', [], {}, { vaiTro: 'nhan_vien' }, { vaiTro: 'nhan_vien', nhanVienId: '' }, { vaiTro: 'nhan_vien', nhanVienId: '  ' }, { vaiTro: 'nhan_vien', nhanVienId: 7 }, { vaiTro: 'admin' }].forEach(function (v) { assert.equal(A.normalizeSession(v), null, JSON.stringify(v)); });
    });
    it('ghi rồi đọc lại; xóa phiên', function () {
      var st = new FakeStorage(); assert.equal(A.readSession(st), null);
      assert.ok(A.writeSession(st, E1)); assert.deepEqual(A.readSession(st), E1); assert.ok(A.clearSession(st)); assert.equal(A.readSession(st), null);
    });
    it('ghi phiên không hợp lệ bị từ chối, không ghi', function () { var st = new FakeStorage(); assert.equal(A.writeSession(st, { vaiTro: 'nhan_vien' }), false); assert.equal(st.sets, 0); });
    it('đọc phiên: JSON hỏng / rác / chặn đọc → null, không ném lỗi', function () {
      var st = new FakeStorage(); st.m[K.SESSION] = '{hỏng'; assert.equal(A.readSession(st), null); st.m[K.SESSION] = '"x"'; assert.equal(A.readSession(st), null); st.m[K.SESSION] = '{"vaiTro":"admin"}'; assert.equal(A.readSession(st), null);
      st.failGet = true; assert.equal(A.readSession(st), null);
    });
    it('ghi phiên khi bị chặn lưu trữ → false', function () { var st = new FakeStorage(); st.failSet = true; assert.equal(A.writeSession(st, MGR), false); });
    it('activeEmployees: chỉ người đang hoạt động, bỏ phần tử hỏng và trùng', function () {
      var st = makeStorage({ nhanVien: [null, 5, {}, { id: 'a' }, { id: 'a', hoTen: 'A1' }, { id: 'a', hoTen: 'A2' }, { id: 'b', hoTen: 'B', hoatDong: false }, { id: 7, hoTen: 'S', ma: 'M' }] });
      assert.deepEqual(A.activeEmployees(st).map(function (e) { return e.id + ':' + e.hoTen; }), ['a:A1', '7:S']);
      assert.deepEqual(A.activeEmployees(makeStorage({ nhanVien: null })), []); var bad = makeStorage(); bad.m[K.NV] = 'x'; assert.deepEqual(A.activeEmployees(bad), []);
    });
    it('sessionCheck: Quản lý luôn hợp lệ; Nhân viên phải tồn tại và đang hoạt động', function () {
      var st = makeStorage();
      assert.equal(A.sessionCheck(MGR, st).ok, true); assert.deepEqual(A.sessionCheck(E1, st), { ok: true, name: 'Nguyễn Văn An' });
      assert.deepEqual(A.sessionCheck({ vaiTro: 'nhan_vien', nhanVienId: 'nv4' }, st), { ok: false, reason: 'inactive' });
      assert.deepEqual(A.sessionCheck({ vaiTro: 'nhan_vien', nhanVienId: 'khong' }, st), { ok: false, reason: 'missing' }); assert.deepEqual(A.sessionCheck(null, st), { ok: false, reason: 'none' });
    });
    it('roleLabel / initial / colorIndex', function () {
      var st = makeStorage(); assert.equal(A.roleLabel(MGR, st), 'Quản lý'); assert.equal(A.roleLabel(E1, st), 'Nguyễn Văn An'); assert.equal(A.roleLabel(null, st), '');
      assert.equal(A.roleLabel({ vaiTro: 'nhan_vien', nhanVienId: 'x' }, st), 'Nhân viên');
      assert.equal(A.initial('Nguyễn Văn An'), 'A'); assert.equal(A.initial(''), '?'); assert.equal(A.initial('Tèo 😀'), '😀');
      for (var i = 0; i < 50; i++) { var c = A.colorIndex('k' + i); assert.ok(c >= 1 && c <= 7); }
    });
  });

  describe('sức khỏe dữ liệu và banner (DESIGN 13.5)', function () {
    it('dữ liệu tốt hoặc chưa có → không cảnh báo', function () {
      assert.deepEqual(A.health(makeStorage()), { blocked: false, corrupt: [] }); assert.deepEqual(A.health(makeStorage({ nhanVien: null, deNghi: null })), { blocked: false, corrupt: [] });
    });
    it('phát hiện dữ liệu hỏng từng khóa (JSON hỏng hoặc không phải mảng)', function () {
      var st = makeStorage(); st.m[K.NV] = '{x'; assert.deepEqual(A.health(st).corrupt, ['nhanVien']);
      st.m[K.DN] = '{"a":1}'; assert.deepEqual(A.health(st).corrupt, ['nhanVien', 'deNghi']);
    });
    it('phát hiện bị chặn lưu trữ (ghi lỗi) hoặc chặn đọc', function () {
      var st = makeStorage(); st.failSet = true; assert.equal(A.health(st).blocked, true); st.failSet = false; st.failGet = true; assert.equal(A.health(st).blocked, true);
    });
    it('kiểm tra không để lại khóa thăm dò', function () { var st = makeStorage(); A.health(st); assert.equal(st.m[K.PROBE], undefined); });
    it('pickBanner: ưu tiên dữ liệu hỏng > bị chặn > nhắc lần đầu', function () {
      var ok = { blocked: false, corrupt: [] };
      assert.equal(A.pickBanner({ blocked: true, corrupt: ['deNghi'] }, false, 'home'), 'corrupt'); assert.equal(A.pickBanner({ blocked: true, corrupt: [] }, false, 'home'), 'blocked'); assert.equal(A.pickBanner(ok, false, 'home'), 'notice'); assert.equal(A.pickBanner(ok, true, 'home'), null);
    });
    it('nhắc lần đầu chỉ ở Trang chủ và Chọn vai trò; cảnh báo hỏng/chặn ở mọi màn', function () {
      var ok = { blocked: false, corrupt: [] };
      ['home', 'vai-tro'].forEach(function (r) { assert.equal(A.pickBanner(ok, false, r), 'notice'); }); ['duyet', 'thong-ke', 'nhap-lieu', 'nhan-vien'].forEach(function (r) { assert.equal(A.pickBanner(ok, false, r), null); assert.equal(A.pickBanner({ blocked: true, corrupt: [] }, false, r), 'blocked'); assert.equal(A.pickBanner({ blocked: false, corrupt: ['nhanVien'] }, true, r), 'corrupt'); });
    });
    it('ack: ghi và đọc lại; lỗi lưu → false', function () { var st = new FakeStorage(); assert.equal(A.acked(st), false); assert.ok(A.setAck(st)); assert.equal(A.acked(st), true); st.failSet = true; assert.equal(A.setAck(st), false); st.failGet = true; assert.equal(A.acked(st), false); });
    it('resetData xóa danh bạ, đề nghị, phiên; giữ nguyên các khóa khác (ack)', function () {
      var st = makeStorage({ session: MGR }); st.m['khac'] = 'giữ'; assert.ok(A.resetData(st));
      assert.equal(st.m[K.NV], undefined); assert.equal(st.m[K.DN], undefined); assert.equal(st.m[K.SESSION], undefined); assert.equal(st.m[K.ACK], '1'); assert.equal(st.m['khac'], 'giữ');
    });
  });

  describe('homeStats (số liệu Trang chủ)', function () {
    var R = REQS();
    it('Quản lý: tổng theo tháng (ngày đề nghị) và số chờ duyệt mọi tháng', function () {
      var s = A.homeStats(R, MGR, '2026-11');
      assert.deepEqual(s.pending, { count: 2, total: 820000 }); assert.deepEqual(s.approved, { count: 2, total: 2400000 }); assert.deepEqual(s.rejected, { count: 1, total: 900000 }); assert.equal(s.pendingAll, 3);
    });
    it('Quản lý: tháng khác', function () {
      var s = A.homeStats(R, MGR, '2026-10'); assert.deepEqual(s.pending, { count: 1, total: 300000 }); assert.equal(s.approved.count, 0); assert.equal(s.pendingAll, 3);
    });
    it('Nhân viên chỉ thấy của mình (kể cả pendingAll)', function () {
      var s = A.homeStats(R, E1, '2026-11'); assert.deepEqual(s.pending, { count: 1, total: 720000 }); assert.deepEqual(s.approved, { count: 1, total: 450000 }); assert.equal(s.rejected.count, 0); assert.equal(s.pendingAll, 1);
      var t = A.homeStats(R, { vaiTro: 'nhan_vien', nhanVienId: 'nv3' }, '2026-11'); assert.equal(t.pending.count, 0); assert.equal(t.pendingAll, 1);
      assert.equal(A.homeStats(R, { vaiTro: 'nhan_vien', nhanVienId: 'khong' }, '2026-11').pendingAll, 0);
    });
    it('bỏ qua khoản hỏng và đếm chúng; không ném lỗi với đầu vào lạ', function () {
      var bad = [null, 5, {}, req({ id: 'a', tt: 'la' }), Object.assign(req({ id: 'b' }), { soLuong: 'x' }), Object.assign(req({ id: 'c' }), { ngay: 'xx' }), req({ id: 'ok', dg: 1000 })];
      var s = A.homeStats(bad, MGR, '2026-11'); assert.equal(s.pending.count, 1); assert.equal(s.skipped, 6);
      [null, undefined, 'x', {}].forEach(function (v) { assert.equal(A.homeStats(v, MGR, '2026-11').pending.count, 0); });
    });
    it('cộng chính xác số lớn', function () { var big = req({ sl: 1000000, dg: 1e9, tt: 'da_duyet' }); assert.equal(A.homeStats([big, big, big], MGR, '2026-11').approved.total, 3e15); });
    it('session null (chưa chọn vai trò) vẫn tính tổng chung, không ném lỗi', function () { assert.equal(A.homeStats(R, null, '2026-11').pending.count, 2); });
    it('định dạng tiền và tháng', function () { assert.equal(A.formatVND(2400000), '2.400.000 ₫'); assert.equal(A.formatVND(NaN), '—'); assert.equal(A.monthLabel('2026-11'), 'Tháng 11/2026'); assert.equal(A.monthLabel('x'), ''); assert.equal(A.todayStr(new Date(2026, 0, 5)), '2026-01-05'); });
  });
})();
