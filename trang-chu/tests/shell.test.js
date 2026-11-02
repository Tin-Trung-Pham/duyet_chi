/* Test khung ứng dụng với module giả (độc lập với 4 module thật). */
(function () {
  var A = DncAppModel, K = A.KEYS, MGR = { vaiTro: 'quan_ly' }, E1 = { vaiTro: 'nhan_vien', nhanVienId: 'nv1' };
  function cs(el) { return getComputedStyle(el); }
  function esc() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }

  describe('khởi động và chọn vai trò (F-01, DESIGN 4.1)', function () {
    itApp('chưa có phiên: tự chuyển (thay thế lịch sử) sang Chọn vai trò; đầu trang chỉ có logo', async function () {
      var h = mountApp({ path: '/' });
      assert.equal(h.route(), 'vai-tro'); assert.deepEqual(h.nav.sets, [{ path: '/vai-tro', replace: true }]);
      assert.ok(h.q('.app-header.is-bare')); assert.equal(h.q('.app-nav'), null); assert.equal(h.q('.app-chip'), null); assert.equal(document.title, 'Chọn vai trò · Sổ Đề Nghị Chi');
      assert.equal(h.log.mounts.length, 0);
    });
    itApp('địa chỉ sâu khi chưa có phiên cũng về Chọn vai trò', async function () { assert.equal(mountApp({ path: '/duyet' }).route(), 'vai-tro'); });
    itApp('màn Chọn vai trò: tiêu đề, hai thẻ radio, chú thích, nút Vào bị khóa', async function () {
      var h = mountApp();
      assert.equal(h.text('.app-role h1'), 'Sổ Đề Nghị Chi'); assert.equal(h.qa('.app-card-role input[type=radio]').length, 2);
      assert.deepEqual(h.qa('.app-card-txt strong').map(function (e) { return e.textContent; }), ['Nhân viên', 'Quản lý']); assert.equal(h.text('.app-foot'), 'Dữ liệu lưu trên trình duyệt này.');
      assert.equal(h.q('[data-act="enter"]').disabled, true); assert.equal(h.q('[data-role="who-field"]').hidden, true); assert.equal(h.q('.app-card-role input:checked'), null);
    });
    itApp('chọn Nhân viên: hiện ô "Tôi là…" chỉ liệt kê người đang hoạt động; Vào chỉ bật khi đã chọn tên', async function () {
      var h = mountApp(); h.pickRole(null, 'nhan_vien');
      assert.equal(h.q('[data-role="who-field"]').hidden, false); assert.deepEqual(h.qa('[data-role="who"] option').map(function (o) { return o.textContent; }), ['Chọn tên của bạn…', 'NV001 · Nguyễn Văn An', 'NV002 · Trần Thị Bình', 'NV003 · Lê Hoàng Cường']);
      assert.equal(h.q('[data-act="enter"]').disabled, true); h.pickWho(null, 'nv2'); assert.equal(h.q('[data-act="enter"]').disabled, false); h.pickWho(null, ''); assert.equal(h.q('[data-act="enter"]').disabled, true);
    });
    itApp('chọn Quản lý: ẩn ô "Tôi là…", Vào bật ngay; đổi qua lại giữa hai vai trò', async function () {
      var h = mountApp(); h.pickRole(null, 'quan_ly'); assert.equal(h.q('[data-role="who-field"]').hidden, true); assert.equal(h.q('[data-act="enter"]').disabled, false);
      h.pickRole(null, 'nhan_vien'); assert.equal(h.q('[data-act="enter"]').disabled, true); h.pickRole(null, 'quan_ly'); assert.equal(h.q('[data-act="enter"]').disabled, false);
    });
    itApp('chưa có nhân viên nào: ô chọn bị khóa, có hướng dẫn, không thể Vào bằng vai trò Nhân viên', async function () {
      var h = mountApp({ nhanVien: [] }); h.pickRole(null, 'nhan_vien');
      assert.equal(h.q('[data-role="who"]').disabled, true); assert.equal(h.text('[data-role="no-emp"]'), 'Chưa có nhân viên. Hãy vào với vai trò Quản lý để thêm trước.'); assert.equal(h.q('[data-act="enter"]').disabled, true);
      h.pickRole(null, 'quan_ly'); assert.equal(h.q('[data-act="enter"]').disabled, false);
    });
    itApp('chỉ còn nhân viên đã ngưng: coi như chưa có nhân viên', async function () {
      var h = mountApp({ nhanVien: [{ id: 'z', ma: 'Z', hoTen: 'Z', hoatDong: false }] }); h.pickRole(null, 'nhan_vien'); assert.ok(h.q('[data-role="no-emp"]'));
    });
    itApp('Vào với vai trò Quản lý: lưu phiên, sang Trang chủ, hiện thanh điều hướng và chip', async function () {
      var h = mountApp(); h.enterAs('quan_ly');
      assert.deepEqual(h.session(), MGR); assert.equal(h.route(), 'home'); assert.equal(h.app.getState().path, '/'); assert.ok(h.q('.app-nav')); assert.ok(h.q('.app-chip')); assert.equal(h.q('.app-header.is-bare'), null);
      assert.equal(h.text('[data-role="chip-name"]'), 'Quản lý');
    });
    itApp('Vào với vai trò Nhân viên: lưu cả mã nhân viên; chip hiện tên', async function () {
      var h = mountApp(); h.enterAs('nhan_vien', 'nv2'); assert.deepEqual(h.session(), { vaiTro: 'nhan_vien', nhanVienId: 'nv2' }); assert.equal(h.text('[data-role="chip-name"]'), 'Trần Thị Bình'); assert.equal(h.q('.app-avatar').textContent, 'B');
    });
    itApp('nhớ lựa chọn: có phiên sẵn thì vào thẳng Trang chủ, không qua Chọn vai trò', async function () {
      var h = mountApp({ session: MGR }); assert.equal(h.route(), 'home'); assert.deepEqual(h.nav.sets, []); var g = mountApp({ session: E1 }); assert.equal(g.route(), 'home');
    });
    itApp('phiên hỏng / không hợp lệ trong storage bị bỏ qua', async function () {
      var st = makeStorage(); st.m[K.SESSION] = '{hỏng'; assert.equal(mountApp({ storage: st }).route(), 'vai-tro');
      var st2 = makeStorage(); st2.m[K.SESSION] = JSON.stringify({ vaiTro: 'admin' }); assert.equal(mountApp({ storage: st2 }).route(), 'vai-tro');
    });
    itApp('nhân viên đã chọn nay bị ngưng hoạt động / bị xóa: về Chọn vai trò, xóa phiên, có thông báo', async function () {
      var h = mountApp({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv4' } });
      assert.equal(h.route(), 'vai-tro'); assert.equal(h.session(), null); assert.equal(h.text('[data-role="notice"]'), 'Nhân viên này không còn hoạt động. Hãy chọn lại vai trò.'); assert.match(h.toastText(), /không còn hoạt động/);
      var g = mountApp({ session: { vaiTro: 'nhan_vien', nhanVienId: 'khong_co' } }); assert.equal(g.route(), 'vai-tro');
    });
    itApp('mở lại màn Chọn vai trò khi đang có phiên: chọn sẵn vai trò hiện tại', async function () {
      var h = mountApp({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv3' } }); h.nav.push('/vai-tro');
      assert.equal(h.route(), 'vai-tro'); assert.equal(h.q('.app-card-role input:checked').value, 'nhan_vien'); assert.equal(h.q('[data-role="who"]').value, 'nv3'); assert.equal(h.q('[data-act="enter"]').disabled, false); assert.ok(h.q('.app-nav'));
    });
    itApp('tên nhân viên chứa HTML được thoát ký tự ở ô chọn, chip và lời chào', async function () {
      window.__xss = 0; var evil = '<img src=x onerror="window.__xss=1">';
      var h = mountApp({ nhanVien: [{ id: 'e', ma: 'E1', hoTen: evil + 'Tèo', hoatDong: true }] }); h.enterAs('nhan_vien', 'e'); await tick(20);
      assert.equal(window.__xss, 0); assert.equal(h.box.querySelectorAll('img').length, 0); assert.ok(h.text('[data-role="greeting"]').indexOf('<img') >= 0); assert.ok(h.q('.app-chip').getAttribute('aria-label').indexOf('<img') >= 0);
    });
  });

  describe('thanh điều hướng theo vai trò (DESIGN 13.2)', function () {
    itApp('Nhân viên: Trang chủ · Thống kê · Thêm; liên kết thật tới #/…', async function () {
      var h = mountApp({ session: E1 });
      assert.deepEqual(h.navLabels(), ['Trang chủ', 'Thống kê', 'Thêm']); assert.deepEqual(h.navItems(), ['home', 'thong-ke', 'nhap-lieu']);
      assert.deepEqual(h.qa('.app-nav-item').map(function (a) { return a.getAttribute('href'); }), ['#/', '#/thong-ke', '#/nhap-lieu']); assert.equal(h.q('.app-nav').getAttribute('aria-label'), 'Điều hướng chính');
    });
    itApp('Quản lý: Trang chủ · Thống kê · Duyệt · Nhân viên', async function () {
      var h = mountApp({ session: MGR }); assert.deepEqual(h.navLabels(), ['Trang chủ', 'Thống kê', 'Duyệt', 'Nhân viên']); assert.deepEqual(h.qa('.app-nav-item').map(function (a) { return a.getAttribute('href'); }), ['#/', '#/thong-ke', '#/duyet', '#/nhan-vien']);
    });
    itApp('mục đang mở có aria-current="page" và lớp is-current; chỉ một mục', async function () {
      var h = mountApp({ session: MGR }); assert.deepEqual(h.qa('[aria-current="page"]').map(function (a) { return a.getAttribute('data-nav'); }), ['home']);
      h.link('duyet').click(); assert.deepEqual(h.qa('[aria-current="page"]').map(function (a) { return a.getAttribute('data-nav'); }), ['duyet']); assert.ok(h.link('duyet').classList.contains('is-current')); assert.equal(h.qa('.is-current').length, 1);
    });
    itApp('bấm mục điều hướng: mở đúng module, hủy module cũ, truyền phiên và tham số', async function () {
      var h = mountApp({ session: MGR });
      h.link('duyet').click(); assert.equal(h.route(), 'duyet'); assert.equal(h.log.mounts.length, 1); assert.equal(h.log.mounts[0].name, 'duyet'); assert.deepEqual(h.log.mounts[0].ctx.session, MGR); assert.deepEqual(h.log.mounts[0].ctx.params, []);
      h.link('nhan-vien').click(); assert.deepEqual(h.log.destroys, ['duyet']); assert.equal(h.log.mounts[1].name, 'nhan-vien'); assert.equal(h.qa('.app-host').length, 1, 'chỉ một vùng module tại một thời điểm'); assert.equal(h.text('.stub-h'), 'Màn nhan-vien');
    });
    itApp('địa chỉ có tham số được chuyển cho module', async function () {
      var h = mountApp({ session: E1, path: '/nhap-lieu/sua/dn_7' }); assert.equal(h.route(), 'nhap-lieu'); assert.deepEqual(h.log.mounts[0].ctx.params, ['sua', 'dn_7']);
    });
    itApp('bấm lại mục đang mở không mount lại (chống nhấp nháy)', async function () {
      var h = mountApp({ session: MGR }); h.link('duyet').click(); h.link('duyet').click(); h.link('duyet').click(); assert.equal(h.log.mounts.length, 1); assert.deepEqual(h.log.destroys, []);
    });
    itApp('bấm logo về Trang chủ; tiêu đề tab đổi theo màn', async function () {
      var h = mountApp({ session: MGR }); h.link('thong-ke').click(); assert.equal(document.title, 'Thống kê · Sổ Đề Nghị Chi'); h.q('.app-brand').click(); assert.equal(h.route(), 'home'); assert.equal(document.title, 'Trang chủ · Sổ Đề Nghị Chi'); assert.deepEqual(h.log.destroys, ['thong-ke']);
    });
    itApp('nút Quay lại / gõ địa chỉ (đổi địa chỉ từ bên ngoài) mở đúng màn', async function () {
      var h = mountApp({ session: MGR }); h.nav.push('/duyet'); assert.equal(h.route(), 'duyet'); h.nav.push('/thong-ke'); assert.equal(h.route(), 'thong-ke'); h.nav.push('/'); assert.equal(h.route(), 'home'); assert.deepEqual(h.log.destroys, ['duyet', 'thong-ke']);
    });
    itApp('chuyển màn: focus vào tiêu đề của màn mới; lần mở đầu tiên không cướp focus', async function () {
      var h = mountApp({ session: MGR }); assert.notEqual(document.activeElement.tagName === 'H1', true, 'lần đầu không cướp focus');
      h.link('duyet').click(); assert.equal(document.activeElement, h.q('.stub-h')); h.link('home').click(); assert.equal(document.activeElement, h.q('.app-home h1'));
    });
    itApp('màn không có tiêu đề h1: focus vào vùng nội dung', async function () {
      var log = { mounts: [], destroys: [] }, m = stubModules(log); m.duyet = { mount: function (el) { el.innerHTML = '<p>không có h1</p>'; return { destroy: function () {} }; } };
      var h = mountApp({ session: MGR, modules: m }); h.link('duyet').click(); assert.equal(document.activeElement, h.q('[data-role="main"]'));
    });
    itApp('liên kết "Bỏ qua tới nội dung" chuyển focus vào vùng nội dung', async function () {
      var h = mountApp({ session: MGR }); h.q('[data-act="skip"]').click(); assert.equal(document.activeElement, h.q('[data-role="main"]'));
    });
    itApp('bấm với phím Ctrl/Cmd không bị chặn (mở tab mới theo mặc định của trình duyệt)', async function () {
      var h = mountApp({ session: MGR }), ev = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }); h.link('duyet').dispatchEvent(ev);
      assert.equal(ev.defaultPrevented, false); assert.equal(h.route(), 'home');
    });
  });

  describe('bảo vệ trang theo vai trò', function () {
    itApp('Nhân viên gõ #/duyet: về Trang chủ + thông báo, thay thế lịch sử, không mount', async function () {
      var h = mountApp({ session: E1 }); h.nav.push('/duyet');
      assert.equal(h.route(), 'home'); assert.equal(h.toastText(), 'Trang này dành cho Quản lý.'); assert.deepEqual(h.nav.sets[h.nav.sets.length - 1], { path: '/', replace: true }); assert.equal(h.log.mounts.length, 0);
    });
    itApp('Nhân viên gõ #/nhan-vien: bị chặn', async function () { var h = mountApp({ session: E1, path: '/nhan-vien' }); assert.equal(h.route(), 'home'); assert.equal(h.toastText(), 'Trang này dành cho Quản lý.'); });
    itApp('Quản lý gõ #/nhap-lieu: bị chặn, nói rõ dành cho Nhân viên', async function () { var h = mountApp({ session: MGR, path: '/nhap-lieu' }); assert.equal(h.route(), 'home'); assert.equal(h.toastText(), 'Trang này dành cho Nhân viên.'); });
    itApp('địa chỉ không tồn tại: về Trang chủ, không báo gì', async function () { var h = mountApp({ session: MGR, path: '/linh-tinh' }); assert.equal(h.route(), 'home'); assert.equal(h.toastText(), ''); });
    itApp('đổi vai trò Quản lý → Nhân viên khi đang ở #/duyet: không còn vào được', async function () {
      var h = mountApp({ session: MGR }); h.link('duyet').click(); h.openMenu(); h.pickRole(h.menu(), 'nhan_vien'); h.pickWho(h.menu(), 'nv1'); h.q('[data-act="apply"]').click();
      assert.equal(h.route(), 'home'); h.nav.push('/duyet'); assert.equal(h.route(), 'home'); assert.equal(h.toastText(), 'Trang này dành cho Quản lý.');
    });
    itApp('module tự báo "bị chặn" (ctx.forbidden): thông báo và về Trang chủ', async function () {
      var h = mountApp({ session: MGR }); h.link('duyet').click(); h.log.mounts[0].ctx.forbidden(); assert.equal(h.route(), 'home'); assert.equal(h.toastText(), 'Trang này dành cho Quản lý.');
    });
    itApp('module điều hướng qua ctx.navigate', async function () {
      var h = mountApp({ session: E1 }); h.link('nhap-lieu').click(); h.log.mounts[0].ctx.navigate('/thong-ke'); assert.equal(h.route(), 'thong-ke'); assert.deepEqual(h.log.destroys, ['nhap-lieu']);
    });
    itApp('ctx.session là bản sao: module sửa nó không ảnh hưởng phiên của khung', async function () {
      var h = mountApp({ session: MGR }); h.link('duyet').click(); h.log.mounts[0].ctx.session.vaiTro = 'nhan_vien'; assert.deepEqual(h.session(), MGR); assert.equal(h.app.getState().session.vaiTro, 'quan_ly');
    });
  });

  describe('móc homeExtras: nội dung bổ sung dưới Trang chủ của Quản lý', function () {
    function extras() {
      var log = { mounts: [], destroys: [] };
      return { log: log, fn: function (el, ctx) { var rec = { el: el, ctx: ctx }; log.mounts.push(rec); el.innerHTML = '<p class="x-extra">phần bổ sung</p>'; return { destroy: function () { log.destroys.push(rec); el.innerHTML = ''; } }; } };
    }
    itApp('Quản lý: được gắn một lần vào vùng home-extras, nhận phiên Quản lý', async function () {
      var x = extras(), h = mountApp({ session: MGR, homeExtras: x.fn }); assert.equal(x.log.mounts.length, 1); assert.equal(x.log.mounts[0].el, h.q('[data-role="home-extras"]')); assert.deepEqual(x.log.mounts[0].ctx.session, MGR); assert.ok(h.q('.x-extra'));
    });
    itApp('Nhân viên: KHÔNG được gắn', async function () { var x = extras(), h = mountApp({ session: E1, homeExtras: x.fn }); assert.equal(x.log.mounts.length, 0); assert.equal(h.q('.x-extra'), null); });
    itApp('không truyền homeExtras: Trang chủ vẫn bình thường', async function () { var h = mountApp({ session: MGR }); assert.ok(h.q('[data-role="home-extras"]')); assert.equal(h.q('[data-role="home-extras"]').innerHTML, ''); });
    itApp('rời Trang chủ thì hủy; quay lại thì gắn lại', async function () {
      var x = extras(), h = mountApp({ session: MGR, homeExtras: x.fn }); h.link('duyet').click(); assert.equal(x.log.destroys.length, 1); assert.equal(h.q('.x-extra'), null); h.link('home').click(); assert.equal(x.log.mounts.length, 2); assert.ok(h.q('.x-extra'));
    });
    itApp('không gắn ở các màn khác', async function () { var x = extras(), h = mountApp({ session: MGR, homeExtras: x.fn, path: '/thong-ke' }); assert.equal(x.log.mounts.length, 0); });
    itApp('khi dữ liệu đổi: số liệu Trang chủ cập nhật nhưng phần bổ sung KHÔNG bị gắn lại và giữ nguyên nội dung', async function () {
      var x = extras(), h = mountApp({ session: MGR, homeExtras: x.fn }), host = h.q('[data-role="home-extras"]'), node = h.q('.x-extra'); var all = JSON.parse(h.storage.m[K.DN]); all.push(req({ tt: 'da_duyet', dg: 50000 })); h.storage.m[K.DN] = JSON.stringify(all); h.dataChanged('entry');
      assert.equal(h.text('[data-role="kpi-approved"]'), '2.450.000 ₫'); assert.equal(x.log.mounts.length, 1); assert.equal(x.log.destroys.length, 0); assert.equal(h.q('[data-role="home-extras"]'), host); assert.equal(h.q('.x-extra'), node, 'cùng một nút DOM');
    });
    itApp('đổi vai trò sang Nhân viên: hủy phần bổ sung; đổi lại Quản lý: gắn lại', async function () {
      var x = extras(), h = mountApp({ session: MGR, homeExtras: x.fn }); h.openMenu(); h.pickRole(h.menu(), 'nhan_vien'); h.pickWho(h.menu(), 'nv1'); h.q('[data-act="apply"]').click(); assert.equal(x.log.destroys.length, 1); assert.equal(h.q('.x-extra'), null);
      h.openMenu(); h.pickRole(h.menu(), 'quan_ly'); h.q('[data-act="apply"]').click(); assert.equal(x.log.mounts.length, 2); assert.ok(h.q('.x-extra'));
    });
    itApp('homeExtras ném lỗi: Trang chủ vẫn hiển thị đầy đủ, vùng bổ sung trống', async function () {
      var h = mountApp({ session: MGR, homeExtras: function () { throw new Error('hỏng'); } }); assert.equal(h.text('[data-role="greeting"]'), 'Xin chào, Quản lý'); assert.ok(h.q('[data-short="duyet"]')); assert.equal(h.q('[data-role="home-extras"]').innerHTML, '');
      h.dataChanged('entry'); assert.ok(h.q('[data-short="duyet"]'));
    });
    itApp('destroy khung cũng hủy phần bổ sung; trả về không có destroy cũng không lỗi', async function () {
      var x = extras(), h = mountApp({ session: MGR, homeExtras: x.fn }); h.app.destroy(); assert.equal(x.log.destroys.length, 1);
      var g = mountApp({ session: MGR, homeExtras: function () { return undefined; } }); g.link('duyet').click(); assert.equal(g.route(), 'duyet');
    });
  });

  describe('không va chạm tên với module con', function () {
    function clashModules(log) {
      var m = stubModules(log);
      ['duyet', 'nhap-lieu'].forEach(function (n) { m[n] = { mount: function (el) { el.innerHTML = '<h1>x</h1><div data-role="toast" class="mod-toast"></div><div data-role="banner" class="mod-banner" hidden></div><button data-act="cancel" class="mod-cancel">h</button>'; return { destroy: function () {} }; } }; });
      return m;
    }
    itApp('toast của khung không bị ghi nhầm vào toast của module con (cùng data-role)', async function () {
      var h = mountApp({ session: MGR, modules: clashModules({ mounts: [], destroys: [] }) }); h.link('duyet').click(); h.app.toast('Thông báo của khung');
      assert.equal(h.toastText(), 'Thông báo của khung'); assert.equal(h.q('.mod-toast').textContent, ''); h.link('thong-ke').click(); assert.equal(h.toastText(), 'Thông báo của khung', 'toast vẫn còn sau khi module con bị gỡ');
    });
    itApp('thông báo "bị chặn" hiện đúng dù module con đang mở có toast riêng', async function () {
      var h = mountApp({ session: E1, modules: clashModules({ mounts: [], destroys: [] }) }); h.link('nhap-lieu').click(); h.nav.push('/duyet'); assert.equal(h.toastText(), 'Trang này dành cho Quản lý.');
    });
    itApp('banner hệ thống của khung không bị lẫn với banner của module con', async function () {
      var st = makeStorage({ session: MGR }); st.failSet = true; var h = mountApp({ storage: st, modules: clashModules({ mounts: [], destroys: [] }) }); h.link('duyet').click(); assert.equal(h.banner(), 'blocked'); assert.equal(h.q('.mod-banner').hidden, true);
    });
    itApp('nút của module con trùng tên data-act (cancel) không kích hoạt hành động của khung', async function () {
      var h = mountApp({ session: MGR, modules: clashModules({ mounts: [], destroys: [] }) }); h.link('duyet').click(); h.q('.mod-cancel').click(); assert.equal(h.route(), 'duyet'); assert.equal(h.menu(), null);
    });
  });

  describe('lỗi khi tải màn hình con', function () {
    itApp('module ném lỗi khi mount: khối lỗi + Thử lại, các màn khác vẫn dùng được', async function () {
      var log = { mounts: [], destroys: [] }, m = stubModules(log), fail = true, ok = m.duyet.mount;
      m.duyet = { mount: function (el, ctx) { if (fail) throw new Error('hỏng'); return ok(el, ctx); } };
      var h = mountApp({ session: MGR, modules: m }); h.link('duyet').click();
      assert.equal(h.q('[data-role="load-error"]').getAttribute('role'), 'alert'); assert.match(h.text('[data-role="load-error"]'), /Không tải được màn hình/); assert.equal(h.text('[data-role="load-error"] h1'), 'Duyệt đề nghị');
      h.link('thong-ke').click(); assert.equal(h.route(), 'thong-ke'); assert.ok(h.q('.stub-h')); h.link('duyet').click(); fail = false; h.q('[data-act="retry-route"]').click(); assert.equal(h.text('.stub-h'), 'Màn duyet'); assert.equal(h.q('[data-role="load-error"]'), null);
    });
    itApp('thiếu module trong danh bạ định tuyến: khối lỗi, không sập', async function () {
      var h = mountApp({ session: MGR, modules: {} }); h.link('duyet').click(); assert.ok(h.q('[data-role="load-error"]')); assert.equal(h.route(), 'duyet'); assert.ok(h.q('.app-nav'));
    });
    itApp('module ném lỗi khi destroy: khung vẫn chuyển màn được', async function () {
      var log = { mounts: [], destroys: [] }, m = stubModules(log); m.duyet = { mount: function (el) { el.innerHTML = '<h1>x</h1>'; return { destroy: function () { throw new Error('destroy lỗi'); } }; } };
      var h = mountApp({ session: MGR, modules: m }); h.link('duyet').click(); h.link('thong-ke').click(); assert.equal(h.route(), 'thong-ke'); assert.ok(h.q('.stub-h'));
    });
    itApp('module không trả về điều khiển (undefined): vẫn chuyển màn được', async function () {
      var m = { duyet: { mount: function (el) { el.innerHTML = '<h1>x</h1>'; } }, 'thong-ke': stubModules({ mounts: [], destroys: [] })['thong-ke'] };
      var h = mountApp({ session: MGR, modules: m }); h.link('duyet').click(); h.link('thong-ke').click(); assert.equal(h.route(), 'thong-ke');
    });
  });

  describe('menu đổi vai trò (DESIGN 10.2)', function () {
    itApp('chip có nhãn đọc được; bấm mở menu (hộp thoại), chip aria-expanded = true', async function () {
      var h = mountApp({ session: E1 }); assert.equal(h.q('.app-chip').getAttribute('aria-haspopup'), 'dialog'); assert.equal(h.q('.app-chip').getAttribute('aria-expanded'), 'false'); assert.match(h.q('.app-chip').getAttribute('aria-label'), /Vai trò hiện tại: Nguyễn Văn An/);
      h.openMenu(); assert.ok(h.menu()); assert.equal(h.q('.app-chip').getAttribute('aria-expanded'), 'true'); var d = h.q('.app-menu'); assert.equal(d.getAttribute('role'), 'dialog'); assert.equal(d.getAttribute('aria-modal'), 'true'); assert.ok(document.getElementById(d.getAttribute('aria-labelledby')));
    });
    itApp('menu chọn sẵn vai trò và tên hiện tại; Áp dụng bị khóa; có dòng nhắc "không phải đăng nhập"', async function () {
      var h = mountApp({ session: E1 }); h.openMenu();
      assert.equal(h.menu().querySelector('input:checked').value, 'nhan_vien'); assert.equal(h.menu().querySelector('[data-role="who"]').value, 'nv1'); assert.equal(h.q('[data-act="apply"]').disabled, false, 'đã hợp lệ sẵn');
      assert.match(h.text('.app-menu .app-hint'), /Chọn vai trò chỉ thay đổi giao diện, không phải đăng nhập\./);
      h.pickWho(h.menu(), ''); assert.equal(h.q('[data-act="apply"]').disabled, true);
    });
    itApp('Esc đóng menu và trả focus về chip', async function () {
      var h = mountApp({ session: MGR }); h.q('.app-chip').focus(); h.openMenu(); esc(); assert.equal(h.menu(), null); assert.equal(document.activeElement, h.q('.app-chip')); assert.equal(h.q('.app-chip').getAttribute('aria-expanded'), 'false');
    });
    itApp('bấm ra ngoài, nút Đóng, hoặc bấm chip lần nữa đều đóng menu', async function () {
      var h = mountApp({ session: MGR }); h.openMenu(); h.menu().dispatchEvent(new MouseEvent('click', { bubbles: true })); assert.equal(h.menu(), null);
      h.openMenu(); h.q('[data-act="menu-close"]').click(); assert.equal(h.menu(), null); h.openMenu(); h.q('.app-chip').dispatchEvent(new MouseEvent('click', { bubbles: true })); assert.equal(h.menu(), null);
    });
    itApp('đổi Quản lý → Nhân viên: lưu phiên, về Trang chủ, thanh điều hướng và chip đổi, có toast', async function () {
      var h = mountApp({ session: MGR }); h.link('duyet').click(); h.openMenu(); h.pickRole(h.menu(), 'nhan_vien'); assert.equal(h.q('[data-act="apply"]').disabled, true); h.pickWho(h.menu(), 'nv3'); h.q('[data-act="apply"]').click();
      assert.deepEqual(h.session(), { vaiTro: 'nhan_vien', nhanVienId: 'nv3' }); assert.equal(h.route(), 'home'); assert.equal(h.menu(), null); assert.deepEqual(h.navLabels(), ['Trang chủ', 'Thống kê', 'Thêm']); assert.equal(h.text('[data-role="chip-name"]'), 'Lê Hoàng Cường');
      assert.equal(h.toastText(), 'Đang dùng với vai trò Lê Hoàng Cường'); assert.equal(h.text('[data-role="greeting"]'), 'Xin chào, Lê Hoàng Cường'); assert.deepEqual(h.log.destroys, ['duyet']);
    });
    itApp('đổi Nhân viên → Quản lý', async function () {
      var h = mountApp({ session: E1 }); h.openMenu(); h.pickRole(h.menu(), 'quan_ly'); h.q('[data-act="apply"]').click();
      assert.deepEqual(h.session(), MGR); assert.deepEqual(h.navLabels(), ['Trang chủ', 'Thống kê', 'Duyệt', 'Nhân viên']); assert.equal(h.toastText(), 'Đang dùng với vai trò Quản lý'); assert.equal(h.text('[data-role="chip-name"]'), 'Quản lý');
    });
    itApp('đổi sang người khác trong cùng vai trò Nhân viên', async function () {
      var h = mountApp({ session: E1 }); h.openMenu(); h.pickWho(h.menu(), 'nv2'); h.q('[data-act="apply"]').click(); assert.equal(h.session().nhanVienId, 'nv2'); assert.equal(h.text('[data-role="chip-name"]'), 'Trần Thị Bình');
    });
    itApp('áp dụng khi đang ở Trang chủ: vẫn làm mới nội dung theo vai trò mới', async function () {
      var h = mountApp({ session: MGR }); assert.ok(h.q('[data-short="duyet"]')); h.openMenu(); h.pickRole(h.menu(), 'nhan_vien'); h.pickWho(h.menu(), 'nv1'); h.q('[data-act="apply"]').click(); assert.equal(h.q('[data-short="duyet"]'), null); assert.ok(h.q('[data-short="nhap-lieu"]'));
    });
    itApp('menu khi chưa có nhân viên: ô chọn bị khóa, chỉ áp dụng được Quản lý', async function () {
      var h = mountApp({ session: MGR, nhanVien: [] }); h.openMenu(); h.pickRole(h.menu(), 'nhan_vien'); assert.equal(h.menu().querySelector('[data-role="who"]').disabled, true); assert.equal(h.q('[data-act="apply"]').disabled, true);
    });
    itApp('focus được giữ trong menu khi bấm Tab / Shift+Tab', async function () {
      var h = mountApp({ session: MGR }); h.openMenu(); var f = h.qa('.app-menu input, .app-menu select:not([disabled]), .app-menu button:not([disabled])').filter(function (x) { return x.offsetParent !== null; }), first = f[0], last = f[f.length - 1];
      last.focus(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); assert.equal(document.activeElement, first);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })); assert.equal(document.activeElement, last);
    });
    itApp('chuyển màn khi menu đang mở sẽ đóng menu', async function () { var h = mountApp({ session: MGR }); h.openMenu(); h.nav.push('/thong-ke'); assert.equal(h.menu(), null); });
  });

  describe('huy hiệu số khoản chờ duyệt (13.2)', function () {
    itApp('Quản lý: hiện số khoản chờ ở MỌI tháng; có nhãn đọc được', async function () {
      var h = mountApp({ session: MGR }); assert.equal(h.badge(), '3'); assert.equal(h.link('duyet').getAttribute('aria-label'), 'Duyệt, 3 khoản chờ duyệt');
    });
    itApp('không có khoản chờ: ẩn huy hiệu', async function () { var h = mountApp({ session: MGR, deNghi: [req({ tt: 'da_duyet' })] }); assert.equal(h.badge(), ''); assert.equal(h.link('duyet').getAttribute('aria-label'), 'Duyệt'); });
    itApp('trên 99: hiện 99+', async function () { var many = []; for (var i = 0; i < 120; i++) many.push(req({ tt: 'cho_duyet' })); assert.equal(mountApp({ session: MGR, deNghi: many }).badge(), '99+'); });
    itApp('Nhân viên không có mục Duyệt nên không có huy hiệu', async function () { var h = mountApp({ session: E1 }); assert.equal(h.q('[data-role="nav-badge"]'), null); });
    itApp('cập nhật khi module khác báo dữ liệu đổi (dnc:data-changed)', async function () {
      var h = mountApp({ session: MGR }); var all = JSON.parse(h.storage.m[K.DN]); all.push(req({ tt: 'cho_duyet' })); h.storage.m[K.DN] = JSON.stringify(all); h.dataChanged('entry'); assert.equal(h.badge(), '4');
      all = all.filter(function (x) { return x.trangThai !== 'cho_duyet'; }); h.storage.m[K.DN] = JSON.stringify(all); h.dataChanged('review'); assert.equal(h.badge(), '');
    });
    itApp('cập nhật qua ctx.notifyChanged và khi có sự kiện storage từ tab khác', async function () {
      var h = mountApp({ session: MGR }); h.link('duyet').click(); var all = JSON.parse(h.storage.m[K.DN]); all.push(req({ tt: 'cho_duyet' })); h.storage.m[K.DN] = JSON.stringify(all);
      h.log.mounts[0].ctx.notifyChanged(); assert.equal(h.badge(), '4'); all.pop(); h.storage.m[K.DN] = JSON.stringify(all); window.dispatchEvent(new Event('storage')); assert.equal(h.badge(), '3');
    });
    itApp('dữ liệu đề nghị hỏng: huy hiệu ẩn, không ném lỗi', async function () { var st = makeStorage({ session: MGR }); st.m[K.DN] = '{hỏng'; assert.equal(mountApp({ storage: st }).badge(), ''); });
  });

  describe('Trang chủ điều hướng (DESIGN 13.4)', function () {
    itApp('Quản lý: lời chào, ba thẻ tổng quan tháng đúng số liệu', async function () {
      var h = mountApp({ session: MGR });
      assert.equal(h.text('[data-role="greeting"]'), 'Xin chào, Quản lý'); assert.match(h.text('.app-lead'), /vai trò Quản lý.*tháng 11\/2026/);
      assert.equal(h.text('[data-role="kpi-pending"]'), '820.000 ₫'); assert.match(h.text('[data-kpi="pending"] .app-kpi-sub'), /^2 khoản · còn 1 khoản ở tháng khác$/);
      assert.equal(h.text('[data-role="kpi-approved"]'), '2.400.000 ₫'); assert.equal(h.text('[data-kpi="approved"] .app-kpi-sub'), '2 khoản'); assert.equal(h.text('[data-role="kpi-rejected"]'), '1 khoản'); assert.equal(h.text('[data-kpi="rejected"] .app-kpi-sub'), 'tổng 900.000 ₫');
    });
    itApp('Quản lý: thẻ Chờ duyệt là liên kết tới #/duyet; hai thẻ còn lại không phải liên kết', async function () {
      var h = mountApp({ session: MGR }); assert.equal(h.q('[data-kpi="pending"]').tagName, 'A'); assert.equal(h.q('[data-kpi="pending"]').getAttribute('href'), '#/duyet'); assert.equal(h.q('[data-kpi="approved"]').tagName, 'ARTICLE');
      h.q('[data-kpi="pending"]').click(); assert.equal(h.route(), 'duyet');
    });
    itApp('Quản lý: lối tắt Duyệt (kèm huy hiệu, nổi bật khi còn khoản chờ), Thống kê, Nhân viên', async function () {
      var h = mountApp({ session: MGR }); assert.deepEqual(h.qa('[data-short]').map(function (a) { return a.getAttribute('data-short'); }), ['duyet', 'thong-ke', 'nhan-vien']);
      assert.equal(h.text('[data-role="home-badge"]'), '3'); assert.ok(h.q('[data-short="duyet"]').classList.contains('is-hot')); assert.equal(h.q('[data-short="thong-ke"]').classList.contains('is-hot'), false);
      assert.deepEqual(h.qa('[data-short]').map(function (a) { return a.getAttribute('href'); }), ['#/duyet', '#/thong-ke', '#/nhan-vien']);
    });
    itApp('Quản lý không còn khoản chờ: lối tắt Duyệt không nổi bật, không có huy hiệu', async function () {
      var h = mountApp({ session: MGR, deNghi: [] }); assert.equal(h.q('[data-role="home-badge"]'), null); assert.equal(h.q('[data-short="duyet"]').classList.contains('is-hot'), false); assert.equal(h.text('[data-role="kpi-pending"]'), '0 ₫');
    });
    itApp('Nhân viên: số liệu CHỈ của mình; lối tắt Thêm (nổi bật) và Thống kê của tôi', async function () {
      var h = mountApp({ session: E1 });
      assert.equal(h.text('[data-role="greeting"]'), 'Xin chào, Nguyễn Văn An'); assert.equal(h.text('[data-role="kpi-pending"]'), '720.000 ₫'); assert.equal(h.text('[data-role="kpi-approved"]'), '450.000 ₫'); assert.equal(h.text('[data-role="kpi-rejected"]'), '0 khoản');
      assert.equal(h.q('[data-kpi="pending"]').tagName, 'ARTICLE'); assert.deepEqual(h.qa('[data-short]').map(function (a) { return a.getAttribute('data-short'); }), ['nhap-lieu', 'thong-ke']); assert.ok(h.q('[data-short="nhap-lieu"]').classList.contains('is-hot')); assert.match(h.text('[data-short="thong-ke"] strong'), /Thống kê của tôi/);
    });
    itApp('Nhân viên khác thấy số liệu khác (không lẫn người khác)', async function () {
      var h = mountApp({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv2' } }); assert.equal(h.text('[data-role="kpi-pending"]'), '100.000 ₫'); assert.equal(h.text('[data-role="kpi-approved"]'), '1.950.000 ₫'); assert.equal(h.text('[data-role="kpi-rejected"]'), '1 khoản');
    });
    itApp('bấm lối tắt mở đúng màn', async function () { var h = mountApp({ session: MGR }); h.q('[data-short="nhan-vien"]').click(); assert.equal(h.route(), 'nhan-vien'); h.q('.app-brand').click(); h.q('[data-short="thong-ke"]').click(); assert.equal(h.route(), 'thong-ke'); });
    itApp('Trang chủ tự làm mới khi dữ liệu đổi; không mount lại module nào', async function () {
      var h = mountApp({ session: MGR }); var all = JSON.parse(h.storage.m[K.DN]); all.push(req({ tt: 'da_duyet', dg: 50000 })); h.storage.m[K.DN] = JSON.stringify(all); h.dataChanged('entry');
      assert.equal(h.text('[data-role="kpi-approved"]'), '2.450.000 ₫'); assert.equal(h.log.mounts.length, 0);
    });
    itApp('Trang chủ trống (chưa có dữ liệu): các thẻ bằng 0, không lỗi', async function () {
      var h = mountApp({ session: MGR, nhanVien: null, deNghi: null }); assert.equal(h.text('[data-role="kpi-approved"]'), '0 ₫'); assert.equal(h.text('[data-role="kpi-rejected"]'), '0 khoản');
    });
    itApp('khi nhân viên đang dùng bị ngưng ở nơi khác: tự về Chọn vai trò kèm thông báo, xóa phiên', async function () {
      var h = mountApp({ session: E1 }); h.link('thong-ke').click(); var all = JSON.parse(h.storage.m[K.NV]); all[0].hoatDong = false; h.storage.m[K.NV] = JSON.stringify(all); h.dataChanged('employees');
      assert.equal(h.route(), 'vai-tro'); assert.equal(h.session(), null); assert.match(h.toastText(), /không còn hoạt động/); assert.deepEqual(h.log.destroys, ['thong-ke']); assert.equal(h.q('.app-nav'), null);
    });
    itApp('đổi tên nhân viên ở nơi khác: chip cập nhật ngay', async function () {
      var h = mountApp({ session: E1 }); var all = JSON.parse(h.storage.m[K.NV]); all[0].hoTen = 'Nguyễn Văn Ân'; h.storage.m[K.NV] = JSON.stringify(all); h.dataChanged('employees'); assert.equal(h.text('[data-role="chip-name"]'), 'Nguyễn Văn Ân');
    });
  });

  describe('banner hệ thống và đặt lại dữ liệu (DESIGN 13.5)', function () {
    itApp('lần đầu: hiện nhắc "chỉ lưu trên trình duyệt này" ở Chọn vai trò và Trang chủ', async function () {
      var h = mountApp({ ack: false }); assert.equal(h.banner(), 'notice'); assert.match(h.text('[data-role="banner"]'), /Dữ liệu chỉ lưu trên trình duyệt này, không chia sẻ giữa các máy\./); assert.equal(h.q('[data-role="banner"]').getAttribute('role'), 'status');
      h.enterAs('quan_ly'); assert.equal(h.banner(), 'notice');
    });
    itApp('không hiện nhắc ở các màn khác', async function () { var h = mountApp({ ack: false, session: MGR }); h.link('duyet').click(); assert.equal(h.banner(), null); h.link('home').click(); assert.equal(h.banner(), 'notice'); });
    itApp('"Đã hiểu": ẩn và nhớ lựa chọn cho lần sau', async function () {
      var h = mountApp({ ack: false, session: MGR }); h.q('[data-act="ack"]').click(); assert.equal(h.banner(), null); assert.equal(h.storage.m[K.ACK], '1'); var g = mountApp({ storage: h.storage }); assert.equal(g.banner(), null);
    });
    itApp('bị chặn lưu trữ: cảnh báo "mất khi đóng tab", không đóng được, hiện ở mọi màn', async function () {
      var st = makeStorage({ session: MGR }); st.failSet = true; var h = mountApp({ storage: st });
      assert.equal(h.banner(), 'blocked'); assert.match(h.text('[data-role="banner"]'), /Dữ liệu sẽ mất khi đóng tab/); assert.equal(h.q('[data-role="banner"] button'), null); h.link('duyet').click(); assert.equal(h.banner(), 'blocked');
    });
    itApp('dữ liệu hỏng: banner lỗi (role alert) + nút Đặt lại dữ liệu, hiện ở mọi màn, ưu tiên hơn các banner khác', async function () {
      var st = makeStorage({ session: MGR, ack: false }); st.m[K.DN] = '{hỏng'; st.failSet = true; var h = mountApp({ storage: st });
      assert.equal(h.banner(), 'corrupt'); assert.equal(h.q('[data-role="banner"]').getAttribute('role'), 'alert'); assert.match(h.text('[data-role="banner"]'), /Không đọc được dữ liệu đã lưu/); assert.ok(h.q('[data-act="reset-open"]')); h.link('thong-ke').click(); assert.equal(h.banner(), 'corrupt');
    });
    itApp('khi hỏng dữ liệu, số liệu Trang chủ và huy hiệu không ném lỗi', async function () { var st = makeStorage({ session: MGR }); st.m[K.NV] = 'x'; st.m[K.DN] = 'y'; var h = mountApp({ storage: st }); assert.equal(h.text('[data-role="kpi-approved"]'), '0 ₫'); });
    itApp('hộp thoại đặt lại: nút Xóa toàn bộ khóa đến khi gõ đúng XÓA (không phân biệt hoa/thường)', async function () {
      var st = makeStorage({ session: MGR }); st.m[K.DN] = '{hỏng'; var h = mountApp({ storage: st }); h.q('[data-act="reset-open"]').click();
      var d = h.q('[data-role="reset-overlay"] .app-dialog'); assert.equal(d.getAttribute('role'), 'dialog'); assert.equal(h.text('.app-dtitle'), 'Xóa toàn bộ dữ liệu?'); assert.match(h.text('.app-msg'), /Toàn bộ nhân viên và đề nghị sẽ bị xóa, không hoàn tác được\./);
      var inp = h.q('[data-role="reset-input"]'), ok = h.q('[data-act="reset-ok"]'); assert.equal(document.activeElement, inp); assert.equal(ok.disabled, true);
      [['xo', true], ['XÓ', true], ['XOA', true], ['XÓAA', true], ['', true]].forEach(function (c) { inp.value = c[0]; inp.dispatchEvent(new Event('input', { bubbles: true })); assert.equal(ok.disabled, c[1], c[0]); });
      inp.value = 'xóa'; inp.dispatchEvent(new Event('input', { bubbles: true })); assert.equal(ok.disabled, false); inp.value = ' XÓA '; inp.dispatchEvent(new Event('input', { bubbles: true })); assert.equal(ok.disabled, false);
    });
    itApp('xác nhận đặt lại: xóa danh bạ, đề nghị và phiên; về Chọn vai trò; banner hỏng biến mất; toast', async function () {
      var st = makeStorage({ session: MGR }); st.m[K.DN] = '{hỏng'; var h = mountApp({ storage: st }); h.q('[data-act="reset-open"]').click(); var inp = h.q('[data-role="reset-input"]'); inp.value = 'XÓA'; inp.dispatchEvent(new Event('input', { bubbles: true })); h.q('[data-act="reset-ok"]').click();
      assert.equal(st.m[K.NV], undefined); assert.equal(st.m[K.DN], undefined); assert.equal(h.session(), null); assert.equal(h.route(), 'vai-tro'); assert.equal(h.banner(), null); assert.equal(h.toastText(), 'Đã xóa toàn bộ dữ liệu'); assert.equal(h.q('[data-role="reset-overlay"]'), null); assert.equal(st.m[K.ACK], '1', 'giữ lựa chọn "Đã hiểu"');
    });
    itApp('Hủy / Esc / bấm ra ngoài hộp thoại đặt lại: không xóa gì, trả focus về nút đã mở', async function () {
      var st = makeStorage({ session: MGR }); st.m[K.NV] = 'x'; var h = mountApp({ storage: st }), b = h.q('[data-act="reset-open"]'); b.focus(); b.click(); h.q('[data-act="reset-cancel"]').click();
      assert.equal(h.q('[data-role="reset-overlay"]'), null); assert.equal(document.activeElement, b); assert.equal(st.m[K.NV], 'x');
      b.click(); esc(); assert.equal(h.q('[data-role="reset-overlay"]'), null); b.click(); h.q('[data-role="reset-overlay"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); assert.equal(h.q('[data-role="reset-overlay"]'), null); assert.equal(st.m[K.NV], 'x');
    });
    itApp('ép bấm Xóa khi chưa gõ đúng (phát click thẳng) cũng không xóa', async function () {
      var st = makeStorage({ session: MGR }); st.m[K.DN] = 'x'; var h = mountApp({ storage: st }); h.q('[data-act="reset-open"]').click(); var ok = h.q('[data-act="reset-ok"]'); ok.disabled = false; ok.click(); assert.equal(st.m[K.DN], 'x'); assert.ok(h.q('[data-role="reset-overlay"]'));
    });
  });

  describe('vòng đời và địa chỉ thật (hashchange)', function () {
    itApp('destroy gỡ giao diện, hủy module, gỡ mọi listener (địa chỉ, dữ liệu, storage)', async function () {
      var h = mountApp({ session: MGR }); h.link('duyet').click(); assert.equal(h.nav.listeners(), 1); var btn = h.link('thong-ke');
      h.app.destroy(); assert.equal(h.box.innerHTML, ''); assert.deepEqual(h.log.destroys, ['duyet']); assert.equal(h.nav.listeners(), 0);
      btn.click(); h.nav.push('/thong-ke'); h.dataChanged(); window.dispatchEvent(new Event('storage')); esc(); assert.equal(h.log.mounts.length, 1); assert.equal(h.app.getState().destroyed, true);
    });
    itApp('khởi động lại sau destroy trên cùng vùng chứa không nhân đôi listener', async function () {
      var st = makeStorage({ session: MGR }), box = document.createElement('div'); document.body.appendChild(box), n = 0;
      for (var i = 0; i < 3; i++) DncApp.start(box, { storage: st, nav: memNav('/'), modules: stubModules({ mounts: [], destroys: [] }), today: TODAY }).destroy();
      var log = { mounts: [], destroys: [] }, nav = memNav('/'), a = DncApp.start(box, { storage: st, nav: nav, modules: stubModules(log), today: TODAY }); box.querySelector('[data-nav="duyet"]').click(); assert.equal(log.mounts.length, 1); assert.equal(nav.listeners(), 1); a.destroy(); box.remove();
    });
    itApp('hashNav mặc định: đọc, ghi (push/replace) và lắng nghe hashchange trên cửa sổ giả', async function () {
      var calls = [], ls = [], win = { location: { hash: '#/duyet', replace: function (h) { calls.push(['replace', h]); win.location.hash = h; } }, addEventListener: function (t, f) { ls.push([t, f]); }, removeEventListener: function (t, f) { ls = ls.filter(function (x) { return x[1] !== f; }); } };
      var nv = DncApp.hashNav(win); assert.equal(nv.get(), '/duyet'); win.location.hash = ''; assert.equal(nv.get(), '/'); win.location.hash = '#'; assert.equal(nv.get(), '/');
      nv.set('/thong-ke'); assert.equal(win.location.hash, '#/thong-ke'); nv.set('/', { replace: true }); assert.deepEqual(calls, [['replace', '#/']]);
      var fired = 0, off = nv.listen(function () { fired++; }); assert.equal(ls.length, 1); assert.equal(ls[0][0], 'hashchange'); ls[0][1](); assert.equal(fired, 1); off(); assert.equal(ls.length, 0);
    });
    itApp('chạy với hashNav + cửa sổ giả: đổi hash giả rồi phát hashchange thì khung chuyển màn', async function () {
      var ls = [], win = { location: { hash: '#/', replace: function (h) { win.location.hash = h; } }, addEventListener: function (t, f) { ls.push(f); }, removeEventListener: function () {} };
      var h = mountApp({ session: MGR, nav: DncApp.hashNav(win) }); win.location.hash = '#/duyet'; ls.forEach(function (f) { f(); }); assert.equal(h.route(), 'duyet'); h.link('thong-ke').click(); assert.equal(win.location.hash, '#/thong-ke'); assert.equal(h.route(), 'thong-ke');
    });
    itApp('đồng bộ: gọi navigate từ bên ngoài', async function () { var h = mountApp({ session: MGR }); h.app.navigate('/nhan-vien'); assert.equal(h.route(), 'nhan-vien'); h.app.navigate('/duyet', { replace: true }); assert.equal(h.route(), 'duyet'); assert.equal(h.nav.sets[h.nav.sets.length - 1].replace, true); });
  });
})();
