/* Sổ Đề Nghị Chi – Cơ sở dữ liệu: bảng "Tổng hợp chi từ cơ sở dữ liệu" trên Trang chủ của Quản lý (DESIGN mục 14).
 * API: DncDbPanel.mount(el, { client, sync?, session, threshold? }) → { reload(), getState(), destroy() }
 * Chỉ hiển thị với Quản lý. Đọc products.db qua API; cảnh báo khi MỘT khoản chi LỚN HƠN 100 triệu.
 */
(function (root) {
  'use strict';
  var seq = 0;
  var STATUS_TXT = { cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối' };
  var STATUS_ORDER = ['cho_duyet', 'da_duyet', 'tu_choi'];
  var CATEGORY_ORDER = ['Văn phòng phẩm', 'Vật tư', 'Thiết bị', 'Vận chuyển', 'Tiếp khách', 'Dịch vụ', 'Khác'];
  var SORTS = { newest: 'Mới nhất', amount: 'Số tiền cao → thấp', name: 'Nhân viên A–Z' };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(path, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + '</svg>';
  }
  var P = {
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>', db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'
  };
  function groupDigits(d) { return String(d).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function vnd(n) { return typeof n !== 'number' || !isFinite(n) ? '—' : (n < 0 ? '-' : '') + groupDigits(String(Math.abs(Math.round(n)))) + ' ₫'; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  var STATUS_ICON = { cho_duyet: P.clock, da_duyet: P.tick, tu_choi: P.cross };
  function badge(s) { return '<span class="db-badge db-badge-' + s + '" data-status-badge="' + s + '">' + icon(STATUS_ICON[s], 14) + (STATUS_TXT[s] || esc(s)) + '</span>'; }

  function mount(el, opts) {
    opts = opts || {};
    var client = opts.client, sync = opts.sync, session = opts.session || null;
    var threshold = typeof opts.threshold === 'number' ? opts.threshold : 100000000;
    var allowed = !!(session && session.vaiTro === 'quan_ly');
    var uid = 'db' + (++seq);
    var cleanups = [];
    var st = { phase: 'loading', items: [], error: null, filter: 'all', sort: 'newest', destroyed: false, timer: null, seq: 0, loadedAt: null };
    if (!allowed) return { reload: function () {}, getState: function () { return { allowed: false, phase: 'hidden' }; }, destroy: function () { el.innerHTML = ''; } };
    el.classList.add('db-root');
    var $ = function (s) { return el.querySelector(s); };

    function over(r) { return r.so_tien > threshold; }
    function load() {
      var mine = ++st.seq;
      if (st.phase !== 'ready') st.phase = 'loading';
      render();
      return client.list().then(function (r) {
        if (st.destroyed || mine !== st.seq) return;
        if (!r.ok) { st.phase = 'error'; st.error = r; st.items = []; }
        else { st.phase = 'ready'; st.error = null; st.items = Array.isArray(r.data.items) ? r.data.items.slice() : []; st.loadedAt = Date.now(); }
        render();
      });
    }

    function sorted(list) {
      var a = list.slice();
      if (st.sort === 'amount') a.sort(function (x, y) { return y.so_tien - x.so_tien || y.id - x.id; });
      else if (st.sort === 'name') a.sort(function (x, y) { return x.ten_nhan_vien.localeCompare(y.ten_nhan_vien, 'vi') || y.id - x.id; });
      else a.sort(function (x, y) { return x.thoi_gian < y.thoi_gian ? 1 : x.thoi_gian > y.thoi_gian ? -1 : y.id - x.id; });
      return a;
    }
    function totals(list) { return list.reduce(function (t, r) { return t + r.so_tien; }, 0); }

    function chartHTML(items) {
      var cats = {}, max = 0;
      items.forEach(function (r) {
        var c = cats[r.phan_loai_chi] || (cats[r.phan_loai_chi] = { total: 0, over: 0, cho_duyet: 0, da_duyet: 0, tu_choi: 0 });
        c.total += r.so_tien; c[r.trang_thai] += r.so_tien; if (over(r)) c.over++;
      });
      var names = Object.keys(cats).sort(function (a, b) { return cats[b].total - cats[a].total || CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b) || a.localeCompare(b, 'vi'); });
      names.forEach(function (n) { if (cats[n].total > max) max = cats[n].total; });
      if (!names.length) return '<p class="db-empty" data-role="chart-empty">Chưa có dữ liệu để vẽ biểu đồ.</p>';
      var rows = names.map(function (n) {
        var c = cats[n], x = 0, segs = '';
        STATUS_ORDER.forEach(function (s) {
          if (!c[s]) return;
          var w = max > 0 ? c[s] / max * 100 : 0;
          segs += '<rect class="db-seg db-seg-' + s + '" data-status="' + s + '" data-amount="' + c[s] + '" x="' + (Math.round(x * 1000) / 1000) + '" y="0" width="' + (Math.round(w * 1000) / 1000) + '" height="14"><title>' + esc(n + ' · ' + STATUS_TXT[s] + ' · ' + vnd(c[s])) + '</title></rect>';
          x += w;
        });
        return '<li class="db-crow" data-cat="' + esc(n) + '"><span class="db-cname">' + esc(n) + (c.over ? ' <span class="db-flag" data-role="cat-flag">' + icon(P.warn, 14) + c.over + ' khoản &gt; 100 triệu</span>' : '') + '</span>' +
          '<svg class="db-cbar" viewBox="0 0 100 14" preserveAspectRatio="none" role="img" aria-label="' + esc(n + ': ' + vnd(c.total)) + '"><rect class="db-track" x="0" y="0" width="100" height="14"/>' + segs + '</svg>' +
          '<span class="db-camt" data-role="cat-total">' + vnd(c.total) + '</span></li>';
      }).join('');
      var legend = '<ul class="db-legend" aria-label="Chú giải trạng thái">' + STATUS_ORDER.map(function (s) { return '<li><span class="db-dot db-dot-' + s + '" aria-hidden="true"></span>' + STATUS_TXT[s] + '</li>'; }).join('') + '</ul>';
      var sr = '<div class="db-sr"><table><caption>Chi theo phân loại và trạng thái</caption><thead><tr><th>Phân loại</th><th>Chờ duyệt</th><th>Đã duyệt</th><th>Từ chối</th><th>Tổng</th></tr></thead><tbody>' +
        names.map(function (n) { var c = cats[n]; return '<tr><td>' + esc(n) + '</td><td>' + vnd(c.cho_duyet) + '</td><td>' + vnd(c.da_duyet) + '</td><td>' + vnd(c.tu_choi) + '</td><td>' + vnd(c.total) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      return legend + '<ul class="db-chart" data-role="chart">' + rows + '</ul>' + sr;
    }

    function rowHTML(r) {
      var o = over(r);
      return '<tr class="db-tr' + (o ? ' is-over' : '') + '" data-id="' + r.id + '"' + (o ? ' data-over="1"' : '') + '>' +
        '<td class="db-c-id" data-label="ID">' + r.id + '</td><td class="db-c-ma" data-label="Mã NV">' + esc(r.ma_nhan_vien) + '</td><td class="db-c-name" data-label="Tên nhân viên">' + esc(r.ten_nhan_vien) + '</td>' +
        '<td class="db-num db-c-amt" data-label="Số tiền"><span data-role="amount">' + vnd(r.so_tien) + '</span>' + (o ? '<span class="db-flag" data-role="row-flag">' + icon(P.warn, 14) + 'Trên 100 triệu</span>' : '') + '</td>' +
        '<td class="db-c-time" data-label="Thời gian">' + fmtTime(r.thoi_gian) + '</td><td class="db-c-cat" data-label="Phân loại chi">' + esc(r.phan_loai_chi) + '</td><td class="db-c-st" data-label="Trạng thái">' + badge(r.trang_thai) + '</td></tr>';
    }

    function render() {
      if (st.destroyed) return;
      var items = st.items, n = items.length, overs = items.filter(over).sort(function (a, b) { return b.so_tien - a.so_tien || a.id - b.id; });
      var pend = items.filter(function (r) { return r.trang_thai === 'cho_duyet'; });
      var conn = st.phase === 'ready' ? '<span class="db-conn is-ok" data-role="conn" data-state="ok">' + icon(P.db) + 'Đã kết nối products.db · ' + n + ' khoản</span>'
        : st.phase === 'loading' ? '<span class="db-conn" data-role="conn" data-state="loading">' + icon(P.db) + 'Đang tải…</span>'
        : '<span class="db-conn is-bad" data-role="conn" data-state="offline">' + icon(P.db) + 'Chưa kết nối</span>';
      var h = '<section class="db-panel" aria-labelledby="' + uid + '-t"><div class="db-head"><h2 id="' + uid + '-t" class="db-title">Tổng hợp chi từ cơ sở dữ liệu</h2>' + conn +
        '<button type="button" class="db-btn" data-act="reload" aria-label="Làm mới dữ liệu">' + icon(P.refresh, 18) + 'Làm mới</button></div>';
      if (st.phase === 'error') {
        var detail = st.error && st.error.error === 'http' ? 'Máy chủ báo lỗi: ' + esc(st.error.message || '') : 'Không đọc được cơ sở dữ liệu.';
        h += '<div class="db-note" data-role="offline" role="alert"><p><strong>Chưa kết nối cơ sở dữ liệu.</strong> ' + detail + '</p>' +
          '<p>Hãy chạy máy chủ: <code>python3 server/server.py</code> rồi mở <code>http://127.0.0.1:8000/trang-chu/</code>. Các chức năng khác của ứng dụng vẫn dùng bình thường.</p></div></section>';
        el.innerHTML = h; return;
      }
      if (st.phase === 'loading' && !n) { h += '<p class="db-empty" data-role="loading" role="status">Đang tải dữ liệu từ cơ sở dữ liệu…</p></section>'; el.innerHTML = h; return; }
      if (overs.length) {
        h += '<div class="db-warn" data-role="warn" role="alert"><div class="db-warn-head">' + icon(P.warn, 20) + '<strong data-role="warn-title">Cảnh báo: có ' + overs.length + ' khoản chi trên 100 triệu đồng</strong></div><ul class="db-warn-list">' +
          overs.map(function (r) { return '<li data-warn-id="' + r.id + '"><strong>' + vnd(r.so_tien) + '</strong> · ' + esc(r.ten_nhan_vien) + ' (' + esc(r.ma_nhan_vien) + ') · ' + esc(r.phan_loai_chi) + ' · ' + STATUS_TXT[r.trang_thai] + ' · ' + fmtTime(r.thoi_gian) + '</li>'; }).join('') + '</ul></div>';
      }
      h += '<div class="db-kpis" data-role="kpis">' +
        kpi('count', 'Tổng số khoản chi', String(n), '') + kpi('total', 'Tổng số tiền', vnd(totals(items)), '') +
        kpi('pending', 'Chờ duyệt', String(pend.length) + ' khoản', vnd(totals(pend))) +
        kpi('over', 'Trên 100 triệu', String(overs.length) + ' khoản', overs.length ? 'cần chú ý' : 'không có') + '</div>';
      h += '<div class="db-card" data-card="chart"><h3 class="db-sub">Chi theo phân loại</h3>' + chartHTML(items) + '</div>';
      var counts = { all: n, cho_duyet: 0, da_duyet: 0, tu_choi: 0 };
      items.forEach(function (r) { if (counts[r.trang_thai] != null) counts[r.trang_thai]++; });
      var shown = sorted(items.filter(function (r) { return st.filter === 'all' || r.trang_thai === st.filter; }));
      h += '<div class="db-card" data-card="table"><div class="db-tools"><h3 class="db-sub">Toàn bộ khoản chi</h3>' +
        '<div class="db-seg-btns" role="group" aria-label="Lọc theo trạng thái">' + [['all', 'Tất cả'], ['cho_duyet', 'Chờ duyệt'], ['da_duyet', 'Đã duyệt'], ['tu_choi', 'Từ chối']].map(function (b) {
          return '<button type="button" data-filter="' + b[0] + '" aria-pressed="' + (st.filter === b[0]) + '">' + b[1] + ' (<span class="db-count">' + counts[b[0]] + '</span>)</button>';
        }).join('') + '</div><label class="db-sortlab">Sắp xếp <select class="db-select" data-role="sort" aria-label="Sắp xếp">' +
        Object.keys(SORTS).map(function (k) { return '<option value="' + k + '"' + (k === st.sort ? ' selected' : '') + '>' + SORTS[k] + '</option>'; }).join('') + '</select></label></div>';
      if (!n) h += '<p class="db-empty" data-role="empty">Cơ sở dữ liệu chưa có khoản chi nào.</p>';
      else if (!shown.length) h += '<p class="db-empty" data-role="filtered-empty">Không có khoản chi nào ở trạng thái này.</p>';
      else h += '<div class="db-tablewrap"><table class="db-table" data-role="table"><caption class="db-sr">Danh sách toàn bộ khoản chi trong products.db</caption><thead><tr>' +
        '<th scope="col">ID</th><th scope="col">Mã NV</th><th scope="col">Tên nhân viên</th><th scope="col" class="db-num">Số tiền</th><th scope="col">Thời gian</th><th scope="col">Phân loại chi</th><th scope="col">Trạng thái</th></tr></thead><tbody>' +
        shown.map(rowHTML).join('') + '</tbody></table></div>';
      h += '</div></section>';
      el.innerHTML = h;
    }
    function kpi(k, label, val, sub) {
      return '<article class="db-kpi" data-kpi="' + k + '"><h3 class="db-kpi-label">' + label + '</h3><div class="db-kpi-val" data-role="kpi-' + k + '">' + val + '</div>' + (sub ? '<div class="db-kpi-sub">' + sub + '</div>' : '') + '</article>';
    }

    function on(target, type, fn) { target.addEventListener(type, fn); cleanups.push(function () { target.removeEventListener(type, fn); }); }
    on(el, 'click', function (e) {
      var t = e.target;
      var a = t.closest ? t.closest('[data-act]') : null;
      if (a && a.getAttribute('data-act') === 'reload') { load(); return; }
      var f = t.closest ? t.closest('[data-filter]') : null;
      if (f) { st.filter = f.getAttribute('data-filter'); render(); var b = $('[data-filter="' + st.filter + '"]'); if (b) b.focus(); }
    });
    on(el, 'change', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-role') === 'sort') { st.sort = SORTS[e.target.value] ? e.target.value : 'newest'; render(); var s = $('[data-role="sort"]'); if (s) s.focus(); }
    });
    function debounced() { if (st.destroyed) return; clearTimeout(st.timer); st.timer = setTimeout(function () { load(); }, 120); }
    if (sync && sync.onState) {
      var last = null;
      cleanups.push(sync.onState(function (s) { if (s.state === 'synced' && last !== 'synced') debounced(); else if (s.state === 'synced' && s.pushed) debounced(); last = s.state; }));
    }
    if (el.ownerDocument) on(el.ownerDocument, 'dnc:db-synced', debounced);

    load();
    return {
      reload: load,
      getState: function () { return { allowed: true, phase: st.phase, count: st.items.length, filter: st.filter, sort: st.sort, destroyed: st.destroyed, overCount: st.items.filter(over).length }; },
      destroy: function () { st.destroyed = true; clearTimeout(st.timer); cleanups.forEach(function (f) { f(); }); cleanups = []; el.innerHTML = ''; el.classList.remove('db-root'); }
    };
  }

  root.DncDbPanel = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
