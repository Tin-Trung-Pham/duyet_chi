/* Test lớp lưu dữ liệu: entry-store.js */
(function () {
  describe('store – nhân viên (chỉ đọc)', function () {
    it('chỉ trả nhân viên đang hoạt động', function () {
      var r = makeStore().store.listNhanVien();
      assert.ok(r.ok);
      assert.deepEqual(r.data.map(function (x) { return x.id; }), ['nv1', 'nv2']);
    });
    it('includeId đưa cả nhân viên đã ngưng vào (dùng khi sửa khoản cũ)', function () {
      var r = makeStore().store.listNhanVien({ includeId: 'nv3' });
      assert.deepEqual(r.data.map(function (x) { return x.id; }), ['nv1', 'nv2', 'nv3']);
      assert.equal(r.data[2].hoatDong, false);
    });
    it('chưa có dữ liệu → danh sách rỗng, không lỗi', function () {
      var r = makeStore({ nhanVien: null }).store.listNhanVien();
      assert.ok(r.ok); assert.equal(r.data.length, 0);
    });
    it('bỏ qua bản ghi hỏng và trùng id', function () {
      var env = makeStore({ nhanVien: [null, 5, 'x', {}, { id: 'a' }, { hoTen: 'B' }, { id: 'ok', hoTen: 'Hợp lệ' }, { id: 'ok', hoTen: 'Trùng' }] });
      var r = env.store.listNhanVien();
      assert.equal(r.data.length, 1);
      assert.equal(r.data[0].hoTen, 'Hợp lệ');
    });
    it('JSON hỏng → corrupt; không phải mảng → corrupt', function () {
      var env = makeStore();
      env.storage.m[DncStore.KEY_NV] = '{không phải json';
      assert.equal(env.store.listNhanVien().error, 'corrupt');
      env.storage.m[DncStore.KEY_NV] = '{"a":1}';
      assert.equal(env.store.listNhanVien().error, 'corrupt');
    });
    it('storage ném lỗi khi đọc → blocked', function () {
      var env = makeStore();
      env.storage.failGet = true;
      assert.equal(env.store.listNhanVien().error, 'blocked');
    });
  });

  describe('store – thêm đề nghị', function () {
    it('thêm hợp lệ: lưu đủ trường, trạng thái Chờ duyệt, thời điểm tạo theo đồng hồ', function () {
      var env = makeStore();
      var r = env.store.add(sample());
      assert.ok(r.ok, JSON.stringify(r));
      var it0 = r.item;
      assert.match(it0.id, /^dn_/);
      assert.equal(it0.trangThai, 'cho_duyet');
      assert.equal(it0.lyDoTuChoi, null);
      assert.equal(it0.ngayXuLy, null);
      assert.equal(it0.ngayTao, new Date(NOW).toISOString());
      ['nhanVienId', 'nhaCungCap', 'danhMuc', 'soLuong', 'donGia', 'ngay', 'ghiChu'].forEach(function (k) {
        assert.equal(it0[k], sample()[k], k);
      });
      assert.equal(env.store.listDeNghi().data.length, 1);
    });
    it('bản ghi không lưu thành tiền (luôn tính lại)', function () {
      var item = makeStore().store.add(sample()).item;
      assert.equal('thanhTien' in item, false);
      assert.equal(DncModel.thanhTienOf(item), 450000);
    });
    it('dữ liệu lưu thật sự ở localStorage dưới khóa có phiên bản', function () {
      var env = makeStore();
      env.store.add(sample());
      var raw = JSON.parse(env.storage.m['dnc:v1:deNghi']);
      assert.equal(raw.length, 1);
      assert.equal(raw[0].nhaCungCap, 'Giấy A4');
    });
    it('id không trùng khi thêm nhiều khoản (kể cả cùng mili-giây)', function () {
      var env = makeStore();
      var ids = {};
      for (var i = 0; i < 50; i++) ids[env.store.add(sample({ nhaCungCap: 'm' + i })).item.id] = 1;
      assert.equal(Object.keys(ids).length, 50);
    });
    it('id sinh ra trùng id có sẵn thì tự đổi', function () {
      var st = new FakeStorage();
      st.setItem(DncStore.KEY_NV, JSON.stringify(NV));
      st.setItem(DncStore.KEY_DN, JSON.stringify([{ id: 'dn_' + NOW.toString(36) + '_x', trangThai: 'cho_duyet' }]));
      var seq = ['x', 'y'];
      var store = DncStore.create({ storage: st, now: function () { return NOW; }, uid: function () { return seq.shift(); } });
      var r = store.add(sample());
      assert.ok(r.ok); assert.match(r.item.id, /_y$/);
    });
    it('không làm mất khoản đã có; giữ thứ tự thêm', function () {
      var env = makeStore();
      env.store.add(sample({ nhaCungCap: 'A' }));
      env.store.add(sample({ nhaCungCap: 'B' }));
      env.store.add(sample({ nhaCungCap: 'C' }));
      assert.deepEqual(env.store.listDeNghi().data.map(function (x) { return x.nhaCungCap; }), ['A', 'B', 'C']);
    });
    it('chuẩn hóa dữ liệu trước khi lưu (cắt khoảng trắng)', function () {
      var r = makeStore().store.add(sample({ nhaCungCap: '  Giấy   A4 ', ghiChu: ' x ' }));
      assert.equal(r.item.nhaCungCap, 'Giấy A4'); assert.equal(r.item.ghiChu, 'x');
    });
    it('dữ liệu sai bị từ chối và KHÔNG ghi gì', function () {
      var env = makeStore();
      [sample({ soLuong: 0 }), sample({ soLuong: -1 }), sample({ soLuong: 'abc' }), sample({ donGia: -5 }), sample({ donGia: 1.5 }),
        sample({ nhaCungCap: '' }), sample({ danhMuc: 'xe' }), sample({ ngay: '2026-11-03' }), sample({ ngay: 'xx' }),
        sample({ nhanVienId: 'khong_co' }), sample({ soLuong: 1e-7 }), sample({ donGia: 1e21 })].forEach(function (bad, i) {
        var r = env.store.add(bad);
        assert.equal(r.ok, false, 'ca ' + i);
        assert.equal(r.error, 'invalid', 'ca ' + i);
        assert.ok(r.errors && Object.keys(r.errors).length > 0);
      });
      assert.equal(env.storage.sets, 0);
      assert.equal(env.store.listDeNghi().data.length, 0);
    });
    it('không cho thêm cho nhân viên đã ngưng hoạt động', function () {
      var r = makeStore().store.add(sample({ nhanVienId: 'nv3' }));
      assert.equal(r.ok, false); assert.equal(r.error, 'invalid'); assert.ok(r.errors.nhanVienId);
    });
    it('actorId khác người đề nghị → forbidden, không ghi', function () {
      var env = makeStore();
      var r = env.store.add(sample({ nhanVienId: 'nv1' }), { actorId: 'nv2' });
      assert.equal(r.error, 'forbidden');
      assert.equal(env.storage.sets, 0);
      assert.ok(env.store.add(sample({ nhanVienId: 'nv1' }), { actorId: 'nv1' }).ok);
    });
    it('lưu đầy → full, dữ liệu cũ nguyên vẹn', function () {
      var env = makeStore();
      env.store.add(sample({ nhaCungCap: 'Cũ' }));
      env.storage.failSet = quotaError();
      var r = env.store.add(sample({ nhaCungCap: 'Mới' }));
      assert.equal(r.error, 'full');
      env.storage.failSet = null;
      assert.deepEqual(env.store.listDeNghi().data.map(function (x) { return x.nhaCungCap; }), ['Cũ']);
    });
    it('storage bị chặn khi ghi → blocked', function () {
      var env = makeStore();
      var e = new Error('SecurityError'); e.name = 'SecurityError';
      env.storage.failSet = e;
      assert.equal(env.store.add(sample()).error, 'blocked');
    });
    it('mã lỗi quota kiểu cũ (code 22 / 1014) cũng là full', function () {
      var env = makeStore();
      var e = new Error('q'); e.code = 22; env.storage.failSet = e;
      assert.equal(env.store.add(sample()).error, 'full');
      var e2 = new Error('q'); e2.name = 'NS_ERROR_DOM_QUOTA_REACHED'; env.storage.failSet = e2;
      assert.equal(env.store.add(sample()).error, 'full');
    });
    it('dữ liệu đề nghị hỏng → corrupt, không ghi đè', function () {
      var env = makeStore();
      env.storage.m[DncStore.KEY_DN] = 'hỏng';
      var r = env.store.add(sample());
      assert.equal(r.error, 'corrupt');
      assert.equal(env.storage.m[DncStore.KEY_DN], 'hỏng');
    });
    it('bản ghi trả về là bản sao: sửa nó không ảnh hưởng dữ liệu lưu', function () {
      var env = makeStore();
      var r = env.store.add(sample());
      r.item.nhaCungCap = 'bị sửa';
      assert.equal(env.store.listDeNghi().data[0].nhaCungCap, 'Giấy A4');
    });
    it('hiệu năng: thêm 1000 khoản và đọc lại dưới 3 giây', function () {
      var env = makeStore();
      var t0 = Date.now();
      for (var i = 0; i < 1000; i++) assert.ok(env.store.add(sample({ nhaCungCap: 'Món ' + i })).ok);
      assert.equal(env.store.listDeNghi().data.length, 1000);
      assert.ok(Date.now() - t0 < 3000, 'chậm: ' + (Date.now() - t0) + 'ms');
    });
  });

  describe('store – sửa đề nghị', function () {
    function withOne(over) {
      var env = makeStore();
      var item = env.store.add(sample(over)).item;
      return { env: env, item: item };
    }
    it('sửa thành công: giữ id, trạng thái, ngày tạo; thêm ngày cập nhật', function () {
      var c = withOne();
      var r = c.env.store.update(c.item.id, sample({ nhaCungCap: 'Đã sửa', soLuong: 2.5, donGia: 100000 }));
      assert.ok(r.ok, JSON.stringify(r));
      assert.equal(r.item.id, c.item.id);
      assert.equal(r.item.trangThai, 'cho_duyet');
      assert.equal(r.item.ngayTao, c.item.ngayTao);
      assert.equal(r.item.nhaCungCap, 'Đã sửa');
      assert.equal(r.item.soLuong, 2.5);
      assert.ok(r.item.ngayCapNhat);
      assert.equal(c.env.store.listDeNghi().data.length, 1);
      assert.equal(c.env.store.get(c.item.id).item.donGia, 100000);
    });
    it('chỉ sửa đúng khoản được chọn', function () {
      var c = withOne({ nhaCungCap: 'A' });
      var b = c.env.store.add(sample({ nhaCungCap: 'B' })).item;
      c.env.store.update(b.id, sample({ nhaCungCap: 'B2' }));
      assert.deepEqual(c.env.store.listDeNghi().data.map(function (x) { return x.nhaCungCap; }), ['A', 'B2']);
    });
    ['da_duyet', 'tu_choi'].forEach(function (st) {
      it('khoản ' + st + ' bị khóa: không sửa được, không đổi dữ liệu', function () {
        var env = makeStore({ deNghi: [Object.assign(sample(), { id: 'x1', trangThai: st })] });
        var before = env.storage.m[DncStore.KEY_DN];
        var r = env.store.update('x1', sample({ nhaCungCap: 'Cố sửa' }));
        assert.equal(r.error, 'locked');
        assert.equal(env.storage.m[DncStore.KEY_DN], before);
      });
    });
    it('không tìm thấy → notfound', function () {
      assert.equal(makeStore().store.update('khong_co', sample()).error, 'notfound');
      assert.equal(makeStore().store.get('khong_co').error, 'notfound');
    });
    it('nhân viên khác không sửa được khoản của người khác (forbidden)', function () {
      var c = withOne();
      var r = c.env.store.update(c.item.id, sample({ nhaCungCap: 'Đổi' }), { actorId: 'nv2' });
      assert.equal(r.error, 'forbidden');
      assert.equal(c.env.store.get(c.item.id).item.nhaCungCap, 'Giấy A4');
    });
    it('nhân viên B không chiếm được khoản của A bằng cách đặt mình làm người đề nghị', function () {
      var c = withOne({ nhanVienId: 'nv1' });
      var before = c.env.storage.m[DncStore.KEY_DN];
      var r = c.env.store.update(c.item.id, sample({ nhanVienId: 'nv2', nhaCungCap: 'Chiếm' }), { actorId: 'nv2' });
      assert.equal(r.error, 'forbidden');
      assert.equal(c.env.storage.m[DncStore.KEY_DN], before, 'dữ liệu không đổi');
    });
    it('chính chủ không được chuyển khoản sang người khác', function () {
      var c = withOne();
      assert.equal(c.env.store.update(c.item.id, sample({ nhanVienId: 'nv2' }), { actorId: 'nv1' }).error, 'forbidden');
    });
    it('dữ liệu sai khi sửa → invalid, không ghi', function () {
      var c = withOne();
      c.env.storage.sets = 0;
      var r = c.env.store.update(c.item.id, sample({ soLuong: 0 }));
      assert.equal(r.error, 'invalid'); assert.ok(r.errors.soLuong);
      assert.equal(c.env.storage.sets, 0);
    });
    it('sửa khoản của nhân viên đã ngưng hoạt động vẫn được nếu không đổi người', function () {
      var env = makeStore({ deNghi: [Object.assign(sample({ nhanVienId: 'nv3' }), { id: 'x9', trangThai: 'cho_duyet' })] });
      var r = env.store.update('x9', sample({ nhanVienId: 'nv3', nhaCungCap: 'Sửa' }));
      assert.ok(r.ok, JSON.stringify(r));
    });
    it('đầy bộ nhớ khi sửa → full, bản cũ nguyên vẹn', function () {
      var c = withOne();
      c.env.storage.failSet = quotaError();
      assert.equal(c.env.store.update(c.item.id, sample({ nhaCungCap: 'Mới' })).error, 'full');
      c.env.storage.failSet = null;
      assert.equal(c.env.store.get(c.item.id).item.nhaCungCap, 'Giấy A4');
    });
  });
})();
