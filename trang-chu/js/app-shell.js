/* Sổ Đề Nghị Chi – Module 5: khung ứng dụng (DESIGN mục 13, kèm 4.1, 10.2, 10.7).
 * API: DncApp.start(rootEl, { storage, modules, nav?, today?, homeExtras? }) → controller
 *   homeExtras(el, ctx) → {destroy()} : (tuỳ chọn) gắn thêm nội dung dưới Trang chủ của Quản lý, vd. bảng tổng hợp từ CSDL.
 *   modules: { 'nhap-lieu': { mount(el, ctx) → {destroy()} }, 'duyet': …, 'thong-ke': …, 'nhan-vien': … }
 *   ctx = { session, params, storage, navigate(path), forbidden(), notifyChanged() }
 */
(function (root) {
  'use strict';
  var A = root.DncAppModel;
  var seq = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  var P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', chev: '<path d="M9 5l7 7-7 7"/>', down: '<path d="M6 9l6 6 6-6"/>',
    tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'
  };
  function icon(name, size) {
    return '<svg width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + P[name] + '</svg>';
  }

  /* Bộ điều hợp địa chỉ dựa trên location.hash (có thể thay bằng bản giả trong test). */
  function hashNav(win) {
    win = win || root;
    return {
      get: function () { return win.location.hash.replace(/^#/, '') || '/'; },
      set: function (path, o) { if (o && o.replace) win.location.replace('#' + path); else win.location.hash = '#' + path; },
      listen: function (cb) { win.addEventListener('hashchange', cb); return function () { win.removeEventListener('hashchange', cb); }; }
    };
  }

  function start(rootEl, opts) {
    opts = opts || {};
    var storage = opts.storage, modules = opts.modules || {}, nav = opts.nav || hashNav();
    var doc = rootEl.ownerDocument || document;
    var uid = 'app' + (++seq);
    var cleanups = [];
    var $ = function (s) { return rootEl.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(rootEl.querySelectorAll(s)); };
    function today() { return typeof opts.today === 'function' ? opts.today() : (opts.today || A.todayStr()); }

    var st = {
      session: null, cur: null, curPath: null, mod: null, menu: null, dlg: null, toastTimer: null, destroyed: false, first: true, notice: ''
    };
    rootEl.classList.add('app-root');

    /* ---------- Phiên làm việc ---------- */
    function loadSession() {
      var s = A.readSession(storage);
      if (s) {
        var c = A.sessionCheck(s, storage);
        if (!c.ok) { A.clearSession(storage); st.notice = 'Nhân viên này không còn hoạt động. Hãy chọn lại vai trò.'; s = null; }
      }
      st.session = s;
    }
    function setSession(s) { st.session = A.normalizeSession(s); if (st.session) A.writeSession(storage, st.session); else A.clearSession(storage); }

    /* ---------- Khung ---------- */
    rootEl.innerHTML =
      '<button type="button" class="app-skip" data-act="skip">Bỏ qua tới nội dung</button>' +
      '<header class="app-header" role="banner"></header>' +
      '<div class="app-banner" data-role="banner" hidden></div>' +
      '<main class="app-main" data-role="main" tabindex="-1"></main>' +
      '<div class="app-toast" data-role="toast" role="status" aria-live="polite"></div>';
    var headerEl = $('.app-header'), mainEl = $('[data-role="main"]');

    function renderChrome() {
      var s = st.session, h = '<a class="app-brand" href="#/" data-nav="home" aria-label="' + esc(A.APP_NAME) + ' – về Trang chủ"><span class="app-logo" aria-hidden="true">' + icon('check', 20) + '</span><span class="app-brand-name">' + esc(A.APP_NAME) + '</span></a>';
      if (s) {
        h += '<nav class="app-nav" aria-label="Điều hướng chính">' + A.navItems(s).map(function (it) {
          var cur = st.cur && st.cur.name === it.name;
          return '<a class="app-nav-item' + (cur ? ' is-current' : '') + '" href="#' + it.path + '" data-nav="' + it.name + '"' + (cur ? ' aria-current="page"' : '') + '>' + icon(it.icon) +
            '<span class="app-nav-label">' + esc(it.label) + '</span>' +
            (it.name === 'duyet' ? '<span class="app-badge" data-role="nav-badge" hidden></span>' : '') + '</a>';
        }).join('') + '</nav>';
        var label = A.roleLabel(s, storage);
        h += '<button type="button" class="app-chip" data-act="menu" aria-haspopup="dialog" aria-expanded="' + !!st.menu + '" aria-label="Vai trò hiện tại: ' + esc(label) + '. Bấm để đổi vai trò">' +
          '<span class="app-avatar" data-role="chip-avatar" style="--av:var(--cat-' + A.colorIndex(s.nhanVienId || 'quan_ly') + ')" aria-hidden="true">' + (s.vaiTro === A.QL ? icon('shield', 18) : esc(A.initial(label))) + '</span>' +
          '<span class="app-chip-name" data-role="chip-name">' + esc(label) + '</span>' + icon('down', 16) + '</button>';
      }
      headerEl.innerHTML = h;
      headerEl.classList.toggle('is-bare', !s);
      updateBadge();
    }

    function items() { var r = A.readList(storage, A.KEYS.DN); return r.ok ? r.data : []; }
    function stats() { return A.homeStats(items(), st.session, A.monthOf(today())); }
    function updateBadge() {
      var b = $('[data-role="nav-badge"]'); if (!b) return;
      var n = st.session && st.session.vaiTro === A.QL ? stats().pendingAll : 0;
      b.hidden = n === 0; b.textContent = n > 99 ? '99+' : String(n);
      b.setAttribute('data-count', String(n));
      var link = b.closest('a'); if (link) link.setAttribute('aria-label', n ? 'Duyệt, ' + n + ' khoản chờ duyệt' : 'Duyệt');
    }

    /* ---------- Banner hệ thống (13.5) ---------- */
    function renderBanner() {
      var b = own('[data-role="banner"]'), name = st.cur ? st.cur.name : '';
      var kind = A.pickBanner(A.health(storage), A.acked(storage), name);
      b.className = 'app-banner' + (kind === 'corrupt' ? ' is-error' : kind === 'blocked' ? ' is-warn' : '');
      b.setAttribute('data-kind', kind || '');
      if (!kind) { b.hidden = true; b.innerHTML = ''; b.removeAttribute('role'); return; }
      b.hidden = false;
      if (kind === 'corrupt') { b.setAttribute('role', 'alert'); b.innerHTML = '<span>Không đọc được dữ liệu đã lưu.</span><button type="button" class="app-btn app-btn-secondary" data-act="reset-open">Đặt lại dữ liệu</button>'; }
      else if (kind === 'blocked') { b.setAttribute('role', 'status'); b.innerHTML = '<span>Dữ liệu sẽ mất khi đóng tab (trình duyệt đang chặn lưu trữ).</span>'; }
      else { b.setAttribute('role', 'status'); b.innerHTML = '<span>Dữ liệu chỉ lưu trên trình duyệt này, không chia sẻ giữa các máy.</span><button type="button" class="app-btn app-btn-secondary" data-act="ack">Đã hiểu</button>'; }
    }

    /* ---------- Toast ---------- */
    /* Chỉ truy vấn phần tử của CHÍNH khung (con trực tiếp của rootEl): module con có thể dùng cùng tên data-role (vd. "toast", "banner"). */
    function own(sel) { return rootEl.querySelector(':scope > ' + sel); }
    function toast(msg) {
      var t = own('[data-role="toast"]'); if (!t) return;
      t.textContent = msg; t.classList.add('is-show');
      clearTimeout(st.toastTimer);
      st.toastTimer = setTimeout(function () { t.classList.remove('is-show'); }, 4000);
    }

    /* ---------- Biểu mẫu chọn vai trò (màn Chọn vai trò + menu đổi vai trò) ---------- */
    function roleFormHTML(prefix, init) {
      var emps = A.activeEmployees(storage), cur = init || {};
      var noEmp = !emps.length;
      return '<div class="app-roleform" data-form="' + prefix + '">' +
        '<div class="app-cards" role="radiogroup" aria-label="Vai trò">' +
        roleCard(prefix, A.NV, 'user', 'Nhân viên', 'Tạo đề nghị chi và xem thống kê của riêng bạn', cur.vaiTro === A.NV) +
        roleCard(prefix, A.QL, 'shield', 'Quản lý', 'Duyệt đề nghị, xem thống kê và quản lý nhân viên', cur.vaiTro === A.QL) + '</div>' +
        '<div class="app-field" data-role="who-field"' + (cur.vaiTro === A.NV ? '' : ' hidden') + '><label class="app-label" for="' + uid + '-' + prefix + '-who">Tôi là…</label>' +
        '<select class="app-select" id="' + uid + '-' + prefix + '-who" data-role="who"' + (noEmp ? ' disabled' : '') + '><option value="">' + (noEmp ? 'Chưa có nhân viên' : 'Chọn tên của bạn…') + '</option>' +
        emps.map(function (e) { return '<option value="' + esc(e.id) + '"' + (cur.vaiTro === A.NV && cur.nhanVienId === e.id ? ' selected' : '') + '>' + esc((e.ma ? e.ma + ' · ' : '') + e.hoTen) + '</option>'; }).join('') + '</select>' +
        (noEmp ? '<p class="app-hint" data-role="no-emp">Chưa có nhân viên. Hãy vào với vai trò Quản lý để thêm trước.</p>' : '') + '</div></div>';
    }
    function roleCard(prefix, value, ic, title, desc, checked) {
      return '<label class="app-card-role"><input class="app-sr" type="radio" name="' + uid + '-' + prefix + '-role" value="' + value + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="app-card-in">' + icon(ic, 28) + '<span class="app-card-txt"><strong>' + title + '</strong><small>' + desc + '</small></span><span class="app-card-tick" aria-hidden="true">' + icon('tick', 20) + '</span></span></label>';
    }
    function readRoleForm(box) {
      var r = box.querySelector('input[type=radio]:checked'), who = box.querySelector('[data-role="who"]');
      var role = r ? r.value : '', nv = who ? who.value : '';
      var ok = role === A.QL || (role === A.NV && !!nv && A.activeEmployees(storage).some(function (e) { return e.id === nv; }));
      return { role: role, nhanVienId: nv, ok: ok, session: ok ? (role === A.QL ? { vaiTro: A.QL } : { vaiTro: A.NV, nhanVienId: nv }) : null };
    }
    function syncRoleForm(box) {
      var v = readRoleForm(box), f = box.querySelector('[data-role="who-field"]');
      f.hidden = v.role !== A.NV;
      var btn = box.parentNode.querySelector('[data-act="enter"], [data-act="apply"]');
      if (btn) btn.disabled = !v.ok;
    }

    /* ---------- Màn Chọn vai trò (4.1) ---------- */
    function renderRoleScreen() {
      mainEl.innerHTML = '<section class="app-role" aria-labelledby="' + uid + '-rt"><h1 id="' + uid + '-rt" class="app-title">' + esc(A.APP_NAME) + '</h1>' +
        '<p class="app-lead">Chọn vai trò để bắt đầu. Đây chỉ là lựa chọn giao diện, không phải đăng nhập.</p>' +
        (st.notice ? '<p class="app-notice" data-role="notice" role="status">' + esc(st.notice) + '</p>' : '') +
        '<div data-role="roleform-box">' + roleFormHTML('screen', st.session) + '<button type="button" class="app-btn app-btn-primary app-enter" data-act="enter" disabled>Vào</button></div>' +
        '<p class="app-foot">Dữ liệu lưu trên trình duyệt này.</p></section>';
      syncRoleForm(mainEl.querySelector('.app-roleform'));
    }

    /* ---------- Trang chủ điều hướng (13.4) ---------- */
    function renderHome() {
      var s = st.session, mgr = s.vaiTro === A.QL, name = A.roleLabel(s, storage), S = stats(), month = A.monthOf(today());
      function kpi(key, label, val, sub, link) {
        var inner = '<h2 class="app-kpi-label">' + label + '</h2><div class="app-kpi-val" data-role="kpi-' + key + '">' + val + '</div><div class="app-kpi-sub">' + sub + '</div>';
        return link ? '<a class="app-kpi" data-kpi="' + key + '" href="#/duyet" data-nav="duyet">' + inner + '</a>' : '<article class="app-kpi" data-kpi="' + key + '">' + inner + '</article>';
      }
      function shortcut(nm, ic, title, desc, extra, hot) {
        return '<a class="app-short' + (hot ? ' is-hot' : '') + '" href="#' + A.buildPath(nm) + '" data-nav="' + nm + '" data-short="' + nm + '">' + icon(ic, 28) + '<span class="app-short-txt"><strong>' + title + '</strong><small>' + desc + '</small></span>' + (extra || '') + icon('chev', 20) + '</a>';
      }
      var pendBadge = S.pendingAll > 0 ? '<span class="app-badge app-badge-inline" data-role="home-badge">' + S.pendingAll + '</span>' : '';
      var core = '<h1 id="' + uid + '-ht" class="app-title" data-role="greeting">Xin chào, ' + esc(name) + '</h1>' +
        '<p class="app-lead">' + (mgr ? 'Bạn đang dùng với vai trò Quản lý. Đây là việc cần làm trong ' : 'Bạn đang dùng với vai trò Nhân viên. Đây là các đề nghị của bạn trong ') + esc(A.monthLabel(month).toLowerCase()) + '.</p>' +
        '<div class="app-kpis" data-role="kpis">' +
        kpi('pending', mgr ? 'Chờ duyệt (tháng này)' : 'Chờ duyệt của bạn', A.formatVND(S.pending.total), S.pending.count + ' khoản' + (mgr && S.pendingAll > S.pending.count ? ' · còn ' + (S.pendingAll - S.pending.count) + ' khoản ở tháng khác' : ''), mgr) +
        kpi('approved', 'Đã duyệt tháng này', A.formatVND(S.approved.total), S.approved.count + ' khoản') +
        kpi('rejected', 'Từ chối tháng này', S.rejected.count + ' khoản', 'tổng ' + A.formatVND(S.rejected.total)) + '</div>' +
        '<h2 class="app-sec">Lối tắt</h2><div class="app-shorts" data-role="shorts">' +
        (mgr ? shortcut('duyet', 'check', 'Duyệt đề nghị', 'Duyệt hoặc từ chối các khoản đang chờ', pendBadge, S.pendingAll > 0) +
          shortcut('thong-ke', 'chart', 'Thống kê', 'So sánh chi theo tháng, danh mục, nhân viên') + shortcut('nhan-vien', 'users', 'Nhân viên', 'Thêm, sửa và xem tổng hợp nhân viên')
          : shortcut('nhap-lieu', 'plus', 'Thêm đề nghị chi', 'Gửi đề nghị mới cho quản lý duyệt', '', true) + shortcut('thong-ke', 'chart', 'Thống kê của tôi', 'Xem các đề nghị và chi tiêu của bạn')) +
        '</div>';
      // Phần lõi được vẽ lại khi dữ liệu đổi; vùng "extras" (bảng tổng hợp CSDL…) chỉ gắn một lần cho mỗi lần mở Trang chủ.
      if (!mainEl.querySelector('[data-role="home-core"]')) {
        mainEl.innerHTML = '<section class="app-home" aria-labelledby="' + uid + '-ht"><div data-role="home-core"></div><div data-role="home-extras"></div></section>';
      }
      mainEl.querySelector('[data-role="home-core"]').innerHTML = core;
      mountExtras(mgr);
    }
    function mountExtras(mgr) {
      if (!mgr || typeof opts.homeExtras !== 'function' || st.extras) return;
      var host = mainEl.querySelector('[data-role="home-extras"]');
      if (!host) return;
      try { st.extras = opts.homeExtras(host, ctxFor({ name: 'home', params: [] })) || null; } catch (e) { st.extras = null; host.innerHTML = ''; }
    }

    /* ---------- Menu đổi vai trò (10.2) ---------- */
    function openMenu() {
      if (!st.session || st.menu) return;
      var prev = doc.activeElement;
      var ov = doc.createElement('div'); ov.className = 'app-overlay app-overlay-menu'; ov.setAttribute('data-role', 'menu-overlay');
      ov.innerHTML = '<div class="app-dialog app-menu" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-mt"><h2 id="' + uid + '-mt" class="app-dtitle">Bạn đang dùng với vai trò</h2>' +
        '<div data-role="roleform-box">' + roleFormHTML('menu', st.session) + '<p class="app-hint">Chọn vai trò chỉ thay đổi giao diện, không phải đăng nhập.</p>' +
        '<div class="app-actions"><button type="button" class="app-btn app-btn-secondary" data-act="menu-close">Đóng</button><button type="button" class="app-btn app-btn-primary" data-act="apply" disabled>Áp dụng</button></div></div></div>';
      rootEl.appendChild(ov);
      st.menu = { el: ov, prev: prev };
      var chip = $('.app-chip'); if (chip) chip.setAttribute('aria-expanded', 'true');
      syncRoleForm(ov.querySelector('.app-roleform'));
      var first = ov.querySelector('input[type=radio]:checked') || ov.querySelector('input[type=radio]'); if (first) first.focus();
    }
    function closeMenu(restore) {
      if (!st.menu) return;
      var m = st.menu; st.menu = null;
      if (m.el.parentNode) m.el.parentNode.removeChild(m.el);
      var chip = $('.app-chip'); if (chip) chip.setAttribute('aria-expanded', 'false');
      if (restore !== false) { var t = chip || m.prev; if (t && t.focus) t.focus(); }
    }

    /* ---------- Hộp thoại Đặt lại dữ liệu (13.5) ---------- */
    function openReset() {
      if (st.dlg) return;
      var prev = doc.activeElement;
      var ov = doc.createElement('div'); ov.className = 'app-overlay'; ov.setAttribute('data-role', 'reset-overlay');
      ov.innerHTML = '<div class="app-dialog" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-rst" aria-describedby="' + uid + '-rsd"><h2 id="' + uid + '-rst" class="app-dtitle">Xóa toàn bộ dữ liệu?</h2>' +
        '<p id="' + uid + '-rsd" class="app-msg">Toàn bộ nhân viên và đề nghị sẽ bị xóa, không hoàn tác được.</p>' +
        '<div class="app-field"><label class="app-label" for="' + uid + '-rsi">Gõ XÓA để xác nhận</label><input class="app-input" id="' + uid + '-rsi" data-role="reset-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>' +
        '<div class="app-actions"><button type="button" class="app-btn app-btn-secondary" data-act="reset-cancel">Hủy</button><button type="button" class="app-btn app-btn-danger" data-act="reset-ok" disabled>Xóa toàn bộ</button></div></div>';
      rootEl.appendChild(ov); st.dlg = { el: ov, prev: prev };
      ov.querySelector('[data-role="reset-input"]').focus();
    }
    function closeReset(restore) {
      if (!st.dlg) return; var d = st.dlg; st.dlg = null;
      if (d.el.parentNode) d.el.parentNode.removeChild(d.el);
      if (restore !== false && d.prev && d.prev.focus && doc.contains(d.prev)) d.prev.focus();
    }

    /* ---------- Định tuyến ---------- */
    function destroyModule() {
      if (st.extras && st.extras.destroy) { try { st.extras.destroy(); } catch (e) { /* bỏ qua */ } }
      st.extras = null;
      if (st.mod && st.mod.destroy) { try { st.mod.destroy(); } catch (e) { /* bỏ qua */ } }
      st.mod = null;
    }
    function go(path, o) { if (st.destroyed) return; nav.set(path, o); handle(path); }
    function ctxFor(p) {
      return {
        session: st.session ? JSON.parse(JSON.stringify(st.session)) : null, params: p.params.slice(), storage: storage,
        navigate: function (path) { go(path); },
        forbidden: function () { toast(A.forbiddenMessage(p.name)); go('/', { replace: true }); },
        notifyChanged: function () { updateBadge(); }
      };
    }
    function mountModule(p) {
      var m = modules[p.name], title = (A.route(p.name) || {}).title || '';
      var host = doc.createElement('div'); host.className = 'app-host'; host.setAttribute('data-module', p.name);
      mainEl.appendChild(host);
      try {
        if (!m || typeof m.mount !== 'function') throw new Error('Chưa có module cho ' + p.name);
        st.mod = m.mount(host, ctxFor(p));
      } catch (e) {
        st.mod = null;
        host.innerHTML = '<section class="app-panel" data-role="load-error" role="alert"><h1 class="app-title">' + esc(title) + '</h1><p>Không tải được màn hình.</p><button type="button" class="app-btn app-btn-secondary" data-act="retry-route">Thử lại</button></section>';
      }
    }
    function handle(path, force) {
      if (st.destroyed) return;
      var res = A.resolve(path, st.session);
      if (res.action === 'redirect') {
        if (res.reason === 'forbidden') toast(A.forbiddenMessage(res.route));
        nav.set(res.to, { replace: true });
        res = A.resolve(res.to, st.session);
      }
      var p = res.route;
      if (!force && p.path === st.curPath) return;
      show(p);
    }
    function show(p) {
      closeMenu(false); closeReset(false); destroyModule();
      st.cur = p; st.curPath = p.path;
      renderChrome(); renderBanner();
      mainEl.innerHTML = '';
      mainEl.setAttribute('data-route', p.name);
      if (p.name === 'home') renderHome();
      else if (p.name === 'vai-tro') renderRoleScreen();
      else mountModule(p);
      doc.title = A.pageTitle(p.name);
      if (!st.first) focusHeading(); st.first = false;
    }
    function focusHeading() {
      var h = mainEl.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } else mainEl.focus();
    }
    function onRoute() { handle(nav.get()); }

    /* ---------- Sự kiện ---------- */
    function on(target, type, fn, capture) { target.addEventListener(type, fn, capture); cleanups.push(function () { target.removeEventListener(type, fn, capture); }); }
    function applyRole(box, closeFirst) {
      var v = readRoleForm(box); if (!v.ok) return false;
      setSession(v.session); st.notice = '';
      if (closeFirst) closeMenu(false);
      var label = A.roleLabel(st.session, storage);
      st.curPath = null; go('/');
      if (closeFirst) toast('Đang dùng với vai trò ' + label);
      return true;
    }
    on(rootEl, 'click', function (e) {
      var t = e.target;
      var a = t.closest ? t.closest('a[href^="#/"]') : null;
      if (a && !e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) { e.preventDefault(); go(a.getAttribute('href').slice(1)); return; }
      if (st.menu && t === st.menu.el) { closeMenu(); return; }
      if (st.dlg && t === st.dlg.el) { closeReset(); return; }
      var b = t.closest ? t.closest('[data-act]') : null; if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'skip') { mainEl.setAttribute('tabindex', '-1'); mainEl.focus(); }
      else if (act === 'menu') { if (st.menu) closeMenu(); else openMenu(); }
      else if (act === 'menu-close') closeMenu();
      else if (act === 'apply') applyRole(st.menu.el.querySelector('.app-roleform').parentNode, true);
      else if (act === 'enter') applyRole(mainEl.querySelector('.app-roleform').parentNode, false);
      else if (act === 'ack') { A.setAck(storage); renderBanner(); }
      else if (act === 'reset-open') openReset();
      else if (act === 'reset-cancel') closeReset();
      else if (act === 'reset-ok') {
        var inp = st.dlg.el.querySelector('[data-role="reset-input"]');
        if (String(inp.value).trim().toUpperCase() !== 'XÓA') return;
        A.resetData(storage); st.session = null; st.notice = ''; closeReset(false); toast('Đã xóa toàn bộ dữ liệu'); st.curPath = null; go('/vai-tro');
      }
      else if (act === 'retry-route') show(st.cur);
    });
    on(rootEl, 'change', function (e) {
      var box = e.target.closest ? e.target.closest('.app-roleform') : null;
      if (box) syncRoleForm(box);
    });
    on(rootEl, 'input', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-role') === 'reset-input') {
        var ok = String(e.target.value).trim().toUpperCase() === 'XÓA';
        st.dlg.el.querySelector('[data-act="reset-ok"]').disabled = !ok;
      }
    });
    on(doc, 'keydown', function (e) {
      var top = st.dlg || st.menu; if (!top) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (st.dlg) closeReset(); else closeMenu(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.slice.call(top.el.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')).filter(function (x) { return x.offsetParent !== null || x === doc.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], cur = doc.activeElement;
      if (!top.el.contains(cur)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    }, true);
    function onData() {
      if (st.destroyed) return;
      if (st.session) {
        var c = A.sessionCheck(st.session, storage);
        if (!c.ok) {
          A.clearSession(storage); st.session = null; st.notice = 'Nhân viên này không còn hoạt động. Hãy chọn lại vai trò.';
          toast(st.notice); st.curPath = null; go('/vai-tro', { replace: true }); return;
        }
        var nm = $('[data-role="chip-name"]'); if (nm) nm.textContent = A.roleLabel(st.session, storage);
      }
      updateBadge(); renderBanner();
      if (st.cur && st.cur.name === 'home' && st.session) renderHome();
    }
    on(doc, 'dnc:data-changed', onData);
    var win = doc.defaultView; if (win) on(win, 'storage', onData);
    cleanups.push(nav.listen(onRoute));

    /* ---------- Khởi động ---------- */
    loadSession();
    handle(nav.get(), true);
    if (st.notice && st.session === null) toast(st.notice);

    return {
      root: rootEl,
      navigate: function (path, o) { go(path, o); },
      getState: function () { return { session: st.session ? Object.assign({}, st.session) : null, route: st.cur ? st.cur.name : null, path: st.curPath, menuOpen: !!st.menu, resetOpen: !!st.dlg, destroyed: st.destroyed }; },
      toast: toast,
      destroy: function () {
        st.destroyed = true; clearTimeout(st.toastTimer); destroyModule();
        cleanups.forEach(function (f) { f(); }); cleanups = [];
        rootEl.innerHTML = ''; rootEl.classList.remove('app-root');
      }
    };
  }

  root.DncApp = { start: start, hashNav: hashNav };
})(typeof window !== 'undefined' ? window : this);
