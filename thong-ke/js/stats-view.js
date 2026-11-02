/* Sổ Đề Nghị Chi – Module 3: giao diện trang "Thống kê" (DESIGN mục 11, kèm 4.2, 6.5, 6.6, 10.5).
 * API: DncStats.mount(rootEl, { store, session, today, month, range, onForbidden }) → controller
 *   session: { vaiTro:'quan_ly' } (thấy tất cả) | { vaiTro:'nhan_vien', nhanVienId } (chỉ số liệu của mình).
 * Đồ họa biểu đồ là SVG; nhãn chữ là HTML để giữ cỡ chữ ≥ 12px và chọn/đọc được.
 */
(function (root) {
  'use strict';
  var S = root.DncStatsModel;
  var seq = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(path, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + '</svg>';
  }
  var P = {
    prev: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>', down: '<path d="M12 5v14M19 12l-7 7-7-7"/>', same: '<path d="M5 9h14M5 15h14"/>'
  };
  var ERR = {
    blocked: 'Trình duyệt đang chặn đọc dữ liệu đã lưu.',
    corrupt: 'Không đọc được dữ liệu đã lưu.'
  };
  function initial(name) {
    var w = String(name || '').trim().split(/\s+/).filter(Boolean);
    return w.length ? Array.from(w[w.length - 1])[0].toUpperCase() : '?';
  }
  function colorIndex(key) {
    var h = 0, s = String(key || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 7) + 1;
  }
  function num(n) { return Math.round(n * 1000) / 1000; }

  function mount(rootEl, opts) {
    opts = opts || {};
    var store = opts.store;
    var session = opts.session || null;
    var role = session && session.vaiTro;
    var isManager = role === 'quan_ly';
    var ownId = role === 'nhan_vien' && session.nhanVienId ? String(session.nhanVienId) : '';
    var allowed = isManager || !!ownId;
    var uid = 'dst' + (++seq);
    var cleanups = [];
    var $ = function (s) { return rootEl.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(rootEl.querySelectorAll(s)); };
    function todayNow() { return opts.today || S.todayStr(); }

    var st = {
      month: S.isValidMonth(opts.month) ? opts.month : S.monthOf(todayNow()),
      nv: ownId, range: opts.range === 12 ? 12 : 6,
      sort: { key: 'approved', dir: 'desc' }, showAllEmp: false,
      rows: [], skipped: 0, employees: [], loadError: null, destroyed: false, tipFor: null
    };
    rootEl.classList.add('dst-root');

    /* ---------- Dữ liệu ---------- */
    function reload() {
      var n = store.listNhanVien(), d = store.listDeNghi();
      if (!n.ok) { st.loadError = n.error; return false; }
      if (!d.ok) { st.loadError = d.error; return false; }
      var p = S.prepare(d.data);
      st.rows = p.rows; st.skipped = p.skipped; st.employees = n.data; st.loadError = null;
      return true;
    }
    function nameOf(id) {
      for (var i = 0; i < st.employees.length; i++) if (st.employees[i].id === id) return st.employees[i].hoTen;
      return 'Nhân viên không rõ';
    }
    function filter() { return st.nv ? { nhanVienId: st.nv } : {}; }
    function nowMonth() { return S.monthOf(todayNow()); }

    /* ---------- Khung ---------- */
    function renderShell() {
      var h = '<div class="dst-main"><div class="dst-head"><h1 class="dst-title">Thống kê</h1>';
      if (!allowed) {
        rootEl.innerHTML = h + '</div><div class="dst-panel" data-role="blocked" data-code="role" role="status"><p>Hãy chọn vai trò để xem thống kê.</p></div></div>';
        return;
      }
      if (st.loadError) {
        rootEl.innerHTML = h + '</div><div class="dst-panel" data-role="blocked" data-code="' + esc(st.loadError) + '" role="alert"><p>' + esc(ERR[st.loadError] || ERR.corrupt) +
          '</p><button type="button" class="dst-btn" data-act="retry">Thử lại</button></div></div>';
        return;
      }
      h += '<div class="dst-month" role="group" aria-label="Chọn tháng">' +
        '<button type="button" class="dst-icon-btn" data-act="prev" aria-label="Tháng trước">' + icon(P.prev, 20) + '</button>' +
        '<button type="button" class="dst-month-label" data-act="today" data-role="month-label" aria-live="polite" title="Về tháng hiện tại"></button>' +
        '<button type="button" class="dst-icon-btn" data-act="next" aria-label="Tháng sau">' + icon(P.next, 20) + '</button></div></div>';
      h += '<div class="dst-controls">';
      if (isManager) h += '<select class="dst-select" data-filter="nv" aria-label="Lọc theo nhân viên"></select>';
      h += '<div class="dst-seg" role="group" aria-label="Số tháng so sánh">' +
        '<button type="button" data-range="6" aria-pressed="false">6 tháng</button><button type="button" data-range="12" aria-pressed="false">12 tháng</button></div></div>';
      h += '<div data-role="content"></div>';
      h += '<div class="dst-tip" data-role="tip" role="tooltip" hidden></div></div>';
      rootEl.innerHTML = h;
    }

    function syncControls() {
      $('[data-role="month-label"]').textContent = S.monthLabel(st.month);
      $('[data-act="next"]').disabled = st.month >= nowMonth();
      $('[data-act="prev"]').disabled = st.month <= S.LIMITS.MONTH_MIN;
      $$('[data-range]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-range') === st.range)); });
      var sel = $('[data-filter="nv"]');
      if (sel) {
        var ids = {};
        st.employees.forEach(function (e) { if (e.hoatDong) ids[e.id] = true; });
        st.rows.forEach(function (r) { ids[r.nv] = true; });
        if (st.nv) ids[st.nv] = true;
        sel.innerHTML = '<option value="">Tất cả nhân viên</option>' + Object.keys(ids).sort(function (a, b) {
          return nameOf(a).localeCompare(nameOf(b), 'vi');
        }).map(function (id) { return '<option value="' + esc(id) + '">' + esc(nameOf(id)) + '</option>'; }).join('');
        sel.value = st.nv;
      }
    }

    /* ---------- Các khối nội dung ---------- */
    function deltaHTML(cmp, prevMonth) {
      var label = S.monthLabel(prevMonth), txt, dir = cmp.dir, ico = P[dir === 'same' ? 'same' : dir];
      if (cmp.isNew) { txt = 'Mới (tháng trước chưa có)'; ico = P.up; dir = 'new'; }
      else if (cmp.diff === 0) txt = 'Không đổi so với ' + label;
      else txt = S.formatDelta(cmp.pct) + ' (' + S.formatSignedVND(cmp.diff) + ') so với ' + label;
      var sr = cmp.isNew ? 'Mới, tháng trước chưa có' : cmp.diff === 0 ? 'Không đổi' : (cmp.dir === 'up' ? 'Tăng ' : 'Giảm ') + S.formatPct(Math.abs(cmp.pct)) + ' so với ' + label;
      return '<div class="dst-delta" data-role="delta" data-dir="' + dir + '" aria-label="' + esc(sr) + '">' + icon(ico) + '<span>' + esc(txt) + '</span></div>';
    }

    function highlightsHTML(items) {
      return '<section class="dst-card" aria-labelledby="' + uid + '-hl"><h2 id="' + uid + '-hl">Điểm chính</h2><ul class="dst-hl" data-role="highlights">' +
        items.map(function (i) { return '<li data-kind="' + i.kind + '">' + esc(i.text) + '</li>'; }).join('') + '</ul></section>';
    }

    function kpiHTML(ms, f) {
      var prevM = S.shiftMonth(st.month, -1);
      var prev = S.monthStats(st.rows, prevM, f);
      var cmp = S.compare(ms.approved.total, prev.approved.total);
      return '<section class="dst-kpis" aria-label="Tổng quan tháng">' +
        '<article class="dst-kpi" data-kpi="approved"><h3>Đã duyệt</h3><div class="dst-kpi-val" data-role="kpi-approved">' + S.formatVND(ms.approved.total) + '</div>' +
        '<div class="dst-kpi-sub">' + ms.approved.count + ' khoản</div>' + deltaHTML(cmp, prevM) + '</article>' +
        '<article class="dst-kpi" data-kpi="pending"><h3>Chờ duyệt</h3><div class="dst-kpi-val" data-role="kpi-pending">' + S.formatVND(ms.pending.total) + '</div>' +
        '<div class="dst-kpi-sub">' + ms.pending.count + ' khoản</div></article>' +
        '<article class="dst-kpi" data-kpi="rejected"><h3>Từ chối</h3><div class="dst-kpi-val" data-role="kpi-rejected">' + ms.rejected.count + ' khoản</div>' +
        '<div class="dst-kpi-sub">tổng ' + S.formatVND(ms.rejected.total) + '</div></article></section>';
    }

    function metricsHTML(ms) {
      var lg = ms.largest;
      return '<section class="dst-metrics" aria-label="Chỉ số khác">' +
        metric('avg', 'Trung bình mỗi đề nghị', ms.avgApproved == null ? '—' : S.formatVND(ms.avgApproved), 'Tính trên khoản Đã duyệt') +
        metric('largest', 'Đề nghị lớn nhất', lg ? S.formatVND(lg.amount) : '—', lg ? lg.ncc + ' · ' + nameOf(lg.nv) : 'Chưa có khoản Đã duyệt') +
        metric('rate', 'Tỷ lệ duyệt', ms.approvalRate == null ? '—' : S.formatPct(ms.approvalRate), ms.approved.count + ' duyệt · ' + ms.rejected.count + ' từ chối') +
        metric('time', 'Thời gian xử lý TB', ms.avgProcessHours == null ? '—' : S.formatHours(ms.avgProcessHours), 'Từ lúc gửi đến lúc xử lý') + '</section>';
    }
    function metric(k, label, val, sub) {
      return '<article class="dst-metric" data-metric="' + k + '"><h3>' + esc(label) + '</h3><div class="dst-metric-val" data-role="metric-val">' + esc(val) +
        '</div><div class="dst-metric-sub">' + esc(sub) + '</div></article>';
    }

    function pieHTML(cat, ms) {
      var slices = S.pieSlices(cat), c = '', legend = '', off = 0;
      var gap = slices.length > 1 ? 0.6 : 0;
      slices.forEach(function (s) {
        var len = Math.max(s.share - gap, 0.01);
        var tip = s.ten + ' · ' + S.formatVND(s.total) + ' · ' + s.pct + '%';
        c += '<circle class="dst-slice" data-slice="' + s.danhMuc + '" data-pct="' + s.pct + '" data-share="' + num(s.share) + '" data-len="' + num(len) + '" cx="100" cy="100" r="76" pathLength="100" ' +
          'stroke="var(--cat-' + s.cat + ')" stroke-dasharray="' + num(len) + ' 100" stroke-dashoffset="' + (-num(off)) + '" tabindex="0" role="img" aria-label="' + esc(tip) + '" data-tip="' + esc(tip) + '"/>';
        legend += '<li data-legend="' + s.danhMuc + '"><span class="dst-dot" style="--c:var(--cat-' + s.cat + ')" aria-hidden="true"></span><span>' + esc(s.ten) +
          '</span><span class="dst-pct">' + s.pct + '%</span><span class="dst-amt">' + S.formatVND(s.total) + '</span></li>';
        off += s.share;
      });
      var empty = !slices.length;
      var emptyMsg = ms.pending.count > 0 && ms.approved.count === 0 ? 'Chưa có khoản Đã duyệt trong tháng (còn ' + ms.pending.count + ' khoản chờ duyệt).' : 'Chưa có khoản Đã duyệt trong tháng.';
      var top = slices.length ? cat.list[0] : null;
      var sr = '<table class="dst-sr"><caption>Chi Đã duyệt theo danh mục</caption><thead><tr><th>Danh mục</th><th>Tỷ lệ</th><th>Số tiền</th></tr></thead><tbody>' +
        slices.map(function (s) { return '<tr><td>' + esc(s.ten) + '</td><td>' + s.pct + '%</td><td>' + S.formatVND(s.total) + '</td></tr>'; }).join('') + '</tbody></table>';
      return '<section class="dst-card dst-span-5" data-card="pie" aria-labelledby="' + uid + '-pie"><h2 id="' + uid + '-pie">Cơ cấu chi theo danh mục</h2>' +
        (top ? '<p class="dst-sub" data-role="pie-top">Danh mục chi nhiều nhất: <strong>' + esc(top.ten) + '</strong></p>' : '') +
        '<div class="dst-pie"><div class="dst-donut" data-role="donut"><svg viewBox="0 0 200 200" aria-hidden="false" role="group" aria-label="Biểu đồ tròn chi theo danh mục">' +
        '<circle class="dst-ring" cx="100" cy="100" r="76"/>' + c + '</svg>' +
        '<div class="dst-donut-center"><span>Đã duyệt</span><strong data-role="donut-total">' + S.formatVND(cat.total) + '</strong></div></div>' +
        (empty ? '<p class="dst-empty" data-role="pie-empty">' + esc(emptyMsg) + '</p>' : '<ul class="dst-legend" data-role="legend">' + legend + '</ul>') + '</div>' + sr + '</section>';
    }

    function compactLabel(n) { return S.formatCompact(n); }
    function monthsHTML(series, f) {
      var max = 0;
      series.forEach(function (m) { if (m.total > max) max = m.total; });
      var dense = series.length > 6;
      var cols = series.map(function (m) {
        var h = max > 0 ? m.total / max * 100 : 0;
        if (m.total > 0 && h < 1.5) h = 1.5;
        var sel = m.month === st.month;
        var tip = S.monthLabel(m.month) + ' · ' + S.formatVND(m.total) + ' · ' + m.count + ' khoản';
        return '<button type="button" class="dst-col' + (sel ? ' is-selected' : '') + '" data-month="' + m.month + '" data-total="' + m.total + '" data-h="' + num(h) + '" data-tip="' + esc(tip) + '" ' +
          'aria-label="' + esc(tip) + (sel ? ' (đang chọn)' : '') + '"' + (sel ? ' aria-current="true"' : '') + '>' +
          '<span class="dst-col-val">' + esc(compactLabel(m.total)) + '</span>' +
          '<svg class="dst-col-svg" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><rect class="dst-bar" x="0" y="' + num(100 - h) + '" width="10" height="' + num(h) + '"/></svg>' +
          '<span class="dst-col-lab">' + S.monthShort(m.month) + '</span></button>';
      }).join('');
      var cur = series[series.length - 1], prev = series.length > 1 ? series[series.length - 2] : { total: 0 };
      var cmp = S.compare(cur.total, prev.total);
      var allZero = max === 0;
      var foot = allZero ? 'Chưa có khoản Đã duyệt trong giai đoạn này.' : S.monthLabel(cur.month) + ': ' + S.formatVND(cur.total) + ' · ' +
        (cmp.isNew ? 'Mới (tháng trước chưa có)' : cmp.diff === 0 ? 'Không đổi so với tháng trước' : S.formatDelta(cmp.pct) + ' (' + S.formatSignedVND(cmp.diff) + ') so với ' + S.monthLabel(prev.month));
      var sr = '<table class="dst-sr"><caption>Chi Đã duyệt theo tháng</caption><thead><tr><th>Tháng</th><th>Số tiền</th><th>Số khoản</th></tr></thead><tbody>' +
        series.map(function (m) { return '<tr><td>' + S.monthLabel(m.month) + '</td><td>' + S.formatVND(m.total) + '</td><td>' + m.count + '</td></tr>'; }).join('') + '</tbody></table>';
      return '<section class="dst-card dst-span-7" data-card="months" aria-labelledby="' + uid + '-mo"><h2 id="' + uid + '-mo">So sánh chi theo tháng</h2>' +
        '<p class="dst-sub">Tổng chi Đã duyệt, ' + series.length + ' tháng gần nhất đến ' + esc(S.monthLabel(st.month)) + '</p>' +
        '<div class="dst-cols' + (dense ? ' is-dense' : '') + '" data-role="month-cols" role="group" aria-label="Chi theo tháng">' + cols + '</div>' +
        '<p class="dst-foot" data-role="month-foot">' + esc(foot) + '</p>' + sr + '</section>';
    }

    function deltaCell(c) {
      if (c.isNew) return '<span class="dst-delta" data-dir="new" aria-label="Mới, tháng trước chưa có">' + icon(P.up) + 'Mới</span>';
      if (c.diff === 0) return '<span class="dst-delta" data-dir="same" aria-label="Không đổi">' + icon(P.same) + 'Không đổi</span>';
      return '<span class="dst-delta" data-dir="' + c.dir + '" aria-label="' + (c.dir === 'up' ? 'Tăng ' : 'Giảm ') + esc(S.formatPct(Math.abs(c.pct))) + '">' + icon(P[c.dir]) +
        esc(S.formatDelta(c.pct)) + ' · ' + esc(S.formatSignedVND(c.diff)) + '</span>';
    }
    function categoryCompareHTML(cc) {
      var prevM = S.shiftMonth(st.month, -1);
      var max = 0;
      cc.list.forEach(function (c) { max = Math.max(max, c.cur, c.prev); });
      var topId = cc.list.length ? cc.list[0].danhMuc : null;
      var rise = cc.list.filter(function (c) { return c.diff > 0 && !c.isNew; }).sort(function (a, b) { return b.diff - a.diff || a.cat - b.cat; })[0];
      if (!rise) rise = cc.list.filter(function (c) { return c.diff > 0; }).sort(function (a, b) { return b.diff - a.diff || a.cat - b.cat; })[0];
      var rowsH = cc.list.map(function (c) {
        var wp = max > 0 ? c.prev / max * 100 : 0, wc = max > 0 ? c.cur / max * 100 : 0;
        return '<tr data-cat="' + c.danhMuc + '"><td><span class="dst-person"><span class="dst-dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--cat-' + c.cat + ')" aria-hidden="true"></span>' + esc(c.ten) + '</span>' +
          (c.danhMuc === topId && c.cur > 0 ? '<span class="dst-tag" data-tag="top">Chi nhiều nhất</span>' : '') +
          (rise && c.danhMuc === rise.danhMuc ? '<span class="dst-tag" data-tag="rise">Tăng nhiều nhất</span>' : '') + '</td>' +
          '<td class="dst-num" data-label="' + esc(S.monthShort(prevM)) + ' (tháng trước)" data-role="cmp-prev">' + S.formatVND(c.prev) + '</td>' +
          '<td class="dst-num" data-label="' + esc(S.monthShort(st.month)) + ' (tháng này)" data-role="cmp-cur">' + S.formatVND(c.cur) + '</td>' +
          '<td data-label="Chênh lệch" class="dst-wide" data-role="cmp-delta">' + deltaCell(c) + '</td>' +
          '<td class="dst-wide" aria-hidden="true"><svg class="dst-mini" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect class="dst-track" width="100" height="8"/><rect class="dst-prev" width="' + num(wp) + '" height="8"/></svg>' +
          '<svg class="dst-mini" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" style="--c:var(--cat-' + c.cat + ')"><rect class="dst-track" width="100" height="8"/><rect class="dst-cur" width="' + num(wc) + '" height="8"/></svg></td></tr>';
      }).join('');
      var tot = cc.total;
      var body = cc.list.length
        ? '<table class="dst-table" data-role="cmp-table"><caption class="dst-sr">So sánh chi theo danh mục giữa ' + esc(S.monthLabel(prevM)) + ' và ' + esc(S.monthLabel(st.month)) + '</caption><thead><tr><th scope="col">Danh mục</th><th scope="col" class="dst-num">' + esc(S.monthShort(prevM)) + ' (tháng trước)</th><th scope="col" class="dst-num">' + esc(S.monthShort(st.month)) + ' (tháng này)</th><th scope="col">Chênh lệch</th><th scope="col"><span class="dst-sr">Biểu đồ so sánh</span></th></tr></thead><tbody>' + rowsH + '</tbody>' +
          '<tfoot><tr data-role="cmp-total"><td>Tổng cộng</td><td class="dst-num" data-label="Tháng trước">' + S.formatVND(cc.prevTotal) + '</td><td class="dst-num" data-label="Tháng này">' + S.formatVND(cc.curTotal) + '</td><td class="dst-wide" data-label="Chênh lệch">' + deltaCell(tot) + '</td><td class="dst-wide"></td></tr></tfoot></table>'
        : '<p class="dst-empty" data-role="cmp-empty">Chưa có khoản Đã duyệt trong hai tháng này.</p>';
      return '<section class="dst-card dst-span-12" data-card="compare" aria-labelledby="' + uid + '-cmp"><h2 id="' + uid + '-cmp">So sánh danh mục với tháng trước</h2>' +
        '<p class="dst-sub">' + esc(S.monthLabel(st.month)) + ' so với ' + esc(S.monthLabel(prevM)) + ' · tìm lý do chi nhiều nhất và tăng nhiều nhất</p>' + body + '</section>';
    }

    function employeeBarsHTML(list) {
      var withData = list.filter(function (e) { return e.approved.total > 0; });
      var max = withData.length ? withData[0].approved.total : 0;
      var shown = st.showAllEmp ? withData : withData.slice(0, S.LIMITS.EMP_CHART_MAX);
      var rowsH = shown.map(function (e) {
        var w = max > 0 ? e.approved.total / max * 100 : 0;
        var tip = e.ten + ' · ' + S.formatVND(e.approved.total) + ' · ' + S.formatPct(Math.round(e.share * 10) / 10);
        return '<li><button type="button" class="dst-hrow" data-nv="' + esc(e.id) + '" data-total="' + e.approved.total + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip + '. Bấm để xem riêng người này') + '">' +
          '<span class="dst-name">' + esc(e.ten) + '</span><svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><rect class="dst-track" width="100" height="12" rx="2"/><rect class="dst-bar" width="' + num(w) + '" height="12" rx="2"/></svg>' +
          '<span class="dst-amt">' + S.formatVND(e.approved.total) + '</span></button></li>';
      }).join('');
      var more = withData.length > S.LIMITS.EMP_CHART_MAX
        ? '<button type="button" class="dst-link dst-more" data-act="toggle-emp">' + (st.showAllEmp ? 'Thu gọn' : 'Xem tất cả (' + withData.length + ')') + '</button>' : '';
      var body = withData.length ? '<ul class="dst-hlist" data-role="emp-bars">' + rowsH + '</ul>' + more
        : list.length ? '<p class="dst-empty" data-role="emp-empty">Chưa có khoản Đã duyệt trong tháng.</p>' : '<p class="dst-empty" data-role="emp-empty">Chưa có nhân viên.</p>';
      return '<section class="dst-card dst-span-7" data-card="emp-chart" aria-labelledby="' + uid + '-ec"><h2 id="' + uid + '-ec">Chi theo nhân viên</h2><p class="dst-sub">Tổng chi Đã duyệt trong tháng</p>' + body + '</section>';
    }

    function suppliersHTML(top, spanClass) {
      var max = top.length ? top[0].total : 0;
      var body = top.length ? '<ol class="dst-hlist" data-role="suppliers" style="list-style:none">' + top.map(function (t, i) {
        var tip = t.name + ' · ' + S.formatVND(t.total) + ' · ' + t.count + ' lần';
        return '<li><div class="dst-hrow dst-hrow--stack" data-tip="' + esc(tip) + '" tabindex="0" role="group" aria-label="' + esc((i + 1) + '. ' + tip) + '"><span class="dst-name" title="' + esc(t.name) + '"><span class="dst-rank">' + (i + 1) + '</span>' + esc(t.name) + '</span>' +
          '<svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><rect class="dst-track" width="100" height="12" rx="2"/><rect class="dst-bar" width="' + num(max > 0 ? t.total / max * 100 : 0) + '" height="12" rx="2"/></svg>' +
          '<span class="dst-amt">' + S.formatVND(t.total) + ' <span class="dst-rank">· ' + t.count + ' lần</span></span></div></li>';
      }).join('') + '</ol>' : '<p class="dst-empty" data-role="sup-empty">Chưa có khoản Đã duyệt trong tháng.</p>';
      return '<section class="dst-card ' + spanClass + '" data-card="suppliers" aria-labelledby="' + uid + '-sp"><h2 id="' + uid + '-sp">Nội dung / nhà cung cấp chi nhiều nhất</h2><p class="dst-sub">Top ' + S.LIMITS.TOP_N + ' theo tổng chi Đã duyệt</p>' + body + '</section>';
    }

    var SORT_LABEL = { monthCount: 'Đề nghị trong tháng', approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Từ chối', share: 'Tỷ trọng', allTime: 'Từ trước đến nay' };
    function employeeTableHTML(list) {
      var sorted = S.sortEmployees(list, st.sort.key, st.sort.dir);
      var tot = S.employeeTotals(list);
      function th(key, label, cls) {
        var active = st.sort.key === key;
        return '<th scope="col" class="' + cls + '"' + (active ? ' aria-sort="' + (st.sort.dir === 'asc' ? 'ascending' : 'descending') + '"' : '') + '><button type="button" class="dst-sort" data-sort="' + key + '">' + label + (active ? (st.sort.dir === 'asc' ? ' ▲' : ' ▼') : '') + '</button></th>';
      }
      var rowsH = sorted.map(function (e) {
        return '<tr data-nv="' + esc(e.id) + '" tabindex="0" aria-label="' + esc(e.ten + '. Bấm để xem thống kê riêng') + '">' +
          '<td><span class="dst-person"><span class="dst-avatar" style="--av:var(--cat-' + colorIndex(e.id) + ')" aria-hidden="true">' + esc(initial(e.ten)) + '</span><span>' + esc(e.ten) + '</span>' + (e.ngung ? '<span class="dst-badge-off">Ngưng</span>' : '') + '</span></td>' +
          '<td class="dst-num" data-label="Đề nghị trong tháng" data-role="e-count">' + e.monthCount + '</td>' +
          '<td class="dst-num" data-label="Đã duyệt" data-role="e-approved">' + S.formatVND(e.approved.total) + '<span class="dst-sr"> (' + e.approved.count + ' khoản)</span></td>' +
          '<td class="dst-num" data-label="Chờ duyệt" data-role="e-pending">' + S.formatVND(e.pending.total) + '<span class="dst-sr"> (' + e.pending.count + ' khoản)</span></td>' +
          '<td class="dst-num" data-label="Từ chối" data-role="e-rejected">' + e.rejected.count + ' khoản</td>' +
          '<td class="dst-num" data-label="Tỷ trọng" data-role="e-share">' + S.formatPct(Math.round(e.share * 10) / 10) + '</td>' +
          '<td class="dst-num" data-label="Từ trước đến nay" data-role="e-all">' + e.allTimeCount + ' đề nghị</td></tr>';
      }).join('');
      var sortSel = '<div class="dst-sortbar"><label for="' + uid + '-sort">Sắp xếp theo</label><select class="dst-select" id="' + uid + '-sort" data-role="sort-select">' +
        Object.keys(SORT_LABEL).map(function (k) { return '<option value="' + k + '"' + (k === st.sort.key ? ' selected' : '') + '>' + SORT_LABEL[k] + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="dst-icon-btn" data-act="sort-dir" aria-label="Đổi chiều sắp xếp">' + (st.sort.dir === 'asc' ? '▲' : '▼') + '</button></div>';
      var body = list.length ? sortSel + '<table class="dst-table" data-role="emp-table"><caption class="dst-sr">Tổng hợp đề nghị chi theo nhân viên, ' + esc(S.monthLabel(st.month)) + '</caption><thead><tr><th scope="col">Nhân viên</th>' +
        th('monthCount', 'Đề nghị trong tháng', 'dst-num') + th('approved', 'Đã duyệt (₫)', 'dst-num') + th('pending', 'Chờ duyệt (₫)', 'dst-num') + th('rejected', 'Từ chối', 'dst-num') + th('share', 'Tỷ trọng', 'dst-num') + th('allTime', 'Từ trước đến nay', 'dst-num') +
        '</tr></thead><tbody>' + rowsH + '</tbody><tfoot><tr data-role="emp-total"><td>Tổng cộng</td><td class="dst-num" data-label="Đề nghị trong tháng">' + tot.monthCount + '</td><td class="dst-num" data-label="Đã duyệt">' + S.formatVND(tot.approved.total) +
        '</td><td class="dst-num" data-label="Chờ duyệt">' + S.formatVND(tot.pending.total) + '</td><td class="dst-num" data-label="Từ chối">' + tot.rejected.count + ' khoản</td><td class="dst-num" data-label="Tỷ trọng">' + (tot.approved.total > 0 ? '100%' : '—') +
        '</td><td class="dst-num" data-label="Từ trước đến nay">' + tot.allTimeCount + ' đề nghị</td></tr></tfoot></table>'
        : '<p class="dst-empty" data-role="emp-table-empty">Chưa có nhân viên.</p>';
      return '<section class="dst-card dst-span-12" data-card="emp-table" aria-labelledby="' + uid + '-et"><h2 id="' + uid + '-et">Tổng hợp theo nhân viên</h2><p class="dst-sub">Tổng số đề nghị chi của từng nhân viên · ' + esc(S.monthLabel(st.month)) + '</p>' + body + '</section>';
    }

    function renderContent() {
      var box = $('[data-role="content"]');
      var f = filter();
      var ms = S.monthStats(st.rows, st.month, f);
      var cat = S.byCategory(st.rows, st.month, f);
      var emps = isManager && !st.nv ? S.byEmployee(st.rows, st.month, st.employees) : null;
      var h = '';
      if (st.skipped > 0) h += '<p class="dst-note" data-role="skipped">Đã bỏ qua ' + st.skipped + ' khoản dữ liệu lỗi.</p>';
      if (isManager && st.nv) h += '<p class="dst-viewing" data-role="viewing">Đang xem: <strong>' + esc(nameOf(st.nv)) + '</strong><button type="button" class="dst-link" data-act="clear-nv">Xem tất cả</button></p>';
      else if (!isManager) h += '<p class="dst-viewing" data-role="viewing">Đang xem số liệu của bạn: <strong>' + esc(nameOf(ownId)) + '</strong></p>';
      h += highlightsHTML(S.highlights(st.rows, st.month, f, emps ? st.employees : null));
      h += kpiHTML(ms, f) + metricsHTML(ms);
      h += '<div class="dst-grid">' + pieHTML(cat, ms) + monthsHTML(S.monthlySeries(st.rows, st.month, st.range, f), f) + '</div>';
      h += categoryCompareHTML(S.categoryComparison(st.rows, st.month, f));
      var top = S.topSuppliers(st.rows, st.month, f);
      if (emps) h += '<div class="dst-grid">' + employeeBarsHTML(emps) + suppliersHTML(top, 'dst-span-5') + '</div>' + employeeTableHTML(emps);
      else h += '<div class="dst-grid">' + suppliersHTML(top, 'dst-span-12') + '</div>';
      box.innerHTML = h;
      box.classList.remove('dst-fade'); void box.offsetWidth; box.classList.add('dst-fade');
    }

    function render() {
      renderShell();
      if (!allowed || st.loadError) return;
      syncControls();
      renderContent();
    }
    function update() { hideTip(); syncControls(); renderContent(); }

    /* ---------- Chú giải ---------- */
    function showTip(el) {
      var t = $('[data-role="tip"]');
      if (!t || !el.getAttribute('data-tip')) return;
      t.textContent = el.getAttribute('data-tip');
      t.hidden = false;
      var r = el.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
      var left = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, document.documentElement.clientWidth - tw - 8));
      var top = r.top - th - 8; if (top < 8) top = r.bottom + 8;
      t.style.left = Math.round(left) + 'px'; t.style.top = Math.round(top) + 'px';
      st.tipFor = el;
    }
    function hideTip() { var t = $('[data-role="tip"]'); if (t) { t.hidden = true; t.textContent = ''; } st.tipFor = null; }

    /* ---------- Sự kiện ---------- */
    function on(target, type, fn, capture) {
      target.addEventListener(type, fn, capture);
      cleanups.push(function () { target.removeEventListener(type, fn, capture); });
    }
    function setNv(id) { st.nv = id; st.showAllEmp = false; update(); }

    on(rootEl, 'click', function (e) {
      if (!allowed) return;
      var t = e.target;
      var a = t.closest ? t.closest('[data-act]') : null;
      if (a) {
        var act = a.getAttribute('data-act');
        if (act === 'prev') { st.month = S.shiftMonth(st.month, -1); update(); }
        else if (act === 'next') { if (st.month < nowMonth()) { st.month = S.shiftMonth(st.month, 1); update(); } }
        else if (act === 'today') { st.month = nowMonth(); update(); }
        else if (act === 'retry') { reload(); render(); }
        else if (act === 'clear-nv' && isManager) setNv('');
        else if (act === 'toggle-emp') { st.showAllEmp = !st.showAllEmp; update(); var b = $('[data-act="toggle-emp"]'); if (b) b.focus(); }
        else if (act === 'sort-dir') { st.sort.dir = st.sort.dir === 'asc' ? 'desc' : 'asc'; update(); var s2 = $('[data-act="sort-dir"]'); if (s2) s2.focus(); }
        return;
      }
      var rg = t.closest ? t.closest('[data-range]') : null;
      if (rg) { st.range = +rg.getAttribute('data-range') === 12 ? 12 : 6; update(); var rb = $('[data-range="' + st.range + '"]'); if (rb) rb.focus(); return; }
      var so = t.closest ? t.closest('[data-sort]') : null;
      if (so) {
        var key = so.getAttribute('data-sort');
        if (st.sort.key === key) st.sort.dir = st.sort.dir === 'asc' ? 'desc' : 'asc'; else { st.sort.key = key; st.sort.dir = 'desc'; }
        update(); var nb = $('[data-sort="' + key + '"]'); if (nb) nb.focus();
        return;
      }
      var col = t.closest ? t.closest('[data-month]') : null;
      if (col) {
        var m = col.getAttribute('data-month');
        if (m && m <= nowMonth() && m !== st.month) { st.month = m; update(); var cb = $('[data-month="' + m + '"]'); if (cb) cb.focus(); }
        return;
      }
      if (isManager) {
        var who = t.closest ? t.closest('[data-nv]') : null;
        if (who && !t.closest('[data-sort]')) { setNv(who.getAttribute('data-nv')); var v = $('[data-role="viewing"]'); if (v) { v.setAttribute('tabindex', '-1'); v.focus(); } }
      }
    });
    on(rootEl, 'keydown', function (e) {
      if (!isManager) return;
      var tr = e.target.closest ? e.target.closest('tr[data-nv]') : null;
      if (tr && e.target === tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setNv(tr.getAttribute('data-nv')); }
    });
    on(rootEl, 'change', function (e) {
      var t = e.target;
      if (t.getAttribute && t.getAttribute('data-filter') === 'nv' && isManager) setNv(t.value);
      else if (t.getAttribute && t.getAttribute('data-role') === 'sort-select') {
        st.sort.key = SORT_LABEL[t.value] ? t.value : 'approved'; st.sort.dir = 'desc'; update();
        var sel = $('[data-role="sort-select"]'); if (sel) sel.focus();
      }
    });
    on(rootEl, 'pointerover', function (e) { var el = e.target.closest ? e.target.closest('[data-tip]') : null; if (el) showTip(el); });
    on(rootEl, 'pointerout', function (e) { var el = e.target.closest ? e.target.closest('[data-tip]') : null; if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hideTip(); });
    on(rootEl, 'focusin', function (e) { var el = e.target.closest ? e.target.closest('[data-tip]') : null; if (el) showTip(el); });
    on(rootEl, 'focusout', function (e) { if (e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape' && st.tipFor) hideTip(); });
    on(document, 'dnc:data-changed', function () {
      if (st.destroyed || !allowed) return;
      if (reload()) { if ($('[data-role="content"]')) update(); else render(); } else render();
    });

    /* ---------- Khởi động ---------- */
    if (allowed) reload();
    render();
    if (!allowed && opts.onForbidden) opts.onForbidden();

    return {
      root: rootEl,
      refresh: function () { if (allowed) { reload(); render(); } },
      getState: function () {
        return { month: st.month, nhanVienId: st.nv, range: st.range, sort: { key: st.sort.key, dir: st.sort.dir }, allowed: allowed, isManager: isManager, loadError: st.loadError, skipped: st.skipped, destroyed: st.destroyed };
      },
      destroy: function () {
        st.destroyed = true;
        cleanups.forEach(function (f) { f(); });
        cleanups = [];
        rootEl.innerHTML = '';
        rootEl.classList.remove('dst-root');
      }
    };
  }

  root.DncStats = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
