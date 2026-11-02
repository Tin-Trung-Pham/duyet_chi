/* Sổ Đề Nghị Chi – Module 2: giao diện trang "Duyệt đề nghị" (DESIGN 4.4, 10.4, 10.8; chỉ Quản lý).
 * API: DncReview.mount(rootEl, { store, session, today, month, onChanged, onForbidden }) → controller
 *   session phải là { vaiTro: 'quan_ly' }; vai trò khác bị chặn.
 */
(function (root) {
  'use strict';
  var R = root.DncReviewModel;
  var seq = 0;

  function icon(path, size) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + '</svg>';
  }
  var P = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    done: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'
  };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ERR_MSG = {
    blocked: 'Trình duyệt đang chặn lưu trữ nên không thao tác được.',
    full: 'Bộ nhớ trình duyệt đã đầy nên chưa lưu được thay đổi.',
    corrupt: 'Không đọc được dữ liệu đã lưu.',
    forbidden: 'Chỉ Quản lý mới được duyệt hoặc từ chối.',
    exception: 'Có lỗi khi xử lý. Hãy thử lại.'
  };

  function mount(rootEl, opts) {
    opts = opts || {};
    var store = opts.store;
    var session = opts.session || null;
    var isManager = !!(session && session.vaiTro === 'quan_ly');
    var actor = { vaiTro: 'quan_ly' };
    var uid = 'dv' + (++seq);
    var cleanups = [];
    var $ = function (s) { return rootEl.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(rootEl.querySelectorAll(s)); };
    function todayNow() { return opts.today || R.todayStr(); }

    var st = {
      month: opts.month || R.monthOf(todayNow()),
      nv: '', dm: '',
      sel: {}, items: [], nvMap: {}, loadError: null,
      busy: false, destroyed: false, toastTimer: null, undo: null, dlg: null
    };

    rootEl.classList.add('dv-root');

    /* ---------- Dữ liệu ---------- */
    function reload() {
      var n = store.listNhanVien();
      var d = store.listDeNghi();
      if (!n.ok) { st.loadError = n.error; return false; }
      if (!d.ok) { st.loadError = d.error; return false; }
      st.loadError = null;
      st.nvMap = {};
      n.data.forEach(function (e) { st.nvMap[e.id] = e; });
      st.items = d.data;
      return true;
    }
    function nameOf(id) { return st.nvMap[id] ? st.nvMap[id].hoTen : 'Nhân viên không rõ'; }
    function visible() { return R.filterQueue(st.items, { month: st.month, nhanVienId: st.nv, danhMuc: st.dm }); }
    function byId(id) { for (var i = 0; i < st.items.length; i++) if (st.items[i].id === id) return st.items[i]; return null; }
    function selectedIds() {
      var vis = visible();
      return vis.filter(function (it) { return st.sel[it.id]; }).map(function (it) { return it.id; });
    }
    function pruneSelection() {
      var vis = {};
      visible().forEach(function (it) { vis[it.id] = true; });
      Object.keys(st.sel).forEach(function (id) { if (!vis[id]) delete st.sel[id]; });
    }

    /* ---------- Khung giao diện ---------- */
    function renderShell() {
      var h = '<div class="dv-main"><div class="dv-head"><h1 class="dv-title">Duyệt đề nghị</h1>';
      if (!isManager) {
        h += '</div><div class="dv-panel" data-role="blocked" data-code="role" role="status"><p>Trang này dành cho Quản lý.</p></div></div>' +
          '<div class="dv-toast" data-role="toast" role="status" aria-live="polite"></div>';
        rootEl.innerHTML = h;
        return;
      }
      if (st.loadError) {
        h += '</div><div class="dv-panel" data-role="blocked" data-code="' + esc(st.loadError) + '" role="alert"><p>' +
          esc(ERR_MSG[st.loadError] || ERR_MSG.exception) + '</p><button type="button" class="dv-btn dv-btn-secondary" data-act="retry">Thử lại</button></div></div>' +
          '<div class="dv-toast" data-role="toast" role="status" aria-live="polite"></div>';
        rootEl.innerHTML = h;
        return;
      }
      h += '<div class="dv-month" role="group" aria-label="Chọn tháng">' +
        '<button type="button" class="dv-icon-btn" data-act="prev" aria-label="Tháng trước">' + icon(P.prev) + '</button>' +
        '<button type="button" class="dv-month-label" data-act="today" data-role="month-label" aria-live="polite" title="Về tháng hiện tại"></button>' +
        '<button type="button" class="dv-icon-btn" data-act="next" aria-label="Tháng sau">' + icon(P.next) + '</button></div></div>';
      h += '<div class="dv-banner" data-role="banner" role="alert" hidden></div>';
      h += '<div class="dv-strip" data-role="strip" role="status"></div>';
      h += '<div class="dv-filters">' +
        '<select class="dv-select" data-filter="nv" aria-label="Lọc theo nhân viên"></select>' +
        '<select class="dv-select" data-filter="dm" aria-label="Lọc theo danh mục"><option value="">Tất cả danh mục</option>' +
        R.DANH_MUC.map(function (d) { return '<option value="' + d.id + '">' + esc(d.ten) + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="dv-link" data-act="clear-filter" hidden>Xóa lọc</button></div>';
      h += '<div data-role="listwrap"></div>';
      h += '</div><div class="dv-bulk" data-role="bulk" hidden></div>';
      h += '<div class="dv-toast" data-role="toast" role="status" aria-live="polite"></div>';
      rootEl.innerHTML = h;
    }

    function renderParts() {
      if (!isManager || st.loadError) return;
      var vis = visible();
      pruneSelection();

      // tháng
      var ml = $('[data-role="month-label"]');
      ml.textContent = R.monthLabel(st.month);
      var nowM = R.monthOf(todayNow());
      $('[data-act="next"]').disabled = st.month >= nowM;
      $('[data-act="prev"]').disabled = st.month <= R.LIMITS.MONTH_MIN;

      // lọc nhân viên: những người có khoản chờ trong tháng + người đang được chọn
      var inMonth = R.filterQueue(st.items, { month: st.month });
      var ids = {};
      inMonth.forEach(function (it) { ids[it.nhanVienId] = true; });
      if (st.nv) ids[st.nv] = true;
      var nvSel = $('[data-filter="nv"]');
      nvSel.innerHTML = '<option value="">Tất cả nhân viên</option>' + Object.keys(ids).sort(function (a, b) {
        return nameOf(a).localeCompare(nameOf(b), 'vi');
      }).map(function (id) { return '<option value="' + esc(id) + '">' + esc(nameOf(id)) + '</option>'; }).join('');
      nvSel.value = st.nv;
      $('[data-filter="dm"]').value = st.dm;
      $('[data-act="clear-filter"]').hidden = !(st.nv || st.dm);

      // dải tóm tắt
      var sum = R.summarize(vis);
      var elsewhere = R.countPending(st.items) - R.countPending(inMonth);
      $('[data-role="strip"]').innerHTML = icon(P.clock) + '<span><strong data-role="strip-count">' + sum.count + ' khoản chờ</strong> · tổng ' +
        '<span class="dv-strip-total" data-role="strip-total">' + R.formatVND(sum.total) + '</span></span>' +
        (elsewhere > 0 ? '<span class="dv-strip-more" data-role="strip-more">Còn ' + elsewhere + ' khoản chờ ở tháng khác</span>' : '');

      // danh sách
      var wrap = $('[data-role="listwrap"]');
      if (!vis.length) {
        var filtering = st.nv || st.dm;
        wrap.innerHTML = filtering
          ? '<div class="dv-empty" data-role="empty" data-kind="filtered"><strong>Không có khoản chờ khớp bộ lọc</strong><button type="button" class="dv-btn dv-btn-secondary" data-act="clear-filter">Xóa lọc</button></div>'
          : '<div class="dv-empty" data-role="empty" data-kind="done">' + icon(P.done, 48) + '<strong>Đã xử lý hết đề nghị</strong><p>' + esc(R.monthLabel(st.month)) + ' không còn khoản nào chờ duyệt.</p></div>';
      } else {
        var allSel = vis.every(function (it) { return st.sel[it.id]; });
        var someSel = vis.some(function (it) { return st.sel[it.id]; });
        var t = todayNow();
        wrap.innerHTML =
          '<div class="dv-listhead"><label class="dv-check"><input type="checkbox" data-role="select-all" aria-label="Chọn tất cả khoản đang hiển thị"' + (allSel ? ' checked' : '') + '></label><span>Chọn tất cả</span></div>' +
          '<div class="dv-cols"><span><label class="dv-check"><input type="checkbox" data-role="select-all" aria-label="Chọn tất cả khoản đang hiển thị"' + (allSel ? ' checked' : '') + '></label></span><span>Người đề nghị</span><span>Nội dung · Danh mục</span><span class="dv-num">SL × Đơn giá</span><span class="dv-num">Thành tiền</span><span>Ngày</span><span></span></div>' +
          '<div class="dv-list" data-role="list" tabindex="-1" aria-label="Đề nghị chờ duyệt">' + vis.map(function (it) { return rowHTML(it, t); }).join('') + '</div>';
        $$('[data-role="select-all"]').forEach(function (c) { c.indeterminate = someSel && !allSel; });
      }

      // thanh hành động hàng loạt
      var picked = visible().filter(function (it) { return st.sel[it.id]; });
      var bulk = $('[data-role="bulk"]');
      if (picked.length) {
        var s2 = R.summarize(picked);
        bulk.hidden = false;
        bulk.innerHTML = '<span class="dv-bulk-info" role="status">Đã chọn ' + s2.count + ' khoản · ' + R.formatVND(s2.total) + '</span>' +
          '<button type="button" class="dv-btn dv-btn-approve" data-act="approve-sel">Duyệt các khoản đã chọn</button>' +
          '<button type="button" class="dv-btn dv-btn-secondary" data-act="clear-sel">Bỏ chọn</button>';
      } else { bulk.hidden = true; bulk.innerHTML = ''; }
      var tt = $('[data-role="toast"]');
      if (tt) tt.classList.toggle('has-bulk', picked.length > 0);
    }

    function rowHTML(it, today) {
      var nm = nameOf(it.nhanVienId);
      var w = R.waitInfo(it, today);
      var total = R.thanhTienOf(it);
      return '<article class="dv-row' + (st.sel[it.id] ? ' is-selected' : '') + '" data-id="' + esc(it.id) + '">' +
        '<label class="dv-check"><input type="checkbox" data-sel="' + esc(it.id) + '"' + (st.sel[it.id] ? ' checked' : '') +
        ' aria-label="Chọn đề nghị ' + esc(it.nhaCungCap) + ' của ' + esc(nm) + '"></label>' +
        '<div class="dv-who"><span class="dv-avatar" style="--av:var(--cat-' + R.colorIndex(it.nhanVienId) + ')" aria-hidden="true">' + esc(R.initial(nm)) + '</span>' +
        '<span class="dv-who-name">' + esc(nm) + '</span></div>' +
        '<div class="dv-total" data-role="row-total">' + R.formatVND(total) + '</div>' +
        '<button type="button" class="dv-what" data-act="open" title="Xem chi tiết">' + esc(it.nhaCungCap) + '</button>' +
        '<div class="dv-meta"><span class="dv-cat">' + esc(R.danhMucTen(it.danhMuc)) + '</span>' +
        '<span class="dv-qty">' + esc(R.formatSoLuong(it.soLuong)) + ' × ' + esc(R.formatVND(it.donGia)) + '</span>' +
        '<span class="dv-date">' + esc(R.formatDate(it.ngay)) + (w ? ' <span class="dv-wait" data-role="wait">' + esc(w.label) + '</span>' : '') + '</span></div>' +
        '<div class="dv-actions">' +
        '<button type="button" class="dv-btn dv-btn-approve" data-act="approve">' + icon(P.check, 18) + 'Duyệt</button>' +
        '<button type="button" class="dv-btn dv-btn-danger" data-act="reject">' + icon(P.cross, 18) + 'Từ chối</button></div></article>';
    }

    function renderAll() { renderShell(); renderParts(); }

    /* ---------- Banner & toast ---------- */
    function showBanner(msg, isErr) {
      var b = $('[data-role="banner"]');
      if (!b) return;
      b.textContent = msg; b.classList.toggle('is-error', !!isErr); b.hidden = false;
    }
    function hideBanner() { var b = $('[data-role="banner"]'); if (b) { b.hidden = true; b.textContent = ''; } }
    function toast(msg, undoable) {
      var t = $('[data-role="toast"]');
      if (!t) return;
      t.innerHTML = '<span data-role="toast-text">' + esc(msg) + '</span>' +
        (undoable ? '<button type="button" class="dv-toast-undo" data-act="undo">Hoàn tác</button>' : '');
      t.classList.add('is-show');
      clearTimeout(st.toastTimer);
      st.toastTimer = setTimeout(function () { t.classList.remove('is-show'); st.undo = null; }, 4000);
    }
    function setBusy(b) { st.busy = b; rootEl.classList.toggle('is-busy', b); }

    /* ---------- Hộp thoại ---------- */
    function openDialog(html) {
      var prev = st.dlg ? st.dlg.prev : document.activeElement; // giữ nút đã mở khi chuyển bước Chi tiết ↔ Từ chối
      closeDialog(true);
      var ov = document.createElement('div');
      ov.className = 'dv-overlay';
      ov.setAttribute('data-role', 'dialog-overlay');
      ov.innerHTML = html;
      rootEl.appendChild(ov);
      st.dlg = { el: ov, prev: prev };
      return ov;
    }
    function closeDialog(keepFocus) {
      if (!st.dlg) return;
      var d = st.dlg;
      st.dlg = null;
      if (d.el.parentNode) d.el.parentNode.removeChild(d.el);
      if (!keepFocus && d.prev && d.prev.focus && document.contains(d.prev) && !st.destroyed) d.prev.focus();
    }
    function badge(kind) {
      var m = { pending: [P.clock, 'Chờ duyệt'], rejected: [P.cross, 'Từ chối'] }[kind];
      return '<span class="dv-badge dv-badge-' + kind + '">' + icon(m[0], 14) + m[1] + '</span>';
    }
    function summaryLine(it) {
      return nameOf(it.nhanVienId) + ' · ' + it.nhaCungCap + ' · ' + R.formatVND(R.thanhTienOf(it));
    }
    function showDetail(id) {
      var it = byId(id);
      if (!it || !R.isPending(it)) return gone();
      var ov = openDialog(
        '<div class="dv-dialog" data-step="detail" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-dt">' +
        '<div class="dv-dhead"><h2 id="' + uid + '-dt">Chi tiết đề nghị</h2>' + badge('pending') + '</div>' +
        '<dl class="dv-dl">' +
        '<dt>Người đề nghị</dt><dd>' + esc(nameOf(it.nhanVienId)) + '</dd>' +
        '<dt>Nội dung</dt><dd>' + esc(it.nhaCungCap) + '</dd>' +
        '<dt>Danh mục</dt><dd>' + esc(R.danhMucTen(it.danhMuc)) + '</dd>' +
        '<dt>SL × Đơn giá</dt><dd>' + esc(R.formatSoLuong(it.soLuong)) + ' × ' + esc(R.formatVND(it.donGia)) + '</dd>' +
        '<dt>Thành tiền</dt><dd class="dv-big" data-role="detail-total">' + esc(R.formatVND(R.thanhTienOf(it))) + '</dd>' +
        '<dt>Ngày</dt><dd>' + esc(R.formatDate(it.ngay)) + '</dd>' +
        '<dt>Ghi chú</dt><dd data-role="detail-note">' + (it.ghiChu ? esc(it.ghiChu) : '—') + '</dd>' +
        '</dl><div class="dv-dactions">' +
        '<button type="button" class="dv-btn dv-btn-secondary" data-dlg="close">Đóng</button>' +
        '<button type="button" class="dv-btn dv-btn-danger" data-dlg="to-reject" data-id="' + esc(id) + '">Từ chối</button>' +
        '<button type="button" class="dv-btn dv-btn-approve" data-dlg="approve" data-id="' + esc(id) + '">Duyệt</button></div></div>');
      st.dlg.id = id;
      ov.querySelector('[data-dlg="approve"]').focus();
    }
    function showReject(id) {
      var it = byId(id);
      if (!it || !R.isPending(it)) return gone();
      var ov = openDialog(
        '<div class="dv-dialog" data-step="reject" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-dt">' +
        '<div class="dv-dhead"><h2 id="' + uid + '-dt">Từ chối đề nghị này</h2>' + badge('rejected') + '</div>' +
        '<p class="dv-sum" data-role="reject-sum">' + esc(summaryLine(it)) + '</p>' +
        '<div class="dv-label-row"><label class="dv-label" for="' + uid + '-ly">Lý do từ chối</label>' +
        '<span class="dv-count" data-role="reason-count">0/' + R.LIMITS.LY_DO_MAX + '</span></div>' +
        '<textarea class="dv-textarea" id="' + uid + '-ly" data-role="reason" rows="3" aria-describedby="' + uid + '-lye"></textarea>' +
        '<p class="dv-error" id="' + uid + '-lye" data-role="reason-err" hidden></p>' +
        '<div class="dv-chips" role="group" aria-label="Gợi ý lý do">' +
        R.QUICK_REASONS.map(function (q) { return '<button type="button" class="dv-chip" data-dlg="quick" data-text="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
        '<div class="dv-dactions"><button type="button" class="dv-btn dv-btn-secondary" data-dlg="back" data-id="' + esc(id) + '">Quay lại</button>' +
        '<button type="button" class="dv-btn dv-btn-danger" data-dlg="reject" data-id="' + esc(id) + '" disabled>Xác nhận từ chối</button></div></div>');
      st.dlg.id = id;
      ov.querySelector('[data-role="reason"]').focus();
    }
    function showBulkConfirm(ids) {
      var list = ids.map(byId).filter(Boolean);
      var s = R.summarize(list);
      var ov = openDialog(
        '<div class="dv-dialog" data-step="bulk" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-dt" aria-describedby="' + uid + '-dd">' +
        '<div class="dv-dhead"><h2 id="' + uid + '-dt">Duyệt ' + s.count + ' khoản, tổng ' + esc(R.formatVND(s.total)) + '?</h2></div>' +
        '<p class="dv-msg" id="' + uid + '-dd">Các khoản đã chọn sẽ chuyển sang Đã duyệt. Bạn có thể hoàn tác ngay sau đó.</p>' +
        '<div class="dv-dactions"><button type="button" class="dv-btn dv-btn-secondary" data-dlg="close">Hủy</button>' +
        '<button type="button" class="dv-btn dv-btn-approve" data-dlg="bulk-ok">Duyệt</button></div></div>');
      st.dlg.ids = ids;
      ov.querySelector('[data-dlg="close"]').focus();
    }
    function gone() {
      closeDialog();
      toast('Khoản này không còn ở trạng thái chờ duyệt', false);
      if (reload()) renderParts();
    }

    function updateReasonUI() {
      var ta = $('[data-role="reason"]');
      if (!ta) return;
      var v = R.validateLyDo(ta.value);
      var n = R.charLen(ta.value.replace(/\r\n?/g, '\n').trim());
      var c = $('[data-role="reason-count"]');
      c.textContent = n + '/' + R.LIMITS.LY_DO_MAX;
      c.classList.toggle('is-over', n > R.LIMITS.LY_DO_MAX);
      $('[data-dlg="reject"]').disabled = !v.ok;
      $$('[data-dlg="quick"]').forEach(function (b) { b.classList.toggle('is-picked', ta.value.trim() === b.getAttribute('data-text')); });
      return v;
    }
    function showReasonError(show) {
      var ta = $('[data-role="reason"]');
      var v = R.validateLyDo(ta.value);
      var p = $('[data-role="reason-err"]');
      p.textContent = show && !v.ok ? v.message : '';
      p.hidden = !(show && !v.ok);
      if (show && !v.ok) ta.setAttribute('aria-invalid', 'true'); else ta.removeAttribute('aria-invalid');
    }

    /* ---------- Hành động nghiệp vụ ---------- */
    function fire(action, ids) {
      try { document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'review', action: action, ids: ids } })); } catch (e) { /* bỏ qua */ }
      if (opts.onChanged) opts.onChanged(action, ids);
    }
    function fail(r) {
      if (r && (r.error === 'processed' || r.error === 'notfound' || r.error === 'nothing')) { gone(); return; }
      if (r && r.error === 'invalid' && r.message) { showBanner(r.message, false); return; }
      showBanner(ERR_MSG[r && r.error] || ERR_MSG.exception, !!(r && (r.error === 'corrupt' || r.error === 'forbidden')));
    }
    function focusAfterRemoval() {
      if (st.destroyed) return;
      var next = $('.dv-row [data-act="approve"]');
      if (next) next.focus();
      else { var l = $('[data-role="list"]') || $('[data-role="empty"]'); if (l) { l.setAttribute('tabindex', '-1'); l.focus(); } }
    }
    async function run(fn) {
      if (st.busy || st.destroyed) return null;
      setBusy(true);
      hideBanner();
      var r;
      try { r = await fn(); } catch (e) { r = { ok: false, error: 'exception' }; }
      if (st.destroyed) return null;
      setBusy(false);
      return r;
    }
    function afterChange(msg, r, action, ids) {
      st.undo = r.undo;
      reload();
      renderParts();
      toast(msg, true);
      fire(action, ids);
      focusAfterRemoval();
    }

    async function doApprove(id) {
      var it = byId(id);
      var label = it ? nameOf(it.nhanVienId) + ' · ' + R.formatVND(R.thanhTienOf(it)) : '';
      var r = await run(function () { return store.approve(id, actor); });
      if (!r) return;
      closeDialog(true);
      if (!r.ok) return fail(r);
      delete st.sel[id];
      afterChange('Đã duyệt đề nghị · ' + label, r, 'approve', [id]);
    }
    async function doReject(id) {
      var ta = $('[data-role="reason"]');
      var lyDo = ta ? ta.value : '';
      var it = byId(id);
      var label = it ? nameOf(it.nhanVienId) : '';
      var r = await run(function () { return store.reject(id, lyDo, actor); });
      if (!r) return;
      if (!r.ok) {
        if (r.error === 'invalid') { showReasonError(true); return; }
        closeDialog(true);
        return fail(r);
      }
      closeDialog(true);
      delete st.sel[id];
      afterChange('Đã từ chối đề nghị · ' + label, r, 'reject', [id]);
    }
    async function doApproveMany(ids) {
      var r = await run(function () { return store.approveMany(ids, actor); });
      if (!r) return;
      closeDialog(true);
      if (!r.ok) return fail(r);
      r.done.forEach(function (id) { delete st.sel[id]; });
      var extra = r.skipped.length ? ' (bỏ qua ' + r.skipped.length + ' khoản đã được xử lý)' : '';
      afterChange('Đã duyệt ' + r.done.length + ' khoản' + extra, r, 'approve_many', r.done);
    }
    async function doUndo() {
      var token = st.undo;
      if (!token) return;
      var r = await run(function () { return store.undo(token, actor); });
      if (!r) return;
      st.undo = null;
      reload();
      renderParts();
      if (!r.ok) { toast('Không thể hoàn tác (khoản đã thay đổi)', false); return; }
      toast(r.skipped.length ? 'Đã hoàn tác ' + r.reverted.length + ' khoản, bỏ qua ' + r.skipped.length + ' khoản đã thay đổi' : 'Đã hoàn tác', false);
      fire('undo', r.reverted);
    }

    /* ---------- Sự kiện ---------- */
    function on(target, type, fn, capture) {
      target.addEventListener(type, fn, capture);
      cleanups.push(function () { target.removeEventListener(type, fn, capture); });
    }
    function rowId(el) { var r = el.closest('.dv-row'); return r ? r.getAttribute('data-id') : null; }

    on(rootEl, 'click', function (e) {
      var d = e.target.closest ? e.target.closest('[data-dlg]') : null;
      if (d && st.dlg) {
        var k = d.getAttribute('data-dlg'), id = d.getAttribute('data-id') || st.dlg.id;
        if (k === 'close') closeDialog();
        else if (k === 'approve') doApprove(id);
        else if (k === 'to-reject') showReject(id);
        else if (k === 'back') showDetail(id);
        else if (k === 'reject') doReject(id);
        else if (k === 'bulk-ok') doApproveMany(st.dlg.ids || []);
        else if (k === 'quick') {
          var ta = $('[data-role="reason"]');
          ta.value = d.getAttribute('data-text');
          updateReasonUI(); showReasonError(false); ta.focus();
        }
        return;
      }
      if (st.dlg && e.target === st.dlg.el) { closeDialog(); return; }
      var a = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!a || !isManager) return;
      var act = a.getAttribute('data-act');
      if (st.busy) return;
      if (act === 'prev') { st.month = R.shiftMonth(st.month, -1); renderParts(); }
      else if (act === 'next') { if (st.month < R.monthOf(todayNow())) { st.month = R.shiftMonth(st.month, 1); renderParts(); } }
      else if (act === 'today') { st.month = R.monthOf(todayNow()); renderParts(); }
      else if (act === 'clear-filter') { st.nv = ''; st.dm = ''; renderParts(); }
      else if (act === 'clear-sel') { st.sel = {}; renderParts(); }
      else if (act === 'open') showDetail(rowId(a));
      else if (act === 'approve') doApprove(rowId(a));
      else if (act === 'reject') showReject(rowId(a));
      else if (act === 'approve-sel') { var ids = selectedIds(); if (ids.length) showBulkConfirm(ids); }
      else if (act === 'undo') doUndo();
      else if (act === 'retry') { reload(); renderAll(); }
    });
    on(rootEl, 'change', function (e) {
      var t = e.target;
      if (!isManager) return;
      if (t.getAttribute('data-filter') === 'nv') { st.nv = t.value; renderParts(); }
      else if (t.getAttribute('data-filter') === 'dm') { st.dm = t.value; renderParts(); }
      else if (t.hasAttribute && t.hasAttribute('data-sel')) {
        var id = t.getAttribute('data-sel');
        if (t.checked) st.sel[id] = true; else delete st.sel[id];
        renderParts();
        var again = $('[data-sel="' + id + '"]');
        if (again) again.focus();
      } else if (t.getAttribute('data-role') === 'select-all') {
        visible().forEach(function (it) { if (t.checked) st.sel[it.id] = true; else delete st.sel[it.id]; });
        renderParts();
        var shown = $$('[data-role="select-all"]').filter(function (c) { return c.offsetParent !== null; })[0];
        if (shown) shown.focus();
      }
    });
    on(rootEl, 'input', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-role') === 'reason') {
        updateReasonUI();
        if (!R.validateLyDo(e.target.value).ok) { if ($('[data-role="reason-err"]') && !$('[data-role="reason-err"]').hidden) showReasonError(true); }
        else showReasonError(false);
      }
    });
    on(rootEl, 'focusout', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-role') === 'reason') showReasonError(true);
    });
    on(document, 'keydown', function (e) {
      if (!st.dlg) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDialog(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.slice.call(st.dlg.el.querySelectorAll('button:not([disabled]), textarea, [href]'));
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], cur = document.activeElement;
      if (!st.dlg.el.contains(cur)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    }, true);
    on(document, 'dnc:data-changed', function (e) {
      if (e.detail && e.detail.source === 'review') return;
      if (st.destroyed || !isManager) return;
      if (reload()) { if (!$('[data-role="listwrap"]')) renderAll(); else renderParts(); }
      else renderAll();
    });

    /* ---------- Khởi động ---------- */
    if (isManager) reload();
    renderAll();
    if (!isManager && opts.onForbidden) opts.onForbidden();

    return {
      root: rootEl,
      refresh: function () { if (isManager) { reload(); renderAll(); } },
      getState: function () {
        return { month: st.month, nhanVienId: st.nv, danhMuc: st.dm, selected: selectedIds(), busy: st.busy, destroyed: st.destroyed, loadError: st.loadError, isManager: isManager };
      },
      destroy: function () {
        st.destroyed = true;
        clearTimeout(st.toastTimer);
        cleanups.forEach(function (f) { f(); });
        cleanups = [];
        st.dlg = null;
        rootEl.innerHTML = '';
        rootEl.classList.remove('dv-root', 'is-busy');
      }
    };
  }

  root.DncReview = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
