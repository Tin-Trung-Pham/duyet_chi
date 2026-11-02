/* Sổ Đề Nghị Chi – Module 4: giao diện màn "Nhân viên" (DESIGN 4.5, 10.3, 12; chỉ Quản lý).
 * API: DncEmployees.mount(rootEl, { store, session, onForbidden, onChanged }) → controller
 *   session phải là { vaiTro: 'quan_ly' }; vai trò khác bị chặn.
 */
(function (root) {
  'use strict';
  var M = root.DncEmpModel;
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
    plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', pause: '<path d="M9 6v12M15 6v12"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6"/>'
  };
  var ERR = {
    blocked: 'Trình duyệt đang chặn lưu trữ nên không thao tác được.',
    full: 'Bộ nhớ trình duyệt đã đầy nên chưa lưu được. Dữ liệu bạn đang nhập vẫn được giữ lại.',
    corrupt: 'Không đọc được dữ liệu đã lưu.',
    forbidden: 'Chỉ Quản lý mới được thêm, sửa hoặc xóa nhân viên.',
    notfound: 'Không tìm thấy nhân viên này (có thể đã bị xóa).',
    conflict: 'Không thể hoàn tác vì mã hoặc nhân viên này đã bị thay đổi.',
    exception: 'Có lỗi khi xử lý. Hãy thử lại.'
  };
  var SORT_LABEL = { ten: 'Tên A–Z (theo tên gọi)', ma: 'Mã', requests: 'Số đề nghị nhiều nhất', approved: 'Tổng Đã duyệt nhiều nhất' };

  function mount(rootEl, opts) {
    opts = opts || {};
    var store = opts.store;
    var session = opts.session || null;
    var allowed = !!(session && session.vaiTro === 'quan_ly');
    var actor = { vaiTro: 'quan_ly' };
    var uid = 'de' + (++seq);
    var cleanups = [];
    var $ = function (s) { return rootEl.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(rootEl.querySelectorAll(s)); };

    var st = {
      items: [], stats: {}, q: '', status: 'all', sort: 'ten', loadError: null,
      busy: false, destroyed: false, toastTimer: null, undo: null, stack: [], form: null
    };
    rootEl.classList.add('de-root');

    /* ---------- Dữ liệu ---------- */
    function reload() {
      var l = store.list(), s = store.requestStats();
      if (!l.ok) { st.loadError = l.error; return false; }
      if (!s.ok) { st.loadError = s.error; return false; }
      st.items = l.data; st.stats = s.data; st.loadError = null;
      return true;
    }
    function byId(id) { for (var i = 0; i < st.items.length; i++) if (st.items[i].id === id) return st.items[i]; return null; }
    function statsOf(id) { return M.statsOf(st.stats, id); }
    function visible() {
      return M.sort(M.filter(st.items, { q: st.q, status: st.status }), st.sort, st.stats);
    }

    /* ---------- Khung ---------- */
    function renderShell() {
      var h = '<div class="de-main"><div class="de-head"><h1 class="de-title">Nhân viên</h1>';
      if (!allowed) {
        rootEl.innerHTML = h + '</div><div class="de-panel" data-role="blocked" data-code="role" role="status"><p>Trang này dành cho Quản lý.</p></div></div>';
        return;
      }
      if (st.loadError) {
        rootEl.innerHTML = h + '</div><div class="de-panel" data-role="blocked" data-code="' + esc(st.loadError) + '" role="alert"><p>' + esc(ERR[st.loadError] || ERR.corrupt) +
          '</p><button type="button" class="de-btn de-btn-secondary" data-act="retry">Thử lại</button></div></div>' +
          '<div class="de-toast" data-role="toast" role="status" aria-live="polite"></div>';
        return;
      }
      h += '<button type="button" class="de-btn de-btn-primary" data-act="add">' + icon(P.plus, 18) + 'Thêm nhân viên</button></div>';
      h += '<div class="de-banner" data-role="banner" role="alert" hidden></div>';
      h += '<section class="de-sum" data-role="summary" aria-label="Tổng hợp nhân viên"></section>';
      h += '<div class="de-controls"><div class="de-search">' + icon(P.search, 20) +
        '<input class="de-input" type="search" data-role="search" placeholder="Tìm theo mã hoặc họ tên" aria-label="Tìm nhân viên theo mã hoặc họ tên" autocomplete="off">' +
        '<button type="button" class="de-clear" data-act="clear-search" aria-label="Xóa tìm kiếm" hidden>' + icon(P.x, 18) + '</button></div>' +
        '<div class="de-seg" role="group" aria-label="Lọc theo trạng thái"></div>' +
        '<select class="de-select" data-role="sort" aria-label="Sắp xếp">' +
        M.SORT_KEYS.map(function (k) { return '<option value="' + k + '">' + esc(SORT_LABEL[k]) + '</option>'; }).join('') + '</select></div>';
      h += '<div data-role="list"></div></div>';
      h += '<div class="de-toast" data-role="toast" role="status" aria-live="polite"></div>';
      rootEl.innerHTML = h;
    }

    function renderParts() {
      if (!allowed || st.loadError) return;
      var c = M.counts(st.items);
      $('[data-role="summary"]').innerHTML =
        sumCard('total', 'Tổng số nhân viên', c.total) + sumCard('active', 'Đang hoạt động', c.active) + sumCard('inactive', 'Đã ngưng', c.inactive);
      var seg = $('.de-seg');
      seg.innerHTML = [['all', 'Tất cả', c.total], ['active', 'Hoạt động', c.active], ['inactive', 'Ngưng', c.inactive]].map(function (b) {
        return '<button type="button" data-status="' + b[0] + '" aria-pressed="' + (st.status === b[0]) + '">' + b[1] + ' (<span class="de-count">' + b[2] + '</span>)</button>';
      }).join('');
      var si = $('[data-role="search"]'); if (si.value !== st.q) si.value = st.q;
      $('[data-act="clear-search"]').hidden = !st.q;
      $('[data-role="sort"]').value = st.sort;
      renderList();
    }
    function sumCard(k, label, n) {
      return '<article class="de-sum-card" data-sum="' + k + '"><h2>' + label + '</h2><div class="de-sum-val" data-role="sum-' + k + '">' + n + '</div></article>';
    }

    function badge(on) {
      return on ? '<span class="de-badge de-badge-on" data-status-badge="on">' + icon(P.check, 14) + 'Hoạt động</span>'
        : '<span class="de-badge de-badge-off" data-status-badge="off">' + icon(P.pause, 14) + 'Ngưng</span>';
    }

    function renderList() {
      var box = $('[data-role="list"]');
      var list = visible();
      if (!st.items.length) {
        box.innerHTML = '<div class="de-empty" data-role="empty" data-kind="none">' + icon(P.users, 40) + '<strong>Chưa có nhân viên</strong>' +
          '<p>Thêm nhân viên để họ có thể được chọn khi tạo đề nghị.</p><button type="button" class="de-btn de-btn-primary" data-act="add">' + icon(P.plus, 18) + 'Thêm nhân viên</button></div>';
        return;
      }
      if (!list.length) {
        box.innerHTML = '<div class="de-empty" data-role="empty" data-kind="filtered"><strong>Không tìm thấy nhân viên khớp</strong>' +
          '<button type="button" class="de-btn de-btn-secondary" data-act="clear-filters">Xóa tìm kiếm và lọc</button></div>';
        return;
      }
      var rows = list.map(function (e) {
        var s = statsOf(e.id);
        return '<tr data-id="' + esc(e.id) + '">' +
          '<td class="de-c-person"><button type="button" class="de-person-btn" data-act="edit" title="Sửa thông tin"><span class="de-avatar" style="--av:var(--cat-' + M.colorIndex(e.id) + ')" aria-hidden="true">' + esc(M.initial(e.hoTen)) +
          '</span><span data-role="name">' + esc(e.hoTen) + '</span></button></td>' +
          '<td class="de-c-ma" data-label="Mã"><span class="de-ma" data-role="ma">' + esc(e.ma || '—') + '</span></td>' +
          '<td class="de-c-status">' + badge(e.hoatDong) + '</td>' +
          '<td class="de-num de-c-n" data-label="Số đề nghị" data-role="n-count">' + s.count + '</td>' +
          '<td class="de-num de-c-p" data-label="Chờ duyệt" data-role="n-pending">' + s.pending + ' khoản</td>' +
          '<td class="de-num de-c-a" data-label="Tổng Đã duyệt" data-role="n-approved">' + M.formatVND(s.approved.total) + '</td>' +
          '<td class="de-c-act"><button type="button" class="de-btn de-btn-secondary" data-act="edit" aria-label="Sửa ' + esc(e.hoTen) + '">Sửa</button></td></tr>';
      }).join('');
      box.innerHTML = '<div class="de-card"><table class="de-table" data-role="table"><caption class="de-sr">Danh sách nhân viên</caption><thead><tr>' +
        '<th scope="col">Nhân viên</th><th scope="col">Mã</th><th scope="col">Trạng thái</th><th scope="col" class="de-num">Số đề nghị</th><th scope="col" class="de-num">Chờ duyệt</th><th scope="col" class="de-num">Tổng Đã duyệt</th>' +
        '<th scope="col"><span class="de-sr">Thao tác</span></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    function renderAll() { renderShell(); renderParts(); }

    /* ---------- Banner & toast ---------- */
    function showBanner(msg, isErr, scope) {
      var b = scope ? scope.querySelector('[data-role="form-banner"]') : $('[data-role="banner"]');
      if (!b) return;
      b.textContent = msg; b.classList.toggle('is-error', !!isErr); b.hidden = false;
    }
    function hideBanner(scope) { var b = scope ? scope.querySelector('[data-role="form-banner"]') : $('[data-role="banner"]'); if (b) { b.hidden = true; b.textContent = ''; } }
    function toast(msg, undoable) {
      var t = $('[data-role="toast"]'); if (!t) return;
      t.innerHTML = '<span data-role="toast-text">' + esc(msg) + '</span>' + (undoable ? '<button type="button" class="de-toast-undo" data-act="undo">Hoàn tác</button>' : '');
      t.classList.add('is-show');
      clearTimeout(st.toastTimer);
      st.toastTimer = setTimeout(function () { t.classList.remove('is-show'); st.undo = null; }, 4000);
    }
    function setBusy(b) { st.busy = b; rootEl.classList.toggle('is-busy', b); var s = $('[data-dlg="save"]'); if (s) { if (b) s.setAttribute('aria-busy', 'true'); else s.removeAttribute('aria-busy'); } }

    /* ---------- Ngăn xếp hộp thoại ---------- */
    function push(html, kind) {
      var prev = document.activeElement;
      var ov = document.createElement('div');
      ov.className = 'de-overlay' + (st.stack.length ? ' is-top' : '');
      ov.setAttribute('data-role', 'dialog-overlay'); ov.setAttribute('data-kind', kind);
      ov.innerHTML = html;
      rootEl.appendChild(ov);
      var d = { el: ov, prev: prev, kind: kind };
      st.stack.push(d);
      return d;
    }
    function pop(keepFocus) {
      var d = st.stack.pop(); if (!d) return;
      if (d.el.parentNode) d.el.parentNode.removeChild(d.el);
      if (d.kind === 'form') st.form = null;
      if (!keepFocus && d.prev && d.prev.focus && document.contains(d.prev) && !st.destroyed) d.prev.focus();
    }
    function popAll(keepFocus) { while (st.stack.length) pop(keepFocus || st.stack.length > 1); }
    function top() { return st.stack[st.stack.length - 1] || null; }

    function confirmBox(cfg) {
      var d = push('<div class="de-dialog" data-step="confirm" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-ct" aria-describedby="' + uid + '-cm">' +
        '<h2 id="' + uid + '-ct">' + esc(cfg.title) + '</h2><p class="de-msg" id="' + uid + '-cm">' + esc(cfg.message) + '</p>' +
        '<div class="de-actions"><button type="button" class="de-btn de-btn-secondary" data-dlg="c-cancel">' + esc(cfg.cancelText) + '</button>' +
        '<button type="button" class="de-btn ' + (cfg.danger ? 'de-btn-danger' : 'de-btn-primary') + '" data-dlg="c-ok">' + esc(cfg.okText) + '</button></div></div>', 'confirm');
      d.onOk = cfg.onOk; d.onCancel = cfg.onCancel;
      d.el.querySelector('[data-dlg="c-cancel"]').focus();
      return d;
    }

    /* ---------- Form Thêm / Sửa (10.3) ---------- */
    function openForm(mode, id) {
      var emp = mode === 'edit' ? byId(id) : null;
      if (mode === 'edit' && !emp) { toast(ERR.notfound, false); if (reload()) renderParts(); return; }
      var s = emp ? statsOf(emp.id) : null;
      var init = { ma: emp ? emp.ma : '', hoTen: emp ? emp.hoTen : '', hoatDong: emp ? emp.hoatDong : true };
      var title = mode === 'edit' ? 'Sửa nhân viên' : 'Thêm nhân viên';
      var delArea = '';
      if (mode === 'edit') {
        delArea = s.count > 0
          ? '<p class="de-hint" data-role="del-note">Nhân viên đã có ' + s.count + ' đề nghị nên chỉ có thể Ngưng hoạt động.</p>'
          : '<div class="de-del"><button type="button" class="de-btn de-btn-danger" data-dlg="delete">Xóa nhân viên</button></div>';
      }
      var h = '<div class="de-dialog" data-step="form" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-ft"><h2 id="' + uid + '-ft">' + title + '</h2>' +
        '<div class="de-banner" data-role="form-banner" role="alert" hidden></div>' +
        '<form class="de-form" novalidate>' +
        '<div class="de-field"><label class="de-label" for="' + uid + '-ma">Mã nhân viên</label><input class="de-input" id="' + uid + '-ma" data-field="ma" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="' + uid + '-mae">' +
        '<p class="de-error" id="' + uid + '-mae" data-err="ma" hidden></p></div>' +
        '<div class="de-field"><label class="de-label" for="' + uid + '-ten">Họ và tên</label><input class="de-input" id="' + uid + '-ten" data-field="hoTen" type="text" autocomplete="off" aria-describedby="' + uid + '-tene">' +
        '<p class="de-error" id="' + uid + '-tene" data-err="hoTen" hidden></p></div>';
      if (mode === 'edit') {
        h += '<div class="de-field"><label class="de-switch" for="' + uid + '-on"><span>Hoạt động</span><input id="' + uid + '-on" data-field="hoatDong" type="checkbox" role="switch"></label>' +
          '<p class="de-hint" data-role="on-hint" aria-live="polite"></p></div>' +
          '<p class="de-info" data-role="info">Đã có ' + s.count + ' đề nghị · Tổng Đã duyệt ' + esc(M.formatVND(s.approved.total)) + '</p>' + delArea;
      }
      h += '<div class="de-actions"><button type="button" class="de-btn de-btn-secondary" data-dlg="cancel">Hủy</button>' +
        '<button type="submit" class="de-btn de-btn-primary" data-dlg="save" disabled>Lưu</button></div></form></div>';
      var d = push(h, 'form');
      st.form = { mode: mode, id: emp ? emp.id : null, init: init, touched: {}, submitted: false, el: d.el };
      var f = d.el;
      f.querySelector('[data-field="ma"]').value = init.ma;
      f.querySelector('[data-field="hoTen"]').value = init.hoTen;
      var sw = f.querySelector('[data-field="hoatDong"]'); if (sw) sw.checked = init.hoatDong;
      refreshForm();
      f.querySelector('[data-field="ma"]').focus();
    }

    function formValues() {
      var f = st.form.el, sw = f.querySelector('[data-field="hoatDong"]');
      return { ma: f.querySelector('[data-field="ma"]').value, hoTen: f.querySelector('[data-field="hoTen"]').value, hoatDong: sw ? sw.checked : true };
    }
    function formCtx() {
      return { others: st.items.map(function (e) { return { id: e.id, ma: e.ma, hoTen: e.hoTen }; }), selfId: st.form.id };
    }
    function formChanged() {
      var v = formValues(), i = st.form.init;
      return M.normMa(v.ma) !== M.normMa(i.ma) || M.normTen(v.hoTen) !== M.normTen(i.hoTen) || v.hoatDong !== i.hoatDong;
    }
    function setFieldError(name, msg) {
      var f = st.form.el, p = f.querySelector('[data-err="' + name + '"]'), c = f.querySelector('[data-field="' + name + '"]');
      if (p) { p.textContent = msg || ''; p.hidden = !msg; }
      if (c) { if (msg) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid'); }
    }
    function refreshForm(onlyField) {
      if (!st.form) return;
      var f = st.form, v = M.validate(formValues(), formCtx());
      ['ma', 'hoTen'].forEach(function (k) {
        if (onlyField && onlyField !== k) return;
        if (f.submitted || f.touched[k]) setFieldError(k, v.errors[k] || '');
      });
      var sw = f.el.querySelector('[data-field="hoatDong"]');
      var hint = f.el.querySelector('[data-role="on-hint"]');
      if (sw && hint) hint.textContent = sw.checked ? '' : 'Không còn xuất hiện khi tạo đề nghị mới; các khoản cũ vẫn giữ nguyên.';
      var save = f.el.querySelector('[data-dlg="save"]');
      save.disabled = !v.ok || (f.mode === 'edit' && !formChanged());
    }
    function requestCloseForm() {
      if (!st.form || st.busy) return;
      if (formChanged()) {
        confirmBox({ title: 'Bỏ các thay đổi?', message: 'Những gì bạn đã nhập chưa được lưu.', okText: 'Bỏ thay đổi', cancelText: 'Tiếp tục sửa',
          onOk: function () { popAll(); } });
      } else pop();
    }

    function fire(action, id) {
      try { document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'employees', action: action, id: id } })); } catch (e) { /* bỏ qua */ }
      if (opts.onChanged) opts.onChanged(action, id);
    }
    function focusRow(id) {
      if (st.destroyed) return;
      var b = id ? $('tr[data-id="' + id.replace(/["\\]/g, '\\$&') + '"] [data-act="edit"].de-btn') : null;
      if (b) { b.focus(); return; }
      var a = $('.de-head [data-act="add"]'); if (a) a.focus();
    }
    function failIn(r, scope) {
      if (r && r.error === 'notfound') { showBanner(ERR.notfound, true, scope); return; }
      showBanner(ERR[r && r.error] || ERR.exception, !!(r && (r.error === 'corrupt' || r.error === 'forbidden')), scope);
    }
    async function run(fn) {
      if (st.busy || st.destroyed) return null;
      setBusy(true);
      var r;
      try { r = await fn(); } catch (e) { r = { ok: false, error: 'exception' }; }
      if (st.destroyed) return null;
      setBusy(false);
      return r;
    }

    async function doSave() {
      if (!st.form) return;
      var f = st.form; f.submitted = true;
      hideBanner(f.el);
      var vals = formValues(), v = M.validate(vals, formCtx());
      refreshForm();
      if (!v.ok) { var first = v.errors.ma ? 'ma' : 'hoTen'; f.el.querySelector('[data-field="' + first + '"]').focus(); return; }
      if (f.mode === 'edit' && !formChanged()) return;
      var el = f.el, mode = f.mode, id = f.id;
      var r = await run(function () { return mode === 'add' ? store.add({ ma: vals.ma, hoTen: vals.hoTen }, actor) : store.update(id, vals, actor); });
      if (!r) return;
      if (!r.ok) {
        if (r.error === 'invalid' && r.errors) {
          Object.keys(r.errors).forEach(function (k) { if (st.form) { st.form.touched[k] = true; setFieldError(k, r.errors[k]); } });
          var k1 = r.errors.ma ? 'ma' : 'hoTen'; var c = el.querySelector('[data-field="' + k1 + '"]'); if (c) c.focus();
        } else {
          failIn(r, el);
          if (r.error === 'notfound') reload() && renderParts();
        }
        return;
      }
      pop(true);
      reload(); renderParts();
      toast(mode === 'add' ? 'Đã thêm nhân viên ' + r.item.hoTen : 'Đã lưu thay đổi', false);
      fire(mode === 'add' ? 'add' : 'update', r.item.id);
      focusRow(r.item.id);
    }

    function askDelete() {
      if (!st.form) return;
      var e = byId(st.form.id); if (!e) return;
      var fid = e.id;
      confirmBox({ title: 'Xóa nhân viên này?', message: e.hoTen + ' (' + (e.ma || 'không có mã') + ') sẽ bị xóa khỏi danh bạ. Bạn có thể hoàn tác trong vài giây.', okText: 'Xóa', cancelText: 'Hủy', danger: true,
        onOk: async function () {
          var formEl = st.form && st.form.el;
          var r = await run(function () { return store.remove(fid, actor); });
          if (!r) return;
          if (!r.ok) {
            reload(); renderParts(); // hộp xác nhận đã được đóng trước khi gọi onOk; form vẫn mở
            if (r.error === 'hasRequests') {
              if (st.form) {
                showBanner('Nhân viên đã có ' + r.count + ' đề nghị nên chỉ có thể Ngưng hoạt động.', false, formEl);
                var del = formEl.querySelector('[data-dlg="delete"]'); if (del) del.closest('.de-del').outerHTML = '<p class="de-hint" data-role="del-note">Nhân viên đã có ' + r.count + ' đề nghị nên chỉ có thể Ngưng hoạt động.</p>';
              }
            } else if (st.form) failIn(r, formEl);
            return;
          }
          popAll(true);
          st.undo = r.undo;
          reload(); renderParts();
          toast('Đã xóa ' + r.item.hoTen, true);
          fire('delete', r.item.id);
          focusRow(null);
        } });
    }

    async function doUndo() {
      var token = st.undo; if (!token) return;
      var r = await run(function () { return store.restore(token, actor); });
      if (!r) return;
      st.undo = null;
      reload(); renderParts();
      if (!r.ok) { toast(ERR[r.error] || ERR.exception, false); return; }
      toast('Đã hoàn tác', false);
      fire('restore', r.item.id);
    }

    /* ---------- Sự kiện ---------- */
    function on(target, type, fn, capture) {
      target.addEventListener(type, fn, capture);
      cleanups.push(function () { target.removeEventListener(type, fn, capture); });
    }
    function rowId(el) { var r = el.closest('tr[data-id]'); return r ? r.getAttribute('data-id') : null; }

    on(rootEl, 'click', function (e) {
      var t = e.target;
      var d = t.closest ? t.closest('[data-dlg]') : null;
      if (d && st.stack.length) {
        var k = d.getAttribute('data-dlg'), tp = top();
        if (k === 'cancel') requestCloseForm();
        else if (k === 'delete') askDelete();
        else if (k === 'c-cancel') { var oc = tp.onCancel; pop(); if (oc) oc(); }
        else if (k === 'c-ok') { var ok = tp.onOk; pop(true); if (ok) ok(); }
        return;
      }
      if (st.stack.length && t === top().el) {
        if (top().kind === 'form') requestCloseForm(); else pop();
        return;
      }
      var a = t.closest ? t.closest('[data-act]') : null;
      if (a && allowed) {
        if (st.busy || st.stack.length) return;
        var act = a.getAttribute('data-act');
        if (act === 'add') openForm('add');
        else if (act === 'edit') openForm('edit', rowId(a));
        else if (act === 'retry') { reload(); renderAll(); }
        else if (act === 'clear-search') { st.q = ''; renderParts(); $('[data-role="search"]').focus(); }
        else if (act === 'clear-filters') { st.q = ''; st.status = 'all'; renderParts(); }
        else if (act === 'undo') doUndo();
        return;
      }
      var sb = t.closest ? t.closest('[data-status]') : null;
      if (sb && allowed && !st.stack.length) { st.status = sb.getAttribute('data-status'); renderParts(); var nb = $('[data-status="' + st.status + '"]'); if (nb) nb.focus(); }
    });
    on(rootEl, 'input', function (e) {
      var t = e.target, fld = t.getAttribute && t.getAttribute('data-field');
      if (fld && st.form) {
        if (fld === 'ma') { // tự viết hoa, giữ vị trí con trỏ
          var pos = t.selectionStart, up = t.value.toUpperCase();
          if (up !== t.value) { t.value = up; try { t.setSelectionRange(pos, pos); } catch (x) { /* bỏ qua */ } }
        }
        refreshForm(fld);
        return;
      }
      if (t.getAttribute && t.getAttribute('data-role') === 'search') { st.q = t.value; renderListKeepFocus(); }
    });
    function renderListKeepFocus() {
      renderList();
      var c = $('[data-act="clear-search"]'); if (c) c.hidden = !st.q;
    }
    on(rootEl, 'change', function (e) {
      var t = e.target;
      if (t.getAttribute && t.getAttribute('data-role') === 'sort') { st.sort = SORT_LABEL[t.value] ? t.value : 'ten'; renderList(); }
      else if (t.getAttribute && t.getAttribute('data-field') === 'hoatDong' && st.form) refreshForm();
    });
    on(rootEl, 'focusout', function (e) {
      var fld = e.target.getAttribute && e.target.getAttribute('data-field');
      if (fld && st.form && (fld === 'ma' || fld === 'hoTen')) { st.form.touched[fld] = true; refreshForm(fld); }
    });
    on(rootEl, 'submit', function (e) { e.preventDefault(); doSave(); });
    on(rootEl, 'keydown', function (e) {
      if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-role') === 'search') e.preventDefault();
    });
    on(document, 'keydown', function (e) {
      if (!st.stack.length) return;
      var tp = top();
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        if (tp.kind === 'form') requestCloseForm(); else { var oc = tp.onCancel; pop(); if (oc) oc(); }
        return;
      }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.slice.call(tp.el.querySelectorAll('button:not([disabled]), input:not([disabled]), select, textarea')).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], cur = document.activeElement;
      if (!tp.el.contains(cur)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    }, true);
    on(document, 'dnc:data-changed', function (e) {
      if (st.destroyed || !allowed) return;
      if (e.detail && e.detail.source === 'employees') return;
      if (reload()) { if ($('[data-role="list"]')) renderParts(); else renderAll(); } else renderAll();
    });

    /* ---------- Khởi động ---------- */
    if (allowed) reload();
    renderAll();
    if (!allowed && opts.onForbidden) opts.onForbidden();

    return {
      root: rootEl,
      refresh: function () { if (allowed) { reload(); renderAll(); } },
      getState: function () {
        return { q: st.q, status: st.status, sort: st.sort, total: st.items.length, visible: allowed && !st.loadError ? visible().length : 0, allowed: allowed, loadError: st.loadError, dialogs: st.stack.length, busy: st.busy, destroyed: st.destroyed };
      },
      destroy: function () {
        st.destroyed = true; clearTimeout(st.toastTimer);
        cleanups.forEach(function (f) { f(); }); cleanups = [];
        st.stack = []; st.form = null;
        rootEl.innerHTML = ''; rootEl.classList.remove('de-root', 'is-busy');
      }
    };
  }

  root.DncEmployees = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
