/* Test giao diện thật (DOM + sự kiện) của form Nhập liệu chi. */
(function () {
  var M = DncModel;

  describe('giao diện – hiển thị ban đầu (DESIGN 4.3)', function () {
    itForm('tiêu đề, nút và thứ tự trường đúng thiết kế', async function () {
      var h = mountForm();
      assert.equal(h.q('.dn-title').textContent, 'Thêm đề nghị chi');
      assert.equal(h.q('[data-act="submit"]').textContent, 'Gửi đề nghị');
      assert.equal(h.q('[data-act="cancel"]').textContent, 'Hủy');
      var order = h.qa('[data-field]').map(function (e) { return e.getAttribute('data-field'); });
      assert.deepEqual(order, ['nhanVienId', 'nhaCungCap', 'danhMuc', 'soLuong', 'donGia', 'ngay', 'ghiChu']);
      var pos = function (s) { return h.q(s).compareDocumentPosition(h.q('[data-role="total"]')); };
      assert.ok(pos('[data-field="donGia"]') & Node.DOCUMENT_POSITION_FOLLOWING, 'Thành tiền nằm sau Đơn giá');
      assert.ok(h.q('[data-role="total"]').compareDocumentPosition(h.f('ngay')) & Node.DOCUMENT_POSITION_FOLLOWING, 'Ngày nằm sau Thành tiền');
    });
    itForm('ngày mặc định là hôm nay, giới hạn min/max, form chưa có lỗi', async function () {
      var h = mountForm();
      assert.equal(h.f('ngay').value, TODAY);
      assert.equal(h.f('ngay').max, TODAY);
      assert.equal(h.f('ngay').min, '2000-01-01');
      M.FIELD_ORDER.forEach(function (f) { assert.equal(h.err(f), '', f); });
      assert.equal(h.banner(), '');
      assert.equal(h.total(), '—');
    });
    itForm('có đủ 7 danh mục dạng nhóm radio, chưa chọn mục nào', async function () {
      var h = mountForm();
      assert.equal(h.qa('input[type=radio]').length, 7);
      assert.equal(h.qa('input[type=radio]:checked').length, 0);
      assert.equal(h.q('[role=radiogroup]') !== null, true);
      assert.deepEqual(h.qa('.dn-chip-in').map(function (e) { return e.textContent.trim(); }),
        ['Văn phòng phẩm', 'Vật tư', 'Thiết bị', 'Vận chuyển', 'Tiếp khách', 'Dịch vụ', 'Khác']);
      assert.equal(h.qa('.dn-chip-in svg').length, 7);
    });
    itForm('ô người đề nghị liệt kê nhân viên đang hoạt động (không có người đã ngưng)', async function () {
      var h = mountForm();
      var opts = h.qa('[data-field="nhanVienId"] option').map(function (o) { return o.textContent; });
      assert.deepEqual(opts, ['Chọn người đề nghị…', 'NV001 · Nguyễn Văn An', 'NV002 · Trần Thị Bình']);
    });
    itForm('nhãn gắn đúng ô nhập (for/id) và bàn phím số trên điện thoại', async function () {
      var h = mountForm();
      ['nhanVienId', 'nhaCungCap', 'soLuong', 'donGia', 'ngay', 'ghiChu'].forEach(function (f) {
        var id = h.f(f).id;
        assert.ok(id, f + ' có id');
        assert.ok(h.q('label[for="' + id + '"]'), f + ' có nhãn');
      });
      assert.equal(h.f('soLuong').getAttribute('inputmode'), 'decimal');
      assert.equal(h.f('donGia').getAttribute('inputmode'), 'numeric');
    });
    itForm('hai lần mount cùng lúc không trùng id phần tử', async function () {
      var a = mountForm(), b = mountForm();
      assert.notEqual(a.f('soLuong').id, b.f('soLuong').id);
      assert.notEqual(a.qa('input[type=radio]')[0].name, b.qa('input[type=radio]')[0].name);
      a.pick('vat_tu');
      assert.equal(b.qa('input[type=radio]:checked').length, 0, 'chọn ở form A không ảnh hưởng form B');
    });
  });

  describe('giao diện – thành tiền & mặt nạ nhập', function () {
    itForm('thành tiền cập nhật theo từng lần gõ', async function () {
      var h = mountForm();
      h.type('soLuong', '10');
      assert.equal(h.total(), '—', 'thiếu đơn giá');
      h.type('donGia', '45000');
      assert.equal(h.total(), '450.000 ₫');
      assert.equal(h.q('[data-role="total-val"]').getAttribute('data-value'), '450000');
      h.type('soLuong', '2,5');
      assert.equal(h.total(), '112.500 ₫');
      h.type('soLuong', 'abc');
      assert.equal(h.total(), '—');
      h.type('soLuong', '0');
      assert.equal(h.total(), '—');
    });
    itForm('thành tiền làm tròn đúng với số lượng lẻ', async function () {
      var h = mountForm();
      h.type('soLuong', '0,333'); h.type('donGia', '3');
      assert.equal(h.total(), '1 ₫');
      h.type('soLuong', '1,1'); h.type('donGia', '30000');
      assert.equal(h.total(), '33.000 ₫');
    });
    itForm('đơn giá tự thêm dấu chấm hàng nghìn khi gõ', async function () {
      var h = mountForm();
      h.type('donGia', '1500000');
      assert.equal(h.f('donGia').value, '1.500.000');
      h.type('donGia', '999');
      assert.equal(h.f('donGia').value, '999');
      h.type('donGia', '1000');
      assert.equal(h.f('donGia').value, '1.000');
    });
    itForm('dán "1.250.000đ" hoặc ký tự lạ vào đơn giá được làm sạch', async function () {
      var h = mountForm();
      h.type('donGia', '1.250.000đ');
      assert.equal(h.f('donGia').value, '1.250.000');
      h.type('donGia', 'abc');
      assert.equal(h.f('donGia').value, '');
      h.type('donGia', '-5');
      assert.equal(h.f('donGia').value, '5');
      h.type('donGia', '0005');
      assert.equal(h.f('donGia').value, '5');
    });
    itForm('đơn giá quá lớn vẫn hiện nhưng báo lỗi, thành tiền là —', async function () {
      var h = mountForm();
      h.type('soLuong', '1');
      h.type('donGia', '2000000000');
      h.blur('donGia');
      assert.match(h.err('donGia'), /tối đa/);
      assert.equal(h.total(), '—');
    });
    itForm('thành tiền cực đại hiển thị đúng, không thành 1e+15', async function () {
      var h = mountForm();
      h.type('soLuong', '1000000'); h.type('donGia', '1000000000');
      assert.equal(h.total(), '1.000.000.000.000.000 ₫');
    });
    itForm('bộ đếm ghi chú đếm đúng và đổi cảnh báo khi quá 500', async function () {
      var h = mountForm();
      assert.equal(h.q('[data-role="count"]').textContent, '0/500');
      h.type('ghiChu', 'xin chào');
      assert.equal(h.q('[data-role="count"]').textContent, '8/500');
      h.type('ghiChu', '😀'.repeat(3));
      assert.equal(h.q('[data-role="count"]').textContent, '3/500');
      h.type('ghiChu', 'a'.repeat(501));
      assert.ok(h.q('[data-role="count"]').classList.contains('is-over'));
      h.type('ghiChu', 'a'.repeat(500));
      assert.equal(h.q('[data-role="count"]').classList.contains('is-over'), false);
    });
  });

  describe('giao diện – chọn danh mục', function () {
    itForm('bấm một chip thì chỉ chip đó được chọn', async function () {
      var h = mountForm();
      h.pick('thiet_bi');
      assert.equal(h.q('input[type=radio]:checked').value, 'thiet_bi');
      h.pick('khac');
      assert.equal(h.qa('input[type=radio]:checked').length, 1);
      assert.equal(h.q('input[type=radio]:checked').value, 'khac');
    });
    itForm('bấm vào nhãn chữ của chip cũng chọn được (vùng chạm)', async function () {
      var h = mountForm();
      h.qa('.dn-chip')[3].click();
      assert.equal(h.q('input[type=radio]:checked').value, 'van_chuyen');
    });
    itForm('chip cao ≥ 44px (vùng chạm)', async function () {
      var h = mountForm();
      var r = h.q('.dn-chip-in').getBoundingClientRect();
      assert.ok(r.height >= 44, 'cao ' + r.height);
    });
    itForm('chọn danh mục xóa lỗi danh mục đã hiện', async function () {
      var h = mountForm();
      h.submit();
      assert.equal(h.err('danhMuc'), 'Chọn danh mục');
      h.pick('vat_tu');
      assert.equal(h.err('danhMuc'), '');
    });
  });

  describe('giao diện – kiểm tra dữ liệu khi gửi', function () {
    itForm('gửi form trống: báo lỗi mọi trường bắt buộc, không ghi gì, focus vào ô lỗi đầu tiên', async function () {
      var h = mountForm();
      h.submit();
      await tick();
      assert.equal(h.err('nhanVienId'), 'Chọn người đề nghị');
      assert.match(h.err('nhaCungCap'), /Nhập nhà cung cấp/);
      assert.equal(h.err('danhMuc'), 'Chọn danh mục');
      assert.equal(h.err('soLuong'), 'Nhập số lượng');
      assert.equal(h.err('donGia'), 'Nhập đơn giá');
      assert.equal(h.err('ngay'), '');
      assert.equal(h.err('ghiChu'), '');
      assert.equal(h.f('nhanVienId').getAttribute('aria-invalid'), 'true');
      assert.equal(h.f('ngay').getAttribute('aria-invalid'), null);
      assert.equal(document.activeElement, h.f('nhanVienId'));
      assert.equal(h.env.storage.sets, 0);
      assert.equal(h.env.store.listDeNghi().data.length, 0);
      assert.equal(h.toastText(), '');
    });
    itForm('focus nhảy tới ô lỗi đầu tiên theo thứ tự form', async function () {
      var h = mountForm();
      h.choose('nv1'); h.type('nhaCungCap', 'x'); h.pick('khac');
      h.type('soLuong', '0'); h.type('donGia', '100');
      h.submit(); await tick();
      assert.equal(document.activeElement, h.f('soLuong'));
      assert.match(h.err('soLuong'), /lớn hơn 0/);
      h.type('soLuong', '1'); h.type('donGia', '');
      h.submit(); await tick();
      assert.equal(document.activeElement, h.f('donGia'));
    });
    itForm('lỗi gắn với ô qua aria-describedby và có vai trò đọc được', async function () {
      var h = mountForm();
      h.submit();
      var f = h.f('soLuong');
      var ids = f.getAttribute('aria-describedby');
      assert.ok(ids);
      assert.equal(document.getElementById(ids).textContent, 'Nhập số lượng');
    });
    itForm('rời ô (blur) chỉ hiện lỗi của chính ô đó, chưa hiện lỗi ô khác', async function () {
      var h = mountForm();
      h.f('soLuong').focus(); h.f('soLuong').blur();
      assert.equal(h.err('soLuong'), 'Nhập số lượng');
      assert.equal(h.err('donGia'), '');
      assert.equal(h.err('nhaCungCap'), '');
    });
    itForm('đang sửa ô có lỗi: lỗi biến mất ngay khi nhập đúng', async function () {
      var h = mountForm();
      h.submit();
      assert.ok(h.err('nhaCungCap'));
      h.type('nhaCungCap', 'Giấy');
      assert.equal(h.err('nhaCungCap'), '');
      assert.equal(h.f('nhaCungCap').getAttribute('aria-invalid'), null);
    });
    itForm('ô chưa chạm tới không hiện lỗi khi người dùng đang gõ ô khác', async function () {
      var h = mountForm();
      h.type('soLuong', 'abc');
      assert.equal(h.err('soLuong'), '', 'chưa blur thì chưa báo');
      h.blur('soLuong');
      assert.match(h.err('soLuong'), /không hợp lệ/);
    });
    itForm('ngày tương lai bị chặn khi gửi', async function () {
      var h = mountForm();
      h.fillValid({ ngay: '2026-11-03' });
      h.submit(); await tick();
      assert.match(h.err('ngay'), /tương lai/);
      assert.equal(h.env.store.listDeNghi().data.length, 0);
    });
    itForm('xóa trống ngày → lỗi "Chọn ngày"', async function () {
      var h = mountForm();
      h.fillValid();
      h.f('ngay').value = '';
      h.submit(); await tick();
      assert.equal(h.err('ngay'), 'Chọn ngày');
    });
    itForm('ghi chú quá 500 ký tự bị chặn; đúng 500 thì qua', async function () {
      var h = mountForm();
      h.fillValid({ gc: 'g'.repeat(501) });
      h.submit(); await tick();
      assert.match(h.err('ghiChu'), /500/);
      assert.equal(h.env.store.listDeNghi().data.length, 0);
      h.type('ghiChu', 'g'.repeat(500));
      h.submit(); await tick();
      assert.equal(h.env.store.listDeNghi().data.length, 1);
    });
    itForm('nhà cung cấp 121 ký tự bị chặn', async function () {
      var h = mountForm();
      h.fillValid({ ncc: 'n'.repeat(121) });
      h.submit(); await tick();
      assert.match(h.err('nhaCungCap'), /120/);
    });
  });

  describe('giao diện – gửi đề nghị thành công', function () {
    itForm('lưu đúng dữ liệu, trạng thái Chờ duyệt, báo toast, đặt lại form, bắn sự kiện', async function () {
      var h = mountForm();
      h.fillValid({ nv: 'nv2', ncc: '  Giấy  A4  Hồng Hà ', dm: 'van_phong_pham', sl: '2,5', dg: '45.000', gc: 'Gấp' });
      h.submit();
      await tick();
      var list = h.env.store.listDeNghi().data;
      assert.equal(list.length, 1);
      var x = list[0];
      assert.equal(x.nhanVienId, 'nv2');
      assert.equal(x.nhaCungCap, 'Giấy A4 Hồng Hà');
      assert.equal(x.danhMuc, 'van_phong_pham');
      assert.equal(x.soLuong, 2.5);
      assert.equal(x.donGia, 45000);
      assert.equal(x.ngay, TODAY);
      assert.equal(x.ghiChu, 'Gấp');
      assert.equal(x.trangThai, 'cho_duyet');
      assert.equal(M.thanhTienOf(x), 112500);
      assert.equal(h.toastText(), 'Đã gửi đề nghị · Chờ duyệt');
      assert.equal(h.calls.saved.length, 1);
      assert.equal(h.calls.saved[0].id, x.id);
      assert.equal(h.calls.events.length, 1);
      assert.equal(h.calls.events[0].source, 'entry');
      assert.equal(h.calls.events[0].action, 'add');
      assert.equal(h.calls.events[0].id, x.id);
      // form đã đặt lại, giữ người đề nghị
      assert.equal(h.f('nhaCungCap').value, '');
      assert.equal(h.f('soLuong').value, '');
      assert.equal(h.f('donGia').value, '');
      assert.equal(h.f('ghiChu').value, '');
      assert.equal(h.qa('input[type=radio]:checked').length, 0);
      assert.equal(h.f('ngay').value, TODAY);
      assert.equal(h.f('nhanVienId').value, 'nv2');
      assert.equal(h.total(), '—');
      M.FIELD_ORDER.forEach(function (f) { assert.equal(h.err(f), '', f); });
      assert.equal(document.activeElement, h.f('nhaCungCap'));
    });
    itForm('gửi nhiều đề nghị liên tiếp: mỗi lần một bản ghi, id khác nhau', async function () {
      var h = mountForm();
      for (var i = 0; i < 5; i++) { h.fillValid({ ncc: 'Món ' + i }); h.submit(); await tick(); }
      var ids = h.env.store.listDeNghi().data.map(function (x) { return x.id; });
      assert.equal(ids.length, 5);
      assert.equal(new Set(ids).size, 5);
    });
    itForm('bấm gửi hai lần nhanh khi đang lưu chỉ tạo một bản ghi (chống bấm đôi)', async function () {
      var calls = 0;
      var h = mountForm({
        wrapStore: function (s) {
          return Object.assign({}, s, {
            add: function (v, o) { calls++; return new Promise(function (res) { setTimeout(function () { res(s.add(v, o)); }, 20); }); }
          });
        }
      });
      h.fillValid();
      h.submit(); h.submit(); h.fireSubmit(); h.fireSubmit();
      assert.equal(h.q('[data-act="submit"]').getAttribute('aria-busy'), 'true');
      assert.equal(h.q('[data-act="submit"]').disabled, true);
      assert.equal(h.q('[data-act="cancel"]').disabled, true);
      await tick(60);
      assert.equal(calls, 1);
      assert.equal(h.env.store.listDeNghi().data.length, 1);
      assert.equal(h.q('[data-act="submit"]').hasAttribute('aria-busy'), false);
      assert.equal(h.q('[data-act="submit"]').disabled, false);
    });
    itForm('Enter trong ô văn bản gửi form (submit)', async function () {
      var h = mountForm();
      h.fillValid();
      var ev = new Event('submit', { bubbles: true, cancelable: true });
      h.q('form').dispatchEvent(ev);
      await tick();
      assert.equal(ev.defaultPrevented, true);
      assert.equal(h.env.store.listDeNghi().data.length, 1);
    });
    itForm('toast tự ẩn sau 4 giây', async function () {
      var h = mountForm();
      h.fillValid(); h.submit(); await tick();
      assert.ok(h.toastText());
      await tick(4100);
      assert.equal(h.toastText(), '');
    });
  });

  describe('giao diện – lỗi lưu trữ (DESIGN 9.2): không mất dữ liệu đã nhập', function () {
    itForm('bộ nhớ đầy: hiện banner, giữ nguyên dữ liệu, nút gửi dùng lại được, thử lại thành công', async function () {
      var h = mountForm();
      h.fillValid({ ncc: 'Giấy quan trọng', sl: '3', dg: '120000', gc: 'đừng mất' });
      h.env.storage.failSet = quotaError();
      h.submit(); await tick();
      assert.match(h.banner(), /đã đầy/);
      assert.equal(h.f('nhaCungCap').value, 'Giấy quan trọng');
      assert.equal(h.f('soLuong').value, '3');
      assert.equal(h.f('donGia').value, '120.000');
      assert.equal(h.f('ghiChu').value, 'đừng mất');
      assert.equal(h.q('input[type=radio]:checked').value, 'van_phong_pham');
      assert.equal(h.q('[data-act="submit"]').disabled, false);
      assert.equal(h.toastText(), '');
      assert.equal(h.calls.saved.length, 0);
      assert.equal(h.calls.events.length, 0);
      h.env.storage.failSet = null;
      h.submit(); await tick();
      assert.equal(h.banner(), '', 'banner biến mất khi thử lại');
      assert.equal(h.env.store.listDeNghi().data.length, 1);
      assert.equal(h.env.store.listDeNghi().data[0].nhaCungCap, 'Giấy quan trọng');
    });
    itForm('trình duyệt chặn lưu trữ: banner nêu rõ nguyên nhân', async function () {
      var h = mountForm();
      h.fillValid();
      var e = new Error('x'); e.name = 'SecurityError'; h.env.storage.failSet = e;
      h.submit(); await tick();
      assert.match(h.banner(), /chặn lưu trữ/);
      assert.equal(h.q('[data-act="submit"]').disabled, false);
    });
    itForm('dữ liệu đã lưu bị hỏng: banner lỗi, không ghi đè', async function () {
      var h = mountForm();
      h.env.storage.m[DncStore.KEY_DN] = '{hỏng';
      h.fillValid(); h.submit(); await tick();
      assert.match(h.banner(), /Không đọc được dữ liệu/);
      assert.ok(h.q('[data-role="banner"]').classList.contains('is-error'));
      assert.equal(h.env.storage.m[DncStore.KEY_DN], '{hỏng');
    });
    itForm('store ném ngoại lệ: hiện banner, không treo nút gửi', async function () {
      var h = mountForm({ wrapStore: function (s) { return Object.assign({}, s, { add: function () { throw new Error('boom'); } }); } });
      h.fillValid(); h.submit(); await tick();
      assert.match(h.banner(), /Có lỗi khi lưu/);
      assert.equal(h.q('[data-act="submit"]').disabled, false);
      assert.equal(h.ctrl.getState().saving, false);
    });
    itForm('store trả Promise bị từ chối: xử lý như lỗi', async function () {
      var h = mountForm({ wrapStore: function (s) { return Object.assign({}, s, { add: function () { return Promise.reject(new Error('x')); } }); } });
      h.fillValid(); h.submit(); await tick();
      assert.match(h.banner(), /Có lỗi khi lưu/);
      assert.equal(h.q('[data-act="submit"]').disabled, false);
    });
    itForm('store báo invalid kèm lỗi theo trường: hiện lỗi dưới ô', async function () {
      var h = mountForm({ wrapStore: function (s) { return Object.assign({}, s, { add: function () { return { ok: false, error: 'invalid', errors: { donGia: 'Đơn giá phải là số nguyên đồng' } }; } }); } });
      h.fillValid(); h.submit(); await tick();
      assert.equal(h.err('donGia'), 'Đơn giá phải là số nguyên đồng');
      assert.equal(document.activeElement, h.f('donGia'));
    });
  });

  describe('giao diện – hủy và thay đổi chưa lưu', function () {
    itForm('hủy khi chưa nhập gì: gọi onCancel ngay, không hỏi', async function () {
      var h = mountForm();
      h.q('[data-act="cancel"]').click(); await tick();
      assert.equal(h.calls.cancel, 1);
      assert.equal(h.dialog(), null);
    });
    itForm('hủy khi đã nhập: hỏi xác nhận; "Tiếp tục sửa" giữ nguyên dữ liệu', async function () {
      var h = mountForm();
      h.type('nhaCungCap', 'Đang nhập dở');
      h.q('[data-act="cancel"]').click(); await tick();
      assert.ok(h.dialog(), 'có hộp thoại');
      assert.match(h.dialog().textContent, /Bỏ các thay đổi\?/);
      h.q('[data-dlg="cancel"]').click(); await tick();
      assert.equal(h.dialog(), null);
      assert.equal(h.calls.cancel, 0);
      assert.equal(h.f('nhaCungCap').value, 'Đang nhập dở');
    });
    itForm('hủy → "Bỏ thay đổi": gọi onCancel', async function () {
      var h = mountForm();
      h.type('soLuong', '5');
      h.q('[data-act="cancel"]').click(); await tick();
      h.q('[data-dlg="ok"]').click(); await tick();
      assert.equal(h.calls.cancel, 1);
      assert.equal(h.dialog(), null);
    });
    itForm('hộp thoại: Esc đóng như "Tiếp tục sửa"; focus ban đầu ở nút an toàn; trả focus về nút Hủy', async function () {
      var h = mountForm();
      h.type('soLuong', '5');
      var cancelBtn = h.q('[data-act="cancel"]');
      cancelBtn.focus(); cancelBtn.click(); await tick();
      assert.equal(document.activeElement, h.q('[data-dlg="cancel"]'));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await tick();
      assert.equal(h.dialog(), null);
      assert.equal(h.calls.cancel, 0);
      assert.equal(document.activeElement, cancelBtn);
    });
    itForm('hộp thoại giữ focus bên trong khi bấm Tab', async function () {
      var h = mountForm();
      h.type('soLuong', '5');
      h.q('[data-act="cancel"]').click(); await tick();
      var okBtn = h.q('[data-dlg="ok"]');
      okBtn.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      assert.equal(document.activeElement, h.q('[data-dlg="cancel"]'));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
      assert.equal(document.activeElement, okBtn);
      h.q('[data-dlg="cancel"]').click();
    });
    itForm('hộp thoại có role dialog, aria-modal và nhãn', async function () {
      var h = mountForm();
      h.type('soLuong', '5');
      h.q('[data-act="cancel"]').click(); await tick();
      var d = h.q('[role="dialog"]');
      assert.equal(d.getAttribute('aria-modal'), 'true');
      assert.ok(document.getElementById(d.getAttribute('aria-labelledby')).textContent.length > 0);
      h.q('[data-dlg="cancel"]').click();
    });
    itForm('sau khi gửi thành công, hủy không còn hỏi (đã lưu)', async function () {
      var h = mountForm();
      h.fillValid(); h.submit(); await tick();
      h.q('[data-act="cancel"]').click(); await tick();
      assert.equal(h.dialog(), null);
      assert.equal(h.calls.cancel, 1);
    });
    itForm('không có onCancel (chạy độc lập): hủy sau khi xác nhận sẽ đặt lại form', async function () {
      var h = mountForm({ noCancel: true });
      h.type('nhaCungCap', 'abc'); h.type('soLuong', '2');
      h.q('[data-act="cancel"]').click(); await tick();
      h.q('[data-dlg="ok"]').click(); await tick();
      assert.equal(h.f('nhaCungCap').value, '');
      assert.equal(h.f('soLuong').value, '');
    });
    itForm('chỉ đổi khoảng trắng/dấu phân cách không bị coi là thay đổi', async function () {
      var h = mountForm();
      h.type('nhaCungCap', '   ');
      h.q('[data-act="cancel"]').click(); await tick();
      assert.equal(h.dialog(), null);
      assert.equal(h.calls.cancel, 1);
    });
  });

  describe('giao diện – vai trò và trạng thái đặc biệt', function () {
    itForm('chưa có nhân viên: thông báo, ô chọn bị khóa, nút gửi vô hiệu, gửi không ghi gì', async function () {
      var h = mountForm({ nhanVien: [] });
      assert.ok(h.q('[data-role="no-employee"]'));
      assert.match(h.q('[data-role="no-employee"]').textContent, /Chưa có nhân viên/);
      assert.equal(h.f('nhanVienId').disabled, true);
      assert.equal(h.q('[data-act="submit"]').disabled, true);
      var ev = h.fireSubmit();
      await tick();
      assert.equal(ev.defaultPrevented, true, 'sự kiện submit có tới trình xử lý');
      assert.equal(h.env.storage.sets, 0);
      assert.equal(h.env.store.listDeNghi().data.length, 0);
    });
    itForm('chưa có khóa nhân viên trong storage: coi như chưa có nhân viên', async function () {
      var h = mountForm({ nhanVien: null });
      assert.ok(h.q('[data-role="no-employee"]'));
    });
    itForm('chỉ còn nhân viên đã ngưng hoạt động: coi như chưa có nhân viên', async function () {
      var h = mountForm({ nhanVien: [{ id: 'z', ma: 'Z', hoTen: 'Z', hoatDong: false }] });
      assert.ok(h.q('[data-role="no-employee"]'));
    });
    itForm('vai trò Quản lý: không có form, hiện giải thích', async function () {
      var h = mountForm({ session: { vaiTro: 'quan_ly' } });
      assert.equal(h.q('form'), null);
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'role');
      assert.match(h.q('[data-role="blocked"]').textContent, /Chỉ Nhân viên/);
      assert.equal(h.ctrl.getState().blocked.code, 'role');
    });
    itForm('vai trò Nhân viên: người đề nghị được chọn sẵn và khóa; gửi lưu đúng người đó', async function () {
      var h = mountForm({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv2' } });
      assert.equal(h.f('nhanVienId').value, 'nv2');
      assert.equal(h.f('nhanVienId').disabled, true);
      h.fillValid(); h.submit(); await tick();
      var list = h.env.store.listDeNghi().data;
      assert.equal(list.length, 1);
      assert.equal(list[0].nhanVienId, 'nv2');
      assert.equal(h.f('nhanVienId').value, 'nv2', 'giữ nguyên sau khi gửi');
    });
    itForm('vai trò Nhân viên nhưng nhân viên đó đã ngưng/không tồn tại: chặn với giải thích', async function () {
      var h = mountForm({ session: { vaiTro: 'nhan_vien', nhanVienId: 'nv3' } });
      assert.equal(h.q('form'), null);
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'session');
      var h2 = mountForm({ session: { vaiTro: 'nhan_vien', nhanVienId: 'khong_co' } });
      assert.equal(h2.q('form'), null);
    });
    itForm('dữ liệu nhân viên hỏng: chặn với thông báo, không ném lỗi', async function () {
      var env = makeStore();
      env.storage.m[DncStore.KEY_NV] = 'hỏng';
      var h = mountForm({ env: env });
      assert.equal(h.q('form'), null);
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'corrupt');
    });
    itForm('trình duyệt chặn đọc storage: chặn với thông báo', async function () {
      var env = makeStore();
      env.storage.failGet = true;
      var h = mountForm({ env: env });
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'blocked');
    });
    itForm('khối bị chặn có nút "Quay lại" khi có onCancel', async function () {
      var h = mountForm({ session: { vaiTro: 'quan_ly' } });
      h.q('[data-act="cancel"]').click(); await tick();
      assert.equal(h.calls.cancel, 1);
    });
  });

  describe('giao diện – chế độ sửa (F-08)', function () {
    function seed(over) {
      var env = makeStore();
      var item = env.store.add(sample(over)).item;
      return { env: env, item: item };
    }
    itForm('điền sẵn đúng dữ liệu, tiêu đề và nút theo chế độ sửa', async function () {
      var s = seed({ soLuong: 2.5, donGia: 1500000, ghiChu: 'Ghi chú cũ', nhaCungCap: 'Cty ABC', danhMuc: 'thiet_bi' });
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id });
      assert.equal(h.q('.dn-title').textContent, 'Sửa đề nghị chi');
      assert.equal(h.q('[data-act="submit"]').textContent, 'Lưu thay đổi');
      assert.equal(h.f('nhanVienId').value, 'nv1');
      assert.equal(h.f('nhaCungCap').value, 'Cty ABC');
      assert.equal(h.q('input[type=radio]:checked').value, 'thiet_bi');
      assert.equal(h.f('soLuong').value, '2,5');
      assert.equal(h.f('donGia').value, '1.500.000');
      assert.equal(h.f('ngay').value, '2026-11-01');
      assert.equal(h.f('ghiChu').value, 'Ghi chú cũ');
      assert.equal(h.total(), '3.750.000 ₫');
      assert.equal(h.q('[data-role="count"]').textContent, '10/500');
    });
    itForm('lưu thay đổi cập nhật đúng khoản, không tạo bản ghi mới, bắn sự kiện update', async function () {
      var s = seed();
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id });
      h.type('nhaCungCap', 'Đã sửa'); h.type('soLuong', '4');
      h.submit(); await tick();
      var list = s.env.store.listDeNghi().data;
      assert.equal(list.length, 1);
      assert.equal(list[0].id, s.item.id);
      assert.equal(list[0].nhaCungCap, 'Đã sửa');
      assert.equal(list[0].soLuong, 4);
      assert.equal(list[0].trangThai, 'cho_duyet');
      assert.equal(h.toastText(), 'Đã lưu thay đổi');
      assert.equal(h.calls.events[0].action, 'update');
      assert.equal(h.f('nhaCungCap').value, 'Đã sửa', 'giữ nguyên giá trị sau khi lưu');
      h.q('[data-act="cancel"]').click(); await tick();
      assert.equal(h.dialog(), null, 'đã lưu thì hủy không hỏi');
    });
    itForm('sửa không đổi gì rồi hủy: không hỏi', async function () {
      var s = seed();
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id });
      h.q('[data-act="cancel"]').click(); await tick();
      assert.equal(h.dialog(), null);
      assert.equal(h.calls.cancel, 1);
    });
    itForm('sửa rồi hủy → xác nhận bỏ: khoản gốc không đổi', async function () {
      var s = seed();
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id });
      h.type('nhaCungCap', 'Không lưu');
      h.q('[data-act="cancel"]').click(); await tick();
      h.q('[data-dlg="ok"]').click(); await tick();
      assert.equal(s.env.store.get(s.item.id).item.nhaCungCap, 'Giấy A4');
    });
    itForm('sửa vẫn kiểm tra hợp lệ như thêm mới', async function () {
      var s = seed();
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id });
      h.type('soLuong', '0'); h.type('donGia', '');
      h.submit(); await tick();
      assert.match(h.err('soLuong'), /lớn hơn 0/);
      assert.equal(h.err('donGia'), 'Nhập đơn giá');
      assert.equal(s.env.store.get(s.item.id).item.soLuong, 10);
    });
    ['da_duyet', 'tu_choi'].forEach(function (st) {
      itForm('khoản ' + st + ' bị khóa: không mở được form sửa', async function () {
        var env = makeStore({ deNghi: [Object.assign(sample(), { id: 'k1', trangThai: st })] });
        var h = mountForm({ env: env, mode: 'edit', id: 'k1' });
        assert.equal(h.q('form'), null);
        assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'locked');
        assert.match(h.q('[data-role="blocked"]').textContent, /không thể chỉnh sửa/);
      });
    });
    itForm('khoản đã bị xử lý trong lúc đang mở form: lưu bị từ chối với banner, dữ liệu nhập giữ nguyên', async function () {
      var s = seed();
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id });
      var all = JSON.parse(s.env.storage.m[DncStore.KEY_DN]);
      all[0].trangThai = 'da_duyet';
      s.env.storage.m[DncStore.KEY_DN] = JSON.stringify(all);
      h.type('nhaCungCap', 'Cố sửa');
      h.submit(); await tick();
      assert.match(h.banner(), /đã được xử lý/);
      assert.equal(h.f('nhaCungCap').value, 'Cố sửa');
      assert.equal(s.env.store.get(s.item.id).item.nhaCungCap, 'Giấy A4');
    });
    itForm('id không tồn tại: thông báo không tìm thấy', async function () {
      var h = mountForm({ mode: 'edit', id: 'khong_co' });
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'notfound');
    });
    itForm('nhân viên không được sửa khoản của người khác', async function () {
      var s = seed({ nhanVienId: 'nv1' });
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id, session: { vaiTro: 'nhan_vien', nhanVienId: 'nv2' } });
      assert.equal(h.q('form'), null);
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'forbidden');
    });
    itForm('nhân viên sửa khoản của chính mình được', async function () {
      var s = seed({ nhanVienId: 'nv2' });
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id, session: { vaiTro: 'nhan_vien', nhanVienId: 'nv2' } });
      assert.ok(h.q('form'));
      h.type('nhaCungCap', 'Của tôi'); h.submit(); await tick();
      assert.equal(s.env.store.get(s.item.id).item.nhaCungCap, 'Của tôi');
    });
    itForm('quản lý không sửa nội dung đề nghị', async function () {
      var s = seed();
      var h = mountForm({ env: s.env, mode: 'edit', id: s.item.id, session: { vaiTro: 'quan_ly' } });
      assert.equal(h.q('form'), null);
    });
    itForm('nhân viên đã ngưng hoạt động vẫn hiện tên (kèm "ngưng") khi sửa khoản cũ', async function () {
      var env = makeStore({ deNghi: [Object.assign(sample({ nhanVienId: 'nv3' }), { id: 'o1', trangThai: 'cho_duyet' })] });
      var h = mountForm({ env: env, mode: 'edit', id: 'o1' });
      assert.equal(h.f('nhanVienId').value, 'nv3');
      assert.match(h.f('nhanVienId').selectedOptions[0].textContent, /ngưng/);
    });
  });

  describe('giao diện – an toàn (XSS) và độ bền', function () {
    itForm('nội dung chứa HTML được lưu nguyên văn và không tạo phần tử/chạy script', async function () {
      window.__xss = 0;
      var h = mountForm();
      var evil = '<img src=x onerror="window.__xss=1"><script>window.__xss=2<\/script>';
      h.fillValid({ ncc: evil, gc: '<b>đậm</b>' });
      h.submit(); await tick(20);
      assert.equal(h.env.store.listDeNghi().data[0].nhaCungCap, evil);
      assert.equal(window.__xss, 0);
      assert.equal(h.box.querySelectorAll('img').length, 0);
    });
    itForm('tên nhân viên chứa HTML được thoát ký tự trong danh sách chọn', async function () {
      window.__xss = 0;
      var env = makeStore({ nhanVien: [{ id: 'e', ma: '<i>1</i>', hoTen: '<img src=x onerror="window.__xss=1">Tèo', hoatDong: true }] });
      var h = mountForm({ env: env });
      await tick(20);
      assert.equal(window.__xss, 0);
      assert.equal(h.box.querySelectorAll('img').length, 0);
      assert.match(h.f('nhanVienId').options[1].textContent, /<img src=x/);
    });
    itForm('lỗi trong form dựng từ dữ liệu không bị diễn giải thành HTML', async function () {
      var h = mountForm();
      h.type('nhaCungCap', '<b>' + 'x'.repeat(130));
      h.blur('nhaCungCap');
      assert.match(h.err('nhaCungCap'), /120/);
      assert.equal(h.box.querySelectorAll('b').length, 0);
    });
    itForm('destroy gỡ giao diện và listener; sự kiện sau đó không gây lỗi', async function () {
      var h = mountForm();
      var form = h.q('form');
      var input = h.f('nhaCungCap');
      h.ctrl.destroy();
      assert.equal(h.box.innerHTML, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      var ev = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(ev);
      await tick();
      assert.equal(ev.defaultPrevented, false, 'listener đã được gỡ');
      assert.equal(h.env.storage.sets, 0);
      assert.equal(h.ctrl.getState().destroyed, true);
    });
    itForm('hủy form (destroy) khi đang lưu bất đồng bộ không gây lỗi', async function () {
      var h = mountForm({
        wrapStore: function (s) { return Object.assign({}, s, { add: function (v, o) { return new Promise(function (r) { setTimeout(function () { r(s.add(v, o)); }, 10); }); } }); }
      });
      h.fillValid(); h.submit();
      h.ctrl.destroy();
      await tick(40);
      assert.equal(h.calls.saved.length, 0, 'không gọi onSaved sau khi đã hủy');
    });
    itForm('chuỗi rất dài trong ô nhập không làm chậm hoặc treo', async function () {
      var h = mountForm();
      var t0 = Date.now();
      h.type('ghiChu', 'x'.repeat(200000));
      h.type('nhaCungCap', 'y'.repeat(200000));
      h.submit(); await tick();
      assert.ok(Date.now() - t0 < 2000);
      assert.match(h.err('ghiChu'), /500/);
    });
  });

  describe('giao diện – kiểu dáng theo DESIGN (bố cục, màu, font)', function () {
    function cs(el) { return getComputedStyle(el); }
    itForm('ô nhập cao 48px, bo 10px, cỡ chữ ≥ 16px (không bị zoom trên iOS)', async function () {
      var h = mountForm();
      ['nhaCungCap', 'soLuong', 'donGia', 'ngay', 'nhanVienId'].forEach(function (f) {
        var el = h.f(f);
        assert.equal(Math.round(el.getBoundingClientRect().height), 48, f + ' cao ' + el.getBoundingClientRect().height);
        assert.equal(cs(el).borderTopLeftRadius, '10px', f);
        assert.ok(parseFloat(cs(el).fontSize) >= 16, f + ' cỡ chữ ' + cs(el).fontSize);
      });
    });
    itForm('tiêu đề 22px đậm 700; nhãn 13px/500; font hệ thống', async function () {
      var h = mountForm();
      var t = cs(h.q('.dn-title'));
      assert.equal(t.fontSize, '22px'); assert.equal(t.fontWeight, '700');
      var l = cs(h.q('.dn-label'));
      assert.equal(l.fontSize, '13px'); assert.equal(l.fontWeight, '500');
      assert.match(cs(h.box).fontFamily, /system-ui|-apple-system|Segoe UI|Roboto|Arial/);
    });
    itForm('số tiền căn phải, dùng chữ số đều nét (tabular-nums)', async function () {
      var h = mountForm();
      ['soLuong', 'donGia'].forEach(function (f) {
        assert.equal(cs(h.f(f)).textAlign, 'right', f);
        assert.match(cs(h.f(f)).fontVariantNumeric, /tabular-nums/, f);
      });
      var tv = cs(h.q('[data-role="total-val"]'));
      assert.equal(tv.fontSize, '22px'); assert.equal(tv.fontWeight, '700');
      assert.equal(tv.textAlign, 'right');
      assert.match(tv.fontVariantNumeric, /tabular-nums/);
    });
    itForm('khung form rộng tối đa 560px', async function () {
      var h = mountForm();
      h.box.style.width = '1200px';
      assert.ok(h.q('.dn-main').getBoundingClientRect().width <= 560);
    });
    itForm('nút chính nền primary, chữ primary-contrast (theo chế độ sáng/tối), cao ≥ 44px', async function () {
      var h = mountForm();
      var b = h.q('[data-act="submit"]');
      assert.equal(cs(b).backgroundColor, isDark() ? 'rgb(108, 155, 255)' : 'rgb(47, 111, 237)', 'nền primary');
      assert.equal(cs(b).color, isDark() ? 'rgb(11, 18, 32)' : 'rgb(255, 255, 255)', 'chữ primary-contrast');
      assert.ok(b.getBoundingClientRect().height >= 44);
      assert.ok(h.q('[data-act="cancel"]').getBoundingClientRect().height >= 44);
    });
    itForm('hàng Số lượng/Đơn giá chia 40/60 cùng một hàng', async function () {
      var h = mountForm();
      var a = h.f('soLuong').getBoundingClientRect(), b = h.f('donGia').getBoundingClientRect();
      assert.equal(Math.round(a.top), Math.round(b.top), 'cùng hàng');
      assert.ok(Math.abs(a.width / (a.width + b.width) - 0.4) < 0.03, 'tỉ lệ ' + a.width / (a.width + b.width));
    });
    itForm('[điện thoại] không cuộn ngang; nút gửi/hủy dính đáy; chip cuộn ngang trên một hàng', async function () {
      if (!isMobile()) skip();
      var h = mountForm();
      h.box.style.width = 'auto';
      var de = document.documentElement;
      assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang ' + de.scrollWidth + ' > ' + de.clientWidth);
      assert.equal(cs(h.q('.dn-actions')).position, 'sticky');
      var tops = h.qa('.dn-chip').map(function (c) { return Math.round(c.getBoundingClientRect().top); });
      assert.equal(new Set(tops).size, 1, 'tất cả chip cùng một hàng: ' + tops);
      assert.equal(cs(h.q('.dn-chips')).overflowX, 'auto');
      assert.ok(h.q('[data-act="submit"]').getBoundingClientRect().width >= window.innerWidth * 0.5, 'nút gửi đủ rộng');
    });
    itForm('[điện thoại] mọi ô nhập và nút nằm trọn trong chiều rộng màn hình', async function () {
      if (!isMobile()) skip();
      var h = mountForm();
      h.box.style.width = 'auto';
      h.qa('[data-field]:not([role=radiogroup]), .dn-btn, .dn-total').forEach(function (e) {
        var r = e.getBoundingClientRect();
        assert.ok(r.left >= 0 && r.right <= window.innerWidth + 0.5, (e.getAttribute('data-field') || e.className) + ' ra ngoài: ' + r.left + '..' + r.right);
      });
    });
    itForm('[laptop] chip danh mục xếp lưới 4 cột, không tràn; nút không dính đáy; không cuộn ngang', async function () {
      if (!isDesktop()) skip();
      var h = mountForm();
      h.box.style.width = 'auto';
      var de = document.documentElement;
      assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang trang');
      var grid = h.q('.dn-chips');
      assert.equal(cs(grid).display, 'grid');
      assert.ok(grid.scrollWidth <= grid.clientWidth + 1, 'lưới chip tràn: ' + grid.scrollWidth + ' > ' + grid.clientWidth);
      var chips = h.qa('.dn-chip');
      var tops = chips.map(function (c) { return Math.round(c.getBoundingClientRect().top); });
      assert.equal(tops[0], tops[3], '4 chip đầu cùng hàng');
      assert.ok(tops[4] > tops[3], 'chip thứ 5 xuống hàng 2');
      var gr = grid.getBoundingClientRect();
      chips.forEach(function (c) {
        var r = c.getBoundingClientRect();
        assert.ok(r.left >= gr.left - 1 && r.right <= gr.right + 1, c.textContent.trim() + ' ra ngoài lưới');
        assert.ok(r.height >= 44, 'cao ' + r.height);
      });
      assert.equal(cs(h.q('.dn-actions')).position, 'static');
      assert.ok(h.q('.dn-main').getBoundingClientRect().width <= 560);
    });
    itForm('biến màu của DESIGN được áp dụng (nền trang, chữ, viền ô nhập)', async function () {
      var h = mountForm();
      var root = cs(document.documentElement);
      var expectLight = { '--surface-2': '#EEF0F4', '--border': '#DDE1E8', '--text': '#14181F', '--danger': '#B3261E', '--status-pending': '#8A5A00' };
      var dark = matchMedia('(prefers-color-scheme: dark)').matches;
      if (!dark) Object.keys(expectLight).forEach(function (k) {
        assert.equal(root.getPropertyValue(k).trim().toUpperCase(), expectLight[k], k);
      });
      assert.equal(cs(h.f('nhaCungCap')).backgroundColor, dark ? 'rgb(34, 38, 48)' : 'rgb(238, 240, 244)');
    });
    itForm('ô lỗi có viền màu danger', async function () {
      var h = mountForm();
      h.submit();
      assert.equal(cs(h.f('soLuong')).borderTopColor, matchMedia('(prefers-color-scheme: dark)').matches ? 'rgb(242, 118, 109)' : 'rgb(179, 38, 30)');
    });
  });

  describe('giao diện – tương phản màu (WCAG AA ≥ 4.5:1 cho chữ thường)', function () {
    function cs(el) { return getComputedStyle(el); }
    function bgOf(el) {
      while (el) {
        var c = cs(el).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        el = el.parentElement;
      }
      return cs(document.body).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'rgb(255,255,255)' : cs(document.body).backgroundColor;
    }
    function pair(name, fg, bg, min) {
      var r = contrast(fg, bg);
      assert.ok(r >= (min || 4.5), name + ': ' + r.toFixed(2) + ':1 (' + fg + ' trên ' + bg + ')');
    }
    itForm('nhãn, chữ ô nhập, nút chính, nút phụ, chip, lỗi, banner, thành tiền, bộ đếm, gợi ý', async function () {
      var h = mountForm();
      // Nhãn, bộ đếm, lỗi nằm trực tiếp trên nền trang (--bg), không phải --surface.
      var surface = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      pair('nhãn', cs(h.q('.dn-label')).color, surface);
      pair('chữ ô nhập', cs(h.f('nhaCungCap')).color, cs(h.f('nhaCungCap')).backgroundColor);
      pair('nút chính', cs(h.q('[data-act="submit"]')).color, cs(h.q('[data-act="submit"]')).backgroundColor);
      pair('nút phụ', cs(h.q('[data-act="cancel"]')).color, cs(h.q('[data-act="cancel"]')).backgroundColor);
      pair('chip chưa chọn', cs(h.q('.dn-chip-in')).color, cs(h.q('.dn-chip-in')).backgroundColor);
      h.pick('vat_tu');
      var sel = h.q('input:checked + .dn-chip-in');
      pair('chip đã chọn', cs(sel).color, cs(sel).backgroundColor);
      pair('thành tiền', cs(h.q('[data-role="total-val"]')).color, cs(h.q('[data-role="total"]')).backgroundColor, 3);
      pair('dòng phụ thành tiền', cs(h.q('.dn-total-sub')).color, cs(h.q('[data-role="total"]')).backgroundColor);
      pair('bộ đếm', cs(h.q('[data-role="count"]')).color, surface);
      h.submit();
      var e = h.q('[data-err="soLuong"]');
      pair('chữ lỗi', cs(e).color, surface);
      h.env.storage.failSet = quotaError();
      h.fillValid(); h.submit(); await tick();
      var b = h.q('[data-role="banner"]');
      pair('banner cảnh báo', cs(b).color, cs(b).backgroundColor);
      b.classList.add('is-error');
      pair('banner lỗi', cs(b).color, cs(b).backgroundColor);
    });
    itForm('toast: chữ trên nền', async function () {
      var h = mountForm();
      h.fillValid(); h.submit(); await tick();
      var t = h.q('[data-role="toast"]');
      pair('toast', cs(t).color, cs(t).backgroundColor);
    });
  });

  describe('giao diện – trợ năng', function () {
    itForm('nhóm danh mục có chú thích (legend) và các radio cùng tên', async function () {
      var h = mountForm();
      assert.ok(h.q('fieldset legend'));
      var names = new Set(h.qa('input[type=radio]').map(function (r) { return r.name; }));
      assert.equal(names.size, 1);
    });
    itForm('toast và banner có vùng thông báo cho trình đọc màn hình', async function () {
      var h = mountForm();
      assert.equal(h.q('[data-role="toast"]').getAttribute('aria-live'), 'polite');
      assert.equal(h.q('[data-role="banner"]').getAttribute('role'), 'alert');
    });
    itForm('mọi ô nhập đều có thể focus bằng bàn phím và có vòng focus', async function () {
      var h = mountForm();
      h.qa('[data-field]').forEach(function (e) {
        if (e.getAttribute('role') === 'radiogroup') return;
        assert.ok(e.tabIndex >= 0, e.getAttribute('data-field'));
      });
      assert.ok(h.qa('.dn-chip input').every(function (i) { return i.tabIndex >= 0; }));
    });
    itForm('chip radio vẫn nhận focus dù ẩn trực quan (không dùng display:none)', async function () {
      var h = mountForm();
      var r = h.q('.dn-chip input');
      r.focus();
      assert.equal(document.activeElement, r);
    });
  });
})();
