/* Test CHẠY THẬT với máy chủ Python + file SQLite (chỉ khi trang test được mở qua http://127.0.0.1:PORT/…, do run-tests.sh dựng). */
(function () {
  var LIVE = location.protocol === 'http:';
  function lit(name, fn) { it(name, async function () { if (!LIVE) skip(); await fn(); }); }
  var base = LIVE ? new URL('../../api/', location.href).href : '';
  function client() { return DncDb.createClient({ base: base }); }
  var N = 0;
  function newRow(o) { N++; return Object.assign({ ma_nhan_vien: 'T' + N, ten_nhan_vien: 'Người thử ' + N, so_tien: 1000 * N, thoi_gian: '2026-11-03T01:02:03Z', phan_loai_chi: 'Khác', trang_thai: 'cho_duyet', ma_de_nghi: 'live-' + Date.now() + '-' + N }, o); }

  describe('LIVE: API + products.db thật', function () {
    lit('sức khỏe: kết nối được CSDL products.db', async function () { var r = await client().health(); assert.ok(r.ok, r.message); assert.equal(r.data.ok, true); assert.equal(r.data.db, 'products.db'); assert.ok(r.data.count >= 9); });
    lit('dữ liệu mẫu có ≥ 5 dòng, đủ 8 cột, đủ 3 trạng thái', async function () {
      var r = await client().list(); assert.ok(r.ok); var it0 = r.data.items; assert.ok(it0.length >= 5);
      assert.deepEqual(Object.keys(it0[0]).sort(), ['id', 'ma_de_nghi', 'ma_nhan_vien', 'phan_loai_chi', 'so_tien', 'ten_nhan_vien', 'thoi_gian', 'trang_thai']);
      assert.deepEqual(['cho_duyet', 'da_duyet', 'tu_choi'].filter(function (s) { return it0.some(function (r) { return r.trang_thai === s; }); }), ['cho_duyet', 'da_duyet', 'tu_choi']);
      assert.ok(r.data.meta.over_threshold >= 2); assert.equal(r.data.meta.threshold, 100000000);
    });
    lit('ghi một dòng rồi đọc lại đúng từng trường', async function () {
      var c = client(), row = newRow({ so_tien: 7777000, ten_nhan_vien: 'Đỗ Thị Ánh', phan_loai_chi: 'Tiếp khách', trang_thai: 'da_duyet' }), u = await c.upsert(row);
      assert.ok(u.ok); assert.equal(u.status, 201); var back = (await c.list()).data.items.filter(function (r) { return r.ma_de_nghi === row.ma_de_nghi; })[0];
      assert.deepEqual([back.ma_nhan_vien, back.ten_nhan_vien, back.so_tien, back.thoi_gian, back.phan_loai_chi, back.trang_thai], [row.ma_nhan_vien, 'Đỗ Thị Ánh', 7777000, '2026-11-03T01:02:03Z', 'Tiếp khách', 'da_duyet']);
    });
    lit('ghi lại cùng mã đề nghị = cập nhật (200), không nhân dòng', async function () {
      var c = client(), row = newRow(), n0 = (await c.list()).data.items.length; await c.upsert(row); var u = await c.upsert(Object.assign({}, row, { trang_thai: 'da_duyet', so_tien: 5 })); assert.equal(u.status, 200); assert.equal(u.data.created, false);
      assert.equal((await c.list()).data.items.length, n0 + 1);
    });
    lit('ghi hàng loạt trong một giao dịch; một dòng sai thì không dòng nào được ghi', async function () {
      var c = client(), n0 = (await c.list()).data.items.length, a = newRow(), b = newRow(); var ok = await c.bulk([a, b]); assert.deepEqual(ok.data, { created: 2, updated: 0 });
      var bad = await c.bulk([newRow(), newRow({ so_tien: -1 })]); assert.equal(bad.ok, false); assert.equal(bad.status, 400); assert.ok(bad.details['items[1].so_tien']); assert.equal((await c.list()).data.items.length, n0 + 2);
    });
    lit('lỗi hợp lệ từ máy chủ thật: 400 kèm chi tiết từng trường', async function () {
      var r = await client().upsert({ so_tien: 1.5, phan_loai_chi: 'Xe hơi', trang_thai: 'x' }); assert.deepEqual([r.ok, r.error, r.status, r.code], [false, 'http', 400, 'invalid']); ['so_tien', 'phan_loai_chi', 'trang_thai', 'ma_nhan_vien'].forEach(function (k) { assert.ok(r.details[k], k); });
    });
    lit('đổi trạng thái theo id', async function () {
      var c = client(), u = await c.upsert(newRow()); var id = u.data.item.id; var s = await c.setStatus(id, 'tu_choi'); assert.equal(s.data.item.trang_thai, 'tu_choi'); assert.equal((await c.setStatus(999999, 'da_duyet')).status, 404); assert.equal((await c.setStatus(id, 'xyz')).status, 400);
    });
    lit('khoản đúng 100 triệu KHÔNG bị tính vượt ngưỡng, 100.000.001 thì có (meta của máy chủ)', async function () {
      var c = client(), o0 = (await c.list()).data.meta.over_threshold; await c.upsert(newRow({ so_tien: 100000000 })); assert.equal((await c.list()).data.meta.over_threshold, o0); await c.upsert(newRow({ so_tien: 100000001 })); assert.equal((await c.list()).data.meta.over_threshold, o0 + 1);
    });
    lit('chuỗi có ký tự SQL được lưu nguyên văn, bảng không bị ảnh hưởng', async function () {
      var c = client(), evil = "x'); DROP TABLE products; --", u = await c.upsert(newRow({ ten_nhan_vien: evil.slice(0, 60), ma_de_nghi: evil })); assert.ok(u.ok); var l = await c.list(); assert.ok(l.ok); assert.ok(l.data.items.some(function (r) { return r.ma_de_nghi === evil; }));
    });
    lit('máy chủ không lộ file CSDL và mã nguồn', async function () {
      for (var p of ['products.db', 'server/db.py', 'server/server.py', '.git/config']) { var r = await fetch(new URL('../../' + p, location.href).href); assert.equal(r.status, 404, p); }
    });
    lit('kịch bản đầy đủ với máy chủ THẬT: nhập → ghi SQLite → tổng hợp + cảnh báo → duyệt → cập nhật', async function () {
      var c = client(); var n0 = (await c.list()).data.items.length; try { await e2eScenario(c); } finally { /* dọn do kịch bản tự thực hiện */ }
      assert.equal((await c.list()).data.items.length >= n0 + 2, true);
    });
  });
})();
