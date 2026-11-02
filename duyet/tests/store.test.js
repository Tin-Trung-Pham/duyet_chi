/* Test lớp lưu: review-store.js */
(function () {
  function three() { return [item({ id: 'a' }), item({ id: 'b', nhanVienId: 'nv2' }), item({ id: 'c' })]; }
  function byId(env, id) { return read(env).filter(function (x) { return x.id === id; })[0]; }

  describe('store – đọc dữ liệu', function () {
    it('listNhanVien trả cả nhân viên đã ngưng (để hiển thị tên khoản cũ)', function () {
      var r = makeStore().store.listNhanVien();
      assert.ok(r.ok); assert.deepEqual(r.data.map(function (x) { return x.id; }), ['nv1', 'nv2', 'nv3']);
      assert.equal(r.data[2].hoatDong, false);
    });
    it('chưa có dữ liệu → rỗng, không lỗi', function () {
      var env = makeStore({ nhanVien: null });
      assert.deepEqual(env.store.listNhanVien().data, []); assert.deepEqual(env.store.listDeNghi().data, []);
    });
    it('bỏ qua bản ghi nhân viên hỏng / trùng id; bỏ qua đề nghị thiếu id', function () {
      var env = makeStore({ nhanVien: [null, 3, {}, { id: 'x' }, { id: 'ok', hoTen: 'A' }, { id: 'ok', hoTen: 'B' }], deNghi: [null, 'x', { trangThai: 'cho_duyet' }, item({ id: 'z' })] });
      assert.equal(env.store.listNhanVien().data.length, 1);
      assert.deepEqual(env.store.listDeNghi().data.map(function (x) { return x.id; }), ['z']);
    });
    it('JSON hỏng / không phải mảng → corrupt; storage chặn đọc → blocked', function () {
      var env = makeStore();
      env.storage.m[DncReviewStore.KEY_DN] = '{hỏng'; assert.equal(env.store.listDeNghi().error, 'corrupt');
      env.storage.m[DncReviewStore.KEY_DN] = '{"a":1}'; assert.equal(env.store.listDeNghi().error, 'corrupt');
      env.storage.m[DncReviewStore.KEY_NV] = 'x'; assert.equal(env.store.listNhanVien().error, 'corrupt');
      env.storage.failGet = true; assert.equal(env.store.listDeNghi().error, 'blocked');
    });
    it('dữ liệu trả về là bản sao', function () {
      var env = makeStore({ deNghi: three() });
      var l = env.store.listDeNghi().data; l[0].nhaCungCap = 'bị sửa';
      assert.notEqual(env.store.listDeNghi().data[0].nhaCungCap, 'bị sửa');
    });
  });

  describe('store – duyệt', function () {
    it('duyệt: đổi trạng thái, ghi thời điểm và người xử lý, xóa lý do, giữ nguyên trường khác', function () {
      var env = makeStore({ deNghi: three() });
      var before = byId(env, 'a');
      var r = env.store.approve('a', MGR);
      assert.ok(r.ok, JSON.stringify(r));
      var after = byId(env, 'a');
      assert.equal(after.trangThai, 'da_duyet'); assert.equal(after.ngayXuLy, new Date(NOW).toISOString());
      assert.equal(after.nguoiXuLy, 'quan_ly'); assert.equal(after.lyDoTuChoi, null);
      ['id', 'nhanVienId', 'nhaCungCap', 'danhMuc', 'soLuong', 'donGia', 'ngay', 'ghiChu', 'ngayTao'].forEach(function (k) { assert.equal(after[k], before[k], k); });
      assert.equal(r.item.trangThai, 'da_duyet');
    });
    it('chỉ khoản được chọn thay đổi', function () {
      var env = makeStore({ deNghi: three() });
      env.store.approve('b', MGR);
      assert.deepEqual(read(env).map(function (x) { return x.trangThai; }), ['cho_duyet', 'da_duyet', 'cho_duyet']);
    });
    it('chỉ Quản lý được duyệt: nhân viên / null / thiếu / vai trò lạ → forbidden, không ghi', function () {
      [EMP, null, undefined, {}, { vaiTro: 'admin' }, { vaiTro: 'QUAN_LY' }].forEach(function (actor, i) {
        var env = makeStore({ deNghi: three() });
        var r = env.store.approve('a', actor);
        assert.equal(r.error, 'forbidden', 'ca ' + i);
        assert.equal(env.storage.sets, 0);
        assert.equal(byId(env, 'a').trangThai, 'cho_duyet');
      });
    });
    it('không thấy → notfound; đã duyệt/từ chối → processed (không ghi đè lần xử lý trước)', function () {
      var env = makeStore({ deNghi: [item({ id: 'x', trangThai: 'da_duyet', ngayXuLy: 'T0' }), item({ id: 'y', trangThai: 'tu_choi', lyDoTuChoi: 'L', ngayXuLy: 'T1' })] });
      assert.equal(env.store.approve('khong_co', MGR).error, 'notfound');
      assert.equal(env.store.approve('x', MGR).error, 'processed');
      assert.equal(env.store.approve('y', MGR).error, 'processed');
      assert.equal(env.storage.sets, 0);
      assert.equal(byId(env, 'x').ngayXuLy, 'T0'); assert.equal(byId(env, 'y').lyDoTuChoi, 'L');
    });
    it('duyệt hai lần liên tiếp: lần hai bị từ chối, thời điểm xử lý không đổi', function () {
      var env = makeStore({ deNghi: three() });
      env.store.approve('a', MGR);
      env.clock.t += 60000;
      assert.equal(env.store.approve('a', MGR).error, 'processed');
      assert.equal(byId(env, 'a').ngayXuLy, new Date(NOW).toISOString());
    });
    it('lỗi lưu: đầy → full, bị chặn → blocked, dữ liệu hỏng → corrupt; trạng thái không đổi', function () {
      var env = makeStore({ deNghi: three() });
      env.storage.failSet = quotaError(); assert.equal(env.store.approve('a', MGR).error, 'full');
      var e = new Error('x'); e.name = 'SecurityError'; env.storage.failSet = e; assert.equal(env.store.approve('a', MGR).error, 'blocked');
      env.storage.failSet = null; assert.equal(byId(env, 'a').trangThai, 'cho_duyet');
      env.storage.m[DncReviewStore.KEY_DN] = 'hỏng'; assert.equal(env.store.approve('a', MGR).error, 'corrupt');
      assert.equal(env.storage.m[DncReviewStore.KEY_DN], 'hỏng');
    });
    it('mã lỗi quota kiểu cũ (code 22, 1014) cũng là full', function () {
      var env = makeStore({ deNghi: three() });
      var e = new Error('q'); e.code = 22; env.storage.failSet = e; assert.equal(env.store.approve('a', MGR).error, 'full');
      var e2 = new Error('q'); e2.name = 'NS_ERROR_DOM_QUOTA_REACHED'; env.storage.failSet = e2; assert.equal(env.store.approve('a', MGR).error, 'full');
    });
  });

  describe('store – từ chối', function () {
    it('từ chối kèm lý do: ghi lý do (đã cắt khoảng trắng), thời điểm, người xử lý', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.reject('a', '  Giá chưa hợp lý  ', MGR);
      assert.ok(r.ok, JSON.stringify(r));
      var x = byId(env, 'a');
      assert.equal(x.trangThai, 'tu_choi'); assert.equal(x.lyDoTuChoi, 'Giá chưa hợp lý');
      assert.equal(x.ngayXuLy, new Date(NOW).toISOString()); assert.equal(x.nguoiXuLy, 'quan_ly');
    });
    it('lý do rỗng/khoảng trắng/quá 300 ký tự → invalid, không ghi gì', function () {
      var env = makeStore({ deNghi: three() });
      ['', '   ', null, undefined, 'a'.repeat(301)].forEach(function (ly) {
        var r = env.store.reject('a', ly, MGR);
        assert.equal(r.error, 'invalid'); assert.ok(r.message);
      });
      assert.equal(env.storage.sets, 0); assert.equal(byId(env, 'a').trangThai, 'cho_duyet');
    });
    it('đúng 300 ký tự được chấp nhận', function () {
      var env = makeStore({ deNghi: three() });
      assert.ok(env.store.reject('a', 'x'.repeat(300), MGR).ok);
    });
    it('chỉ Quản lý được từ chối', function () {
      var env = makeStore({ deNghi: three() });
      assert.equal(env.store.reject('a', 'Lý do', EMP).error, 'forbidden');
      assert.equal(env.store.reject('a', 'Lý do', null).error, 'forbidden');
      assert.equal(env.storage.sets, 0);
    });
    it('kiểm tra quyền trước kiểm tra lý do (không lộ thông tin cho người không có quyền)', function () {
      assert.equal(makeStore({ deNghi: three() }).store.reject('a', '', EMP).error, 'forbidden');
    });
    it('khoản đã xử lý → processed; không tìm thấy → notfound', function () {
      var env = makeStore({ deNghi: [item({ id: 'x', trangThai: 'da_duyet' })] });
      assert.equal(env.store.reject('x', 'Lý do', MGR).error, 'processed');
      assert.equal(env.store.reject('khong_co', 'Lý do', MGR).error, 'notfound');
    });
    it('lý do chứa HTML được lưu nguyên văn', function () {
      var env = makeStore({ deNghi: three() });
      env.store.reject('a', '<img src=x onerror=1>', MGR);
      assert.equal(byId(env, 'a').lyDoTuChoi, '<img src=x onerror=1>');
    });
    it('đầy bộ nhớ → full, khoản vẫn Chờ duyệt', function () {
      var env = makeStore({ deNghi: three() });
      env.storage.failSet = quotaError();
      assert.equal(env.store.reject('a', 'Lý do', MGR).error, 'full');
      env.storage.failSet = null; assert.equal(byId(env, 'a').trangThai, 'cho_duyet');
    });
  });

  describe('store – duyệt hàng loạt (nguyên tử)', function () {
    it('duyệt nhiều khoản chỉ ghi MỘT lần, cùng thời điểm', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approveMany(['a', 'b', 'c'], MGR);
      assert.ok(r.ok); assert.deepEqual(r.done, ['a', 'b', 'c']); assert.equal(env.storage.sets, 1);
      assert.ok(read(env).every(function (x) { return x.trangThai === 'da_duyet' && x.ngayXuLy === new Date(NOW).toISOString(); }));
    });
    it('bỏ qua khoản đã xử lý / không có, vẫn duyệt các khoản còn lại', function () {
      var env = makeStore({ deNghi: [item({ id: 'a' }), item({ id: 'b', trangThai: 'tu_choi', lyDoTuChoi: 'L' }), item({ id: 'c' })] });
      var r = env.store.approveMany(['a', 'b', 'zzz', 'c'], MGR);
      assert.ok(r.ok); assert.deepEqual(r.done, ['a', 'c']);
      assert.deepEqual(r.skipped.map(function (s) { return s.id + ':' + s.reason; }), ['b:processed', 'zzz:notfound']);
      assert.equal(byId(env, 'b').trangThai, 'tu_choi'); assert.equal(byId(env, 'b').lyDoTuChoi, 'L');
    });
    it('trùng id trong danh sách chỉ xử lý một lần', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approveMany(['a', 'a', 'a'], MGR);
      assert.deepEqual(r.done, ['a']); assert.equal(r.skipped.length, 0);
    });
    it('không khoản nào xử lý được → lỗi, không ghi', function () {
      var env = makeStore({ deNghi: [item({ id: 'a', trangThai: 'da_duyet' })] });
      assert.equal(env.store.approveMany(['a', 'zzz'], MGR).error, 'nothing');
      assert.equal(env.storage.sets, 0);
    });
    it('danh sách rỗng / không phải mảng → invalid', function () {
      var env = makeStore({ deNghi: three() });
      assert.equal(env.store.approveMany([], MGR).error, 'invalid');
      assert.equal(env.store.approveMany(null, MGR).error, 'invalid');
      assert.equal(env.store.approveMany('a', MGR).error, 'invalid');
    });
    it('nhân viên không được duyệt hàng loạt', function () {
      var env = makeStore({ deNghi: three() });
      assert.equal(env.store.approveMany(['a'], EMP).error, 'forbidden'); assert.equal(env.storage.sets, 0);
    });
    it('ghi thất bại → KHÔNG khoản nào đổi (tất cả hoặc không)', function () {
      var env = makeStore({ deNghi: three() });
      env.storage.failSet = quotaError();
      assert.equal(env.store.approveMany(['a', 'b', 'c'], MGR).error, 'full');
      env.storage.failSet = null;
      assert.ok(read(env).every(function (x) { return x.trangThai === 'cho_duyet'; }));
    });
    it('hiệu năng: duyệt 1.000 khoản trong 3 giây', function () {
      var items = []; for (var i = 0; i < 1000; i++) items.push(item({ id: 'k' + i }));
      var env = makeStore({ deNghi: items });
      var t0 = Date.now();
      var r = env.store.approveMany(items.map(function (x) { return x.id; }), MGR);
      assert.ok(r.ok); assert.equal(r.done.length, 1000); assert.ok(Date.now() - t0 < 3000);
    });
  });

  describe('store – hoàn tác', function () {
    it('hoàn tác duyệt: về Chờ duyệt, xóa dấu vết xử lý', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approve('a', MGR);
      var u = env.store.undo(r.undo, MGR);
      assert.ok(u.ok); assert.deepEqual(u.reverted, ['a']);
      var x = byId(env, 'a');
      assert.equal(x.trangThai, 'cho_duyet'); assert.equal(x.ngayXuLy, null); assert.equal(x.lyDoTuChoi, null); assert.equal('nguoiXuLy' in x, false);
    });
    it('hoàn tác từ chối: xóa cả lý do', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.reject('a', 'Lý do', MGR);
      env.store.undo(r.undo, MGR);
      var x = byId(env, 'a'); assert.equal(x.trangThai, 'cho_duyet'); assert.equal(x.lyDoTuChoi, null);
    });
    it('hoàn tác duyệt hàng loạt khôi phục tất cả', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approveMany(['a', 'b', 'c'], MGR);
      var u = env.store.undo(r.undo, MGR);
      assert.deepEqual(u.reverted, ['a', 'b', 'c']);
      assert.ok(read(env).every(function (x) { return x.trangThai === 'cho_duyet'; }));
    });
    it('sau hoàn tác khoản trở lại giống hệt ban đầu', function () {
      var env = makeStore({ deNghi: three() });
      var before = JSON.stringify(read(env));
      env.store.undo(env.store.approve('a', MGR).undo, MGR);
      assert.equal(JSON.stringify(read(env)), before);
    });
    it('khoản đã bị thay đổi sau đó thì KHÔNG hoàn tác (không ghi đè thao tác khác)', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approve('a', MGR);
      var all = read(env); all[0].ngayXuLy = 'THOI-DIEM-KHAC'; env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(all);
      var u = env.store.undo(r.undo, MGR);
      assert.equal(u.error, 'nothing'); assert.deepEqual(u.skipped, ['a']);
      assert.equal(byId(env, 'a').trangThai, 'da_duyet');
    });
    it('hoàn tác một phần: khoản còn nguyên được hoàn, khoản đã đổi bị bỏ qua', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approveMany(['a', 'b'], MGR);
      var all = read(env); all[1].trangThai = 'tu_choi'; env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(all);
      var u = env.store.undo(r.undo, MGR);
      assert.ok(u.ok); assert.deepEqual(u.reverted, ['a']); assert.deepEqual(u.skipped, ['b']);
      assert.equal(byId(env, 'b').trangThai, 'tu_choi');
    });
    it('khoản đã bị xóa → bỏ qua', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approve('a', MGR);
      env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(read(env).filter(function (x) { return x.id !== 'a'; }));
      assert.equal(env.store.undo(r.undo, MGR).error, 'nothing');
    });
    it('hoàn tác hai lần: lần hai không làm gì', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approve('a', MGR);
      assert.ok(env.store.undo(r.undo, MGR).ok);
      assert.equal(env.store.undo(r.undo, MGR).error, 'nothing');
    });
    it('chỉ Quản lý được hoàn tác; token rác → invalid', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approve('a', MGR);
      assert.equal(env.store.undo(r.undo, EMP).error, 'forbidden');
      assert.equal(env.store.undo(null, MGR).error, 'invalid');
      assert.equal(env.store.undo({}, MGR).error, 'invalid');
      assert.equal(env.store.undo({ entries: [] }, MGR).error, 'invalid');
    });
    it('lỗi ghi khi hoàn tác → full, vẫn ở trạng thái đã duyệt', function () {
      var env = makeStore({ deNghi: three() });
      var r = env.store.approve('a', MGR);
      env.storage.failSet = quotaError();
      assert.equal(env.store.undo(r.undo, MGR).error, 'full');
      env.storage.failSet = null; assert.equal(byId(env, 'a').trangThai, 'da_duyet');
    });
  });
})();
