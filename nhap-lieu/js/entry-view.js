/* Sổ Đề Nghị Chi – Module 1: giao diện form Thêm/Sửa đề nghị chi (DESIGN 4.3, 6.x, 9.x).
 * API: DncEntry.mount(rootEl, { store, session, mode, id, today, onSaved, onCancel }) → controller
 *   session: null | { vaiTro: 'nhan_vien', nhanVienId } | { vaiTro: 'quan_ly' }
 */
(function (root) {
  'use strict';
  var M = root.DncModel;
  var seq = 0;

  var ICONS = {
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    truck: '<path d="M1 6h13v10H1z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    coffee: '<path d="M4 8h13v6a4 4 0 01-4 4H8a4 4 0 01-4-4z"/><path d="M17 10h2a2 2 0 010 4h-2"/><path d="M7 2v3M11 2v3"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    dots: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
  };
  function icon(name) {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var FAIL_MSG = {
    full: 'Bộ nhớ trình duyệt đã đầy nên chưa lưu được. Dữ liệu bạn đang nhập vẫn được giữ lại.',
    blocked: 'Trình duyệt đang chặn lưu trữ (có thể do chế độ ẩn danh). Dữ liệu sẽ mất khi đóng tab.',
    corrupt: 'Không đọc được dữ liệu đã lưu. Chưa thể lưu đề nghị mới.',
    notfound: 'Không tìm thấy đề nghị này (có thể đã bị xóa).',
    locked: 'Khoản đã được xử lý nên không thể chỉnh sửa.',
    forbidden: 'Bạn chỉ được thao tác với đề nghị của chính mình.',
    exception: 'Có lỗi khi lưu. Dữ liệu bạn đang nhập vẫn được giữ lại, hãy thử lại.'
  };

  function mount(rootEl, opts) {
    opts = opts || {};
    var store = opts.store;
    var session = opts.session || null;
    var mode = opts.mode === 'edit' ? 'edit' : 'add';
    var uid = 'dn' + (++seq);
    var cleanups = [];
    var state = { saving: false, submitted: false, touched: {}, initial: null, blocked: null, destroyed: false, toastTimer: null };
    var employees = [];
    var record = null;
    var $ = function (sel) { return rootEl.querySelector(sel); };
    var $$ = function (sel) { return Array.prototype.slice.call(rootEl.querySelectorAll(sel)); };
    var actorId = session && session.vaiTro === 'nhan_vien' ? session.nhanVienId : undefined;
    function todayNow() { return opts.today || M.todayStr(); }

    /* ---------- Xác định trạng thái ban đầu ---------- */
    function init() {
      if (session && session.vaiTro === 'quan_ly') {
        return block('role', 'Chỉ Nhân viên mới tạo hoặc sửa đề nghị chi. Hãy đổi vai trò nếu bạn cần nhập đề nghị.');
      }
      if (mode === 'edit') {
        var g = store.get(opts.id);
        if (!g.ok) return block(g.error, FAIL_MSG[g.error] || FAIL_MSG.exception);
        record = g.item;
        if (record.trangThai !== 'cho_duyet') return block('locked', FAIL_MSG.locked);
        if (actorId && record.nhanVienId !== actorId) return block('forbidden', FAIL_MSG.forbidden);
      }
      var l = store.listNhanVien({ includeId: record && record.nhanVienId });
      if (!l.ok) return block(l.error, FAIL_MSG[l.error] || FAIL_MSG.exception);
      employees = l.data;
      if (actorId && !employees.some(function (e) { return e.id === actorId; })) {
        return block('session', 'Nhân viên này không còn hoạt động trong danh bạ. Hãy chọn lại vai trò.');
      }
    }
    function block(code, msg) { state.blocked = { code: code, message: msg }; }
    init();

    /* ---------- Render ---------- */
    rootEl.classList.add('dn-root');
    var title = mode === 'edit' ? 'Sửa đề nghị chi' : 'Thêm đề nghị chi';

    function fieldId(name) { return uid + '-' + name; }
    function errP(name) { return '<p class="dn-error" id="' + fieldId(name) + '-err" data-err="' + name + '" hidden></p>'; }

    function render() {
      var html = '<div class="dn-main"><h1 class="dn-title">' + title + '</h1>';
      html += '<div class="dn-banner" data-role="banner" role="alert" hidden></div>';
      if (state.blocked) {
        html += '<div class="dn-panel" data-role="blocked" data-code="' + esc(state.blocked.code) + '" role="status">' +
          '<p>' + esc(state.blocked.message) + '</p>' +
          (opts.onCancel ? '<button type="button" class="dn-btn dn-btn-secondary" data-act="cancel">Quay lại</button>' : '') +
          '</div></div><div class="dn-toast" data-role="toast" role="status" aria-live="polite"></div>';
        rootEl.innerHTML = html;
        return;
      }
      var noEmp = employees.length === 0;
      var lockEmp = !!actorId;
      html += '<form class="dn-form" novalidate aria-label="' + title + '">';

      // Người đề nghị
      html += '<div class="dn-field"><div class="dn-label-row"><label class="dn-label" for="' + fieldId('nhanVienId') + '">Người đề nghị</label></div>' +
        '<select class="dn-control" id="' + fieldId('nhanVienId') + '" data-field="nhanVienId" aria-describedby="' + fieldId('nhanVienId') + '-err"' +
        (noEmp || lockEmp ? ' disabled' : '') + '>' +
        '<option value="">' + (noEmp ? 'Chưa có nhân viên' : 'Chọn người đề nghị…') + '</option>' +
        employees.map(function (e) {
          return '<option value="' + esc(e.id) + '">' + esc((e.ma ? e.ma + ' · ' : '') + e.hoTen + (e.hoatDong ? '' : ' (ngưng)')) + '</option>';
        }).join('') + '</select>' +
        (noEmp ? '<p class="dn-hint" data-role="no-employee" role="status">Chưa có nhân viên. Quản lý hãy thêm trước.</p>' : '') +
        (lockEmp ? '<p class="dn-hint">Bạn đang đề nghị chi với tư cách nhân viên này.</p>' : '') +
        errP('nhanVienId') + '</div>';

      // Nhà cung cấp / nội dung
      html += '<div class="dn-field"><div class="dn-label-row"><label class="dn-label" for="' + fieldId('nhaCungCap') + '">Nhà cung cấp / nội dung mua</label></div>' +
        '<input class="dn-control" type="text" id="' + fieldId('nhaCungCap') + '" data-field="nhaCungCap" autocomplete="off" ' +
        'placeholder="Ví dụ: Giấy A4 – Công ty Hồng Hà" aria-describedby="' + fieldId('nhaCungCap') + '-err">' + errP('nhaCungCap') + '</div>';

      // Danh mục
      html += '<fieldset class="dn-field"><legend class="dn-label">Danh mục</legend>' +
        '<div class="dn-chips" role="radiogroup" data-field="danhMuc" aria-describedby="' + fieldId('danhMuc') + '-err">' +
        M.DANH_MUC.map(function (d) {
          return '<label class="dn-chip" style="--chip-color:var(--cat-' + d.cat + ')">' +
            '<input class="dn-sr" type="radio" name="' + uid + '-danhMuc" value="' + d.id + '">' +
            '<span class="dn-chip-in">' + icon(d.icon) + esc(d.ten) + '</span></label>';
        }).join('') + '</div>' + errP('danhMuc') + '</fieldset>';

      // Số lượng + Đơn giá
      html += '<div class="dn-row">' +
        '<div class="dn-field"><label class="dn-label" for="' + fieldId('soLuong') + '">Số lượng</label>' +
        '<input class="dn-control dn-num" type="text" inputmode="decimal" id="' + fieldId('soLuong') + '" data-field="soLuong" autocomplete="off" placeholder="0" aria-describedby="' + fieldId('soLuong') + '-err">' + errP('soLuong') + '</div>' +
        '<div class="dn-field"><label class="dn-label" for="' + fieldId('donGia') + '">Đơn giá (₫)</label>' +
        '<input class="dn-control dn-num" type="text" inputmode="numeric" id="' + fieldId('donGia') + '" data-field="donGia" autocomplete="off" placeholder="0" aria-describedby="' + fieldId('donGia') + '-err">' + errP('donGia') + '</div>' +
        '</div>';

      // Thành tiền
      html += '<div class="dn-total" data-role="total"><span class="dn-total-label">Thành tiền<span class="dn-total-sub">Số lượng × Đơn giá</span></span>' +
        '<output class="dn-total-val" data-role="total-val" for="' + fieldId('soLuong') + ' ' + fieldId('donGia') + '">—</output></div>';

      // Ngày
      html += '<div class="dn-field"><label class="dn-label" for="' + fieldId('ngay') + '">Ngày</label>' +
        '<input class="dn-control" type="date" id="' + fieldId('ngay') + '" data-field="ngay" min="' + M.LIMITS.NGAY_MIN + '" max="' + todayNow() + '" aria-describedby="' + fieldId('ngay') + '-err">' + errP('ngay') + '</div>';

      // Ghi chú
      html += '<div class="dn-field"><div class="dn-label-row"><label class="dn-label" for="' + fieldId('ghiChu') + '">Ghi chú <span class="dn-opt">(tùy chọn)</span></label>' +
        '<span class="dn-count" data-role="count" aria-hidden="true">0/' + M.LIMITS.GHICHU_MAX + '</span></div>' +
        '<textarea class="dn-control" id="' + fieldId('ghiChu') + '" data-field="ghiChu" rows="3" aria-describedby="' + fieldId('ghiChu') + '-err"></textarea>' + errP('ghiChu') + '</div>';

      // Nút
      html += '<div class="dn-actions">' +
        '<button type="submit" class="dn-btn dn-btn-primary" data-act="submit"' + (noEmp ? ' disabled' : '') + '>' + (mode === 'edit' ? 'Lưu thay đổi' : 'Gửi đề nghị') + '</button>' +
        '<button type="button" class="dn-btn dn-btn-secondary" data-act="cancel">Hủy</button></div>';

      html += '</form></div><div class="dn-toast" data-role="toast" role="status" aria-live="polite"></div>';
      rootEl.innerHTML = html;
    }
    render();

    /* ---------- Đọc/ghi giá trị form ---------- */
    function el(name) { return $('[data-field="' + name + '"]'); }
    function readRaw() {
      var dm = $('input[type=radio]:checked');
      return {
        nhanVienId: el('nhanVienId').value,
        nhaCungCap: el('nhaCungCap').value,
        danhMuc: dm ? dm.value : '',
        soLuong: el('soLuong').value,
        donGia: el('donGia').value,
        ngay: el('ngay').value,
        ghiChu: el('ghiChu').value
      };
    }
    function writeRaw(r) {
      el('nhanVienId').value = r.nhanVienId || '';
      el('nhaCungCap').value = r.nhaCungCap || '';
      $$('input[type=radio]').forEach(function (i) { i.checked = i.value === r.danhMuc; });
      el('soLuong').value = r.soLuong || '';
      el('donGia').value = r.donGia || '';
      el('ngay').value = r.ngay || '';
      el('ghiChu').value = r.ghiChu || '';
      updateTotal();
      updateCount();
    }
    function blankRaw() {
      return { nhanVienId: actorId || '', nhaCungCap: '', danhMuc: '', soLuong: '', donGia: '', ngay: todayNow(), ghiChu: '' };
    }
    function recordRaw(r) {
      return {
        nhanVienId: r.nhanVienId, nhaCungCap: r.nhaCungCap, danhMuc: r.danhMuc,
        soLuong: M.formatSoLuong(Math.round(r.soLuong * 1000), { plain: true }),
        donGia: M.groupDigits(String(r.donGia)),
        ngay: r.ngay, ghiChu: r.ghiChu || ''
      };
    }

    if (!state.blocked) {
      writeRaw(mode === 'edit' ? recordRaw(record) : blankRaw());
      state.initial = readRaw();
    }

    /* ---------- Hiển thị lỗi / tổng tiền / bộ đếm ---------- */
    function setError(name, msg) {
      var p = $('[data-err="' + name + '"]');
      var ctl = el(name);
      if (p) { p.textContent = msg || ''; p.hidden = !msg; }
      if (ctl) {
        if (msg) ctl.setAttribute('aria-invalid', 'true'); else ctl.removeAttribute('aria-invalid');
      }
    }
    function validateCtx() {
      return { today: todayNow(), nhanVienIds: employees.map(function (e) { return e.id; }) };
    }
    function showErrors(res, onlyField) {
      M.FIELD_ORDER.forEach(function (f) {
        if (onlyField && f !== onlyField) return;
        if (!onlyField && !state.submitted && !state.touched[f]) return;
        setError(f, res.errors[f] || '');
      });
    }
    function updateTotal() {
      var out = $('[data-role="total-val"]');
      if (!out) return;
      var sl = M.parseSoLuong(el('soLuong').value);
      var dg = M.parseDonGia(el('donGia').value);
      if (sl.ok && dg.ok) {
        var t = M.thanhTien(sl.milli, dg.value);
        out.textContent = M.formatVND(t);
        out.setAttribute('data-value', String(t));
      } else {
        out.textContent = '—';
        out.removeAttribute('data-value');
      }
    }
    function updateCount() {
      var c = $('[data-role="count"]');
      if (!c) return;
      var n = M.charLen(el('ghiChu').value.replace(/\r\n?/g, '\n').trim());
      c.textContent = n + '/' + M.LIMITS.GHICHU_MAX;
      c.classList.toggle('is-over', n > M.LIMITS.GHICHU_MAX);
    }
    function focusFirstError(errors) {
      for (var i = 0; i < M.FIELD_ORDER.length; i++) {
        var f = M.FIELD_ORDER[i];
        if (!errors[f]) continue;
        var target = f === 'danhMuc' ? ($('input[type=radio]:checked') || $('input[type=radio]')) : el(f);
        if (target) { target.focus(); if (target.scrollIntoView) target.scrollIntoView({ block: 'center' }); }
        return;
      }
    }

    /* ---------- Banner & toast ---------- */
    function showBanner(msg, isError) {
      var b = $('[data-role="banner"]');
      if (!b) return;
      b.textContent = msg;
      b.classList.toggle('is-error', !!isError);
      b.hidden = false;
    }
    function hideBanner() { var b = $('[data-role="banner"]'); if (b) { b.hidden = true; b.textContent = ''; } }
    function toast(msg) {
      var t = $('[data-role="toast"]');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('is-show');
      clearTimeout(state.toastTimer);
      state.toastTimer = setTimeout(function () { t.classList.remove('is-show'); }, 4000);
    }
    function setBusy(b) {
      var s = $('[data-act="submit"]'), c = $('[data-act="cancel"]');
      if (!s) return;
      if (b) { s.setAttribute('aria-busy', 'true'); s.disabled = true; if (c) c.disabled = true; }
      else { s.removeAttribute('aria-busy'); s.disabled = employees.length === 0; if (c) c.disabled = false; }
    }

    /* ---------- Hộp thoại xác nhận ---------- */
    function confirmDialog(cfg) {
      return new Promise(function (resolve) {
        var prev = document.activeElement;
        var ov = document.createElement('div');
        ov.className = 'dn-overlay';
        ov.setAttribute('data-role', 'dialog-overlay');
        ov.innerHTML = '<div class="dn-dialog" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-dt" aria-describedby="' + uid + '-dd">' +
          '<h2 id="' + uid + '-dt">' + esc(cfg.title) + '</h2><p id="' + uid + '-dd">' + esc(cfg.message) + '</p>' +
          '<div class="dn-dialog-actions"><button type="button" class="dn-btn dn-btn-secondary" data-dlg="cancel">' + esc(cfg.cancelText) + '</button>' +
          '<button type="button" class="dn-btn dn-btn-primary" data-dlg="ok">' + esc(cfg.okText) + '</button></div></div>';
        rootEl.appendChild(ov);
        var btns = ov.querySelectorAll('button');
        function close(v) {
          document.removeEventListener('keydown', onKey, true);
          if (ov.parentNode) ov.parentNode.removeChild(ov);
          if (prev && prev.focus && !state.destroyed) prev.focus();
          resolve(v);
        }
        function onKey(e) {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
          else if (e.key === 'Tab') {
            var first = btns[0], last = btns[btns.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            else if (!ov.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
          }
        }
        document.addEventListener('keydown', onKey, true);
        ov.addEventListener('click', function (e) {
          if (e.target === ov) close(false);
          var b = e.target.closest ? e.target.closest('[data-dlg]') : null;
          if (b) close(b.getAttribute('data-dlg') === 'ok');
        });
        btns[0].focus();
      });
    }

    /* ---------- Hành động ---------- */
    function currentResult() { return M.validate(readRaw(), validateCtx()); }

    function resetAfterAdd() {
      var keep = readRaw().nhanVienId;
      var b = blankRaw();
      b.nhanVienId = keep;
      writeRaw(b);
      state.touched = {};
      state.submitted = false;
      M.FIELD_ORDER.forEach(function (f) { setError(f, ''); });
      state.initial = readRaw();
      el('nhaCungCap').focus();
    }

    function fireChanged(action, item) {
      try {
        document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'entry', action: action, id: item.id, item: item } }));
      } catch (e) { /* bỏ qua */ }
    }

    async function doSubmit() {
      if (state.saving || state.destroyed || state.blocked) return;
      if (employees.length === 0) return;
      state.submitted = true;
      hideBanner();
      var res = currentResult();
      showErrors(res);
      if (!res.ok) { focusFirstError(res.errors); return; }
      state.saving = true;
      setBusy(true);
      var r;
      try {
        r = await (mode === 'edit' ? store.update(opts.id, res.value, { actorId: actorId }) : store.add(res.value, { actorId: actorId }));
      } catch (e) { r = { ok: false, error: 'exception' }; }
      state.saving = false;
      if (state.destroyed) return;
      setBusy(false);
      if (r && r.ok) {
        fireChanged(mode === 'edit' ? 'update' : 'add', r.item);
        if (mode === 'edit') {
          state.initial = readRaw();
          toast('Đã lưu thay đổi');
        } else {
          toast('Đã gửi đề nghị · Chờ duyệt');
          resetAfterAdd();
        }
        if (opts.onSaved) opts.onSaved(r.item);
        return;
      }
      if (r && r.error === 'invalid' && r.errors) {
        Object.keys(r.errors).forEach(function (f) { setError(f, r.errors[f]); });
        focusFirstError(r.errors);
        return;
      }
      var code = r && r.error;
      showBanner(FAIL_MSG[code] || FAIL_MSG.exception, code === 'corrupt' || code === 'locked' || code === 'notfound' || code === 'forbidden');
    }

    async function doCancel() {
      if (state.saving || state.blocked) { if (opts.onCancel) opts.onCancel(); return; }
      if (M.hasChanges(state.initial, readRaw())) {
        var discard = await confirmDialog({
          title: 'Bỏ các thay đổi?', message: 'Những gì bạn đã nhập chưa được lưu.',
          okText: 'Bỏ thay đổi', cancelText: 'Tiếp tục sửa'
        });
        if (!discard) return;
      }
      if (state.destroyed) return;
      if (opts.onCancel) opts.onCancel();
      else if (mode === 'add') {
        var keep = readRaw().nhanVienId;
        var b = blankRaw(); b.nhanVienId = keep; writeRaw(b);
        state.initial = readRaw(); state.touched = {}; state.submitted = false;
        M.FIELD_ORDER.forEach(function (f) { setError(f, ''); });
        hideBanner();
      } else { writeRaw(state.initial); }
    }

    /* ---------- Sự kiện ---------- */
    function maskDonGia(input) {
      var v = input.value;
      var pos = input.selectionStart == null ? v.length : input.selectionStart;
      var before = v.slice(0, pos).replace(/\D/g, '').length;
      var digits = v.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      var out = M.groupDigits(digits);
      if (out === v) return;
      input.value = out;
      var n = 0, i = 0;
      if (before > 0) {
        for (; i < out.length; i++) { if (/\d/.test(out[i])) n++; if (n >= before) { i++; break; } }
      }
      try { input.setSelectionRange(i, i); } catch (e) { /* input chưa focus */ }
    }

    function revalidateField(name) {
      if (state.submitted || state.touched[name]) showErrors(currentResult(), name);
    }

    function on(target, type, fn, capture) {
      target.addEventListener(type, fn, capture);
      cleanups.push(function () { target.removeEventListener(type, fn, capture); });
    }

    on(rootEl, 'input', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (!f) return;
      if (f === 'donGia') maskDonGia(e.target);
      if (f === 'soLuong' || f === 'donGia') updateTotal();
      if (f === 'ghiChu') updateCount();
      revalidateField(f);
    });
    on(rootEl, 'change', function (e) {
      var t = e.target;
      if (t.type === 'radio') { state.touched.danhMuc = true; revalidateField('danhMuc'); return; }
      var f = t.getAttribute && t.getAttribute('data-field');
      if (f) { state.touched[f] = true; revalidateField(f); }
    });
    on(rootEl, 'focusout', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (!f || f === 'danhMuc') return;
      state.touched[f] = true;
      showErrors(currentResult(), f);
    });
    on(rootEl, 'submit', function (e) { e.preventDefault(); doSubmit(); });
    on(rootEl, 'click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act="cancel"]') : null;
      if (b) doCancel();
    });

    return {
      root: rootEl,
      getState: function () { return { mode: mode, saving: state.saving, blocked: state.blocked, destroyed: state.destroyed }; },
      submit: doSubmit,
      destroy: function () {
        state.destroyed = true;
        clearTimeout(state.toastTimer);
        cleanups.forEach(function (f) { f(); });
        cleanups = [];
        rootEl.innerHTML = '';
        rootEl.classList.remove('dn-root');
      }
    };
  }

  root.DncEntry = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
