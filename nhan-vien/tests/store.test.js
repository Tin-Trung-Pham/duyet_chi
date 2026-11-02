/* Test lớp lưu: emp-store.js */
(function () {
  function find(env, id) { return readNV(env).filter(function (x) { return x && x.id === id; })[0]; }
  function writtenKeys(env) {
    var keys = {}, orig = env.storage.setItem;
    env.storage.setItem = function (k, v) { keys[k] = (keys[k] || 0) + 1; return orig.call(this, k, v); };
    return keys;
  }

  describe('store – đọc', function () {
    it('list trả danh bạ hợp lệ, đủ trường, hoatDong mặc định true', function () {
      var env = makeEnv({ nhanVien: [{ id: 'a', ma: 'M1', hoTen: 'An' }, { id: 'b', ma: 'M2', hoTen: 'Bình', hoatDong: false }] });
      var r = env.store.list(); assert.ok(r.ok);
      assert.deepEqual(r.data.map(function (x) { return x.id + ':' + x.hoatDong; }), ['a:true', 'b:false']);
      assert.deepEqual(Object.keys(r.data[0]).sort(), ['hoTen', 'hoatDong', 'id', 'ma', 'ngayCapNhat', 'ngayTao']);
    });
    it('bỏ qua phần tử hỏng / trùng id; id số được chuyển thành chuỗi; thiếu mã → chuỗi rỗng', function () {
      var env = makeEnv({ nhanVien: [null, 5, 'x', [], {}, { id: 'a' }, { hoTen: 'B' }, { id: 'ok', hoTen: 'Hợp lệ' }, { id: 'ok', hoTen: 'Trùng' }, { id: 7, hoTen: 'Số', ma: 'M7' }] });
      var r = env.store.list();
      assert.deepEqual(r.data.map(function (x) { return x.id + '/' + x.hoTen + '/' + x.ma; }), ['ok/Hợp lệ/', '7/Số/M7']);
    });
    it('chưa có dữ liệu → rỗng; JSON hỏng / không phải mảng → corrupt; chặn đọc → blocked', function () {
      assert.deepEqual(makeEnv({ nhanVien: null }).store.list().data, []);
      var env = makeEnv();
      env.storage.m[DncEmpStore.KEY_NV] = '{x'; assert.equal(env.store.list().error, 'corrupt');
      env.storage.m[DncEmpStore.KEY_NV] = '{"a":1}'; assert.equal(env.store.list().error, 'corrupt');
      env.storage.failGet = true; assert.equal(env.store.list().error, 'blocked'); assert.equal(env.store.requestStats().error, 'blocked');
    });
    it('requestStats đọc từ danh sách đề nghị', function () {
      var r = makeEnv().store.requestStats(); assert.ok(r.ok); assert.equal(r.data.nv1.count, 3); assert.equal(r.data.nv1.approved.total, 5300000);
      var env = makeEnv(); env.storage.m[DncEmpStore.KEY_DN] = 'hỏng'; assert.equal(env.store.requestStats().error, 'corrupt');
      assert.deepEqual(makeEnv({ deNghi: null }).store.requestStats().data, {});
    });
    it('list trả bản sao độc lập', function () {
      var env = makeEnv(), a = env.store.list().data; a[0].hoTen = 'bị sửa'; assert.notEqual(env.store.list().data[0].hoTen, 'bị sửa');
    });
  });

  describe('store – thêm nhân viên', function () {
    it('thêm hợp lệ: chuẩn hóa mã/tên, hoạt động, có id và dấu thời gian', function () {
      var env = makeEnv(), r = env.store.add({ ma: ' nv005 ', hoTen: '  Đỗ   Minh Khôi ' }, MGR);
      assert.ok(r.ok, JSON.stringify(r)); var x = r.item;
      assert.match(x.id, /^nv_/); assert.equal(x.ma, 'NV005'); assert.equal(x.hoTen, 'Đỗ Minh Khôi'); assert.equal(x.hoatDong, true);
      assert.equal(x.ngayTao, new Date(NOW).toISOString()); assert.equal(x.ngayCapNhat, x.ngayTao);
      assert.equal(readNV(env).length, 5); assert.deepEqual(find(env, x.id).hoTen, 'Đỗ Minh Khôi');
    });
    it('id không trùng khi thêm nhiều người (kể cả cùng mili-giây)', function () {
      var env = makeEnv({ nhanVien: [] }), seen = {};
      for (var i = 0; i < 40; i++) seen[env.store.add({ ma: 'M' + i, hoTen: 'Tên ' + i }, MGR).item.id] = 1;
      assert.equal(Object.keys(seen).length, 40);
    });
    it('không làm mất người cũ, kể cả phần tử lạ trong mảng (giữ nguyên dữ liệu không thuộc về module)', function () {
      var raw = [{ id: 'a', ma: 'M1', hoTen: 'An', extra: 'giữ' }, null, 'rác'];
      var env = makeEnv({ nhanVien: raw }); env.store.add({ ma: 'M2', hoTen: 'Bình' }, MGR);
      var after = readNV(env); assert.equal(after.length, 4); assert.equal(after[0].extra, 'giữ'); assert.equal(after[1], null); assert.equal(after[2], 'rác');
    });
    it('dữ liệu sai: invalid kèm lỗi theo trường, KHÔNG ghi', function () {
      var env = makeEnv();
      [[{ ma: '', hoTen: 'x' }, 'ma'], [{ ma: 'A B', hoTen: 'x' }, 'ma'], [{ ma: 'A1', hoTen: '' }, 'hoTen'], [{ ma: 'A1', hoTen: 'a'.repeat(61) }, 'hoTen'], [{}, 'ma'], [null, 'ma']].forEach(function (c) {
        var r = env.store.add(c[0], MGR); assert.equal(r.error, 'invalid'); assert.ok(r.errors[c[1]]);
      });
      assert.equal(env.storage.sets, 0);
    });
    it('mã trùng (không phân biệt hoa/thường) bị từ chối, nêu tên người đang dùng', function () {
      var env = makeEnv(), r = env.store.add({ ma: 'nv002', hoTen: 'Người mới' }, MGR);
      assert.equal(r.error, 'invalid'); assert.equal(r.errors.ma, 'Mã này đã được dùng bởi Trần Thị Bình'); assert.equal(env.storage.sets, 0);
    });
    it('mã của nhân viên đã ngưng vẫn tính là đã dùng', function () { assert.equal(makeEnv().store.add({ ma: 'NV004', hoTen: 'x' }, MGR).error, 'invalid'); });
    it('chỉ Quản lý được thêm', function () {
      [EMP, null, undefined, {}, { vaiTro: 'admin' }, { vaiTro: 'QUAN_LY' }].forEach(function (a, i) {
        var env = makeEnv(); assert.equal(env.store.add({ ma: 'Z1', hoTen: 'x' }, a).error, 'forbidden', 'ca ' + i); assert.equal(env.storage.sets, 0);
      });
    });
    it('lỗi lưu: đầy → full, chặn → blocked, dữ liệu hỏng → corrupt (không ghi đè)', function () {
      var env = makeEnv();
      env.storage.failSet = quotaError(); assert.equal(env.store.add({ ma: 'Z1', hoTen: 'x' }, MGR).error, 'full');
      var e = new Error('x'); e.name = 'SecurityError'; env.storage.failSet = e; assert.equal(env.store.add({ ma: 'Z1', hoTen: 'x' }, MGR).error, 'blocked');
      env.storage.failSet = null; assert.equal(readNV(env).length, 4);
      env.storage.m[DncEmpStore.KEY_NV] = 'hỏng'; assert.equal(env.store.add({ ma: 'Z1', hoTen: 'x' }, MGR).error, 'corrupt'); assert.equal(env.storage.m[DncEmpStore.KEY_NV], 'hỏng');
    });
    it('mã lỗi quota kiểu cũ (code 22, 1014) cũng là full', function () {
      var env = makeEnv(), e = new Error('q'); e.code = 22; env.storage.failSet = e; assert.equal(env.store.add({ ma: 'Z1', hoTen: 'x' }, MGR).error, 'full');
      var e2 = new Error('q'); e2.name = 'NS_ERROR_DOM_QUOTA_REACHED'; env.storage.failSet = e2; assert.equal(env.store.add({ ma: 'Z1', hoTen: 'x' }, MGR).error, 'full');
    });
    it('hiệu năng: thêm 1.000 nhân viên rồi đọc lại dưới 3 giây', function () {
      var env = makeEnv({ nhanVien: [], deNghi: [] }), t0 = Date.now();
      for (var i = 0; i < 1000; i++) assert.ok(env.store.add({ ma: 'M' + i, hoTen: 'Tên ' + i }, MGR).ok);
      assert.equal(env.store.list().data.length, 1000); assert.ok(Date.now() - t0 < 3000, 'chậm ' + (Date.now() - t0) + 'ms');
    });
  });

  describe('store – sửa thông tin nhân viên', function () {
    it('đổi mã, họ tên, trạng thái; giữ id, ngày tạo và trường lạ; cập nhật ngày sửa', function () {
      var env = makeEnv({ nhanVien: [{ id: 'a', ma: 'M1', hoTen: 'An', hoatDong: true, ngayTao: 'T0', extra: 1 }], deNghi: [] });
      env.clock.t += 60000;
      var r = env.store.update('a', { ma: 'm9', hoTen: ' An   Nguyễn ', hoatDong: false }, MGR); assert.ok(r.ok, JSON.stringify(r));
      var x = find(env, 'a'); assert.equal(x.ma, 'M9'); assert.equal(x.hoTen, 'An Nguyễn'); assert.equal(x.hoatDong, false);
      assert.equal(x.id, 'a'); assert.equal(x.ngayTao, 'T0'); assert.equal(x.extra, 1); assert.equal(x.ngayCapNhat, new Date(NOW + 60000).toISOString());
      assert.equal(r.item.ma, 'M9');
    });
    it('không truyền hoatDong thì giữ nguyên trạng thái cũ', function () {
      var env = makeEnv(); env.store.update('nv4', { ma: 'NV004', hoTen: 'Phạm Thu Dung 2' }, MGR); assert.equal(find(env, 'nv4').hoatDong, false);
      env.store.update('nv1', { ma: 'NV001', hoTen: 'An 2' }, MGR); assert.equal(find(env, 'nv1').hoatDong, true);
    });
    it('hoatDong không phải boolean bị bỏ qua (không ép kiểu)', function () {
      var env = makeEnv(); env.store.update('nv1', { ma: 'NV001', hoTen: 'An', hoatDong: 'false' }, MGR); assert.equal(find(env, 'nv1').hoatDong, true);
    });
    it('ngưng hoạt động rồi bật lại', function () {
      var env = makeEnv();
      env.store.update('nv1', { ma: 'NV001', hoTen: 'Nguyễn Văn An', hoatDong: false }, MGR); assert.equal(find(env, 'nv1').hoatDong, false);
      env.store.update('nv1', { ma: 'NV001', hoTen: 'Nguyễn Văn An', hoatDong: true }, MGR); assert.equal(find(env, 'nv1').hoatDong, true);
    });
    it('chỉ người được sửa thay đổi', function () {
      var env = makeEnv(), before = readNV(env); env.store.update('nv2', { ma: 'NV022', hoTen: 'Mới' }, MGR);
      var after = readNV(env); assert.deepEqual(after[0], before[0]); assert.deepEqual(after[2], before[2]); assert.deepEqual(after[3], before[3]); assert.equal(after[1].ma, 'NV022');
    });
    it('giữ nguyên liên kết với đề nghị: đổi mã/tên không chạm vào danh sách đề nghị', function () {
      var env = makeEnv(), keys = writtenKeys(env), before = env.storage.m[DncEmpStore.KEY_DN];
      env.store.update('nv1', { ma: 'NV111', hoTen: 'Tên khác' }, MGR);
      assert.equal(env.storage.m[DncEmpStore.KEY_DN], before); assert.deepEqual(Object.keys(keys), [DncEmpStore.KEY_NV]);
      assert.equal(env.store.requestStats().data.nv1.count, 3, 'vẫn đếm đúng theo id');
    });
    it('giữ nguyên mã của chính mình là hợp lệ; dùng mã người khác thì bị từ chối', function () {
      var env = makeEnv(); assert.ok(env.store.update('nv1', { ma: 'nv001', hoTen: 'An' }, MGR).ok);
      var r = env.store.update('nv1', { ma: 'NV002', hoTen: 'An' }, MGR); assert.equal(r.error, 'invalid'); assert.match(r.errors.ma, /Trần Thị Bình/);
    });
    it('hoán đổi mã giữa hai người phải qua bước trung gian (không cho trùng tạm thời)', function () {
      var env = makeEnv(); assert.equal(env.store.update('nv1', { ma: 'NV002', hoTen: 'An' }, MGR).error, 'invalid');
      assert.ok(env.store.update('nv1', { ma: 'TAM', hoTen: 'An' }, MGR).ok); assert.ok(env.store.update('nv2', { ma: 'NV001', hoTen: 'Bình' }, MGR).ok); assert.ok(env.store.update('nv1', { ma: 'NV002', hoTen: 'An' }, MGR).ok);
    });
    it('không tìm thấy → notfound; dữ liệu sai → invalid; không ghi', function () {
      var env = makeEnv(); assert.equal(env.store.update('khong_co', { ma: 'A1', hoTen: 'x' }, MGR).error, 'notfound');
      assert.equal(env.store.update('nv1', { ma: '', hoTen: '' }, MGR).error, 'invalid'); assert.equal(env.storage.sets, 0);
    });
    it('chỉ Quản lý được sửa', function () {
      var env = makeEnv(); assert.equal(env.store.update('nv1', { ma: 'A1', hoTen: 'x' }, EMP).error, 'forbidden'); assert.equal(env.store.update('nv1', { ma: 'A1', hoTen: 'x' }).error, 'forbidden'); assert.equal(env.storage.sets, 0);
    });
    it('đầy bộ nhớ khi sửa → full, bản cũ nguyên vẹn', function () {
      var env = makeEnv(); env.storage.failSet = quotaError();
      assert.equal(env.store.update('nv1', { ma: 'NV001', hoTen: 'Mới' }, MGR).error, 'full'); env.storage.failSet = null; assert.equal(find(env, 'nv1').hoTen, 'Nguyễn Văn An');
    });
    it('id số/chuỗi đều tìm được', function () {
      var env = makeEnv({ nhanVien: [{ id: 7, ma: 'M7', hoTen: 'Số' }], deNghi: [] }); assert.ok(env.store.update('7', { ma: 'M8', hoTen: 'Số' }, MGR).ok);
    });
  });

  describe('store – xóa và hoàn tác', function () {
    it('xóa nhân viên chưa có đề nghị nào', function () {
      var env = makeEnv(), r = env.store.remove('nv3', MGR); assert.ok(r.ok, JSON.stringify(r));
      assert.deepEqual(readNV(env).map(function (x) { return x.id; }), ['nv1', 'nv2', 'nv4']); assert.equal(r.item.id, 'nv3'); assert.equal(r.undo.index, 2);
    });
    it('KHÔNG xóa được nhân viên đã có đề nghị (mọi trạng thái), kể cả đã ngưng', function () {
      var env = makeEnv();
      ['nv1', 'nv2', 'nv4'].forEach(function (id) { var r = env.store.remove(id, MGR); assert.equal(r.error, 'hasRequests', id); assert.ok(r.count >= 1); });
      assert.equal(env.store.remove('nv1', MGR).count, 3); assert.equal(env.storage.sets, 0); assert.equal(readNV(env).length, 4);
    });
    it('chỉ có một đề nghị bị Từ chối hoặc Chờ duyệt cũng không xóa được', function () {
      ['tu_choi', 'cho_duyet'].forEach(function (tt) {
        var env = makeEnv({ deNghi: [req({ nv: 'nv3', tt: tt })] }); assert.equal(env.store.remove('nv3', MGR).error, 'hasRequests');
      });
    });
    it('đề nghị dữ liệu lỗi vẫn chặn xóa (an toàn)', function () {
      var env = makeEnv({ deNghi: [{ id: 'x', nhanVienId: 'nv3', trangThai: 'la', soLuong: 'abc' }] }); assert.equal(env.store.remove('nv3', MGR).error, 'hasRequests');
    });
    it('không kiểm tra được đề nghị (dữ liệu hỏng / bị chặn) thì KHÔNG xóa', function () {
      var env = makeEnv(); env.storage.m[DncEmpStore.KEY_DN] = '{hỏng'; assert.equal(env.store.remove('nv3', MGR).error, 'corrupt'); assert.equal(readNV(env).length, 4);
    });
    it('không tìm thấy → notfound; chỉ Quản lý được xóa', function () {
      var env = makeEnv(); assert.equal(env.store.remove('khong_co', MGR).error, 'notfound'); assert.equal(env.store.remove('nv3', EMP).error, 'forbidden'); assert.equal(env.storage.sets, 0);
    });
    it('lỗi ghi khi xóa → full/blocked, không mất người', function () {
      var env = makeEnv(); env.storage.failSet = quotaError(); assert.equal(env.store.remove('nv3', MGR).error, 'full'); env.storage.failSet = null; assert.equal(readNV(env).length, 4);
    });
    it('chỉ ghi khóa nhân viên, không bao giờ ghi khóa đề nghị', function () {
      var env = makeEnv(), keys = writtenKeys(env);
      env.store.add({ ma: 'Z1', hoTen: 'Z' }, MGR); env.store.update('nv1', { ma: 'NV001', hoTen: 'A' }, MGR); env.store.remove('nv3', MGR);
      assert.deepEqual(Object.keys(keys), [DncEmpStore.KEY_NV]);
    });
    it('hoàn tác xóa: chèn lại đúng vị trí, dữ liệu giống hệt ban đầu', function () {
      var env = makeEnv(), before = JSON.stringify(readNV(env)), r = env.store.remove('nv3', MGR);
      var u = env.store.restore(r.undo, MGR); assert.ok(u.ok, JSON.stringify(u)); assert.equal(JSON.stringify(readNV(env)), before);
    });
    it('hoàn tác khi danh sách đã đổi: vẫn chèn lại được, vị trí được giới hạn trong mảng', function () {
      var env = makeEnv({ deNghi: [] }), r = env.store.remove('nv4', MGR); // index 3, không có đề nghị nên xóa được
      env.store.remove('nv3', MGR); env.store.remove('nv2', MGR); // còn 1 người
      var u = env.store.restore(r.undo, MGR); assert.ok(u.ok); assert.deepEqual(readNV(env).map(function (x) { return x.id; }), ['nv1', 'nv4']);
    });
    it('hoàn tác thất bại khi id đã tồn tại hoặc mã đã bị người khác dùng (conflict)', function () {
      var env = makeEnv(), r = env.store.remove('nv3', MGR);
      env.store.add({ ma: 'NV003', hoTen: 'Người mới' }, MGR); assert.equal(env.store.restore(r.undo, MGR).error, 'conflict');
      var env2 = makeEnv(), r2 = env2.store.remove('nv3', MGR); assert.ok(env2.store.restore(r2.undo, MGR).ok); assert.equal(env2.store.restore(r2.undo, MGR).error, 'conflict', 'hoàn tác hai lần');
    });
    it('hoàn tác thất bại khi cùng id nhưng đã bị đổi mã (không ghi đè người đang tồn tại)', function () {
      var env = makeEnv({ deNghi: [] }), r = env.store.remove('nv3', MGR);
      var all = readNV(env); all.push({ id: 'nv3', ma: 'KHAC', hoTen: 'Người khác dùng lại id', hoatDong: true }); env.storage.m[DncEmpStore.KEY_NV] = JSON.stringify(all);
      assert.equal(env.store.restore(r.undo, MGR).error, 'conflict'); assert.equal(readNV(env).filter(function (x) { return x.id === 'nv3'; }).length, 1);
    });
    it('hoàn tác: token rác → invalid; không phải Quản lý → forbidden; lỗi ghi → full', function () {
      var env = makeEnv(), r = env.store.remove('nv3', MGR);
      [null, {}, { record: null }, { record: {} }].forEach(function (t) { assert.equal(env.store.restore(t, MGR).error, 'invalid'); });
      assert.equal(env.store.restore(r.undo, EMP).error, 'forbidden');
      env.storage.failSet = quotaError(); assert.equal(env.store.restore(r.undo, MGR).error, 'full'); env.storage.failSet = null; assert.equal(readNV(env).length, 3);
    });
  });
})();
