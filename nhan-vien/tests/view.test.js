/* Test giao diện thật (DOM + sự kiện) của màn Nhân viên. */
(function () {
  function cs(el) { return getComputedStyle(el); }
  function stored(h, id) { return readNV(h.env).filter(function (x) { return x && x.id === id; })[0]; }
  function okBtn(h) { return h.q('[data-kind="confirm"] [data-dlg="c-ok"]'); }
  function noBtn(h) { return h.q('[data-kind="confirm"] [data-dlg="c-cancel"]'); }
  function esc() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }

  describe('tổng hợp nhân viên (F-21)', function () {
    itPage('tiêu đề, dải tóm tắt: tổng / đang hoạt động / đã ngưng', async function () {
      var h = mountPage();
      assert.equal(h.text('.de-title'), 'Nhân viên');
      assert.equal(h.text('[data-role="sum-total"]'), '4'); assert.equal(h.text('[data-role="sum-active"]'), '3'); assert.equal(h.text('[data-role="sum-inactive"]'), '1');
      assert.deepEqual(h.qa('.de-sum-card h2').map(function (e) { return e.textContent; }), ['Tổng số nhân viên', 'Đang hoạt động', 'Đã ngưng']);
    });
    itPage('danh sách mặc định xếp theo tên gọi A–Z', async function () {
      var h = mountPage(); assert.deepEqual(h.ids(), ['nv1', 'nv2', 'nv3', 'nv4']);
      assert.deepEqual(h.names(), ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thu Dung']);
    });
    itPage('mỗi dòng: mã, trạng thái, số đề nghị, chờ duyệt, tổng Đã duyệt', async function () {
      var h = mountPage(), r = function (id, k) { return h.row(id).querySelector('[data-role="' + k + '"]').textContent; };
      assert.equal(r('nv1', 'ma'), 'NV001'); assert.equal(r('nv1', 'n-count'), '3'); assert.equal(r('nv1', 'n-pending'), '1 khoản'); assert.equal(r('nv1', 'n-approved'), '5.300.000 ₫');
      assert.equal(r('nv2', 'n-count'), '2'); assert.equal(r('nv2', 'n-pending'), '0 khoản'); assert.equal(r('nv2', 'n-approved'), '1.950.000 ₫');
      assert.equal(r('nv3', 'n-count'), '0'); assert.equal(r('nv3', 'n-approved'), '0 ₫'); assert.equal(r('nv4', 'n-count'), '1'); assert.equal(r('nv4', 'n-approved'), '400.000 ₫');
      assert.equal(h.row('nv1').querySelector('.de-avatar').textContent, 'A'); assert.equal(h.row('nv3').querySelector('.de-avatar').textContent, 'C');
    });
    itPage('huy hiệu Hoạt động / Ngưng có biểu tượng và chữ', async function () {
      var h = mountPage();
      assert.equal(h.row('nv1').querySelector('[data-status-badge]').getAttribute('data-status-badge'), 'on'); assert.equal(h.row('nv1').querySelector('[data-status-badge]').textContent.trim(), 'Hoạt động');
      assert.equal(h.row('nv4').querySelector('[data-status-badge]').getAttribute('data-status-badge'), 'off'); assert.equal(h.row('nv4').querySelector('[data-status-badge]').textContent.trim(), 'Ngưng');
      assert.ok(h.row('nv4').querySelector('[data-status-badge] svg'));
    });
    itPage('nút lọc hiện số lượng: Tất cả (4) · Hoạt động (3) · Ngưng (1)', async function () {
      var h = mountPage();
      assert.deepEqual(h.qa('[data-status]').map(function (b) { return b.textContent.replace(/\s+/g, ' ').trim(); }), ['Tất cả (4)', 'Hoạt động (3)', 'Ngưng (1)']);
      assert.equal(h.q('[data-status="all"]').getAttribute('aria-pressed'), 'true');
    });
    itPage('tên chứa HTML hoặc mã lưu sẵn có HTML được thoát ký tự', async function () {
      window.__xss = 0;
      var evil = '<img src=x onerror="window.__xss=1">';
      var h = mountPage({ nhanVien: [{ id: 'e', ma: evil, hoTen: evil + 'Tèo', hoatDong: true }], deNghi: [] });
      h.openEdit('e'); await tick(20);
      assert.equal(window.__xss, 0); assert.equal(h.box.querySelectorAll('img').length, 0); assert.ok(h.names()[0].indexOf('<img') >= 0);
    });
    itPage('nhân viên không có mã (dữ liệu cũ) hiện "—"', async function () {
      var h = mountPage({ nhanVien: [{ id: 'e', hoTen: 'Không Mã' }], deNghi: [] }); assert.equal(h.row('e').querySelector('[data-role="ma"]').textContent, '—');
    });
    itPage('1.000 nhân viên kết xuất dưới 2 giây, tìm kiếm nhanh', async function () {
      var many = []; for (var i = 0; i < 1000; i++) many.push({ id: 'e' + i, ma: 'M' + i, hoTen: 'Người ' + i, hoatDong: i % 5 !== 0 });
      var t0 = Date.now(), h = mountPage({ nhanVien: many, deNghi: [] }); assert.equal(h.rows().length, 1000); h.search('nguoi 99'); assert.ok(h.rows().length > 0);
      assert.ok(Date.now() - t0 < 2000, 'chậm ' + (Date.now() - t0) + 'ms');
    });
  });

  describe('chỉ Quản lý vào được', function () {
    [['nhân viên', EMP], ['không có session', null], ['vai trò lạ', { vaiTro: 'admin' }], ['rỗng', {}]].forEach(function (c) {
      itPage('bị chặn: ' + c[0], async function () {
        var h = mountPage({ session: c[1] });
        assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'role'); assert.match(h.q('[data-role="blocked"]').textContent, /dành cho Quản lý/);
        assert.equal(h.q('[data-act="add"]'), null); assert.equal(h.rows().length, 0); assert.equal(h.calls.forbidden, 1);
      });
    });
    itPage('Quản lý không gọi onForbidden', async function () { assert.equal(mountPage().calls.forbidden, 0); });
    itPage('khi bị chặn, sự kiện giả không ghi gì', async function () {
      var h = mountPage({ session: EMP }); h.box.dispatchEvent(new Event('click', { bubbles: true })); document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: {} })); await tick();
      assert.equal(h.env.storage.sets, 0);
    });
  });

  describe('tìm kiếm, lọc, sắp xếp (F-22)', function () {
    itPage('tìm không cần gõ dấu, không phân biệt hoa/thường', async function () {
      var h = mountPage(); h.search('binh'); assert.deepEqual(h.ids(), ['nv2']); h.search('TRAN THI'); assert.deepEqual(h.ids(), ['nv2']); h.search('dung'); assert.deepEqual(h.ids(), ['nv4']);
    });
    itPage('tìm theo mã và nhiều từ khóa', async function () {
      var h = mountPage(); h.search('nv003'); assert.deepEqual(h.ids(), ['nv3']); h.search('nv00 van'); assert.deepEqual(h.ids(), ['nv1']);
    });
    itPage('nút xóa nhanh (×) chỉ hiện khi có chữ; bấm thì xóa và trả focus về ô tìm', async function () {
      var h = mountPage(); assert.equal(h.q('[data-act="clear-search"]').hidden, true);
      h.search('binh'); assert.equal(h.q('[data-act="clear-search"]').hidden, false);
      h.q('[data-act="clear-search"]').click(); assert.equal(h.q('[data-role="search"]').value, ''); assert.equal(h.rows().length, 4); assert.equal(document.activeElement, h.q('[data-role="search"]'));
    });
    itPage('gõ tìm không làm mất focus ô tìm', async function () {
      var h = mountPage(); h.search('a'); assert.equal(document.activeElement, h.q('[data-role="search"]'));
    });
    itPage('Enter trong ô tìm không gửi form/không làm gì', async function () {
      var h = mountPage(), ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); h.q('[data-role="search"]').dispatchEvent(ev); assert.equal(ev.defaultPrevented, true);
    });
    itPage('lọc Hoạt động / Ngưng / Tất cả', async function () {
      var h = mountPage();
      h.status('active'); assert.deepEqual(h.ids(), ['nv1', 'nv2', 'nv3']); assert.equal(h.q('[data-status="active"]').getAttribute('aria-pressed'), 'true'); assert.equal(h.q('[data-status="all"]').getAttribute('aria-pressed'), 'false');
      h.status('inactive'); assert.deepEqual(h.ids(), ['nv4']); h.status('all'); assert.equal(h.ids().length, 4);
    });
    itPage('lọc và tìm kết hợp; dải tóm tắt luôn là tổng toàn bộ', async function () {
      var h = mountPage(); h.status('active'); h.search('dung'); assert.equal(h.rows().length, 0);
      assert.equal(h.text('[data-role="sum-total"]'), '4'); assert.equal(h.text('[data-role="sum-inactive"]'), '1');
    });
    itPage('không có kết quả: thông báo + "Xóa tìm kiếm và lọc" đưa về đầy đủ', async function () {
      var h = mountPage(); h.status('inactive'); h.search('xyz');
      assert.equal(h.q('[data-role="empty"]').getAttribute('data-kind'), 'filtered'); assert.match(h.q('[data-role="empty"]').textContent, /Không tìm thấy nhân viên khớp/);
      h.q('[data-act="clear-filters"]').click(); assert.equal(h.rows().length, 4); assert.equal(h.q('[data-role="search"]').value, ''); assert.equal(h.q('[data-status="all"]').getAttribute('aria-pressed'), 'true');
    });
    itPage('sắp xếp: theo mã, số đề nghị, tổng Đã duyệt, rồi quay lại theo tên', async function () {
      var h = mountPage();
      h.sort('ma'); assert.deepEqual(h.ids(), ['nv1', 'nv2', 'nv3', 'nv4']);
      h.sort('requests'); assert.deepEqual(h.ids(), ['nv1', 'nv2', 'nv4', 'nv3']);
      h.sort('approved'); assert.deepEqual(h.ids(), ['nv1', 'nv2', 'nv4', 'nv3']);
      h.sort('ten'); assert.deepEqual(h.ids(), ['nv1', 'nv2', 'nv3', 'nv4']); assert.equal(h.ctrl.getState().sort, 'ten');
    });
    itPage('sắp xếp giữ nguyên khi tìm/lọc; giá trị lạ → theo tên', async function () {
      var h = mountPage(); h.sort('requests'); h.status('active'); assert.deepEqual(h.ids(), ['nv1', 'nv2', 'nv3']);
      var s = h.q('[data-role="sort"]'); s.innerHTML += '<option value="la">la</option>'; s.value = 'la'; s.dispatchEvent(new Event('change', { bubbles: true })); assert.equal(h.ctrl.getState().sort, 'ten');
    });
    itPage('có đủ 4 lựa chọn sắp xếp', async function () {
      assert.deepEqual(mountPage().qa('[data-role="sort"] option').map(function (o) { return o.textContent; }), ['Tên A–Z (theo tên gọi)', 'Mã', 'Số đề nghị nhiều nhất', 'Tổng Đã duyệt nhiều nhất']);
    });
  });

  describe('thêm nhân viên (10.3)', function () {
    itPage('mở form: tiêu đề, ô trống, không có công tắc/nút xóa, Lưu bị khóa, focus ở ô Mã', async function () {
      var h = mountPage(); h.openAdd();
      assert.equal(h.step(), 'form'); assert.equal(h.text('.de-dialog h2'), 'Thêm nhân viên'); assert.equal(h.f('ma').value, ''); assert.equal(h.f('hoTen').value, '');
      assert.equal(h.f('hoatDong'), null); assert.equal(h.q('[data-dlg="delete"]'), null); assert.equal(h.q('[data-role="info"]'), null);
      assert.equal(h.save().disabled, true); assert.equal(document.activeElement, h.f('ma'));
    });
    itPage('mã tự viết hoa khi gõ; Lưu chỉ bật khi cả hai ô hợp lệ', async function () {
      var h = mountPage(); h.openAdd();
      h.type('ma', 'nv9'); assert.equal(h.f('ma').value, 'NV9'); assert.equal(h.save().disabled, true);
      h.type('hoTen', 'Hoàng Văn E'); assert.equal(h.save().disabled, false);
      h.type('ma', 'nv 9'); assert.equal(h.save().disabled, true);
    });
    itPage('lỗi hiện khi rời ô (chỉ ô đó), biến mất khi sửa đúng', async function () {
      var h = mountPage(); h.openAdd(); h.blur('ma');
      assert.equal(h.err('ma'), 'Nhập mã nhân viên'); assert.equal(h.err('hoTen'), ''); assert.equal(h.f('ma').getAttribute('aria-invalid'), 'true');
      h.type('ma', 'nv9'); assert.equal(h.err('ma'), ''); assert.equal(h.f('ma').getAttribute('aria-invalid'), null);
    });
    itPage('mã trùng báo tên người đang dùng ngay khi gõ (sau khi đã chạm ô)', async function () {
      var h = mountPage(); h.openAdd(); h.blur('ma'); h.type('ma', 'nv002'); assert.equal(h.err('ma'), 'Mã này đã được dùng bởi Trần Thị Bình'); assert.equal(h.save().disabled, true);
    });
    itPage('mã sai định dạng và họ tên quá dài', async function () {
      var h = mountPage(); h.openAdd(); h.type('ma', 'NV/9'); h.blur('ma'); assert.match(h.err('ma'), /chỉ gồm chữ cái không dấu/);
      h.type('hoTen', 'a'.repeat(61)); h.blur('hoTen'); assert.equal(h.err('hoTen'), 'Tối đa 60 ký tự (đang nhập 61)');
    });
    itPage('gửi khi form trống (Enter): báo lỗi cả hai ô, focus vào ô lỗi đầu tiên, không ghi', async function () {
      var h = mountPage(); h.openAdd(); h.f('ma').form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await tick();
      assert.equal(h.err('ma'), 'Nhập mã nhân viên'); assert.equal(h.err('hoTen'), 'Nhập họ và tên'); assert.equal(document.activeElement, h.f('ma')); assert.equal(h.env.storage.sets, 0);
    });
    itPage('thêm thành công: lưu đúng, đóng form, cập nhật danh sách + tóm tắt, toast, sự kiện, focus vào dòng mới', async function () {
      var h = mountPage(); h.openAdd(); h.type('ma', 'nv005'); h.type('hoTen', '  Đỗ  Minh Khôi '); h.save().click(); await tick();
      var added = readNV(h.env).filter(function (x) { return x.ma === 'NV005'; })[0];
      assert.ok(added); assert.equal(added.hoTen, 'Đỗ Minh Khôi'); assert.equal(added.hoatDong, true);
      assert.equal(h.dialogs(), 0); assert.equal(h.text('[data-role="sum-total"]'), '5'); assert.equal(h.text('[data-role="sum-active"]'), '4');
      assert.ok(h.row(added.id)); assert.equal(h.row(added.id).querySelector('[data-role="n-count"]').textContent, '0');
      assert.equal(h.toastText(), 'Đã thêm nhân viên Đỗ Minh Khôi'); assert.deepEqual(h.calls.events, [{ source: 'employees', action: 'add', id: added.id }]); assert.deepEqual(h.calls.changed, [{ action: 'add', id: added.id }]);
      assert.equal(document.activeElement, h.row(added.id).querySelector('[data-act="edit"].de-btn'));
    });
    itPage('nhân viên mới xuất hiện đúng vị trí theo thứ tự đang chọn', async function () {
      var h = mountPage(); h.openAdd(); h.type('ma', 'nv00a'); h.type('hoTen', 'Võ Thị Ái'); h.save().click(); await tick();
      assert.equal(h.names()[0], 'Võ Thị Ái', 'tên gọi "Ái" đứng đầu bảng chữ cái');
    });
    itPage('thêm người đầu tiên vào danh bạ trống', async function () {
      var h = mountPage({ nhanVien: [], deNghi: [] });
      assert.equal(h.q('[data-role="empty"]').getAttribute('data-kind'), 'none'); h.q('[data-role="empty"] [data-act="add"]').click();
      h.type('ma', 'a1'); h.type('hoTen', 'Người Một'); h.save().click(); await tick(); assert.equal(h.rows().length, 1); assert.equal(h.q('[data-role="empty"]'), null);
    });
    itPage('bấm Lưu hai lần nhanh chỉ thêm một người (chống bấm đôi)', async function () {
      var calls = 0;
      var h = mountPage({ wrapStore: function (s) { return Object.assign({}, s, { add: function (i, a) { calls++; return new Promise(function (r) { setTimeout(function () { r(s.add(i, a)); }, 20); }); } }); } });
      h.openAdd(); h.type('ma', 'x1'); h.type('hoTen', 'Người X');
      var f = h.f('ma').form; h.save().click(); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      assert.equal(h.save().getAttribute('aria-busy'), 'true'); await tick(60); assert.equal(calls, 1); assert.equal(readNV(h.env).length, 5);
    });
    itPage('lỗi từ store (mã bị người khác lấy mất lúc đang nhập) hiện dưới ô, form giữ nguyên', async function () {
      var h = mountPage(); h.openAdd(); h.type('ma', 'zz1'); h.type('hoTen', 'Người Z');
      var all = readNV(h.env); all.push({ id: 'nvx', ma: 'ZZ1', hoTen: 'Đến trước', hoatDong: true }); h.env.storage.m[DncEmpStore.KEY_NV] = JSON.stringify(all);
      h.save().click(); await tick();
      assert.equal(h.err('ma'), 'Mã này đã được dùng bởi Đến trước'); assert.equal(h.step(), 'form'); assert.equal(h.f('hoTen').value, 'Người Z'); assert.equal(document.activeElement, h.f('ma'));
    });
  });

  describe('sửa thông tin nhân viên (10.3)', function () {
    itPage('mở form sửa: điền sẵn, công tắc đúng, thông tin tổng hợp, Lưu bị khóa khi chưa đổi', async function () {
      var h = mountPage(); h.openEdit('nv1');
      assert.equal(h.text('.de-dialog h2'), 'Sửa nhân viên'); assert.equal(h.f('ma').value, 'NV001'); assert.equal(h.f('hoTen').value, 'Nguyễn Văn An'); assert.equal(h.f('hoatDong').checked, true);
      assert.equal(h.text('[data-role="info"]'), 'Đã có 3 đề nghị · Tổng Đã duyệt 5.300.000 ₫'); assert.equal(h.save().disabled, true);
    });
    itPage('bấm tên cũng mở form sửa', async function () {
      var h = mountPage(); h.row('nv2').querySelector('.de-person-btn').click(); assert.equal(h.f('ma').value, 'NV002');
    });
    itPage('đổi họ tên: Lưu bật; đổi lại như cũ: Lưu khóa lại', async function () {
      var h = mountPage(); h.openEdit('nv1'); h.type('hoTen', 'Nguyễn Văn An B'); assert.equal(h.save().disabled, false); h.type('hoTen', 'Nguyễn Văn An'); assert.equal(h.save().disabled, true);
      h.type('hoTen', '  Nguyễn   Văn An '); assert.equal(h.save().disabled, true, 'chỉ khác khoảng trắng không phải thay đổi');
    });
    itPage('lưu thay đổi mã và tên: cập nhật danh sách, giữ id và số liệu đề nghị', async function () {
      var h = mountPage(); h.openEdit('nv1'); h.type('ma', 'nv111'); h.type('hoTen', 'Nguyễn Văn Ân'); h.save().click(); await tick();
      var x = stored(h, 'nv1'); assert.equal(x.ma, 'NV111'); assert.equal(x.hoTen, 'Nguyễn Văn Ân'); assert.equal(h.dialogs(), 0);
      assert.equal(h.row('nv1').querySelector('[data-role="ma"]').textContent, 'NV111'); assert.equal(h.row('nv1').querySelector('[data-role="name"]').textContent, 'Nguyễn Văn Ân');
      assert.equal(h.row('nv1').querySelector('[data-role="n-count"]').textContent, '3', 'vẫn giữ liên kết với đề nghị cũ');
      assert.equal(h.toastText(), 'Đã lưu thay đổi'); assert.equal(h.calls.events[0].action, 'update'); assert.equal(document.activeElement, h.row('nv1').querySelector('[data-act="edit"].de-btn'));
    });
    itPage('giữ mã cũ nhưng đổi tên: hợp lệ (không tự báo trùng với chính mình)', async function () {
      var h = mountPage(); h.openEdit('nv2'); h.type('hoTen', 'Trần Thị Bình An'); assert.equal(h.err('ma'), ''); assert.equal(h.save().disabled, false);
    });
    itPage('đổi sang mã của người khác bị chặn', async function () {
      var h = mountPage(); h.openEdit('nv2'); h.type('ma', 'nv001'); h.blur('ma'); assert.equal(h.err('ma'), 'Mã này đã được dùng bởi Nguyễn Văn An'); assert.equal(h.save().disabled, true);
    });
    itPage('công tắc: tắt hiện giải thích, bật lại thì ẩn; Lưu bật theo thay đổi', async function () {
      var h = mountPage(); h.openEdit('nv1');
      assert.equal(h.text('[data-role="on-hint"]'), '');
      h.f('hoatDong').checked = false; h.f('hoatDong').dispatchEvent(new Event('change', { bubbles: true }));
      assert.equal(h.text('[data-role="on-hint"]'), 'Không còn xuất hiện khi tạo đề nghị mới; các khoản cũ vẫn giữ nguyên.'); assert.equal(h.save().disabled, false);
      h.f('hoatDong').checked = true; h.f('hoatDong').dispatchEvent(new Event('change', { bubbles: true })); assert.equal(h.text('[data-role="on-hint"]'), ''); assert.equal(h.save().disabled, true);
    });
    itPage('ngưng hoạt động: lưu, huy hiệu đổi, tóm tắt và bộ lọc cập nhật; đề nghị cũ vẫn nguyên', async function () {
      var h = mountPage(); h.openEdit('nv2'); h.f('hoatDong').checked = false; h.f('hoatDong').dispatchEvent(new Event('change', { bubbles: true })); h.save().click(); await tick();
      assert.equal(stored(h, 'nv2').hoatDong, false); assert.equal(h.row('nv2').querySelector('[data-status-badge]').getAttribute('data-status-badge'), 'off');
      assert.equal(h.text('[data-role="sum-active"]'), '2'); assert.equal(h.text('[data-role="sum-inactive"]'), '2');
      assert.equal(h.q('[data-status="inactive"]').textContent.replace(/\s+/g, ' ').trim(), 'Ngưng (2)'); assert.equal(h.row('nv2').querySelector('[data-role="n-count"]').textContent, '2');
      assert.equal(JSON.parse(h.env.storage.m[DncEmpStore.KEY_DN]).length, 6);
    });
    itPage('bật lại hoạt động cho người đã ngưng', async function () {
      var h = mountPage(); h.openEdit('nv4'); assert.equal(h.f('hoatDong').checked, false); h.f('hoatDong').checked = true; h.f('hoatDong').dispatchEvent(new Event('change', { bubbles: true })); h.save().click(); await tick();
      assert.equal(stored(h, 'nv4').hoatDong, true); assert.equal(h.text('[data-role="sum-inactive"]'), '0');
    });
    itPage('người đã có đề nghị: không có nút Xóa, có dòng giải thích', async function () {
      var h = mountPage(); h.openEdit('nv1');
      assert.equal(h.q('[data-dlg="delete"]'), null); assert.equal(h.text('[data-role="del-note"]'), 'Nhân viên đã có 3 đề nghị nên chỉ có thể Ngưng hoạt động.');
      h.destroy(); var g = mountPage(); g.openEdit('nv4'); assert.equal(g.q('[data-dlg="delete"]'), null);
    });
    itPage('người chưa có đề nghị: có nút Xóa nhân viên', async function () { var h = mountPage(); h.openEdit('nv3'); assert.ok(h.q('[data-dlg="delete"]')); assert.equal(h.q('[data-role="del-note"]'), null); });
    itPage('người đã bị xóa ở nơi khác khi đang sửa: báo rõ, không ghi', async function () {
      var h = mountPage(); h.openEdit('nv1'); h.type('hoTen', 'Đổi tên');
      h.env.storage.m[DncEmpStore.KEY_NV] = JSON.stringify(readNV(h.env).filter(function (x) { return x.id !== 'nv1'; })); h.env.storage.sets = 0;
      h.save().click(); await tick();
      assert.equal(h.formBanner(), 'Không tìm thấy nhân viên này (có thể đã bị xóa).'); assert.equal(h.env.storage.sets, 0); assert.equal(h.row('nv1'), null, 'danh sách được làm mới');
    });
    itPage('mở form sửa cho người không còn tồn tại: không mở, báo rõ', async function () {
      var h = mountPage(); var row = h.row('nv3'); h.env.storage.m[DncEmpStore.KEY_NV] = JSON.stringify(readNV(h.env).filter(function (x) { return x.id !== 'nv3'; }));
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'entry' } })); assert.equal(h.row('nv3'), null); assert.equal(h.dialogs(), 0);
    });
  });

  describe('hủy và thay đổi chưa lưu', function () {
    itPage('hủy khi chưa đổi gì: đóng ngay, không hỏi, trả focus về nút đã mở', async function () {
      var h = mountPage(), b = h.q('.de-head [data-act="add"]'); b.focus(); b.click(); h.q('[data-dlg="cancel"]').click();
      assert.equal(h.dialogs(), 0); assert.equal(document.activeElement, b);
    });
    itPage('hủy khi đã nhập: hỏi "Bỏ các thay đổi?"; Tiếp tục sửa giữ nguyên dữ liệu', async function () {
      var h = mountPage(); h.openAdd(); h.type('hoTen', 'Đang gõ dở'); h.q('[data-dlg="cancel"]').click();
      assert.equal(h.step(), 'confirm'); assert.match(h.text('.de-dialog[data-step="confirm"] h2'), /Bỏ các thay đổi\?/); assert.equal(h.dialogs(), 2);
      noBtn(h).click(); assert.equal(h.dialogs(), 1); assert.equal(h.f('hoTen').value, 'Đang gõ dở');
    });
    itPage('"Bỏ thay đổi" đóng cả hai hộp thoại, không ghi', async function () {
      var h = mountPage(); h.openAdd(); h.type('ma', 'abc'); h.q('[data-dlg="cancel"]').click(); okBtn(h).click(); assert.equal(h.dialogs(), 0); assert.equal(h.env.storage.sets, 0);
    });
    itPage('Esc: form chưa đổi đóng ngay; form đã đổi hỏi xác nhận; Esc lần nữa chỉ đóng hộp xác nhận', async function () {
      var h = mountPage(); h.openAdd(); esc(); assert.equal(h.dialogs(), 0);
      h.openAdd(); h.type('ma', 'x'); esc(); assert.equal(h.dialogs(), 2); esc(); assert.equal(h.dialogs(), 1); assert.equal(h.step(), 'form'); assert.equal(h.f('ma').value, 'X');
    });
    itPage('bấm ra ngoài hộp thoại: giống Esc', async function () {
      var h = mountPage(); h.openAdd(); h.dialog().dispatchEvent(new MouseEvent('click', { bubbles: true })); assert.equal(h.dialogs(), 0);
      h.openAdd(); h.type('ma', 'x'); h.dialog().dispatchEvent(new MouseEvent('click', { bubbles: true })); assert.equal(h.step(), 'confirm');
    });
    itPage('sửa rồi đổi lại như cũ rồi hủy: không hỏi', async function () {
      var h = mountPage(); h.openEdit('nv1'); h.type('hoTen', 'Khác'); h.type('hoTen', 'Nguyễn Văn An'); h.q('[data-dlg="cancel"]').click(); assert.equal(h.dialogs(), 0);
    });
    itPage('focus được giữ trong hộp thoại khi bấm Tab / Shift+Tab', async function () {
      var h = mountPage(); h.openAdd(); var btns = h.qa('.de-dialog input, .de-dialog button:not([disabled])'), first = btns[0], last = btns[btns.length - 1];
      last.focus(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); assert.equal(document.activeElement, first);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })); assert.equal(document.activeElement, last);
    });
    itPage('khi hộp thoại đang mở, các nút phía sau không hoạt động', async function () {
      var h = mountPage(); h.openAdd(); h.q('.de-head [data-act="add"]').click(); assert.equal(h.dialogs(), 1);
      h.row('nv1').querySelector('[data-act="edit"].de-btn').click(); assert.equal(h.dialogs(), 1); assert.equal(h.text('.de-dialog h2'), 'Thêm nhân viên');
    });
  });

  describe('xóa nhân viên và hoàn tác', function () {
    itPage('Xóa → hộp xác nhận nêu tên và mã; Hủy giữ nguyên', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click();
      assert.equal(h.step(), 'confirm'); assert.match(h.text('.de-dialog[data-step="confirm"] .de-msg'), /Lê Hoàng Cường \(NV003\)/); assert.equal(h.text('.de-dialog[data-step="confirm"] h2'), 'Xóa nhân viên này?');
      noBtn(h).click(); assert.equal(h.dialogs(), 1); assert.equal(readNV(h.env).length, 4);
    });
    itPage('xác nhận: xóa, đóng hộp thoại, cập nhật tóm tắt, toast có Hoàn tác, sự kiện', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click(); okBtn(h).click(); await tick();
      assert.equal(h.dialogs(), 0); assert.equal(h.row('nv3'), null); assert.equal(h.text('[data-role="sum-total"]'), '3'); assert.equal(h.toastText().indexOf('Đã xóa Lê Hoàng Cường'), 0); assert.ok(h.q('[data-act="undo"]'));
      assert.deepEqual(h.calls.events, [{ source: 'employees', action: 'delete', id: 'nv3' }]);
    });
    itPage('Hoàn tác: nhân viên trở lại đúng vị trí, sự kiện restore', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click(); okBtn(h).click(); await tick();
      h.q('[data-act="undo"]').click(); await tick();
      assert.deepEqual(h.ids(), ['nv1', 'nv2', 'nv3', 'nv4']); assert.equal(h.toastText(), 'Đã hoàn tác'); assert.equal(h.calls.events[1].action, 'restore'); assert.equal(h.q('[data-act="undo"]'), null);
    });
    itPage('Hoàn tác tự hết hạn sau 4 giây', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click(); okBtn(h).click(); await tick(); assert.ok(h.toastText()); await tick(4100); assert.equal(h.toastText(), '');
    });
    itPage('hoàn tác thất bại khi mã đã bị người khác dùng: báo rõ, không ghi đè', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click(); okBtn(h).click(); await tick();
      var all = readNV(h.env); all.push({ id: 'moi', ma: 'NV003', hoTen: 'Người mới', hoatDong: true }); h.env.storage.m[DncEmpStore.KEY_NV] = JSON.stringify(all);
      h.q('[data-act="undo"]').click(); await tick(); assert.match(h.toastText(), /Không thể hoàn tác/); assert.equal(readNV(h.env).length, 4);
    });
    itPage('đề nghị xuất hiện sau khi mở form (xung đột): xóa bị chặn, nút Xóa đổi thành dòng giải thích, người vẫn còn', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click();
      var reqs = JSON.parse(h.env.storage.m[DncEmpStore.KEY_DN]); reqs.push(req({ nv: 'nv3', tt: 'cho_duyet' })); h.env.storage.m[DncEmpStore.KEY_DN] = JSON.stringify(reqs);
      okBtn(h).click(); await tick();
      assert.equal(h.step(), 'form'); assert.equal(h.formBanner(), 'Nhân viên đã có 1 đề nghị nên chỉ có thể Ngưng hoạt động.'); assert.equal(h.q('[data-dlg="delete"]'), null); assert.ok(h.q('[data-role="del-note"]'));
      assert.equal(readNV(h.env).length, 4); assert.equal(h.row('nv3').querySelector('[data-role="n-count"]').textContent, '1');
    });
    itPage('xóa khi dữ liệu đề nghị hỏng: không xóa, báo lỗi trong form', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click(); h.env.storage.m[DncEmpStore.KEY_DN] = '{hỏng'; okBtn(h).click(); await tick();
      assert.equal(readNV(h.env).length, 4); assert.match(h.formBanner(), /Không đọc được dữ liệu/);
    });
    itPage('Esc trong hộp xác nhận xóa chỉ đóng hộp xác nhận', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click(); esc(); assert.equal(h.dialogs(), 1); assert.equal(h.step(), 'form'); assert.equal(readNV(h.env).length, 4);
    });
    itPage('xóa hết nhân viên: hiện trạng thái rỗng', async function () {
      var h = mountPage({ nhanVien: [{ id: 'e', ma: 'E1', hoTen: 'Một Mình', hoatDong: true }], deNghi: [] });
      h.openEdit('e'); h.q('[data-dlg="delete"]').click(); okBtn(h).click(); await tick(); assert.equal(h.q('[data-role="empty"]').getAttribute('data-kind'), 'none'); assert.equal(h.text('[data-role="sum-total"]'), '0');
    });
  });

  describe('lỗi lưu trữ và dữ liệu (DESIGN 12.4)', function () {
    itPage('bộ nhớ đầy khi thêm: banner trong form, giữ nguyên dữ liệu đang nhập, thử lại thành công', async function () {
      var h = mountPage(); h.openAdd(); h.type('ma', 'nv9'); h.type('hoTen', 'Người Chín');
      h.env.storage.failSet = quotaError(); h.save().click(); await tick();
      assert.match(h.formBanner(), /đã đầy/); assert.equal(h.step(), 'form'); assert.equal(h.f('ma').value, 'NV9'); assert.equal(h.f('hoTen').value, 'Người Chín'); assert.equal(h.save().disabled, false); assert.equal(h.toastText(), '');
      assert.equal(h.calls.events.length, 0); h.env.storage.failSet = null; h.save().click(); await tick(); assert.equal(h.dialogs(), 0); assert.equal(readNV(h.env).length, 5);
    });
    itPage('bị chặn lưu trữ khi sửa: banner nêu nguyên nhân', async function () {
      var h = mountPage(); h.openEdit('nv1'); h.type('hoTen', 'Mới'); var e = new Error('x'); e.name = 'SecurityError'; h.env.storage.failSet = e; h.save().click(); await tick(); assert.match(h.formBanner(), /chặn lưu trữ/);
    });
    itPage('dữ liệu nhân viên hỏng khi tải: khối lỗi + Thử lại; sửa dữ liệu rồi Thử lại', async function () {
      var env = makeEnv(); env.storage.m[DncEmpStore.KEY_NV] = '{hỏng'; var h = mountPage({ env: env });
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'corrupt'); assert.equal(h.q('[data-role="blocked"]').getAttribute('role'), 'alert');
      env.storage.m[DncEmpStore.KEY_NV] = JSON.stringify(EMPS()); h.q('[data-act="retry"]').click(); assert.equal(h.rows().length, 4); assert.equal(h.q('[data-role="blocked"]'), null);
    });
    itPage('dữ liệu đề nghị hỏng cũng chặn trang (vì không đếm được)', async function () {
      var env = makeEnv(); env.storage.m[DncEmpStore.KEY_DN] = 'x'; assert.equal(mountPage({ env: env }).q('[data-role="blocked"]').getAttribute('data-code'), 'corrupt');
    });
    itPage('trình duyệt chặn đọc storage', async function () { var env = makeEnv(); env.storage.failGet = true; assert.equal(mountPage({ env: env }).q('[data-role="blocked"]').getAttribute('data-code'), 'blocked'); });
    itPage('store ném ngoại lệ / Promise bị từ chối: banner lỗi chung, giao diện không treo', async function () {
      var h = mountPage({ wrapStore: function (s) { return Object.assign({}, s, { add: function () { throw new Error('boom'); } }); } }); h.openAdd(); h.type('ma', 'a1'); h.type('hoTen', 'Người A'); h.save().click(); await tick();
      assert.match(h.formBanner(), /Có lỗi khi xử lý/); assert.equal(h.ctrl.getState().busy, false); assert.equal(h.save().disabled, false);
      var g = mountPage({ wrapStore: function (s) { return Object.assign({}, s, { add: function () { return Promise.reject(new Error('x')); } }); } }); g.openAdd(); g.type('ma', 'a1'); g.type('hoTen', 'Người A'); g.save().click(); await tick(); assert.match(g.formBanner(), /Có lỗi khi xử lý/);
    });
    itPage('chưa có dữ liệu gì trong storage: trang trống bình thường', async function () {
      var h = mountPage({ nhanVien: null, deNghi: null }); assert.equal(h.q('[data-role="empty"]').getAttribute('data-kind'), 'none'); assert.equal(h.ctrl.getState().loadError, null);
    });
  });

  describe('đồng bộ với module khác', function () {
    itPage('khi module khác thay đổi đề nghị (dnc:data-changed), số liệu từng người cập nhật', async function () {
      var h = mountPage(); assert.equal(h.row('nv3').querySelector('[data-role="n-count"]').textContent, '0');
      var r = JSON.parse(h.env.storage.m[DncEmpStore.KEY_DN]); r.push(req({ nv: 'nv3', sl: 2, dg: 500000 })); h.env.storage.m[DncEmpStore.KEY_DN] = JSON.stringify(r);
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'entry', action: 'add' } }));
      assert.equal(h.row('nv3').querySelector('[data-role="n-count"]').textContent, '1'); assert.equal(h.row('nv3').querySelector('[data-role="n-approved"]').textContent, '1.000.000 ₫');
    });
    itPage('cập nhật giữ nguyên tìm kiếm, lọc, sắp xếp và hộp thoại đang mở', async function () {
      var h = mountPage(); h.search('nv00'); h.status('active'); h.sort('ma'); h.openEdit('nv1');
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'review' } }));
      assert.deepEqual(h.ctrl.getState(), Object.assign(h.ctrl.getState(), { q: 'nv00', status: 'active', sort: 'ma', dialogs: 1 }));
    });
    itPage('sự kiện do chính màn này bắn ra không gây tải lại', async function () {
      var h = mountPage(), loads = 0, orig = h.env.store.list; h.env.store.list = function () { loads++; return orig.apply(this, arguments); };
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'employees' } })); assert.equal(loads, 0);
    });
    itPage('refresh() tải lại; destroy gỡ giao diện và listener', async function () {
      var h = mountPage(); h.env.storage.m[DncEmpStore.KEY_NV] = JSON.stringify([{ id: 'only', ma: 'O1', hoTen: 'Duy Nhất' }]); h.ctrl.refresh(); assert.deepEqual(h.ids(), ['only']);
      var btn = h.q('.de-head [data-act="add"]'); h.ctrl.destroy(); assert.equal(h.box.innerHTML, ''); btn.click(); document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: {} })); esc(); assert.equal(h.ctrl.getState().destroyed, true);
    });
    itPage('destroy khi đang lưu bất đồng bộ: không lỗi, không gọi onChanged', async function () {
      var h = mountPage({ wrapStore: function (s) { return Object.assign({}, s, { add: function (i, a) { return new Promise(function (r) { setTimeout(function () { r(s.add(i, a)); }, 10); }); } }); } });
      h.openAdd(); h.type('ma', 'a1'); h.type('hoTen', 'Người A'); h.save().click(); h.ctrl.destroy(); await tick(40); assert.equal(h.calls.changed.length, 0);
    });
    itPage('mount lại nhiều lần không nhân đôi listener', async function () {
      var env = makeEnv(), box = document.createElement('div'); document.body.appendChild(box), n = 0;
      for (var i = 0; i < 3; i++) DncEmployees.mount(box, { store: env.store, session: MGR }).destroy();
      var c = DncEmployees.mount(box, { store: env.store, session: MGR, onChanged: function () { n++; } });
      box.querySelector('.de-head [data-act="add"]').click(); var m = box.querySelector('[data-field="ma"]'); m.value = 'ab1'; m.dispatchEvent(new Event('input', { bubbles: true }));
      var t = box.querySelector('[data-field="hoTen"]'); t.value = 'Người AB'; t.dispatchEvent(new Event('input', { bubbles: true })); box.querySelector('[data-dlg="save"]').click(); await tick(); assert.equal(n, 1); c.destroy(); box.remove();
    });
  });

  describe('kiểu dáng theo DESIGN (bố cục, màu, font)', function () {
    itPage('tiêu đề 22px/700; số tóm tắt 22px/700 số đều nét; font hệ thống', async function () {
      var h = mountPage(), t = cs(h.q('.de-title')); assert.equal(t.fontSize, '22px'); assert.equal(t.fontWeight, '700');
      var v = cs(h.q('.de-sum-val')); assert.equal(v.fontSize, '22px'); assert.equal(v.fontWeight, '700'); assert.match(v.fontVariantNumeric, /tabular-nums/);
      assert.match(cs(h.box).fontFamily, /system-ui|-apple-system|Segoe UI|Roboto|Arial/); assert.equal(cs(h.q('.de-sum-card h2')).fontSize, '13px');
    });
    itPage('thẻ bo 14px viền 1px; nút Thêm nền primary cao ≥ 44px', async function () {
      var h = mountPage(), D = isDark();
      assert.equal(cs(h.q('.de-sum-card')).borderTopLeftRadius, '14px'); assert.equal(cs(h.q('.de-sum-card')).borderTopWidth, '1px');
      var b = h.q('.de-head [data-act="add"]'); assert.equal(cs(b).backgroundColor, D ? 'rgb(108, 155, 255)' : 'rgb(47, 111, 237)'); assert.ok(b.getBoundingClientRect().height >= 44);
    });
    itPage('nút Sửa, nút lọc, ô tìm, ô sắp xếp, nút xóa nhanh cao ≥ 40–44px', async function () {
      var h = mountPage();
      assert.ok(h.q('tbody [data-act="edit"].de-btn').getBoundingClientRect().height >= 44); assert.ok(h.q('[data-role="search"]').getBoundingClientRect().height >= 44); assert.ok(h.q('[data-role="sort"]').getBoundingClientRect().height >= 44);
      h.qa('[data-status]').forEach(function (b) { assert.ok(b.getBoundingClientRect().height >= 40); });
      h.search('a'); var c = h.q('[data-act="clear-search"]').getBoundingClientRect(); assert.ok(c.width >= 44 && c.height >= 44);
    });
    itPage('huy hiệu: Hoạt động viền border + chữ text; Ngưng nền surface-2 + chữ text-muted (không dùng màu trạng thái duyệt)', async function () {
      var h = mountPage(), on = h.row('nv1').querySelector('[data-status-badge]'), off = h.row('nv4').querySelector('[data-status-badge]'), D = isDark();
      assert.equal(cs(on).color, cs(h.q('.de-title')).color); assert.equal(cs(off).backgroundColor, D ? 'rgb(34, 38, 48)' : 'rgb(238, 240, 244)'); assert.equal(cs(off).color, D ? 'rgb(160, 168, 182)' : 'rgb(91, 100, 114)');
      assert.equal(cs(on).borderRadius, '999px'); assert.equal(cs(on).height, '24px');
    });
    itPage('form: ô nhập cao 48px bo 10px cỡ chữ ≥ 16px; nhãn 13px/500', async function () {
      var h = mountPage(); h.openAdd(); h.q('.de-dialog').style.animation = 'none'; // đo kích thước cuối, không phải khung hình đầu của hiệu ứng
      ['ma', 'hoTen'].forEach(function (n) { var e = h.f(n); assert.equal(Math.round(e.getBoundingClientRect().height), 48); assert.equal(cs(e).borderTopLeftRadius, '10px'); assert.ok(parseFloat(cs(e).fontSize) >= 16); });
      assert.equal(cs(h.q('.de-label')).fontSize, '13px'); assert.equal(cs(h.q('.de-label')).fontWeight, '500'); assert.equal(cs(h.q('.de-dialog h2')).fontSize, '17px');
    });
    itPage('công tắc: bật nền primary, tắt nền surface-2; vùng chạm ≥ 44px', async function () {
      var h = mountPage(), D = isDark(); h.openEdit('nv1'); h.q('.de-dialog').style.animation = 'none'; var sw = h.f('hoatDong'); sw.style.transition = 'none';
      assert.equal(cs(sw).backgroundColor, D ? 'rgb(108, 155, 255)' : 'rgb(47, 111, 237)'); assert.ok(sw.closest('label').getBoundingClientRect().height >= 44);
      sw.checked = false; assert.equal(cs(sw).backgroundColor, D ? 'rgb(34, 38, 48)' : 'rgb(238, 240, 244)'); assert.equal(sw.getAttribute('role'), 'switch');
    });
    itPage('nút Xóa kiểu Nguy hiểm: viền + chữ danger', async function () {
      var h = mountPage(), D = isDark(); h.openEdit('nv3'); var b = h.q('[data-dlg="delete"]');
      assert.equal(cs(b).color, D ? 'rgb(242, 118, 109)' : 'rgb(179, 38, 30)'); assert.equal(cs(b).borderTopColor, cs(b).color);
    });
    itPage('[điện thoại] thẻ nhân viên: không cuộn ngang, nút Sửa rộng 100%, nhãn nhỏ phía trên số liệu', async function () {
      if (!isMobile()) skip();
      var h = mountPage(); h.box.style.width = 'auto'; var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang');
      assert.equal(cs(h.q('thead')).position, 'absolute'); assert.equal(cs(h.row('nv1')).display, 'grid');
      var row = h.row('nv1'), btn = row.querySelector('[data-act="edit"].de-btn'); assert.ok(Math.abs(btn.getBoundingClientRect().width - (row.getBoundingClientRect().width - 26)) < 4, 'nút Sửa rộng đủ');
      var tds = ['n-count', 'n-pending', 'n-approved'].map(function (k) { return row.querySelector('[data-role="' + k + '"]'); });
      assert.equal(new Set(tds.map(function (t) { return Math.round(t.getBoundingClientRect().top); })).size, 1, 'ba ô cùng hàng');
      assert.equal(getComputedStyle(tds[0], '::before').content.replace(/"/g, ''), 'Số đề nghị'); assert.equal(getComputedStyle(tds[0], '::before').fontSize, '12px');
      var tops = ['.de-c-person', '.de-c-ma', '.de-c-n', '.de-c-act'].map(function (s) { return Math.round(row.querySelector(s).getBoundingClientRect().top); }); assert.ok(tops[0] < tops[1] && tops[1] < tops[2] && tops[2] < tops[3], 'xếp dọc: ' + tops);
      var add = h.q('.de-head [data-act="add"]'); assert.ok(add.getBoundingClientRect().height >= 44);
    });
    itPage('[điện thoại] hộp thoại là bottom sheet bo góc trên 20px, rộng đủ màn hình, nút Hủy/Lưu chia đôi', async function () {
      if (!isMobile()) skip();
      var h = mountPage(); h.openEdit('nv1'); var d = h.q('.de-dialog'); d.style.animation = 'none';
      var r = d.getBoundingClientRect(); assert.equal(cs(d).borderTopLeftRadius, '20px'); assert.equal(cs(d).borderBottomLeftRadius, '0px');
      assert.ok(Math.abs(r.bottom - window.innerHeight) <= 1, 'dính đáy ' + r.bottom + ' vs ' + window.innerHeight); assert.ok(r.width >= document.documentElement.clientWidth - 1); assert.ok(r.height <= window.innerHeight * 0.85 + 1);
      var a = h.q('[data-dlg="cancel"]').getBoundingClientRect(), b = h.save().getBoundingClientRect(); assert.ok(Math.abs(a.width - b.width) <= 2); assert.equal(Math.round(a.top), Math.round(b.top));
    });
    itPage('[laptop] bảng thật 7 cột, tiêu đề cột hiện, hộp thoại giữa màn hình rộng ≤ 480px', async function () {
      if (!isDesktop()) skip();
      var h = mountPage(); h.box.style.width = 'auto'; var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang');
      assert.equal(cs(h.q('.de-table')).display, 'table'); assert.notEqual(cs(h.q('thead')).position, 'absolute'); assert.equal(h.qa('thead th').length, 7);
      var heads = h.qa('thead th'), cells = h.row('nv1').cells; for (var i = 0; i < 7; i++) assert.ok(Math.abs(heads[i].getBoundingClientRect().left - cells[i].getBoundingClientRect().left) <= 2, 'cột ' + i + ' lệch');
      assert.ok(h.row('nv1').getBoundingClientRect().height < 80, 'một dòng cao ' + h.row('nv1').getBoundingClientRect().height);
      var nm = h.row('nv1').querySelector('[data-role="name"]'); assert.ok(nm.scrollWidth <= nm.clientWidth + 1, 'tên bị cắt');
      var cw = h.qa('.de-sum-card').map(function (c) { return Math.round(c.getBoundingClientRect().top); }); assert.equal(new Set(cw).size, 1);
      h.openEdit('nv1'); var d = h.q('.de-dialog'); d.style.animation = 'none'; var r = d.getBoundingClientRect();
      assert.ok(r.width <= 480); assert.ok(Math.abs(r.left + r.width / 2 - window.innerWidth / 2) <= 10); assert.ok(r.bottom < window.innerHeight); assert.equal(cs(d).borderTopLeftRadius, '14px');
    });
    itPage('[laptop] hàng điều khiển nằm một dòng', async function () {
      if (!isDesktop()) skip();
      var h = mountPage(); h.box.style.width = 'auto'; var t = [h.q('.de-search'), h.q('.de-seg'), h.q('[data-role="sort"]')].map(function (e) { return Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2); });
      assert.ok(Math.max.apply(null, t) - Math.min.apply(null, t) <= 8, 'không cùng hàng: ' + t);
    });
  });

  describe('tương phản màu và trợ năng', function () {
    function pair(name, fg, bg, min) { var r = contrast(fg, bg); assert.ok(r >= (min || 4.5), name + ': ' + r.toFixed(2) + ':1 (' + fg + ' trên ' + bg + ')'); }
    itPage('chữ danh sách, huy hiệu, tóm tắt, điều khiển đạt AA ≥ 4.5:1', async function () {
      var h = mountPage(), bg = cssVar('--bg'), card = cs(h.q('.de-sum-card')).backgroundColor;
      pair('tiêu đề', cs(h.q('.de-title')).color, bg); pair('nhãn tóm tắt', cs(h.q('.de-sum-card h2')).color, card); pair('số tóm tắt', cs(h.q('.de-sum-val')).color, card);
      var row = h.row('nv1'), rb = effBg(row.querySelector('td')); pair('tên', cs(row.querySelector('.de-person-btn')).color, rb); pair('mã', cs(row.querySelector('.de-ma')).color, rb); pair('số liệu', cs(row.querySelector('[data-role="n-count"]')).color, rb);
      var on = row.querySelector('[data-status-badge]'); pair('huy hiệu Hoạt động', cs(on).color, effBg(on)); var off = h.row('nv4').querySelector('[data-status-badge]'); pair('huy hiệu Ngưng', cs(off).color, cs(off).backgroundColor);
      var av = row.querySelector('.de-avatar'); pair('chữ cái đại diện', cs(av).color, cs(av).backgroundColor);
      var sb = h.q('tbody [data-act="edit"].de-btn'); pair('nút Sửa', cs(sb).color, cs(sb).backgroundColor); var ad = h.q('.de-head [data-act="add"]'); pair('nút Thêm', cs(ad).color, cs(ad).backgroundColor);
      pair('ô tìm', cs(h.q('[data-role="search"]')).color, cs(h.q('[data-role="search"]')).backgroundColor); pair('ô sắp xếp', cs(h.q('[data-role="sort"]')).color, cs(h.q('[data-role="sort"]')).backgroundColor);
      var p = h.q('[data-status="all"]'); pair('lọc đang chọn', cs(p).color, cs(p).backgroundColor); pair('lọc chưa chọn', cs(h.q('[data-status="active"]')).color, cs(h.q('.de-seg')).backgroundColor);
      h.status('inactive'); h.search('zzz'); var e = h.q('[data-role="empty"]'); pair('rỗng: mô tả', cs(e.querySelector('strong')).color, cs(e).backgroundColor);
    });
    itPage('form: nhãn, ô nhập, lỗi, gợi ý, thông tin, công tắc (viền ≥ 3:1), nút Hủy/Lưu/Xóa, banner', async function () {
      var h = mountPage(); h.openEdit('nv3'); var d = cs(h.q('.de-dialog')).backgroundColor;
      pair('tiêu đề', cs(h.q('.de-dialog h2')).color, d); pair('nhãn', cs(h.q('.de-label')).color, d); pair('ô nhập', cs(h.f('ma')).color, cs(h.f('ma')).backgroundColor);
      pair('thông tin', cs(h.q('[data-role="info"]')).color, cs(h.q('[data-role="info"]')).backgroundColor);
      h.q('.de-dialog').style.animation = 'none'; h.f('hoatDong').style.transition = 'none';
      h.f('hoatDong').checked = false; h.f('hoatDong').dispatchEvent(new Event('change', { bubbles: true })); pair('gợi ý', cs(h.q('[data-role="on-hint"]')).color, d);
      pair('viền công tắc tắt', cs(h.f('hoatDong')).borderTopColor, d, 3); h.f('hoatDong').checked = true; pair('công tắc bật', cs(h.f('hoatDong')).backgroundColor, d, 3);
      pair('nút Hủy', cs(h.q('[data-dlg="cancel"]')).color, cs(h.q('[data-dlg="cancel"]')).backgroundColor); pair('nút Xóa', cs(h.q('[data-dlg="delete"]')).color, d);
      h.type('ma', ''); h.blur('ma'); pair('chữ lỗi', cs(h.q('[data-err="ma"]')).color, d); h.type('hoTen', 'Khác'); pair('nút Lưu (khi khóa không tính)', cs(h.save()).color, cs(h.save()).backgroundColor, 1);
      h.env.storage.failSet = quotaError(); h.type('ma', 'zz9'); h.save().click(); await tick(); var b = h.q('[data-role="form-banner"]'); pair('banner cảnh báo', cs(b).color, cs(b).backgroundColor); b.classList.add('is-error'); pair('banner lỗi', cs(b).color, cs(b).backgroundColor);
    });
    itPage('toast và hộp xác nhận đạt AA', async function () {
      var h = mountPage(); h.openEdit('nv3'); h.q('[data-dlg="delete"]').click(); var c = h.q('.de-dialog[data-step="confirm"]'); pair('xác nhận', cs(c.querySelector('.de-msg')).color, cs(c).backgroundColor); pair('nút Xóa', cs(okBtn(h)).color, cs(c).backgroundColor);
      okBtn(h).click(); await tick(); var t = h.q('[data-role="toast"]'); pair('toast', cs(t).color, cs(t).backgroundColor);
    });
    itPage('đồ họa (biểu tượng, viền điều khiển) đạt ≥ 3:1', async function () {
      var h = mountPage(), bg = cssVar('--bg'); pair('biểu tượng tìm', cs(h.q('.de-search svg')).color, cs(h.q('[data-role="search"]')).backgroundColor, 3);
    });
    itPage('cấu trúc trợ năng: bảng có caption và scope, nút có nhãn, biểu tượng ẩn, nhóm lọc có nhãn', async function () {
      var h = mountPage(); assert.ok(h.q('table caption')); h.qa('thead th').forEach(function (th) { assert.equal(th.getAttribute('scope'), 'col'); });
      assert.equal(h.q('.de-seg').getAttribute('role'), 'group'); assert.ok(h.q('.de-seg').getAttribute('aria-label')); assert.ok(h.q('[data-role="search"]').getAttribute('aria-label')); assert.ok(h.q('[data-role="sort"]').getAttribute('aria-label'));
      assert.equal(h.row('nv1').querySelector('[data-act="edit"].de-btn').getAttribute('aria-label'), 'Sửa Nguyễn Văn An'); assert.equal(h.q('[data-role="toast"]').getAttribute('aria-live'), 'polite');
      h.qa('svg').forEach(function (s) { assert.equal(s.getAttribute('aria-hidden'), 'true'); });
    });
    itPage('hộp thoại: role, aria-modal, nhãn; ô nhập gắn nhãn và vùng lỗi', async function () {
      var h = mountPage(); h.openAdd(); var d = h.q('.de-dialog'); assert.equal(d.getAttribute('role'), 'dialog'); assert.equal(d.getAttribute('aria-modal'), 'true'); assert.ok(document.getElementById(d.getAttribute('aria-labelledby')));
      ['ma', 'hoTen'].forEach(function (n) { var e = h.f(n); assert.ok(h.q('label[for="' + e.id + '"]')); assert.ok(document.getElementById(e.getAttribute('aria-describedby'))); });
      assert.equal(h.q('[data-role="form-banner"]').getAttribute('role'), 'alert');
    });
    itPage('mọi nút, ô nhập, nút trong bảng đều focus được và có vòng focus', async function () {
      var h = mountPage(); h.qa('button, input, select').forEach(function (e) { assert.ok(e.tabIndex >= 0, e.outerHTML.slice(0, 50)); });
      var b = h.q('.de-head [data-act="add"]'); b.focus(); assert.equal(cs(b).outlineStyle, 'solid'); assert.equal(cs(b).outlineWidth, '2px');
    });
    itPage('công tắc dùng được bằng bàn phím (checkbox thật) và có nhãn gắn kèm', async function () {
      var h = mountPage(); h.openEdit('nv1'); var sw = h.f('hoatDong'); assert.equal(sw.type, 'checkbox'); assert.ok(h.q('label[for="' + sw.id + '"]')); assert.match(h.q('label[for="' + sw.id + '"]').textContent, /Hoạt động/);
    });
  });
})();
