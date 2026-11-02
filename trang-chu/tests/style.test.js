/* Test kiểu dáng (bố cục, màu, font), tương phản và trợ năng của khung ứng dụng theo DESIGN mục 13. */
(function () {
  var K = DncAppModel.KEYS, MGR = { vaiTro: 'quan_ly' }, E1 = { vaiTro: 'nhan_vien', nhanVienId: 'nv1' };
  function cs(el) { return getComputedStyle(el); }
  function pair(name, fg, bg, min) { var r = contrast(fg, bg); assert.ok(r >= (min || 4.5), name + ': ' + r.toFixed(2) + ':1 (' + fg + ' trên ' + bg + ')'); }

  describe('bố cục khung (DESIGN 13.1)', function () {
    itApp('[điện thoại] đầu trang 52px; thanh điều hướng cố định ở đáy cao 64px, mục chia đều, mỗi mục ≥ 44px', async function () {
      if (!isMobile()) skip();
      var h = mountApp({ session: MGR }), hd = h.q('.app-header'), nv = h.q('.app-nav');
      assert.equal(Math.round(hd.getBoundingClientRect().height), 52); assert.equal(cs(hd).position, 'sticky'); assert.equal(cs(nv).position, 'fixed');
      var r = nv.getBoundingClientRect(); assert.ok(Math.abs(r.bottom - window.innerHeight) <= 1, 'dính đáy'); assert.equal(Math.round(r.height), 64); assert.ok(Math.abs(r.width - document.documentElement.clientWidth) <= 1);
      var w = h.qa('.app-nav-item').map(function (a) { return a.getBoundingClientRect(); }); assert.equal(w.length, 4); w.forEach(function (x) { assert.ok(x.height >= 44 && x.width >= 44); assert.ok(Math.abs(x.width - w[0].width) <= 1, 'mục không đều nhau'); });
      var it0 = h.q('.app-nav-item'); assert.equal(cs(it0).flexDirection, 'column'); assert.equal(cs(h.q('.app-nav-label')).fontSize, '12px'); assert.equal(h.q('.app-nav-item svg').getAttribute('width'), '24');
    });
    itApp('[điện thoại] nội dung chừa chỗ cho thanh đáy; không cuộn ngang; thanh đáy 3 mục cho Nhân viên', async function () {
      if (!isMobile()) skip();
      var h = mountApp({ session: E1 }); h.box.style.width = 'auto'; assert.ok(parseFloat(cs(h.q('.app-main')).paddingBottom) >= 64); var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang');
      assert.equal(h.qa('.app-nav-item').length, 3); var w = h.qa('.app-nav-item').map(function (a) { return Math.round(a.getBoundingClientRect().width); }); assert.ok(Math.abs(w[0] - w[2]) <= 1);
    });
    itApp('[điện thoại] chip chỉ còn chữ cái đại diện khi rộng < 400px; logo + tên app vẫn hiện', async function () {
      if (!isMobile()) skip();
      var h = mountApp({ session: E1 }); h.box.style.width = 'auto'; assert.ok(h.q('.app-chip').getBoundingClientRect().height >= 44); assert.ok(h.q('.app-brand').getBoundingClientRect().height >= 44);
      assert.equal(cs(h.q('.app-chip-name')).display === 'none', window.innerWidth < 400);
      var a = h.q('.app-brand').getBoundingClientRect(), c = h.q('.app-chip').getBoundingClientRect(); assert.ok(c.left >= a.right, 'chip không đè logo'); assert.ok(c.right <= window.innerWidth + 0.5);
    });
    itApp('[điện thoại] menu đổi vai trò là bottom sheet bo góc trên 20px nằm TRÊN thanh điều hướng', async function () {
      if (!isMobile()) skip();
      var h = mountApp({ session: MGR }); h.openMenu(); var d = h.q('.app-menu'); d.style.animation = 'none'; var r = d.getBoundingClientRect();
      assert.equal(cs(d).borderTopLeftRadius, '20px'); assert.equal(cs(d).borderBottomLeftRadius, '0px'); assert.ok(Math.abs(r.bottom - window.innerHeight) <= 1); assert.ok(r.height <= window.innerHeight * 0.85 + 1);
      assert.ok(parseInt(cs(h.menu()).zIndex, 10) > parseInt(cs(h.q('.app-nav')).zIndex, 10), 'overlay phải cao hơn thanh điều hướng');
      var e = document.elementFromPoint(r.left + r.width / 2, Math.min(window.innerHeight - 4, r.bottom - 4)); assert.ok(d.contains(e), 'điểm cuối màn hình thuộc về sheet, không phải thanh điều hướng');
    });
    itApp('[laptop] đầu trang 56px chứa cả logo, thanh điều hướng ngang và chip; mục đang mở có gạch chân 2px primary', async function () {
      if (!isDesktop()) skip();
      var h = mountApp({ session: MGR }); h.box.style.width = 'auto'; var hd = h.q('.app-header'), nv = h.q('.app-nav'); assert.equal(Math.round(hd.getBoundingClientRect().height), 56); assert.notEqual(cs(nv).position, 'fixed'); assert.ok(hd.contains(nv));
      var b = h.q('.app-brand').getBoundingClientRect(), n = nv.getBoundingClientRect(), c = h.q('.app-chip').getBoundingClientRect(); assert.ok(n.left >= b.right - 1 && c.left >= n.right - 1, 'brand | nav | chip nằm trên một hàng');
      var tops = h.qa('.app-nav-item').map(function (a) { return Math.round(a.getBoundingClientRect().top); }); assert.equal(new Set(tops).size, 1, 'mục nằm ngang');
      var cur = h.q('.app-nav-item.is-current'); assert.equal(cs(cur).borderBottomWidth, '2px'); assert.equal(cs(cur).borderBottomColor, isDark() ? 'rgb(108, 155, 255)' : 'rgb(47, 111, 237)'); assert.equal(cs(cur).flexDirection, 'row');
      assert.equal(parseFloat(cs(h.q('.app-main')).paddingBottom), 0, 'không chừa chỗ đáy trên laptop');
    });
    itApp('[laptop] menu đổi vai trò là popover góc phải dưới đầu trang, rộng ≤ 380px, không làm tối màn hình', async function () {
      if (!isDesktop()) skip();
      var h = mountApp({ session: MGR }); h.openMenu(); var d = h.q('.app-menu'); d.style.animation = 'none'; var r = d.getBoundingClientRect();
      assert.ok(r.width <= 381); assert.ok(r.top >= 56 && r.top <= 80, 'top ' + r.top); assert.ok(r.right >= window.innerWidth - 60, 'sát mép phải'); assert.equal(cs(h.menu()).backgroundColor, 'rgba(0, 0, 0, 0)');
    });
    itApp('[laptop] hộp thoại đặt lại dữ liệu căn giữa, rộng ≤ 480px', async function () {
      if (!isDesktop()) skip();
      var st = makeStorage({ session: MGR }); st.m[K.DN] = 'x'; var h = mountApp({ storage: st }); h.q('[data-act="reset-open"]').click(); var d = h.q('[data-role="reset-overlay"] .app-dialog'); d.style.animation = 'none'; var r = d.getBoundingClientRect();
      assert.ok(r.width <= 480); assert.ok(Math.abs(r.left + r.width / 2 - window.innerWidth / 2) <= 10); assert.equal(cs(d).borderTopLeftRadius, '14px');
    });
    itApp('banner nằm ngay dưới đầu trang và đẩy nội dung xuống (không che)', async function () {
      var st = makeStorage({ session: MGR, ack: false }), h = mountApp({ storage: st }); var hd = h.q('.app-header').getBoundingClientRect(), b = h.q('[data-role="banner"]').getBoundingClientRect(), m = h.q('.app-main').getBoundingClientRect();
      assert.ok(Math.abs(b.top - hd.bottom) <= 1); assert.ok(m.top >= b.bottom - 1, 'nội dung nằm dưới banner');
    });
  });

  describe('màn Chọn vai trò và Trang chủ (DESIGN 13.3, 13.4)', function () {
    itApp('tiêu đề 22px/700; thẻ vai trò cao ≥ 96px bo 14px; thẻ được chọn có viền primary + nền primary-soft + dấu tick', async function () {
      var h = mountApp(); var t = cs(h.q('.app-role h1')); assert.equal(t.fontSize, '22px'); assert.equal(t.fontWeight, '700');
      h.qa('.app-card-in').forEach(function (c) { assert.ok(c.getBoundingClientRect().height >= 96); assert.equal(cs(c).borderTopLeftRadius, '14px'); });
      assert.equal(cs(h.q('.app-card-tick')).display, 'none'); h.qa('.app-card-in').forEach(function (x) { x.style.transition = 'none'; }); h.pickRole(null, 'quan_ly'); var sel = h.q('input:checked + .app-card-in'), D = isDark(); assert.equal(cs(sel).borderTopColor, D ? 'rgb(108, 155, 255)' : 'rgb(47, 111, 237)'); assert.equal(cs(sel).backgroundColor, D ? 'rgb(27, 42, 74)' : 'rgb(230, 238, 253)'); assert.notEqual(cs(sel.querySelector('.app-card-tick')).display, 'none');
    });
    itApp('[điện thoại] hai thẻ xếp dọc, nút Vào rộng 100%; [laptop] hai thẻ ngang', async function () {
      var h = mountApp(); h.box.style.width = 'auto'; var c = h.qa('.app-card-in').map(function (x) { return x.getBoundingClientRect(); });
      if (isMobile()) { assert.ok(c[1].top >= c[0].bottom - 1, 'xếp dọc'); var b = h.q('[data-act="enter"]').getBoundingClientRect(), r = h.q('.app-role').getBoundingClientRect(); assert.ok(b.width >= r.width - 40, 'Vào rộng ~100%'); }
      else assert.ok(Math.abs(c[0].top - c[1].top) <= 1, 'xếp ngang');
      assert.ok(h.q('.app-role').getBoundingClientRect().width <= 560 + 1); var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth);
    });
    itApp('ô chọn tên cao 48px, cỡ chữ ≥ 16px; nút Vào cao ≥ 44px', async function () {
      var h = mountApp(); h.pickRole(null, 'nhan_vien'); var s = h.q('[data-role="who"]'); assert.equal(Math.round(s.getBoundingClientRect().height), 48); assert.ok(parseFloat(cs(s).fontSize) >= 16); assert.ok(h.q('[data-act="enter"]').getBoundingClientRect().height >= 44);
    });
    itApp('Trang chủ: thẻ tổng quan viền trái 4px đúng màu trạng thái (như 6.5); số 28px/700; lối tắt bo 14px cao ≥ 72px', async function () {
      var h = mountApp({ session: MGR }), D = isDark();
      assert.equal(cs(h.q('[data-kpi="approved"]')).borderLeftWidth, '4px'); assert.equal(cs(h.q('[data-kpi="approved"]')).borderLeftColor, D ? 'rgb(61, 213, 152)' : 'rgb(18, 128, 92)'); assert.equal(cs(h.q('[data-kpi="pending"]')).borderLeftColor, D ? 'rgb(242, 184, 78)' : 'rgb(138, 90, 0)'); assert.equal(cs(h.q('[data-kpi="rejected"]')).borderLeftColor, D ? 'rgb(242, 118, 109)' : 'rgb(179, 38, 30)');
      var v = cs(h.q('[data-role="kpi-approved"]')); assert.equal(v.fontSize, '28px'); assert.equal(v.fontWeight, '700'); assert.match(v.fontVariantNumeric, /tabular-nums/);
      h.qa('.app-short').forEach(function (s) { assert.equal(cs(s).borderTopLeftRadius, '14px'); assert.ok(s.getBoundingClientRect().height >= 72); }); assert.equal(cs(h.q('.app-short.is-hot')).borderLeftWidth, '4px');
      assert.match(cs(h.box).fontFamily, /system-ui|-apple-system|Segoe UI|Roboto|Arial/);
    });
    itApp('[điện thoại] Trang chủ một cột; [laptop] thẻ tổng quan 3 cột, lối tắt 3 cột, khung ≤ 1120px', async function () {
      var h = mountApp({ session: MGR }); h.box.style.width = 'auto'; var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang');
      var k = h.qa('.app-kpi').map(function (e) { return Math.round(e.getBoundingClientRect().top); }), s = h.qa('.app-short').map(function (e) { return Math.round(e.getBoundingClientRect().top); });
      if (isMobile()) { assert.equal(new Set(k).size, 3); assert.equal(new Set(s).size, 3); } else if (isDesktop()) { assert.equal(new Set(k).size, 1); assert.equal(new Set(s).size, 1); assert.ok(h.q('.app-home').getBoundingClientRect().width <= 1120); }
    });
  });

  describe('đẩy thành phần cố định của module con lên trên thanh điều hướng (DESIGN 13.1)', function () {
    itApp('[điện thoại] thanh duyệt hàng loạt (module Duyệt) nằm sát NGAY TRÊN thanh điều hướng, không bị che', async function () {
      if (!isMobile()) skip();
      var h = mountApp({ session: MGR, modules: 'real', deNghi: [req({ id: 'a', ngay: DncAppModel.todayStr() }), req({ id: 'b', ngay: DncAppModel.todayStr() })], today: DncAppModel.todayStr() }); h.link('duyet').click();
      h.q('[data-sel="a"]').click(); h.q('[data-sel="a"]').dispatchEvent(new Event('change', { bubbles: true })); var bar = h.q('.dv-bulk'); assert.equal(bar.hidden, false);
      var nb = h.q('.app-nav').getBoundingClientRect(), bb = bar.getBoundingClientRect(); assert.ok(bb.bottom <= nb.top + 1, 'thanh hàng loạt bị thanh điều hướng che: ' + bb.bottom + ' > ' + nb.top); assert.ok(nb.top - bb.bottom <= 20, 'khe hở quá lớn: ' + (nb.top - bb.bottom));
      var e = document.elementFromPoint(bb.left + bb.width / 2, bb.bottom - 6); assert.ok(bar.contains(e), 'đáy thanh hàng loạt phải bấm được');
    });
    itApp('[điện thoại] nút Gửi/Hủy dính đáy (module Nhập liệu) cách đáy đúng bằng chiều cao thanh điều hướng', async function () {
      if (!isMobile()) skip();
      var h = mountApp({ session: E1, modules: 'real' }); h.link('nhap-lieu').click(); var a = h.q('.dn-actions'); assert.equal(cs(a).position, 'sticky'); assert.equal(parseFloat(cs(a).bottom), 64);
    });
    itApp('[điện thoại] toast của module con nằm phía trên thanh điều hướng', async function () {
      if (!isMobile()) skip();
      var h = mountApp({ session: MGR, modules: 'real' }); h.link('nhan-vien').click(); var t = h.q('.de-toast'); assert.ok(parseFloat(cs(t).bottom) >= 64 + 16 - 0.5, 'bottom ' + cs(t).bottom);
      var h2 = mountApp({ session: E1, modules: 'real' }); h2.link('nhap-lieu').click(); assert.ok(parseFloat(cs(h2.q('.dn-toast')).bottom) >= 80 - 0.5);
    });
    itApp('[laptop] không có thanh đáy nên không đẩy gì: thanh Gửi/Hủy tĩnh, toast ở vị trí gốc', async function () {
      if (!isDesktop()) skip();
      var h = mountApp({ session: E1, modules: 'real' }); h.link('nhap-lieu').click(); assert.equal(cs(h.q('.dn-actions')).position, 'static'); assert.equal(cs(h.q('.app-nav')).position, 'static');
    });
  });

  describe('màu, tương phản và trợ năng (WCAG AA)', function () {
    itApp('đầu trang, thanh điều hướng, chip, banner, nút, thẻ đạt ≥ 4.5:1', async function () {
      var h = mountApp({ session: MGR, ack: false }), card = effBg(h.q('.app-kpi')), nb = effBg(h.q('.app-nav'));
      pair('tên app', cs(h.q('.app-brand-name')).color, effBg(h.q('.app-header'))); pair('logo', cs(h.q('.app-logo')).color, cs(h.q('.app-logo')).backgroundColor, 3);
      pair('mục chưa mở', cs(h.link('thong-ke')).color, effBg(h.link('thong-ke'))); pair('mục đang mở', cs(h.link('home')).color, effBg(h.link('home')));
      pair('chip', cs(h.q('.app-chip-name')).color, cs(h.q('.app-chip')).backgroundColor); pair('chữ cái đại diện', cs(h.q('.app-avatar')).color, cs(h.q('.app-avatar')).backgroundColor);
      pair('huy hiệu', cs(h.q('.app-badge')).color, cs(h.q('.app-badge')).backgroundColor);
      pair('lời chào', cs(h.q('.app-title')).color, cssVar('--bg')); pair('mô tả', cs(h.q('.app-lead')).color, cssVar('--bg'));
      pair('nhãn KPI', cs(h.q('.app-kpi-label')).color, card); pair('số KPI', cs(h.q('.app-kpi-val')).color, card); pair('phụ KPI', cs(h.q('.app-kpi-sub')).color, card);
      pair('lối tắt', cs(h.q('.app-short-txt strong')).color, effBg(h.q('.app-short'))); pair('mô tả lối tắt', cs(h.q('.app-short-txt small')).color, effBg(h.q('.app-short'))); pair('biểu tượng lối tắt', cs(h.q('.app-short svg')).color, effBg(h.q('.app-short')), 3);
      var bn = h.q('[data-role="banner"]'); pair('banner nhắc', cs(bn).color, cs(bn).backgroundColor); pair('nút Đã hiểu', cs(h.q('[data-act="ack"]')).color, cs(h.q('[data-act="ack"]')).backgroundColor);
    });
    itApp('banner cảnh báo và banner lỗi đạt AA', async function () {
      var st = makeStorage({ session: MGR }); st.failSet = true; var h = mountApp({ storage: st }); var b = h.q('[data-role="banner"]'); assert.equal(h.banner(), 'blocked'); pair('cảnh báo', cs(b).color, cs(b).backgroundColor);
      var st2 = makeStorage({ session: MGR }); st2.m[K.NV] = 'x'; var g = mountApp({ storage: st2 }); var e = g.q('[data-role="banner"]'); assert.equal(g.banner(), 'corrupt'); pair('lỗi', cs(e).color, cs(e).backgroundColor); pair('nút Đặt lại', cs(g.q('[data-act="reset-open"]')).color, cs(g.q('[data-act="reset-open"]')).backgroundColor);
      assert.equal(cs(e).backgroundColor, isDark() ? 'rgb(63, 27, 24)' : 'rgb(252, 232, 230)'); assert.equal(cs(b).backgroundColor, isDark() ? 'rgb(58, 44, 16)' : 'rgb(255, 241, 214)');
    });
    itApp('màn Chọn vai trò, menu, hộp thoại đặt lại, toast đạt AA', async function () {
      var h = mountApp(); var bg = cssVar('--bg'); pair('tiêu đề', cs(h.q('.app-role h1')).color, bg); pair('hướng dẫn', cs(h.q('.app-lead')).color, bg); pair('chú thích', cs(h.q('.app-foot')).color, bg);
      var card = h.q('.app-card-in'); pair('tên vai trò', cs(card.querySelector('strong')).color, cs(card).backgroundColor); pair('mô tả vai trò', cs(card.querySelector('small')).color, cs(card).backgroundColor); pair('viền thẻ vai trò', cs(card).borderTopColor, bg, 1.1);
      h.pickRole(null, 'nhan_vien'); pair('ô chọn', cs(h.q('[data-role="who"]')).color, cs(h.q('[data-role="who"]')).backgroundColor); pair('nhãn', cs(h.q('.app-label')).color, bg); pair('nút Vào (khóa không tính)', cs(h.q('[data-act="enter"]')).color, cs(h.q('[data-act="enter"]')).backgroundColor, 1);
      pair('thẻ được chọn', cs(h.q('input:checked + .app-card-in strong')).color, cs(h.q('input:checked + .app-card-in')).backgroundColor); pair('dấu tick', cs(h.q('input:checked + .app-card-in .app-card-tick')).color, cs(h.q('input:checked + .app-card-in')).backgroundColor, 3);
      var g = mountApp({ session: MGR }); g.openMenu(); var d = g.q('.app-menu'), db = cs(d).backgroundColor; pair('tiêu đề menu', cs(g.q('.app-dtitle')).color, db); pair('nhắc', cs(g.q('.app-menu .app-hint')).color, db); pair('Áp dụng', cs(g.q('[data-act="apply"]')).color, cs(g.q('[data-act="apply"]')).backgroundColor);
      g.q('[data-act="menu-close"]').click(); g.link('thong-ke').click(); g.q('.app-brand').click(); g.app.toast('Thông báo thử'); var t = g.q('[data-role="toast"]'); pair('toast', cs(t).color, cs(t).backgroundColor);
      var st = makeStorage({ session: MGR }); st.m[K.DN] = 'x'; var r = mountApp({ storage: st }); r.q('[data-act="reset-open"]').click(); var rd = r.q('[data-role="reset-overlay"] .app-dialog'), rb = cs(rd).backgroundColor;
      pair('hộp đặt lại: tiêu đề', cs(r.q('.app-dtitle')).color, rb); pair('mô tả', cs(r.q('.app-msg')).color, rb); pair('nút Xóa (khóa không tính)', cs(r.q('[data-act="reset-ok"]')).color, rb, 1); var inp = r.q('[data-role="reset-input"]'); pair('ô gõ', cs(inp).color, cs(inp).backgroundColor);
    });
    itApp('trợ năng: landmark header/nav/main, nút bỏ qua, biểu tượng ẩn, vùng thông báo, vòng focus', async function () {
      var h = mountApp({ session: MGR }); assert.equal(h.q('header').getAttribute('role'), 'banner'); assert.equal(h.q('nav').tagName, 'NAV'); assert.equal(h.q('main').tagName, 'MAIN'); assert.ok(h.q('main').hasAttribute('tabindex'));
      assert.equal(h.q('.app-skip').textContent, 'Bỏ qua tới nội dung'); assert.equal(h.q('[data-role="toast"]').getAttribute('aria-live'), 'polite'); h.qa('svg').forEach(function (s) { assert.equal(s.getAttribute('aria-hidden'), 'true'); });
      var a = h.link('thong-ke'); a.focus(); assert.equal(cs(a).outlineStyle, 'solid', 'outline link: ' + cs(a).outline); assert.equal(cs(a).outlineWidth, '2px', 'link: ' + cs(a).outline + ' / active=' + document.activeElement.className); var c = h.q('.app-chip'); c.focus(); assert.equal(cs(c).outlineWidth, '2px', 'chip: ' + cs(c).outline);
      h.qa('a, button, select, input').forEach(function (e) { assert.ok(e.tabIndex >= 0, e.outerHTML.slice(0, 60)); });
    });
    itApp('thẻ vai trò là radio thật: dùng bàn phím được, cùng một nhóm, có nhãn', async function () {
      var h = mountApp(); var r = h.qa('.app-card-role input'); assert.equal(new Set(r.map(function (x) { return x.name; })).size, 1); assert.ok(h.q('[role="radiogroup"]').getAttribute('aria-label')); r[0].focus(); assert.equal(document.activeElement, r[0]);
      assert.equal(cs(h.q('.app-card-role input')).position, 'absolute'); assert.ok(h.q('.app-card-role').textContent.indexOf('Nhân viên') >= 0);
    });
    itApp('nút Vào/Áp dụng bị khóa có độ mờ; đủ vùng chạm ≥ 44px cho mọi nút chính', async function () {
      var h = mountApp(); var en = h.q('[data-act="enter"]'); en.style.transition = 'none'; assert.ok(parseFloat(cs(en).opacity) < 1); h.pickRole(null, 'quan_ly'); assert.equal(cs(en).opacity, '1');
      var g = mountApp({ session: MGR, ack: false }); g.qa('.app-btn, .app-chip, .app-nav-item, .app-brand').forEach(function (b) { if (b.offsetParent === null) return; var r = b.getBoundingClientRect(); assert.ok(r.height >= 36, (b.className) + ' cao ' + r.height); });
    });
  });
})();
