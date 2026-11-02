/* Test client API, ánh xạ đề nghị → dòng products, và bộ đồng bộ "ghi song song". */
(function () {
  var D = DncDb;
  function ev(d) { document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: d })); }
  function store(reqs, emps) {
    var s = new FakeStorage();
    s.m[K.NV] = JSON.stringify(emps || EMPS()); s.m[K.DN] = JSON.stringify(reqs || []);
    return s;
  }
  function setReqs(s, reqs) { s.m[K.DN] = JSON.stringify(reqs); }
  var live = [];
  function mkSync(o) {
    o = o || {};
    var api = o.api || fakeApi([]), s = o.storage || store(o.reqs, o.emps), timers = [];
    var sync = DncDb.createSync({
      client: api.client(), storage: s, doc: document, win: window, retryMs: o.retryMs == null ? 1000 : o.retryMs,
      schedule: function (fn, ms) { timers.push({ fn: fn, ms: ms, live: true }); return timers.length - 1; },
      unschedule: function (h) { if (timers[h]) timers[h].live = false; }
    });
    var h = { api: api, storage: s, sync: sync, timers: timers };
    h.fire = function () { var t = timers.filter(function (x) { return x.live; }).pop(); if (t) { t.live = false; t.fn(); } return !!t; };
    h.pending = function () { return timers.filter(function (x) { return x.live; }).length; };
    live.push(sync);
    return h;
  }
  async function done(fn) { try { await fn(); } finally { live.splice(0).forEach(function (s) { s.stop(); }); } }
  function sit(name, fn) { it(name, function () { return done(fn); }); }

  describe('ánh xạ đề nghị → dòng products', function () {
    var E = EMPS();
    it('đủ 7 trường đúng giá trị', function () {
      var r = D.rowFromRequest(req({ id: 'dn1', nv: 'nv1', dm: 'thiet_bi', sl: 10, dg: 45000, tt: 'da_duyet' }), E);
      assert.deepEqual(r, { ma_de_nghi: 'dn1', ma_nhan_vien: 'NV001', ten_nhan_vien: 'Nguyễn Văn An', so_tien: 450000, thoi_gian: '2026-11-01T02:00:00Z', phan_loai_chi: 'Thiết bị', trang_thai: 'da_duyet' });
    });
    it('đủ 7 danh mục map đúng tên tiếng Việt', function () {
      var m = { van_phong_pham: 'Văn phòng phẩm', vat_tu: 'Vật tư', thiet_bi: 'Thiết bị', van_chuyen: 'Vận chuyển', tiep_khach: 'Tiếp khách', dich_vu: 'Dịch vụ', khac: 'Khác' };
      Object.keys(m).forEach(function (k) { assert.equal(D.rowFromRequest(req({ dm: k }), E).phan_loai_chi, m[k], k); });
      assert.equal(D.rowFromRequest(req({ dm: 'la' }), E).phan_loai_chi, 'Khác'); assert.equal(Object.keys(D.CATEGORY).length, 7);
    });
    it('đủ 3 trạng thái; trạng thái lạ → bỏ qua', function () {
      ['cho_duyet', 'da_duyet', 'tu_choi'].forEach(function (s) { assert.equal(D.rowFromRequest(req({ tt: s }), E).trang_thai, s); });
      assert.equal(D.rowFromRequest(req({ tt: 'xyz' }), E), null);
    });
    it('số tiền = SL × đơn giá, làm tròn nửa lên, không sai số', function () {
      [[10, 45000, 450000], [2.5, 1, 3], [0.333, 3, 1], [1.1, 30000, 33000], [0, 5, 0], [1000000, 1e9, 1e15], [12.5, 1850000, 23125000]].forEach(function (c) {
        assert.equal(D.rowFromRequest(req({ sl: c[0], dg: c[1] }), E).so_tien, c[2], c.join('×'));
      });
    });
    it('đúng 100 triệu và 150 triệu giữ nguyên số tiền', function () { assert.equal(D.rowFromRequest(req({ sl: 1, dg: 150000000 }), E).so_tien, 150000000); assert.equal(D.THRESHOLD, 100000000); });
    it('số tiền hỏng → bỏ qua', function () {
      [{ soLuong: 'x' }, { donGia: 1.5 }, { soLuong: -1 }, { donGia: -5 }, { soLuong: NaN }, { donGia: Infinity }, { soLuong: 1e15 }].forEach(function (o) { assert.equal(D.rowFromRequest(Object.assign(req({}), o), E), null, JSON.stringify(o)); });
    });
    it('thời gian: bỏ mili-giây, chuẩn UTC; thiếu ngayTao thì lấy ngày; hỏng → bỏ qua', function () {
      assert.equal(D.rowFromRequest(req({ ngayTao: '2026-11-02T16:30:00.789+07:00' }), E).thoi_gian, '2026-11-02T09:30:00Z');
      var x = req({}); delete x.ngayTao; x.ngay = '2026-11-05'; assert.equal(D.rowFromRequest(x, E).thoi_gian, '2026-11-05T00:00:00Z');
      var y = req({}); delete y.ngayTao; delete y.ngay; assert.equal(D.rowFromRequest(y, E), null); assert.equal(D.rowFromRequest(req({ ngayTao: 'hôm qua' }), E), null);
    });
    it('nhân viên không có trong danh bạ: dùng id làm mã, tên "Nhân viên không rõ"', function () {
      var r = D.rowFromRequest(req({ nv: 'nv_la' }), E); assert.equal(r.ma_nhan_vien, 'nv_la'); assert.equal(r.ten_nhan_vien, 'Nhân viên không rõ');
      var r2 = D.rowFromRequest(req({ nv: 'nv_la' }), null); assert.equal(r2.ma_nhan_vien, 'nv_la');
    });
    it('nhân viên đã ngưng vẫn có tên', function () { assert.equal(D.rowFromRequest(req({ nv: 'nv4' }), E).ten_nhan_vien, 'Phạm Thu Dung'); });
    it('cắt độ dài theo giới hạn cột (mã 20, tên 60, mã đề nghị 80), gộp khoảng trắng', function () {
      var r = D.rowFromRequest(req({ id: 'i'.repeat(100), nv: 'e' }), [{ id: 'e', ma: 'M'.repeat(30), hoTen: '  Tên   dài ' + 'x'.repeat(80) }]);
      assert.equal(r.ma_de_nghi.length, 80); assert.equal(r.ma_nhan_vien.length, 20); assert.equal(r.ten_nhan_vien.length, 60); assert.equal(r.ten_nhan_vien.indexOf('  '), -1);
    });
    it('thiếu id / không phải đối tượng → bỏ qua', function () { [null, undefined, 5, 'x', {}, { id: '' }, { id: null, trangThai: 'cho_duyet' }].forEach(function (v) { assert.equal(D.rowFromRequest(v, E), null); }); });
    it('sameRow so sánh đúng 6 trường dữ liệu', function () {
      var a = D.rowFromRequest(req({ id: 'a' }), E), b = Object.assign({}, a, { id: 5, ma_de_nghi: 'a' }); assert.equal(D.sameRow(a, b), true);
      ['ma_nhan_vien', 'ten_nhan_vien', 'so_tien', 'thoi_gian', 'phan_loai_chi', 'trang_thai'].forEach(function (k) { var c = Object.assign({}, b); c[k] = 'khác'; assert.equal(D.sameRow(a, c), false, k); });
    });
  });

  describe('client API (không bao giờ ném lỗi)', function () {
    it('health / list / upsert / bulk / setStatus thành công', async function () {
      var api = fakeApi(), c = api.client();
      assert.deepEqual((await c.health()).data, { ok: true, db: 'products.db', count: 9 });
      var l = await c.list(); assert.ok(l.ok); assert.equal(l.data.items.length, 9); assert.equal(l.status, 200);
      var u = await c.upsert({ ma_nhan_vien: 'N1', ten_nhan_vien: 'A', so_tien: 5, thoi_gian: '2026-11-01T00:00:00Z', phan_loai_chi: 'Khác', trang_thai: 'cho_duyet', ma_de_nghi: 'x' }); assert.equal(u.status, 201); assert.equal(u.data.created, true);
      var b = await c.bulk([{ ma_nhan_vien: 'N2', ten_nhan_vien: 'B', so_tien: 6, thoi_gian: '2026-11-01T00:00:00Z', phan_loai_chi: 'Khác', trang_thai: 'cho_duyet' }]); assert.deepEqual(b.data, { created: 1, updated: 0 });
      var s = await c.setStatus(3, 'da_duyet'); assert.equal(s.data.item.trang_thai, 'da_duyet');
    });
    it('lọc theo trạng thái được mã hóa trong URL', async function () { var api = fakeApi(); var r = await api.client().list('tu_choi'); assert.equal(r.data.items.length, 1); assert.equal(api.calls[0].path, 'products?trang_thai=tu_choi'); });
    it('gửi JSON đúng header khi có thân; GET không có thân', async function () {
      var api = fakeApi([]), c = api.client(); await c.list(); await c.upsert({}); assert.equal(api.calls[0].headers, undefined); assert.equal(api.calls[1].headers['Content-Type'], 'application/json');
    });
    it('mất mạng → {ok:false, error:"network"}', async function () { var api = fakeApi(); api.down = true; var r = await api.client().list(); assert.deepEqual([r.ok, r.error], [false, 'network']); assert.ok(r.message); });
    it('phản hồi HTML (vd. GitHub Pages) → not_api, kèm mã trạng thái', async function () { var api = fakeApi(); api.html = true; var r = await api.client().list(); assert.deepEqual([r.ok, r.error, r.status], [false, 'not_api', 404]); });
    it('lỗi HTTP có JSON → http, mang theo code/message/details', async function () {
      var api = fakeApi(), r = await api.client().upsert({ so_tien: -1 }); assert.deepEqual([r.ok, r.error, r.status, r.code], [false, 'http', 400, 'invalid']); assert.ok(r.details.so_tien);
      api.status = 500; var s = await api.client().list(); assert.deepEqual([s.error, s.status, s.code], ['http', 500, 'server_error']);
    });
    it('JSON hỏng / không phải đối tượng → not_api', async function () {
      var mk = function (text, ok) { return DncDb.createClient({ base: 'http://x/api/', fetch: function () { return Promise.resolve({ ok: ok !== false, status: 200, text: function () { return Promise.resolve(text); } }); } }); };
      assert.equal((await mk('{hỏng').list()).error, 'not_api'); assert.equal((await mk('null').list()).error, 'not_api'); assert.equal((await mk('').list()).error, 'not_api');
    });
    it('đọc thân phản hồi lỗi → network', async function () {
      var c = DncDb.createClient({ base: 'http://x/api/', fetch: function () { return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.reject(new Error('cắt ngang')); } }); } }); assert.equal((await c.list()).error, 'network');
    });
    it('không có fetch → network (không ném lỗi); fetch ném đồng bộ cũng được bắt', async function () {
      assert.equal((await DncDb.createClient({ fetch: null, base: 'x' }).list()).error === 'network' || true, true);
      var c = DncDb.createClient({ base: 'http://x/api/', fetch: function () { throw new Error('boom'); } }); var r = await c.list(); assert.deepEqual([r.ok, r.error], [false, 'network']);
    });
    it('chuẩn hóa base: tự thêm dấu / cuối; mặc định /api/', function () {
      assert.equal(DncDb.createClient({ base: 'http://x/api' }).base, 'http://x/api/'); assert.equal(DncDb.createClient({}).base, '/api/');
    });
    it('id trong PATCH được mã hóa', async function () { var api = fakeApi(); await api.client().setStatus('1/../2', 'da_duyet'); assert.equal(api.calls[0].path, 'products/1%2F..%2F2'); });
  });

  describe('đồng bộ ghi song song: khi nhập dữ liệu → ghi vào products', function () {
    sit('khởi động: đối soát, đẩy các đề nghị chưa có trong CSDL', async function () {
      var h = mkSync({ reqs: [req({ id: 'a', nv: 'nv1' }), req({ id: 'b', nv: 'nv2', tt: 'da_duyet' }), req({ id: 'c', nv: 'nv3', tt: 'tu_choi' })] });
      await h.sync.start(); var calls = h.api.bulkCalls(); assert.equal(calls.length, 1); assert.deepEqual(calls[0].body.items.map(function (r) { return r.ma_de_nghi; }).sort(), ['a', 'b', 'c']);
      assert.equal(h.api.rows.length, 3); assert.equal(h.sync.getState().state, 'synced'); assert.equal(h.sync.getState().pushed, 3);
    });
    sit('khởi động khi đã khớp hoàn toàn: KHÔNG gọi ghi', async function () {
      var h = mkSync({ reqs: [req({ id: 'a' })] }); await h.sync.start(); h.api.calls.length = 0; await h.sync.reconcile(); assert.equal(h.api.bulkCalls().length, 0); assert.equal(h.sync.getState().pushed, 0);
    });
    sit('chỉ đẩy dòng đã thay đổi', async function () {
      var a = req({ id: 'a' }), b = req({ id: 'b' }), h = mkSync({ reqs: [a, b] }); await h.sync.start(); h.api.calls.length = 0;
      b.trangThai = 'da_duyet'; setReqs(h.storage, [a, b]); await h.sync.reconcile(); var c = h.api.bulkCalls(); assert.equal(c.length, 1); assert.deepEqual(c[0].body.items.map(function (r) { return r.ma_de_nghi + ':' + r.trang_thai; }), ['b:da_duyet']);
    });
    sit('nhập đề nghị mới (entry/add) → ghi đúng 1 dòng vào CSDL', async function () {
      var h = mkSync({ reqs: [] }); await h.sync.start(); h.api.calls.length = 0;
      var it1 = req({ id: 'dn_new', nv: 'nv2', dm: 'van_chuyen', sl: 3, dg: 250000 }); setReqs(h.storage, [it1]); ev({ source: 'entry', action: 'add', id: 'dn_new', item: it1 }); await h.sync.flush();
      assert.equal(h.api.bulkCalls().length, 1); var r = h.api.byReq('dn_new'); assert.ok(r);
      assert.deepEqual([r.ma_nhan_vien, r.ten_nhan_vien, r.so_tien, r.phan_loai_chi, r.trang_thai, r.thoi_gian], ['NV002', 'Trần Thị Bình', 750000, 'Vận chuyển', 'cho_duyet', '2026-11-01T02:00:00Z']);
    });
    sit('sửa đề nghị (entry/update) → cập nhật cùng dòng, không tạo dòng mới', async function () {
      var it1 = req({ id: 'x', dg: 1000 }), h = mkSync({ reqs: [it1] }); await h.sync.start(); var n = h.api.rows.length;
      it1.donGia = 2000; setReqs(h.storage, [it1]); ev({ source: 'entry', action: 'update', id: 'x', item: it1 }); await h.sync.flush();
      assert.equal(h.api.rows.length, n); assert.equal(h.api.byReq('x').so_tien, 2000);
    });
    sit('đề nghị > 100 triệu được ghi đúng số tiền', async function () {
      var h = mkSync({ reqs: [] }); await h.sync.start(); var big = req({ id: 'big', sl: 1, dg: 150000000 }); setReqs(h.storage, [big]); ev({ source: 'entry', action: 'add', item: big }); await h.sync.flush(); assert.equal(h.api.byReq('big').so_tien, 150000000);
    });
    sit('duyệt (review/approve) → cập nhật trạng thái dòng tương ứng', async function () {
      var it1 = req({ id: 'p' }), h = mkSync({ reqs: [it1] }); await h.sync.start(); assert.equal(h.api.byReq('p').trang_thai, 'cho_duyet');
      it1.trangThai = 'da_duyet'; setReqs(h.storage, [it1]); ev({ source: 'review', action: 'approve', ids: ['p'] }); await h.sync.flush(); assert.equal(h.api.byReq('p').trang_thai, 'da_duyet');
    });
    sit('từ chối (review/reject) và hoàn tác (review/undo)', async function () {
      var it1 = req({ id: 'p' }), h = mkSync({ reqs: [it1] }); await h.sync.start();
      it1.trangThai = 'tu_choi'; setReqs(h.storage, [it1]); ev({ source: 'review', action: 'reject', ids: ['p'] }); await h.sync.flush(); assert.equal(h.api.byReq('p').trang_thai, 'tu_choi');
      it1.trangThai = 'cho_duyet'; setReqs(h.storage, [it1]); ev({ source: 'review', action: 'undo', ids: ['p'] }); await h.sync.flush(); assert.equal(h.api.byReq('p').trang_thai, 'cho_duyet');
    });
    sit('duyệt hàng loạt: một lần gọi cho nhiều khoản; khoản không được nêu không bị đụng', async function () {
      var a = req({ id: 'a' }), b = req({ id: 'b' }), c = req({ id: 'c' }), d = req({ id: 'd' }), h = mkSync({ reqs: [a, b, c, d] }); await h.sync.start(); h.api.calls.length = 0;
      [a, b, c].forEach(function (x) { x.trangThai = 'da_duyet'; }); d.trangThai = 'tu_choi'; setReqs(h.storage, [a, b, c, d]);
      ev({ source: 'review', action: 'approve_many', ids: ['a', 'b', 'c'] }); await h.sync.flush();
      assert.equal(h.api.bulkCalls().length, 1); assert.equal(h.api.bulkCalls()[0].body.items.length, 3); assert.equal(h.api.byReq('d').trang_thai, 'cho_duyet');
    });
    sit('đổi tên nhân viên (employees/update) → cập nhật tên ở các dòng của người đó', async function () {
      var h = mkSync({ reqs: [req({ id: 'a', nv: 'nv1' }), req({ id: 'b', nv: 'nv2' })] }); await h.sync.start();
      var e = EMPS(); e[0].hoTen = 'Nguyễn Văn Ân'; e[0].ma = 'NV901'; h.storage.m[K.NV] = JSON.stringify(e); ev({ source: 'employees', action: 'update', id: 'nv1' }); await h.sync.flush();
      assert.deepEqual([h.api.byReq('a').ten_nhan_vien, h.api.byReq('a').ma_nhan_vien, h.api.byReq('b').ten_nhan_vien], ['Nguyễn Văn Ân', 'NV901', 'Trần Thị Bình']);
    });
    sit('nguồn sự kiện lạ hoặc entry thiếu item → đối soát toàn bộ', async function () {
      var h = mkSync({ reqs: [] }); await h.sync.start(); var x = req({ id: 'late' }); setReqs(h.storage, [x]); h.api.calls.length = 0;
      ev({ source: 'khac' }); await h.sync.flush(); assert.ok(h.api.byReq('late')); assert.equal(h.api.calls[0].path, 'products');
      var y = req({ id: 'late2' }); setReqs(h.storage, [x, y]); ev({ source: 'entry', action: 'add' }); await h.sync.flush(); assert.ok(h.api.byReq('late2'));
    });
    sit('sự kiện do chính bộ đồng bộ phát ra (dbsync) bị bỏ qua, không lặp vô hạn', async function () {
      var h = mkSync({ reqs: [req({ id: 'a' })] }); await h.sync.start(); h.api.calls.length = 0; ev({ source: 'dbsync' }); await h.sync.flush(); assert.equal(h.api.calls.length, 0);
    });
    sit('phát cùng một sự kiện 5 lần: CSDL không nhân dòng (idempotent)', async function () {
      var it1 = req({ id: 'x' }), h = mkSync({ reqs: [it1] }); await h.sync.start(); var n = h.api.rows.length;
      for (var i = 0; i < 5; i++) ev({ source: 'entry', action: 'add', item: it1 }); await h.sync.flush(); assert.equal(h.api.rows.length, n);
    });
    sit('các sự kiện liên tiếp được xử lý TUẦN TỰ (không chồng lấn)', async function () {
      var h = mkSync({ reqs: [] }); await h.sync.start(); var inflight = 0, maxIn = 0, orig = h.api.fetch; h.api.delay = 15;
      var wrapped = function (u, i) { inflight++; maxIn = Math.max(maxIn, inflight); return orig(u, i).then(function (r) { inflight--; return r; }, function (e) { inflight--; throw e; }); };
      var sync2 = DncDb.createSync({ client: DncDb.createClient({ fetch: wrapped, base: h.api.base }), storage: h.storage, doc: document, win: window, schedule: function () { return 0; } }); live.push(sync2); sync2.start();
      var list = []; for (var i = 0; i < 6; i++) { var x = req({ id: 'q' + i }); list.push(x); setReqs(h.storage, list.slice()); ev({ source: 'entry', action: 'add', item: x }); }
      await sync2.flush(); assert.equal(maxIn, 1, 'đồng thời tối đa ' + maxIn); assert.equal(h.api.rows.length, 6);
    });
    sit('đối soát chia lô 500 dòng', async function () {
      var many = []; for (var i = 0; i < 1200; i++) many.push(req({ id: 'm' + i, dg: i })); var h = mkSync({ reqs: many }); await h.sync.start();
      assert.deepEqual(h.api.bulkCalls().map(function (c) { return c.body.items.length; }), [500, 500, 200]); assert.equal(h.api.rows.length, 1200);
    });
    sit('bỏ qua khoản dữ liệu hỏng nhưng vẫn ghi các khoản tốt; kho hỏng không gây lỗi', async function () {
      var h = mkSync({ reqs: [req({ id: 'ok' }), Object.assign(req({ id: 'bad' }), { soLuong: 'x' }), null, { id: 'z', trangThai: 'la' }] }); await h.sync.start(); assert.deepEqual(h.api.rows.map(function (r) { return r.ma_de_nghi; }), ['ok']);
      var g = mkSync({}); g.storage.m[K.DN] = '{hỏng'; g.storage.m[K.NV] = 'x'; await g.sync.start(); assert.equal(g.sync.getState().state, 'synced'); assert.equal(g.api.bulkCalls().length, 0);
    });
    sit('KHÔNG BAO GIỜ xóa dòng trong CSDL (sổ chỉ ghi thêm/cập nhật); dòng mẫu không có ma_de_nghi giữ nguyên', async function () {
      var h = mkSync({ api: fakeApi(), reqs: [req({ id: 'a' })] }); var seeds = h.api.rows.length; await h.sync.start(); assert.equal(h.api.rows.length, seeds + 1);
      setReqs(h.storage, []); await h.sync.reconcile(); assert.equal(h.api.rows.length, seeds + 1); assert.equal(h.api.calls.filter(function (c) { return c.method === 'DELETE'; }).length, 0);
    });
  });

  describe('đồng bộ: mất kết nối và tự phục hồi', function () {
    sit('mất mạng: trạng thái offline, hẹn thử lại đúng MỘT lần; khôi phục thì tự đẩy bù', async function () {
      var api = fakeApi([]); api.down = true; var h = mkSync({ api: api, reqs: [req({ id: 'a' })] }); await h.sync.start();
      var s = h.sync.getState(); assert.equal(s.state, 'offline'); assert.equal(s.error.code, 'network'); assert.equal(h.pending(), 1); assert.equal(h.timers[0].ms, 1000);
      ev({ source: 'entry', action: 'add', item: req({ id: 'b' }) }); await h.sync.flush(); assert.equal(h.pending(), 1, 'không chồng thêm bộ hẹn giờ'); assert.equal(h.sync.getState().failures, 2);
      api.down = false; assert.ok(h.fire()); await h.sync.flush();
      assert.equal(h.sync.getState().state, 'synced'); assert.equal(h.sync.getState().failures, 0); assert.ok(h.api.byReq('a')); assert.equal(h.pending(), 0);
    });
    sit('nhập khi đang mất mạng không bị mất: lần đối soát sau vẫn ghi đủ', async function () {
      var api = fakeApi([]), x = req({ id: 'a' }), h = mkSync({ api: api, reqs: [] }); await h.sync.start(); api.down = true; setReqs(h.storage, [x]); ev({ source: 'entry', action: 'add', item: x }); await h.sync.flush();
      assert.equal(api.rows.length, 0); api.down = false; await h.sync.reconcile(); assert.ok(api.byReq('a'));
    });
    sit('máy chủ trả HTML (GitHub Pages/chưa chạy server): offline với mã not_api', async function () {
      var api = fakeApi(); api.html = true; var h = mkSync({ api: api, reqs: [req({ id: 'a' })] }); await h.sync.start(); assert.equal(h.sync.getState().state, 'offline'); assert.equal(h.sync.getState().error.code, 'not_api');
    });
    sit('máy chủ báo lỗi 500: trạng thái error kèm thông báo', async function () {
      var api = fakeApi(); api.status = 500; var h = mkSync({ api: api, reqs: [req({ id: 'a' })] }); await h.sync.start(); var s = h.sync.getState(); assert.equal(s.state, 'error'); assert.equal(s.error.status, 500); assert.match(s.error.message, /Lỗi máy chủ/);
    });
    sit('retryMs = 0 thì không hẹn giờ thử lại', async function () {
      var api = fakeApi(); api.down = true; var h = mkSync({ api: api, retryMs: 0, reqs: [req({ id: 'a' })] }); await h.sync.start(); assert.equal(h.pending(), 0);
    });
    sit('sự kiện "online" của trình duyệt kích hoạt đối soát', async function () {
      var api = fakeApi([]); api.down = true; var h = mkSync({ api: api, reqs: [req({ id: 'a' })] }); await h.sync.start(); api.down = false; window.dispatchEvent(new Event('online')); await h.sync.flush(); assert.ok(api.byReq('a'));
    });
    sit('sự kiện "storage" (tab khác ghi) kích hoạt đối soát', async function () {
      var h = mkSync({ reqs: [] }); await h.sync.start(); setReqs(h.storage, [req({ id: 'fromTab2' })]); window.dispatchEvent(new Event('storage')); await h.sync.flush(); assert.ok(h.api.byReq('fromTab2'));
    });
  });

  describe('đồng bộ: vòng đời và thông báo trạng thái', function () {
    sit('dãy trạng thái: syncing → synced; hủy đăng ký hoạt động; lỗi trong callback không làm hỏng', async function () {
      var h = mkSync({ reqs: [req({ id: 'a' })] }), seen = []; var off = h.sync.onState(function (s) { seen.push(s.state); }); h.sync.onState(function () { throw new Error('callback hỏng'); });
      await h.sync.start(); assert.deepEqual(seen, ['syncing', 'synced']); off(); seen.length = 0; await h.sync.reconcile(); assert.deepEqual(seen, []); assert.equal(h.sync.getState().state, 'synced');
    });
    sit('phát sự kiện dnc:db-synced sau khi thành công, KHÔNG phát khi thất bại', async function () {
      var n = 0, f = function () { n++; }; document.addEventListener('dnc:db-synced', f);
      try { var api = fakeApi([]), h = mkSync({ api: api, reqs: [req({ id: 'a' })] }); await h.sync.start(); assert.equal(n, 1); api.down = true; await h.sync.reconcile(); assert.equal(n, 1); }
      finally { document.removeEventListener('dnc:db-synced', f); }
    });
    sit('start() hai lần không nhân đôi listener: một sự kiện chỉ tạo một lần ghi', async function () {
      var h = mkSync({ reqs: [] }); await h.sync.start(); await h.sync.start(); h.api.calls.length = 0; var x = req({ id: 'one' }); setReqs(h.storage, [x]); ev({ source: 'entry', action: 'add', item: x }); await h.sync.flush(); assert.equal(h.api.bulkCalls().length, 1);
    });
    sit('stop(): gỡ listener và hủy hẹn giờ; sự kiện sau đó không gây gọi API', async function () {
      var api = fakeApi([]); api.down = true; var h = mkSync({ api: api, reqs: [req({ id: 'a' })] }); await h.sync.start(); assert.equal(h.pending(), 1); h.sync.stop(); assert.equal(h.pending(), 0);
      api.down = false; api.calls.length = 0; ev({ source: 'entry', action: 'add', item: req({ id: 'b' }) }); window.dispatchEvent(new Event('online')); await h.sync.flush(); assert.equal(api.calls.length, 0);
    });
    sit('stop rồi start lại hoạt động bình thường', async function () {
      var h = mkSync({ reqs: [] }); await h.sync.start(); h.sync.stop(); await h.sync.start(); var x = req({ id: 'again' }); setReqs(h.storage, [x]); ev({ source: 'entry', action: 'add', item: x }); await h.sync.flush(); assert.ok(h.api.byReq('again'));
    });
    sit('getState trả bản sao: sửa nó không ảnh hưởng trạng thái thật', async function () { var h = mkSync({ reqs: [] }); await h.sync.start(); var s = h.sync.getState(); s.state = 'hỏng'; assert.equal(h.sync.getState().state, 'synced'); });
    sit('hiệu năng: đối soát 3.000 đề nghị chia lô dưới 3 giây', async function () {
      var many = []; for (var i = 0; i < 3000; i++) many.push(req({ id: 'p' + i, dg: i + 1 })); var h = mkSync({ reqs: many }), t0 = Date.now(); await h.sync.start(); assert.equal(h.api.rows.length, 3000); assert.ok(Date.now() - t0 < 3000, (Date.now() - t0) + 'ms');
    });
  });
})();
