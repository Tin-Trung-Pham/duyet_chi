/* Sổ Đề Nghị Chi – Cơ sở dữ liệu: client gọi API (server/server.py) và bộ đồng bộ "ghi song song".
 *
 * - DncDb.createClient({ fetch, base })  → health/list/upsert/bulk/setStatus, KHÔNG BAO GIỜ ném lỗi (trả {ok:false,error}).
 * - DncDb.createSync({ client, storage, doc, win })  → lắng nghe `dnc:data-changed` và ghi mỗi đề nghị vào products.db.
 *   localStorage vẫn là nguồn chính của ứng dụng; products.db là bản ghi song song, tự đối soát (reconcile) khi mất kết nối.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DncDb = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var THRESHOLD = 100000000; // cảnh báo khi MỘT khoản chi LỚN HƠN mức này
  var KEYS = { NV: 'dnc:v1:nhanVien', DN: 'dnc:v1:deNghi' };
  var CATEGORY = { van_phong_pham: 'Văn phòng phẩm', vat_tu: 'Vật tư', thiet_bi: 'Thiết bị', van_chuyen: 'Vận chuyển', tiep_khach: 'Tiếp khách', dich_vu: 'Dịch vụ', khac: 'Khác' };
  var STATUSES = ['cho_duyet', 'da_duyet', 'tu_choi'];
  var CHUNK = 500;

  function str(x) { return x == null ? '' : String(x); }

  /* ---------- Chuyển đề nghị (localStorage) → dòng products ---------- */
  function amountOf(it) {
    if (!it || typeof it.soLuong !== 'number' || typeof it.donGia !== 'number') return NaN;
    if (!isFinite(it.soLuong) || !isFinite(it.donGia) || it.soLuong < 0 || it.donGia < 0 || it.donGia % 1 !== 0 || it.donGia > 1e12) return NaN;
    var milli = Math.round(it.soLuong * 1000);
    if (milli > 1e12) return NaN;
    return Number((BigInt(milli) * BigInt(it.donGia) + 500n) / 1000n);
  }
  function normTime(v) {
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  function collapse(s) { return str(s).replace(/\s+/g, ' ').trim(); }

  /* employees: [{id, ma, hoTen}] — tra mã/tên theo id; không có thì dùng id và "Nhân viên không rõ". */
  function rowFromRequest(item, employees) {
    if (!item || typeof item !== 'object' || item.id == null || item.id === '') return null;
    var tt = item.trangThai;
    if (STATUSES.indexOf(tt) < 0) return null;
    var amount = amountOf(item);
    if (!isFinite(amount)) return null;
    var time = normTime(item.ngayTao || (str(item.ngay) ? item.ngay + 'T00:00:00Z' : ''));
    if (!time) return null;
    var emp = null;
    (employees || []).forEach(function (e) { if (e && String(e.id) === String(item.nhanVienId)) emp = e; });
    var ma = collapse(emp && emp.ma) || collapse(item.nhanVienId);
    var ten = collapse(emp && emp.hoTen) || 'Nhân viên không rõ';
    if (!ma) return null;
    return {
      ma_de_nghi: String(item.id).slice(0, 80), ma_nhan_vien: ma.slice(0, 20), ten_nhan_vien: ten.slice(0, 60), so_tien: amount, thoi_gian: time,
      phan_loai_chi: CATEGORY[item.danhMuc] || 'Khác', trang_thai: tt
    };
  }
  var FIELDS = ['ma_nhan_vien', 'ten_nhan_vien', 'so_tien', 'thoi_gian', 'phan_loai_chi', 'trang_thai'];
  function sameRow(a, b) { return FIELDS.every(function (k) { return a[k] === b[k]; }); }

  /* ---------- Client ---------- */
  function createClient(opts) {
    opts = opts || {};
    var fetchFn = opts.fetch || (typeof fetch === 'function' ? fetch.bind(typeof self !== 'undefined' ? self : undefined) : null);
    var base = str(opts.base) || '/api/';
    if (base.charAt(base.length - 1) !== '/') base += '/';

    async function request(method, path, body) {
      var res;
      try {
        if (!fetchFn) throw new Error('Trình duyệt không có fetch');
        res = await fetchFn(base + path, {
          method: method, cache: 'no-store',
          headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body)
        });
      } catch (e) { return { ok: false, error: 'network', message: str(e && e.message) || 'Không kết nối được máy chủ' }; }
      var text = '';
      try { text = await res.text(); } catch (e) { return { ok: false, error: 'network', status: res.status, message: 'Mất kết nối khi đọc phản hồi' }; }
      var js;
      try { js = JSON.parse(text); } catch (e) { return { ok: false, error: 'not_api', status: res.status, message: 'Máy chủ không trả về JSON (có thể chưa chạy server/server.py)' }; }
      if (!js || typeof js !== 'object') return { ok: false, error: 'not_api', status: res.status, message: 'Phản hồi không hợp lệ' };
      if (!res.ok) return { ok: false, error: 'http', status: res.status, code: js.error, message: js.message || ('Lỗi ' + res.status), details: js.details };
      return { ok: true, status: res.status, data: js };
    }
    return {
      base: base,
      health: function () { return request('GET', 'health'); },
      list: function (status) { return request('GET', 'products' + (status ? '?trang_thai=' + encodeURIComponent(status) : '')); },
      upsert: function (row) { return request('POST', 'products', row); },
      bulk: function (rows) { return request('POST', 'products/bulk', { items: rows }); },
      setStatus: function (id, st) { return request('PATCH', 'products/' + encodeURIComponent(id), { trang_thai: st }); }
    };
  }

  /* ---------- Đồng bộ ghi song song ---------- */
  function createSync(opts) {
    opts = opts || {};
    var client = opts.client, storage = opts.storage, doc = opts.doc || (typeof document !== 'undefined' ? document : null);
    var win = opts.win || (doc && doc.defaultView) || null;
    var schedule = opts.schedule || function (fn, ms) { return setTimeout(fn, ms); };
    var unschedule = opts.unschedule || function (h) { clearTimeout(h); };
    var retryMs = opts.retryMs == null ? 15000 : opts.retryMs;
    var st = { state: 'idle', error: null, lastSync: null, queued: 0, failures: 0 };
    var subs = [], cleanups = [], chain = Promise.resolve(), retryHandle = null, started = false, stopped = false;

    function set(patch) {
      Object.assign(st, patch);
      var snap = Object.assign({}, st);
      subs.slice().forEach(function (f) { try { f(snap); } catch (e) { /* bỏ qua */ } });
    }
    function readList(key) {
      var raw; try { raw = storage.getItem(key); } catch (e) { return []; }
      if (!raw) return [];
      try { var d = JSON.parse(raw); return Array.isArray(d) ? d : []; } catch (e) { return []; }
    }
    function employees() { return readList(KEYS.NV); }
    function requests() { return readList(KEYS.DN); }
    function fail(r) {
      set({ state: r.error === 'http' ? 'error' : 'offline', error: { code: r.error, status: r.status || null, message: r.message || '' }, failures: st.failures + 1 });
      scheduleRetry();
    }
    function ok(extra) {
      if (retryHandle != null) { unschedule(retryHandle); retryHandle = null; }
      set(Object.assign({ state: 'synced', error: null, lastSync: Date.now(), failures: 0 }, extra || {}));
      if (doc) { try { doc.dispatchEvent(new CustomEvent('dnc:db-synced', { detail: { source: 'dbsync' } })); } catch (e) { /* bỏ qua */ } }
    }
    function scheduleRetry() {
      if (stopped || retryHandle != null || !(retryMs > 0)) return;
      retryHandle = schedule(function () { retryHandle = null; if (!stopped) reconcile(); }, retryMs);
    }
    function enqueue(fn) {
      st.queued++;
      var p = chain.then(function () { return fn(); }).catch(function () { /* mỗi bước tự xử lý lỗi */ }).then(function () { st.queued--; });
      chain = p;
      return p;
    }

    async function pushRows(rows) {
      for (var i = 0; i < rows.length; i += CHUNK) {
        var r = await client.bulk(rows.slice(i, i + CHUNK));
        if (!r.ok) { fail(r); return false; }
      }
      return true;
    }
    function syncItems(items) {
      return enqueue(async function () {
        var emps = employees();
        var rows = items.map(function (it) { return rowFromRequest(it, emps); }).filter(Boolean);
        if (!rows.length) return;
        set({ state: 'syncing' });
        if (await pushRows(rows)) ok();
      });
    }
    function reconcile() {
      return enqueue(async function () {
        if (stopped) return;
        set({ state: 'syncing' });
        var l = await client.list();
        if (!l.ok) { fail(l); return; }
        var byReq = {};
        (l.data.items || []).forEach(function (r) { if (r && r.ma_de_nghi != null) byReq[r.ma_de_nghi] = r; });
        var emps = employees(), changed = [];
        requests().forEach(function (it) {
          var row = rowFromRequest(it, emps);
          if (!row) return;
          var cur = byReq[row.ma_de_nghi];
          if (!cur || !sameRow(cur, row)) changed.push(row);
        });
        if (!changed.length) { ok({ pushed: 0 }); return; }
        if (await pushRows(changed)) ok({ pushed: changed.length });
      });
    }

    function onData(e) {
      if (stopped) return;
      var d = (e && e.detail) || {};
      if (d.source === 'dbsync') return;
      if (d.source === 'entry' && d.item && (d.action === 'add' || d.action === 'update')) { syncItems([d.item]); return; }
      if (d.source === 'review' && Array.isArray(d.ids) && d.ids.length) {
        var want = {}; d.ids.forEach(function (id) { want[String(id)] = true; });
        syncItems(requests().filter(function (it) { return it && want[String(it.id)]; }));
        return;
      }
      reconcile();
    }
    function onOnline() { if (!stopped) reconcile(); }

    return {
      start: function () {
        if (started) return chain;
        started = true; stopped = false;
        if (doc) { doc.addEventListener('dnc:data-changed', onData); cleanups.push(function () { doc.removeEventListener('dnc:data-changed', onData); }); }
        if (win) {
          win.addEventListener('online', onOnline); cleanups.push(function () { win.removeEventListener('online', onOnline); });
          win.addEventListener('storage', onData); cleanups.push(function () { win.removeEventListener('storage', onData); });
        }
        return reconcile();
      },
      stop: function () {
        stopped = true; started = false;
        cleanups.forEach(function (f) { f(); }); cleanups = [];
        if (retryHandle != null) { unschedule(retryHandle); retryHandle = null; }
      },
      reconcile: reconcile,
      flush: function () { return chain; },
      getState: function () { return Object.assign({}, st); },
      onState: function (cb) { subs.push(cb); return function () { subs = subs.filter(function (f) { return f !== cb; }); }; }
    };
  }

  return { THRESHOLD: THRESHOLD, CATEGORY: CATEGORY, STATUSES: STATUSES, amountOf: amountOf, normTime: normTime, rowFromRequest: rowFromRequest, sameRow: sameRow, createClient: createClient, createSync: createSync };
});
