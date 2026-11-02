/* Test lớp đọc dữ liệu: stats-store.js (chỉ đọc, không được ghi). */
(function () {
  describe('store – đọc dữ liệu', function () {
    it('listNhanVien trả mọi nhân viên kể cả đã ngưng, kèm cờ hoatDong', function () {
      var r = makeEnv().store.listNhanVien();
      assert.ok(r.ok); assert.deepEqual(r.data.map(function (x) { return x.id + ':' + x.hoatDong; }), ['nv1:true', 'nv2:true', 'nv3:true', 'nv4:false']);
      assert.equal(r.data[0].ma, 'NV001'); assert.equal(r.data[0].hoTen, 'Nguyễn Văn An');
    });
    it('listDeNghi trả đủ khoản, là bản sao độc lập', function () {
      var env = makeEnv(), r = env.store.listDeNghi();
      assert.ok(r.ok); assert.equal(r.data.length, 11);
      r.data[0].soLuong = 999;
      assert.notEqual(env.store.listDeNghi().data[0].soLuong, 999);
    });
    it('chưa có dữ liệu → mảng rỗng, không lỗi', function () {
      var env = makeEnv({ nhanVien: null, deNghi: null });
      assert.deepEqual(env.store.listNhanVien().data, []); assert.deepEqual(env.store.listDeNghi().data, []);
      env.storage.m[DncStatsStore.KEY_DN] = ''; assert.deepEqual(env.store.listDeNghi().data, []);
    });
    it('bỏ qua nhân viên hỏng hoặc trùng id; mặc định hoatDong = true', function () {
      var env = makeEnv({ nhanVien: [null, 3, 'x', {}, { id: 'a' }, { hoTen: 'B' }, { id: 'ok', hoTen: 'Hợp lệ' }, { id: 'ok', hoTen: 'Trùng' }, { id: 7, hoTen: 'Số' }] });
      var r = env.store.listNhanVien();
      assert.deepEqual(r.data.map(function (x) { return x.id + '/' + x.hoTen + '/' + x.hoatDong; }), ['ok/Hợp lệ/true', '7/Số/true']);
    });
    it('JSON hỏng hoặc không phải mảng → corrupt', function () {
      var env = makeEnv();
      env.storage.m[DncStatsStore.KEY_DN] = '{hỏng'; assert.equal(env.store.listDeNghi().error, 'corrupt');
      env.storage.m[DncStatsStore.KEY_DN] = '{"a":1}'; assert.equal(env.store.listDeNghi().error, 'corrupt');
      env.storage.m[DncStatsStore.KEY_NV] = '"chuỗi"'; assert.equal(env.store.listNhanVien().error, 'corrupt');
    });
    it('storage chặn đọc → blocked', function () {
      var env = makeEnv(); env.storage.failGet = true;
      assert.equal(env.store.listDeNghi().error, 'blocked'); assert.equal(env.store.listNhanVien().error, 'blocked');
    });
    it('KHÔNG BAO GIỜ ghi vào storage (module chỉ đọc)', function () {
      var env = makeEnv(), writes = 0, orig = env.storage.setItem;
      env.storage.setItem = function () { writes++; return orig.apply(this, arguments); };
      env.storage.removeItem = function () { writes++; };
      env.store.listDeNghi(); env.store.listNhanVien();
      var box = document.createElement('div'); document.body.appendChild(box);
      var c = DncStats.mount(box, { store: env.store, session: MGR, today: TODAY });
      box.querySelectorAll('button').forEach(function (b) { try { b.click(); } catch (e) { /* bỏ qua */ } });
      c.destroy(); box.remove();
      assert.equal(writes, 0);
      assert.equal(Object.keys(env.store).sort().join(','), 'listDeNghi,listNhanVien', 'API chỉ có hai hàm đọc');
    });
    it('hiệu năng: đọc và tổng hợp 5.000 khoản dưới 2 giây', function () {
      var rnd = rng(7), items = [], cats = DncStatsModel.DANH_MUC.map(function (d) { return d.id; });
      for (var i = 0; i < 5000; i++) items.push(mk({ id: 'p' + i, ngay: '2026-' + String(1 + (i % 11)).padStart(2, '0') + '-' + String(1 + (i % 28)).padStart(2, '0'), nv: 'nv' + (1 + (i % 4)), dm: cats[i % 7], dg: Math.floor(rnd() * 1e6), tt: i % 5 === 0 ? 'cho_duyet' : 'da_duyet' }));
      var env = makeEnv({ deNghi: items }), t0 = Date.now();
      var S = DncStatsModel, R = S.prepare(env.store.listDeNghi().data).rows;
      S.monthStats(R, '2026-11'); S.byCategory(R, '2026-11'); S.monthlySeries(R, '2026-11', 12); S.categoryComparison(R, '2026-11'); S.byEmployee(R, '2026-11', NV); S.topSuppliers(R, '2026-11'); S.highlights(R, '2026-11', {}, NV);
      assert.equal(R.length, 5000); assert.ok(Date.now() - t0 < 2000, 'chậm ' + (Date.now() - t0) + 'ms');
    });
  });
})();
