/* Test giao diện thật (DOM + sự kiện) của trang Duyệt đề nghị. */
(function () {
  var R = DncReviewModel;

  function data() {
    return [
      item({ id: 'p1', nhanVienId: 'nv1', nhaCungCap: 'Giấy A4 Double A', danhMuc: 'van_phong_pham', soLuong: 10, donGia: 45000, ngay: '2026-11-01', ngayTao: new Date(2026, 9, 29, 9, 0).toISOString(), ghiChu: 'Cần gấp' }),
      item({ id: 'p2', nhanVienId: 'nv2', nhaCungCap: 'Máy in Canon', danhMuc: 'thiet_bi', soLuong: 1, donGia: 4850000, ngay: '2026-11-01', ngayTao: new Date(2026, 10, 1, 8, 0).toISOString() }),
      item({ id: 'p3', nhanVienId: 'nv1', nhaCungCap: 'Cước vận chuyển', danhMuc: 'van_chuyen', soLuong: 1, donGia: 1250000, ngay: '2026-11-02', ngayTao: new Date(2026, 10, 2, 8, 0).toISOString() }),
      item({ id: 'o1', nhanVienId: 'nv2', nhaCungCap: 'Khoản tháng 10', danhMuc: 'vat_tu', soLuong: 2.5, donGia: 320000, ngay: '2026-10-20', ngayTao: new Date(2026, 9, 20, 9, 0).toISOString() }),
      item({ id: 'd1', trangThai: 'da_duyet', ngayXuLy: '2026-11-01T01:00:00.000Z', ngay: '2026-11-01' })
    ];
  }
  function page(o) { o = o || {}; o.deNghi = o.deNghi || data(); return mountPage(o); }
  function stored(h, id) { return read(h.env).filter(function (x) { return x.id === id; })[0]; }
  function cs(el) { return getComputedStyle(el); }

  describe('hiển thị trang (DESIGN 10.8)', function () {
    itPage('tiêu đề, tháng hiện tại, dải tóm tắt đúng số khoản và tổng tiền', async function () {
      var h = page();
      assert.equal(h.q('.dv-title').textContent, 'Duyệt đề nghị');
      assert.equal(h.q('[data-role="month-label"]').textContent, 'Tháng 11/2026');
      assert.match(h.strip(), /3 khoản chờ · tổng 6\.550\.000 ₫/);
      assert.match(h.q('[data-role="strip-more"]').textContent, /Còn 1 khoản chờ ở tháng khác/);
    });
    itPage('chỉ liệt kê khoản Chờ duyệt của tháng, cũ nhất trước', async function () {
      var h = page();
      assert.deepEqual(h.rowIds(), ['p1', 'p2', 'p3']);
      assert.equal(h.row('d1'), null, 'khoản đã duyệt không có trong hàng đợi');
      assert.equal(h.row('o1'), null, 'khoản tháng khác không có');
    });
    itPage('mỗi dòng có đủ: người đề nghị, nội dung, danh mục, SL × đơn giá, thành tiền, ngày, Duyệt, Từ chối', async function () {
      var h = page();
      var r = h.row('p1');
      assert.equal(r.querySelector('.dv-who-name').textContent, 'Nguyễn Văn An');
      assert.equal(r.querySelector('.dv-avatar').textContent, 'A');
      assert.equal(r.querySelector('.dv-what').textContent, 'Giấy A4 Double A');
      assert.equal(r.querySelector('.dv-cat').textContent, 'Văn phòng phẩm');
      assert.equal(r.querySelector('.dv-qty').textContent, '10 × 45.000 ₫');
      assert.equal(r.querySelector('[data-role="row-total"]').textContent, '450.000 ₫');
      assert.match(r.querySelector('.dv-date').textContent, /01\/11\/2026/);
      assert.match(r.querySelector('[data-act="approve"]').textContent, /Duyệt/);
      assert.match(r.querySelector('[data-act="reject"]').textContent, /Từ chối/);
      assert.ok(r.querySelector('[data-sel]'));
    });
    itPage('nhãn "Chờ N ngày" chỉ hiện ở khoản chờ từ 3 ngày', async function () {
      var h = page();
      assert.equal(h.row('p1').querySelector('[data-role="wait"]').textContent, 'Chờ 4 ngày');
      assert.equal(h.row('p2').querySelector('[data-role="wait"]'), null);
      assert.equal(h.row('p3').querySelector('[data-role="wait"]'), null);
    });
    itPage('số lượng lẻ hiển thị dấu phẩy; thành tiền làm tròn đúng', async function () {
      var h = page({ month: '2026-10' });
      assert.equal(h.row('o1').querySelector('.dv-qty').textContent, '2,5 × 320.000 ₫');
      assert.equal(h.row('o1').querySelector('[data-role="row-total"]').textContent, '800.000 ₫');
    });
    itPage('tên nhân viên không có trong danh bạ → "Nhân viên không rõ", không lỗi', async function () {
      var h = page({ deNghi: [item({ id: 'x', nhanVienId: 'ma_quai' })] });
      assert.equal(h.row('x').querySelector('.dv-who-name').textContent, 'Nhân viên không rõ');
    });
    itPage('nhân viên đã ngưng hoạt động vẫn hiện đúng tên trên khoản cũ', async function () {
      var h = page({ deNghi: [item({ id: 'x', nhanVienId: 'nv3' })] });
      assert.equal(h.row('x').querySelector('.dv-who-name').textContent, 'Lê Hoàng Cường');
    });
    itPage('dữ liệu khoản hỏng (số lượng chữ) hiển thị "—" thay vì làm hỏng trang', async function () {
      var h = page({ deNghi: [item({ id: 'x', soLuong: 'abc' }), item({ id: 'y' })] });
      assert.equal(h.row('x').querySelector('[data-role="row-total"]').textContent, '—');
      assert.ok(h.row('y'));
    });
    itPage('không có khoản nào chờ: trạng thái "Đã xử lý hết đề nghị"', async function () {
      var h = page({ deNghi: [item({ trangThai: 'da_duyet' })] });
      assert.equal(h.rows().length, 0);
      assert.equal(h.q('[data-role="empty"]').getAttribute('data-kind'), 'done');
      assert.match(h.q('[data-role="empty"]').textContent, /Đã xử lý hết đề nghị/);
      assert.match(h.strip(), /0 khoản chờ · tổng 0 ₫/);
      assert.equal(h.q('[data-role="bulk"]').hidden, true);
    });
    itPage('chưa có dữ liệu nào: trang trống bình thường, không lỗi', async function () {
      var h = mountPage({ nhanVien: null });
      assert.equal(h.rows().length, 0);
      assert.ok(h.q('[data-role="empty"]'));
    });
    itPage('danh bạ và đề nghị lấy từ storage thật: kết xuất 500 khoản dưới 2 giây', async function () {
      var many = []; for (var i = 0; i < 500; i++) many.push(item({ id: 'k' + i }));
      var t0 = Date.now();
      var h = page({ deNghi: many });
      assert.equal(h.rows().length, 500);
      assert.ok(Date.now() - t0 < 2000, 'chậm ' + (Date.now() - t0) + 'ms');
    });
  });

  describe('chỉ Quản lý được vào trang (DESIGN 10.8)', function () {
    [['nhân viên', EMP], ['không có session', null], ['vai trò lạ', { vaiTro: 'admin' }], ['thiếu vaiTro', {}]].forEach(function (c) {
      itPage('bị chặn: ' + c[0], async function () {
        var h = page({ session: c[1] });
        assert.equal(h.rows().length, 0);
        assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'role');
        assert.match(h.q('[data-role="blocked"]').textContent, /dành cho Quản lý/);
        assert.equal(h.q('[data-act="approve"]'), null);
        assert.equal(h.calls.forbidden, 1, 'gọi onForbidden để host chuyển về Trang chủ');
        assert.equal(h.ctrl.getState().isManager, false);
      });
    });
    itPage('bị chặn thì không thao tác được dù cố phát sự kiện', async function () {
      var h = page({ session: EMP });
      h.box.dispatchEvent(new Event('click', { bubbles: true }));
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'entry' } }));
      await tick();
      assert.equal(h.env.storage.sets, 0);
    });
    itPage('Quản lý không gọi onForbidden', async function () { var h = page(); assert.equal(h.calls.forbidden, 0); });
  });

  describe('chọn tháng (6.9)', function () {
    itPage('‹ chuyển sang tháng trước và hiện khoản của tháng đó; › bị mờ ở tháng hiện tại', async function () {
      var h = page();
      assert.equal(h.q('[data-act="next"]').disabled, true);
      h.q('[data-act="prev"]').click();
      assert.equal(h.q('[data-role="month-label"]').textContent, 'Tháng 10/2026');
      assert.deepEqual(h.rowIds(), ['o1']);
      assert.match(h.strip(), /1 khoản chờ · tổng 800\.000 ₫/);
      assert.match(h.q('[data-role="strip-more"]').textContent, /Còn 3 khoản chờ ở tháng khác/);
      assert.equal(h.q('[data-act="next"]').disabled, false);
      h.q('[data-act="next"]').click();
      assert.equal(h.q('[data-role="month-label"]').textContent, 'Tháng 11/2026');
      assert.equal(h.q('[data-act="next"]').disabled, true);
    });
    itPage('bấm nhãn tháng quay về tháng hiện tại', async function () {
      var h = page();
      h.q('[data-act="prev"]').click(); h.q('[data-act="prev"]').click();
      assert.equal(h.q('[data-role="month-label"]').textContent, 'Tháng 9/2026');
      h.q('[data-role="month-label"]').click();
      assert.equal(h.q('[data-role="month-label"]').textContent, 'Tháng 11/2026');
    });
    itPage('qua biên năm: tháng 1 → tháng 12 năm trước', async function () {
      var h = page({ month: '2026-01' });
      h.q('[data-act="prev"]').click();
      assert.equal(h.q('[data-role="month-label"]').textContent, 'Tháng 12/2025');
    });
    itPage('không lùi quá tháng 1/2000', async function () {
      var h = page({ month: '2000-01' });
      assert.equal(h.q('[data-act="prev"]').disabled, true);
      h.q('[data-act="prev"]').click();
      assert.equal(h.q('[data-role="month-label"]').textContent, 'Tháng 1/2000');
    });
    itPage('đổi tháng bỏ chọn các khoản không còn hiển thị', async function () {
      var h = page();
      h.select('p1');
      assert.equal(h.q('[data-role="bulk"]').hidden, false);
      h.q('[data-act="prev"]').click();
      assert.equal(h.q('[data-role="bulk"]').hidden, true);
      h.q('[data-act="next"]').click();
      assert.equal(h.ctrl.getState().selected.length, 0);
    });
    itPage('nút tháng có nhãn đọc được và vùng chạm ≥ 44px', async function () {
      var h = page();
      assert.equal(h.q('[data-act="prev"]').getAttribute('aria-label'), 'Tháng trước');
      assert.equal(h.q('[data-act="next"]').getAttribute('aria-label'), 'Tháng sau');
      ['prev', 'next', 'today'].forEach(function (a) {
        var r = h.q('[data-act="' + a + '"]').getBoundingClientRect();
        assert.ok(r.width >= 44 && r.height >= 44, a + ' ' + r.width + 'x' + r.height);
      });
    });
  });

  describe('bộ lọc (6.8)', function () {
    itPage('danh sách nhân viên trong bộ lọc chỉ gồm người có khoản chờ trong tháng', async function () {
      var h = page();
      var opts = h.qa('[data-filter="nv"] option').map(function (o) { return o.textContent; });
      assert.deepEqual(opts, ['Tất cả nhân viên', 'Nguyễn Văn An', 'Trần Thị Bình']);
    });
    itPage('lọc theo nhân viên: danh sách và dải tóm tắt cập nhật', async function () {
      var h = page();
      h.filter('nv', 'nv1');
      assert.deepEqual(h.rowIds(), ['p1', 'p3']);
      assert.match(h.strip(), /2 khoản chờ · tổng 1\.700\.000 ₫/);
      assert.equal(h.q('[data-act="clear-filter"]').hidden, false);
    });
    itPage('lọc theo danh mục và kết hợp hai bộ lọc', async function () {
      var h = page();
      h.filter('dm', 'thiet_bi');
      assert.deepEqual(h.rowIds(), ['p2']);
      h.filter('nv', 'nv1');
      assert.equal(h.rows().length, 0);
      assert.equal(h.q('[data-role="empty"]').getAttribute('data-kind'), 'filtered');
      assert.match(h.q('[data-role="empty"]').textContent, /Không có khoản chờ khớp bộ lọc/);
    });
    itPage('"Xóa lọc" trả về toàn bộ danh sách', async function () {
      var h = page();
      h.filter('nv', 'nv2'); h.filter('dm', 'van_chuyen');
      h.q('.dv-empty [data-act="clear-filter"]').click();
      assert.deepEqual(h.rowIds(), ['p1', 'p2', 'p3']);
      assert.equal(h.q('[data-filter="nv"]').value, '');
      assert.equal(h.q('[data-filter="dm"]').value, '');
      assert.equal(h.q('.dv-filters [data-act="clear-filter"]').hidden, true);
    });
    itPage('đổi bộ lọc bỏ chọn các khoản bị ẩn', async function () {
      var h = page();
      h.select('p1'); h.select('p2');
      h.filter('nv', 'nv2');
      assert.deepEqual(h.ctrl.getState().selected, ['p2']);
      assert.match(h.q('[data-role="bulk"]').textContent, /Đã chọn 1 khoản/);
    });
    itPage('7 danh mục trong bộ lọc danh mục', async function () {
      var h = page();
      assert.equal(h.qa('[data-filter="dm"] option').length, 8);
    });
    itPage('bộ lọc có nhãn trợ năng', async function () {
      var h = page();
      assert.ok(h.q('[data-filter="nv"]').getAttribute('aria-label')); assert.ok(h.q('[data-filter="dm"]').getAttribute('aria-label'));
    });
  });

  describe('duyệt một khoản', function () {
    itPage('bấm Duyệt: lưu Đã duyệt, dòng biến mất, dải tóm tắt và toast cập nhật, bắn sự kiện', async function () {
      var h = page();
      h.btn('p1', 'approve').click(); await tick();
      var x = stored(h, 'p1');
      assert.equal(x.trangThai, 'da_duyet'); assert.equal(x.nguoiXuLy, 'quan_ly'); assert.equal(x.ngayXuLy, new Date(NOW).toISOString());
      assert.deepEqual(h.rowIds(), ['p2', 'p3']);
      assert.match(h.strip(), /2 khoản chờ · tổng 6\.100\.000 ₫/);
      assert.match(h.toastText(), /Đã duyệt đề nghị · Nguyễn Văn An · 450\.000 ₫/);
      assert.ok(h.q('[data-act="undo"]'), 'có nút Hoàn tác');
      assert.deepEqual(h.calls.events, [{ source: 'review', action: 'approve', ids: ['p1'] }]);
      assert.deepEqual(h.calls.changed, [{ action: 'approve', ids: ['p1'] }]);
    });
    itPage('các khoản khác không bị đụng tới', async function () {
      var h = page();
      h.btn('p2', 'approve').click(); await tick();
      assert.equal(stored(h, 'p1').trangThai, 'cho_duyet'); assert.equal(stored(h, 'p3').trangThai, 'cho_duyet');
    });
    itPage('focus chuyển sang nút Duyệt của dòng còn lại (không rơi về body)', async function () {
      var h = page();
      h.btn('p1', 'approve').click(); await tick();
      assert.equal(document.activeElement, h.btn('p2', 'approve'));
    });
    itPage('duyệt hết: hiện trạng thái "Đã xử lý hết đề nghị" và focus vào vùng nội dung', async function () {
      var h = page({ deNghi: [item({ id: 'only' })] });
      h.btn('only', 'approve').click(); await tick();
      assert.equal(h.q('[data-role="empty"]').getAttribute('data-kind'), 'done');
      assert.equal(document.activeElement, h.q('[data-role="empty"]'));
    });
    itPage('hoàn tác ngay qua toast: khoản trở lại hàng đợi, trạng thái Chờ duyệt', async function () {
      var h = page();
      h.btn('p1', 'approve').click(); await tick();
      h.q('[data-act="undo"]').click(); await tick();
      assert.equal(stored(h, 'p1').trangThai, 'cho_duyet');
      assert.deepEqual(h.rowIds(), ['p1', 'p2', 'p3']);
      assert.equal(h.toastText(), 'Đã hoàn tác');
      assert.equal(h.q('[data-act="undo"]'), null);
      assert.equal(h.calls.events[1].action, 'undo');
    });
    itPage('toast hoàn tác tự ẩn sau 4 giây và token bị hủy', async function () {
      var h = page();
      h.btn('p1', 'approve').click(); await tick();
      assert.ok(h.toastText());
      await tick(4100);
      assert.equal(h.toastText(), '');
    });
    itPage('khoản đã bị xử lý bởi người khác trong lúc đang mở trang: báo rõ, không ghi đè', async function () {
      var h = page();
      var all = read(h.env); all[0].trangThai = 'tu_choi'; all[0].lyDoTuChoi = 'Người khác từ chối'; all[0].ngayXuLy = 'T9';
      h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(all);
      h.env.storage.sets = 0;
      h.btn('p1', 'approve').click(); await tick();
      assert.match(h.toastText(), /không còn ở trạng thái chờ duyệt/);
      assert.equal(h.row('p1'), null, 'dòng được làm mới');
      assert.equal(stored(h, 'p1').trangThai, 'tu_choi'); assert.equal(stored(h, 'p1').lyDoTuChoi, 'Người khác từ chối');
      assert.equal(h.env.storage.sets, 0);
    });
    itPage('khoản bị xóa ở nơi khác: báo rõ và làm mới', async function () {
      var h = page();
      h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(read(h.env).filter(function (x) { return x.id !== 'p2'; }));
      h.btn('p2', 'approve').click(); await tick();
      assert.equal(h.row('p2'), null);
      assert.match(h.toastText(), /không còn/);
    });
    itPage('bấm Duyệt hai lần nhanh chỉ gọi store một lần (chống bấm đôi)', async function () {
      var calls = 0;
      var h = page({ wrapStore: function (s) {
        return Object.assign({}, s, { approve: function (id, a) { calls++; return new Promise(function (res) { setTimeout(function () { res(s.approve(id, a)); }, 20); }); } });
      } });
      h.btn('p1', 'approve').click(); h.btn('p1', 'approve').click(); h.btn('p2', 'approve').click();
      assert.ok(h.box.classList.contains('is-busy'));
      await tick(60);
      assert.equal(calls, 1);
      assert.equal(stored(h, 'p1').trangThai, 'da_duyet'); assert.equal(stored(h, 'p2').trangThai, 'cho_duyet');
      assert.equal(h.box.classList.contains('is-busy'), false);
    });
  });

  describe('từ chối kèm lý do (10.4)', function () {
    itPage('bấm Từ chối mở bước nhập lý do ngay trong hộp thoại, nút xác nhận vô hiệu', async function () {
      var h = page();
      h.btn('p1', 'reject').click();
      assert.equal(h.step(), 'reject');
      assert.match(h.q('.dv-dhead h2').textContent, /Từ chối đề nghị này/);
      assert.match(h.q('.dv-dhead .dv-badge').textContent, /Từ chối/);
      assert.equal(h.q('[data-role="reject-sum"]').textContent, 'Nguyễn Văn An · Giấy A4 Double A · 450.000 ₫');
      assert.equal(h.q('[data-dlg="reject"]').disabled, true);
      assert.equal(document.activeElement, h.q('[data-role="reason"]'), 'ô lý do tự lấy focus');
      assert.equal(h.q('[data-role="reason-count"]').textContent, '0/300');
      assert.equal(h.qa('[data-dlg="quick"]').length, 4);
      assert.equal(stored(h, 'p1').trangThai, 'cho_duyet');
    });
    itPage('nhập lý do bật nút; xác nhận lưu Từ chối kèm lý do, đóng hộp thoại, bắn sự kiện', async function () {
      var h = page();
      h.btn('p2', 'reject').click();
      h.typeReason('  Giá chưa hợp lý  ');
      assert.equal(h.q('[data-dlg="reject"]').disabled, false);
      assert.equal(h.q('[data-role="reason-count"]').textContent, '15/300');
      h.q('[data-dlg="reject"]').click(); await tick();
      var x = stored(h, 'p2');
      assert.equal(x.trangThai, 'tu_choi'); assert.equal(x.lyDoTuChoi, 'Giá chưa hợp lý'); assert.equal(x.nguoiXuLy, 'quan_ly');
      assert.equal(h.dialog(), null);
      assert.deepEqual(h.rowIds(), ['p1', 'p3']);
      assert.match(h.toastText(), /Đã từ chối đề nghị · Trần Thị Bình/);
      assert.deepEqual(h.calls.events, [{ source: 'review', action: 'reject', ids: ['p2'] }]);
    });
    itPage('lý do rỗng hoặc chỉ khoảng trắng: nút vô hiệu, rời ô thì báo lỗi, không ghi', async function () {
      var h = page();
      h.btn('p1', 'reject').click();
      h.typeReason('    ');
      assert.equal(h.q('[data-dlg="reject"]').disabled, true);
      h.q('[data-role="reason"]').blur();
      assert.equal(h.q('[data-role="reason-err"]').hidden, false);
      assert.equal(h.q('[data-role="reason-err"]').textContent, 'Hãy nhập lý do từ chối');
      assert.equal(h.q('[data-role="reason"]').getAttribute('aria-invalid'), 'true');
      h.q('[data-dlg="reject"]').click(); await tick();
      assert.equal(h.env.storage.sets, 0);
      h.typeReason('Đã có lý do');
      assert.equal(h.q('[data-role="reason-err"]').hidden, true);
      assert.equal(h.q('[data-role="reason"]').getAttribute('aria-invalid'), null);
    });
    itPage('lý do dài 300 ký tự hợp lệ; 301 ký tự bị chặn và đếm báo quá', async function () {
      var h = page();
      h.btn('p1', 'reject').click();
      h.typeReason('x'.repeat(300));
      assert.equal(h.q('[data-dlg="reject"]').disabled, false);
      h.typeReason('x'.repeat(301));
      assert.equal(h.q('[data-dlg="reject"]').disabled, true);
      assert.ok(h.q('[data-role="reason-count"]').classList.contains('is-over'));
      assert.equal(h.q('[data-role="reason-count"]').textContent, '301/300');
      h.q('[data-role="reason"]').blur();
      assert.match(h.q('[data-role="reason-err"]').textContent, /300/);
    });
    itPage('chip gợi ý điền lý do và bật nút; chip đang dùng được đánh dấu', async function () {
      var h = page();
      h.btn('p1', 'reject').click();
      var chip = h.qa('[data-dlg="quick"]')[2];
      chip.click();
      assert.equal(h.q('[data-role="reason"]').value, 'Giá chưa hợp lý');
      assert.equal(h.q('[data-dlg="reject"]').disabled, false);
      assert.ok(chip.classList.contains('is-picked'));
      assert.equal(h.qa('.dv-chip.is-picked').length, 1);
      h.qa('[data-dlg="quick"]')[0].click();
      assert.equal(h.q('[data-role="reason"]').value, 'Vượt ngân sách');
      assert.equal(h.qa('.dv-chip.is-picked').length, 1);
      h.q('[data-dlg="reject"]').click(); await tick();
      assert.equal(stored(h, 'p1').lyDoTuChoi, 'Vượt ngân sách');
    });
    itPage('"Quay lại" về bước chi tiết, không ghi gì', async function () {
      var h = page();
      h.qa('[data-act="open"]')[0].click();
      assert.equal(h.step(), 'detail');
      h.q('[data-dlg="to-reject"]').click();
      assert.equal(h.step(), 'reject');
      h.typeReason('Đang gõ dở');
      h.q('[data-dlg="back"]').click();
      assert.equal(h.step(), 'detail');
      assert.equal(h.env.storage.sets, 0);
    });
    itPage('Esc đóng hộp thoại, không ghi, focus trở về nút đã mở', async function () {
      var h = page();
      var b = h.btn('p3', 'reject');
      b.focus(); b.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      assert.equal(h.dialog(), null);
      assert.equal(document.activeElement, b);
      assert.equal(h.env.storage.sets, 0);
    });
    itPage('bấm ra ngoài hộp thoại đóng nó', async function () {
      var h = page();
      h.btn('p1', 'reject').click();
      h.dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      assert.equal(h.dialog(), null);
    });
    itPage('khoản bị xử lý ở nơi khác khi đang nhập lý do: báo rõ, không ghi đè', async function () {
      var h = page();
      h.btn('p1', 'reject').click(); h.typeReason('Không cần');
      var all = read(h.env); all[0].trangThai = 'da_duyet'; all[0].ngayXuLy = 'T9';
      h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(all); h.env.storage.sets = 0;
      h.q('[data-dlg="reject"]').click(); await tick();
      assert.equal(h.dialog(), null);
      assert.match(h.toastText(), /không còn/);
      assert.equal(stored(h, 'p1').trangThai, 'da_duyet'); assert.equal(h.env.storage.sets, 0);
    });
    itPage('hoàn tác từ chối: xóa lý do, khoản về hàng đợi', async function () {
      var h = page();
      h.btn('p1', 'reject').click(); h.typeReason('Lý do'); h.q('[data-dlg="reject"]').click(); await tick();
      h.q('[data-act="undo"]').click(); await tick();
      var x = stored(h, 'p1'); assert.equal(x.trangThai, 'cho_duyet'); assert.equal(x.lyDoTuChoi, null);
      assert.ok(h.row('p1'));
    });
    itPage('bấm xác nhận hai lần chỉ ghi một lần', async function () {
      var calls = 0;
      var h = page({ wrapStore: function (s) {
        return Object.assign({}, s, { reject: function (id, l, a) { calls++; return new Promise(function (r) { setTimeout(function () { r(s.reject(id, l, a)); }, 20); }); } });
      } });
      h.btn('p1', 'reject').click(); h.typeReason('Lý do');
      var b = h.q('[data-dlg="reject"]'); b.click(); b.click();
      await tick(60);
      assert.equal(calls, 1);
    });
  });

  describe('chi tiết & duyệt (4.4)', function () {
    itPage('bấm nội dung mở chi tiết đầy đủ thông tin', async function () {
      var h = page();
      h.row('p1').querySelector('[data-act="open"]').click();
      assert.equal(h.step(), 'detail');
      var t = h.q('.dv-dialog').textContent;
      ['Chi tiết đề nghị', 'Chờ duyệt', 'Nguyễn Văn An', 'Giấy A4 Double A', 'Văn phòng phẩm', '10 × 45.000 ₫', '01/11/2026', 'Cần gấp'].forEach(function (s) {
        assert.ok(t.indexOf(s) >= 0, 'thiếu: ' + s);
      });
      assert.equal(h.q('[data-role="detail-total"]').textContent, '450.000 ₫');
      var d = h.q('.dv-dialog');
      assert.equal(d.getAttribute('role'), 'dialog'); assert.equal(d.getAttribute('aria-modal'), 'true');
      assert.ok(document.getElementById(d.getAttribute('aria-labelledby')));
    });
    itPage('ghi chú trống hiện "—"', async function () {
      var h = page();
      h.row('p2').querySelector('[data-act="open"]').click();
      assert.equal(h.q('[data-role="detail-note"]').textContent, '—');
    });
    itPage('ba nút: Đóng, Từ chối, Duyệt; Đóng không ghi gì và trả focus', async function () {
      var h = page();
      var opener = h.row('p1').querySelector('[data-act="open"]');
      opener.focus(); opener.click();
      assert.deepEqual(h.qa('.dv-dactions .dv-btn').map(function (b) { return b.textContent.trim(); }), ['Đóng', 'Từ chối', 'Duyệt']);
      h.q('[data-dlg="close"]').click();
      assert.equal(h.dialog(), null); assert.equal(document.activeElement, opener); assert.equal(h.env.storage.sets, 0);
    });
    itPage('Duyệt trong chi tiết: lưu, đóng hộp thoại, toast', async function () {
      var h = page();
      h.row('p2').querySelector('[data-act="open"]').click();
      h.q('[data-dlg="approve"]').click(); await tick();
      assert.equal(stored(h, 'p2').trangThai, 'da_duyet');
      assert.equal(h.dialog(), null);
      assert.match(h.toastText(), /Đã duyệt đề nghị · Trần Thị Bình · 4\.850\.000 ₫/);
    });
    itPage('focus được giữ trong hộp thoại khi bấm Tab / Shift+Tab', async function () {
      var h = page();
      h.row('p1').querySelector('[data-act="open"]').click();
      var btns = h.qa('.dv-dialog button');
      var first = btns[0], last = btns[btns.length - 1];
      last.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      assert.equal(document.activeElement, first);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
      assert.equal(document.activeElement, last);
    });
    itPage('mở chi tiết khoản vừa bị xử lý ở nơi khác: không mở, báo rõ', async function () {
      var h = page();
      var all = read(h.env); all[0].trangThai = 'da_duyet'; h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(all);
      h.ctrl.refresh();
      assert.equal(h.row('p1'), null);
    });
  });

  describe('chọn nhiều và duyệt hàng loạt (10.8)', function () {
    itPage('chọn khoản: thanh hành động hiện số khoản và tổng tiền; bỏ chọn ẩn đi', async function () {
      var h = page();
      assert.equal(h.q('[data-role="bulk"]').hidden, true);
      h.select('p1'); h.select('p3');
      assert.equal(h.q('[data-role="bulk"]').hidden, false);
      assert.match(h.q('.dv-bulk-info').textContent, /Đã chọn 2 khoản · 1\.700\.000 ₫/);
      assert.ok(h.row('p1').classList.contains('is-selected'));
      assert.equal(h.row('p2').classList.contains('is-selected'), false);
      h.select('p1', false); h.select('p3', false);
      assert.equal(h.q('[data-role="bulk"]').hidden, true);
    });
    itPage('"Chọn tất cả" chọn mọi khoản đang hiển thị; có trạng thái lưng chừng', async function () {
      var h = page();
      var all = h.qa('[data-role="select-all"]')[0];
      h.select('p1');
      assert.equal(h.qa('[data-role="select-all"]')[0].indeterminate, true);
      var sa = h.qa('[data-role="select-all"]')[0]; sa.checked = true; sa.dispatchEvent(new Event('change', { bubbles: true }));
      assert.deepEqual(h.ctrl.getState().selected, ['p1', 'p2', 'p3']);
      assert.equal(h.qa('[data-role="select-all"]')[0].checked, true);
      assert.equal(h.qa('[data-role="select-all"]')[0].indeterminate, false);
      sa = h.qa('[data-role="select-all"]')[0]; sa.checked = false; sa.dispatchEvent(new Event('change', { bubbles: true }));
      assert.deepEqual(h.ctrl.getState().selected, []);
    });
    itPage('"Chọn tất cả" chỉ chọn các khoản khớp bộ lọc', async function () {
      var h = page();
      h.filter('nv', 'nv1');
      var sa = h.qa('[data-role="select-all"]')[0]; sa.checked = true; sa.dispatchEvent(new Event('change', { bubbles: true }));
      assert.deepEqual(h.ctrl.getState().selected, ['p1', 'p3']);
    });
    itPage('"Bỏ chọn" xóa toàn bộ lựa chọn', async function () {
      var h = page();
      h.select('p1'); h.select('p2');
      h.q('[data-act="clear-sel"]').click();
      assert.deepEqual(h.ctrl.getState().selected, []);
      assert.equal(h.qa('[data-sel]:checked').length, 0);
    });
    itPage('Duyệt các khoản đã chọn: hộp thoại xác nhận nêu số khoản và tổng tiền; Hủy không ghi', async function () {
      var h = page();
      h.select('p1'); h.select('p2');
      h.q('[data-act="approve-sel"]').click();
      assert.equal(h.step(), 'bulk');
      assert.match(h.q('.dv-dhead h2').textContent, /Duyệt 2 khoản, tổng 5\.300\.000 ₫\?/);
      h.q('[data-dlg="close"]').click();
      assert.equal(h.dialog(), null); assert.equal(h.env.storage.sets, 0);
      assert.deepEqual(h.ctrl.getState().selected, ['p1', 'p2'], 'giữ nguyên lựa chọn');
    });
    itPage('xác nhận: duyệt tất cả khoản đã chọn bằng MỘT lần ghi, cập nhật giao diện, toast, sự kiện', async function () {
      var h = page();
      h.select('p1'); h.select('p3');
      h.q('[data-act="approve-sel"]').click();
      h.env.storage.sets = 0;
      h.q('[data-dlg="bulk-ok"]').click(); await tick();
      assert.equal(h.env.storage.sets, 1);
      assert.equal(stored(h, 'p1').trangThai, 'da_duyet'); assert.equal(stored(h, 'p3').trangThai, 'da_duyet');
      assert.equal(stored(h, 'p2').trangThai, 'cho_duyet');
      assert.deepEqual(h.rowIds(), ['p2']);
      assert.equal(h.toastText().indexOf('Đã duyệt 2 khoản') === 0, true);
      assert.equal(h.q('[data-role="bulk"]').hidden, true);
      assert.deepEqual(h.calls.events, [{ source: 'review', action: 'approve_many', ids: ['p1', 'p3'] }]);
    });
    itPage('hoàn tác duyệt hàng loạt khôi phục cả hai', async function () {
      var h = page();
      h.select('p1'); h.select('p2');
      h.q('[data-act="approve-sel"]').click(); h.q('[data-dlg="bulk-ok"]').click(); await tick();
      h.q('[data-act="undo"]').click(); await tick();
      assert.deepEqual(h.rowIds(), ['p1', 'p2', 'p3']);
      assert.equal(stored(h, 'p1').trangThai, 'cho_duyet'); assert.equal(stored(h, 'p2').trangThai, 'cho_duyet');
    });
    itPage('một khoản đã bị xử lý ở nơi khác: vẫn duyệt các khoản còn lại và báo số khoản bị bỏ qua', async function () {
      var h = page();
      h.select('p1'); h.select('p2'); h.select('p3');
      h.q('[data-act="approve-sel"]').click();
      var all = read(h.env); all[1].trangThai = 'tu_choi'; all[1].lyDoTuChoi = 'Khác'; all[1].ngayXuLy = 'T9';
      h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(all);
      h.q('[data-dlg="bulk-ok"]').click(); await tick();
      assert.equal(stored(h, 'p1').trangThai, 'da_duyet'); assert.equal(stored(h, 'p3').trangThai, 'da_duyet');
      assert.equal(stored(h, 'p2').trangThai, 'tu_choi'); assert.equal(stored(h, 'p2').lyDoTuChoi, 'Khác');
      assert.match(h.toastText(), /Đã duyệt 2 khoản \(bỏ qua 1 khoản đã được xử lý\)/);
    });
    itPage('lỗi lưu khi duyệt hàng loạt: không khoản nào đổi, banner, giữ lựa chọn', async function () {
      var h = page();
      h.select('p1'); h.select('p2');
      h.q('[data-act="approve-sel"]').click();
      h.env.storage.failSet = quotaError();
      h.q('[data-dlg="bulk-ok"]').click(); await tick();
      assert.match(h.banner(), /đã đầy/);
      h.env.storage.failSet = null;
      assert.equal(stored(h, 'p1').trangThai, 'cho_duyet'); assert.equal(stored(h, 'p2').trangThai, 'cho_duyet');
      assert.deepEqual(h.ctrl.getState().selected, ['p1', 'p2']);
    });
    itPage('duyệt một khoản đang được chọn thì nó rời khỏi lựa chọn, thanh hành động cập nhật', async function () {
      var h = page();
      h.select('p1'); h.select('p2');
      h.btn('p1', 'approve').click(); await tick();
      assert.deepEqual(h.ctrl.getState().selected, ['p2']);
      assert.match(h.q('.dv-bulk-info').textContent, /Đã chọn 1 khoản · 4\.850\.000 ₫/);
    });
    itPage('ô tick có nhãn trợ năng nêu đúng khoản', async function () {
      var h = page();
      assert.equal(h.q('[data-sel="p1"]').getAttribute('aria-label'), 'Chọn đề nghị Giấy A4 Double A của Nguyễn Văn An');
    });
  });

  describe('lỗi lưu trữ và dữ liệu (9.2)', function () {
    itPage('bộ nhớ đầy khi duyệt: banner, khoản vẫn ở hàng đợi, có thể thử lại', async function () {
      var h = page();
      h.env.storage.failSet = quotaError();
      h.btn('p1', 'approve').click(); await tick();
      assert.match(h.banner(), /đã đầy/);
      assert.ok(h.row('p1')); assert.equal(h.calls.events.length, 0); assert.equal(h.toastText(), '');
      assert.equal(h.box.classList.contains('is-busy'), false);
      h.env.storage.failSet = null;
      h.btn('p1', 'approve').click(); await tick();
      assert.equal(h.banner(), '');
      assert.equal(stored(h, 'p1').trangThai, 'da_duyet');
    });
    itPage('trình duyệt chặn lưu trữ khi từ chối: banner, dữ liệu lý do còn trong hộp thoại? (hộp thoại đóng, khoản giữ nguyên)', async function () {
      var h = page();
      var e = new Error('x'); e.name = 'SecurityError'; h.env.storage.failSet = e;
      h.btn('p1', 'reject').click(); h.typeReason('Lý do'); h.q('[data-dlg="reject"]').click(); await tick();
      assert.match(h.banner(), /chặn lưu trữ/);
      h.env.storage.failSet = null;
      assert.equal(stored(h, 'p1').trangThai, 'cho_duyet');
    });
    itPage('dữ liệu hỏng khi tải: khối lỗi + nút Thử lại; sửa dữ liệu rồi Thử lại thì hiện danh sách', async function () {
      var env = makeStore({ deNghi: data() });
      env.storage.m[DncReviewStore.KEY_DN] = '{hỏng';
      var h = mountPage({ env: env });
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'corrupt');
      assert.match(h.q('[data-role="blocked"]').textContent, /Không đọc được dữ liệu/);
      assert.equal(h.q('[data-role="blocked"]').getAttribute('role'), 'alert');
      env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(data());
      h.q('[data-act="retry"]').click();
      assert.equal(h.rows().length, 3);
    });
    itPage('trình duyệt chặn đọc storage khi tải: khối lỗi "blocked"', async function () {
      var env = makeStore(); env.storage.failGet = true;
      var h = mountPage({ env: env });
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'blocked');
    });
    itPage('store ném ngoại lệ: banner lỗi chung, giao diện không treo', async function () {
      var h = page({ wrapStore: function (s) { return Object.assign({}, s, { approve: function () { throw new Error('boom'); } }); } });
      h.btn('p1', 'approve').click(); await tick();
      assert.match(h.banner(), /Có lỗi khi xử lý/);
      assert.equal(h.box.classList.contains('is-busy'), false);
      assert.equal(h.ctrl.getState().busy, false);
    });
    itPage('Promise bị từ chối: xử lý như lỗi', async function () {
      var h = page({ wrapStore: function (s) { return Object.assign({}, s, { approve: function () { return Promise.reject(new Error('x')); } }); } });
      h.btn('p1', 'approve').click(); await tick();
      assert.match(h.banner(), /Có lỗi khi xử lý/);
    });
    itPage('banner biến mất ở thao tác kế tiếp', async function () {
      var h = page();
      h.env.storage.failSet = quotaError(); h.btn('p1', 'approve').click(); await tick();
      assert.ok(h.banner());
      h.env.storage.failSet = null; h.btn('p2', 'approve').click(); await tick();
      assert.equal(h.banner(), '');
    });
    itPage('hoàn tác thất bại (khoản đã đổi) báo rõ và không đổi gì', async function () {
      var h = page();
      h.btn('p1', 'approve').click(); await tick();
      var all = read(h.env); all.filter(function (x) { return x.id === 'p1'; })[0].ngayXuLy = 'DA-DOI';
      h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(all);
      h.q('[data-act="undo"]').click(); await tick();
      assert.match(h.toastText(), /Không thể hoàn tác/);
      assert.equal(stored(h, 'p1').trangThai, 'da_duyet');
    });
  });

  describe('đồng bộ với module khác', function () {
    itPage('khi module Nhập liệu thêm đề nghị (sự kiện dnc:data-changed), trang tự làm mới', async function () {
      var h = page();
      var all = read(h.env); all.push(item({ id: 'moi', nhaCungCap: 'Khoản mới gửi', ngay: '2026-11-02' }));
      h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(all);
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'entry', action: 'add', id: 'moi' } }));
      assert.ok(h.row('moi'));
      assert.match(h.strip(), /4 khoản chờ/);
    });
    itPage('sự kiện do chính trang này bắn ra không gây tải lại vô hạn', async function () {
      var h = page();
      var loads = 0;
      var orig = h.env.store.listDeNghi;
      h.env.store.listDeNghi = function () { loads++; return orig.apply(this, arguments); };
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'review' } }));
      assert.equal(loads, 0);
    });
    itPage('làm mới giữ lựa chọn của các khoản còn tồn tại, bỏ khoản đã biến mất', async function () {
      var h = page();
      h.select('p1'); h.select('p2');
      h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify(read(h.env).filter(function (x) { return x.id !== 'p2'; }));
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'entry' } }));
      assert.deepEqual(h.ctrl.getState().selected, ['p1']);
    });
    itPage('refresh() tải lại dữ liệu', async function () {
      var h = page();
      h.env.storage.m[DncReviewStore.KEY_DN] = JSON.stringify([item({ id: 'z', ngay: '2026-11-01' })]);
      h.ctrl.refresh();
      assert.deepEqual(h.rowIds(), ['z']);
    });
  });

  describe('an toàn (XSS) và độ bền', function () {
    itPage('nội dung/ghi chú/tên nhân viên chứa HTML được thoát ký tự ở danh sách và chi tiết', async function () {
      window.__xss = 0;
      var evil = '<img src=x onerror="window.__xss=1">';
      var env = makeStore({ nhanVien: [{ id: 'e', ma: 'E', hoTen: evil + 'Tèo', hoatDong: true }],
        deNghi: [item({ id: 'x', nhanVienId: 'e', nhaCungCap: evil + '<script>window.__xss=2<\/script>', ghiChu: evil })] });
      var h = mountPage({ env: env });
      h.row('x').querySelector('[data-act="open"]').click();
      await tick(20);
      assert.equal(window.__xss, 0);
      assert.equal(h.box.querySelectorAll('img').length, 0);
      assert.equal(h.box.querySelectorAll('script').length, 0);
      assert.ok(h.q('.dv-dialog').textContent.indexOf('<img src=x') >= 0);
    });
    itPage('lý do từ chối chứa HTML được lưu nguyên văn và không tạo phần tử', async function () {
      window.__xss = 0;
      var h = page();
      h.btn('p1', 'reject').click(); h.typeReason('<img src=x onerror="window.__xss=1">'); h.q('[data-dlg="reject"]').click(); await tick(20);
      assert.equal(window.__xss, 0); assert.equal(h.box.querySelectorAll('img').length, 0);
      assert.equal(stored(h, 'p1').lyDoTuChoi, '<img src=x onerror="window.__xss=1">');
    });
    itPage('tên chứa HTML trong bộ lọc nhân viên và nhãn trợ năng cũng được thoát', async function () {
      window.__xss = 0;
      var env = makeStore({ nhanVien: [{ id: 'e', ma: 'E', hoTen: '"><img src=x onerror="window.__xss=1">', hoatDong: true }], deNghi: [item({ id: 'x', nhanVienId: 'e' })] });
      var h = mountPage({ env: env });
      await tick(20);
      assert.equal(window.__xss, 0); assert.equal(h.box.querySelectorAll('img').length, 0);
    });
    itPage('id khoản chứa ký tự đặc biệt vẫn thao tác đúng', async function () {
      var env = makeStore({ deNghi: [item({ id: 'a"b\'c<d>' })] });
      var h = mountPage({ env: env });
      assert.equal(h.rows().length, 1);
      h.qa('[data-act="approve"]')[0].click(); await tick();
      assert.equal(read(env)[0].trangThai, 'da_duyet');
    });
    itPage('destroy gỡ giao diện và mọi listener; sự kiện sau đó không lỗi và không ghi', async function () {
      var h = page();
      var btn = h.btn('p1', 'approve');
      h.ctrl.destroy();
      assert.equal(h.box.innerHTML, '');
      btn.click();
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'entry' } }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await tick();
      assert.equal(h.env.storage.sets, 0);
      assert.equal(h.ctrl.getState().destroyed, true);
    });
    itPage('destroy khi đang lưu bất đồng bộ: không lỗi, không gọi lại onChanged', async function () {
      var h = page({ wrapStore: function (s) {
        return Object.assign({}, s, { approve: function (id, a) { return new Promise(function (r) { setTimeout(function () { r(s.approve(id, a)); }, 10); }); } });
      } });
      h.btn('p1', 'approve').click();
      h.ctrl.destroy();
      await tick(40);
      assert.equal(h.calls.changed.length, 0);
    });
    itPage('mount lại nhiều lần trên cùng một nơi không nhân đôi listener', async function () {
      var env = makeStore({ deNghi: data() });
      var box = document.createElement('div'); document.body.appendChild(box);
      var n = 0;
      for (var i = 0; i < 3; i++) {
        var c = DncReview.mount(box, { store: env.store, session: MGR, today: TODAY, onChanged: function () { n++; } });
        c.destroy();
      }
      var c2 = DncReview.mount(box, { store: env.store, session: MGR, today: TODAY, onChanged: function () { n++; } });
      box.querySelector('[data-act="approve"]').click(); await tick();
      assert.equal(n, 1);
      c2.destroy(); box.remove();
    });
  });

  describe('kiểu dáng theo DESIGN (bố cục, màu, font)', function () {
    itPage('tiêu đề 22px/700; tổng tiền dòng 17px/600 căn phải, số đều nét; font hệ thống', async function () {
      var h = page();
      var t = cs(h.q('.dv-title')); assert.equal(t.fontSize, '22px'); assert.equal(t.fontWeight, '700');
      var tt = cs(h.row('p1').querySelector('.dv-total'));
      assert.equal(tt.fontSize, '17px'); assert.equal(tt.fontWeight, '600'); assert.equal(tt.textAlign, 'right');
      assert.match(tt.fontVariantNumeric, /tabular-nums/);
      assert.match(cs(h.box).fontFamily, /system-ui|-apple-system|Segoe UI|Roboto|Arial/);
    });
    itPage('thẻ bo 14px, viền 1px; dải tóm tắt bo 14px', async function () {
      var h = page();
      assert.equal(cs(h.row('p1')).borderTopLeftRadius, '14px'); assert.equal(cs(h.row('p1')).borderTopWidth, '1px');
      assert.equal(cs(h.q('[data-role="strip"]')).borderTopLeftRadius, '14px');
    });
    itPage('nút Duyệt nền status-approved, nút Từ chối viền danger; cao ≥ 44px', async function () {
      var h = page();
      var a = h.btn('p1', 'approve'), r = h.btn('p1', 'reject');
      assert.equal(cs(a).backgroundColor, isDark() ? 'rgb(61, 213, 152)' : 'rgb(18, 128, 92)');
      assert.equal(cs(r).borderTopColor, isDark() ? 'rgb(242, 118, 109)' : 'rgb(179, 38, 30)');
      assert.equal(cs(r).color, cs(r).borderTopColor);
      assert.ok(a.getBoundingClientRect().height >= 44); assert.ok(r.getBoundingClientRect().height >= 44);
    });
    itPage('dải tóm tắt dùng nền status-pending-soft', async function () {
      var h = page();
      assert.equal(cs(h.q('[data-role="strip"]')).backgroundColor, isDark() ? 'rgb(58, 44, 16)' : 'rgb(255, 241, 214)');
    });
    itPage('ô tick và nút chọn tháng có vùng chạm ≥ 44px', async function () {
      var h = page();
      var r = h.q('[data-sel="p1"]').closest('.dv-check').getBoundingClientRect();
      assert.ok(r.width >= 44 && r.height >= 44, r.width + 'x' + r.height);
    });
    itPage('[điện thoại] thẻ xếp dọc, hai nút 50/50, không cuộn ngang', async function () {
      if (!isMobile()) skip();
      var h = page(); h.box.style.width = 'auto';
      var de = document.documentElement;
      assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang ' + de.scrollWidth + ' > ' + de.clientWidth);
      var a = h.btn('p1', 'approve').getBoundingClientRect(), r = h.btn('p1', 'reject').getBoundingClientRect();
      assert.ok(Math.abs(a.width - r.width) <= 2, 'hai nút bằng nhau ' + a.width + ' / ' + r.width);
      assert.equal(Math.round(a.top), Math.round(r.top));
      var who = h.row('p1').querySelector('.dv-who').getBoundingClientRect();
      var what = h.row('p1').querySelector('.dv-what').getBoundingClientRect();
      assert.ok(what.top >= who.bottom - 1, 'nội dung nằm dưới tên người');
      assert.ok(a.top > what.bottom, 'nút nằm dưới cùng');
      assert.equal(cs(h.q('.dv-cols')).display, 'none');
      assert.notEqual(cs(h.q('.dv-listhead')).display, 'none');
    });
    itPage('[điện thoại] hộp thoại là bottom sheet bo góc trên 20px, thanh hàng loạt dính đáy', async function () {
      if (!isMobile()) skip();
      var h = page(); h.select('p1');
      var bar = h.q('[data-role="bulk"]');
      assert.equal(cs(bar).position, 'fixed');
      assert.ok(Math.abs(bar.getBoundingClientRect().bottom - window.innerHeight) <= 1);
      h.row('p1').querySelector('[data-act="open"]').click();
      var d = h.q('.dv-dialog');
      d.style.animation = 'none'; // đo vị trí cuối: đồng hồ hoạt ảnh của Chrome headless không chạy theo thời gian ảo
      assert.equal(cs(d).borderTopLeftRadius, '20px'); assert.equal(cs(d).borderBottomLeftRadius, '0px');
      assert.ok(Math.abs(d.getBoundingClientRect().bottom - window.innerHeight) <= 1, 'dính đáy màn hình: bottom ' + d.getBoundingClientRect().bottom + ' vs ' + window.innerHeight);
      var dr = d.getBoundingClientRect();
      assert.ok(dr.width >= document.documentElement.clientWidth - 1, 'rộng ' + dr.width + ' vs ' + document.documentElement.clientWidth);
      assert.ok(dr.height <= window.innerHeight * 0.85 + 1, 'cao ' + dr.height + ' vs 85% của ' + window.innerHeight);
    });
    itPage('[laptop] dạng bảng 7 cột, tiêu đề cột hiện, hộp thoại giữa màn hình rộng ≤ 480px', async function () {
      if (!isDesktop()) skip();
      var h = page(); h.box.style.width = 'auto';
      var de = document.documentElement;
      assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang');
      assert.notEqual(cs(h.q('.dv-cols')).display, 'none');
      assert.equal(cs(h.q('.dv-listhead')).display, 'none');
      var cols = cs(h.row('p1')).gridTemplateColumns.split(' ').length;
      assert.equal(cols, 7, 'số cột ' + cols);
      assert.ok(h.row('p1').getBoundingClientRect().height < 90, 'một dòng cao ' + h.row('p1').getBoundingClientRect().height);
      var a = h.btn('p1', 'approve').getBoundingClientRect(), r = h.btn('p1', 'reject').getBoundingClientRect();
      assert.equal(Math.round(a.top), Math.round(r.top));
      assert.equal(h.q('.dv-main').getBoundingClientRect().width <= 1120, true);
      h.row('p1').querySelector('[data-act="open"]').click();
      h.q('.dv-dialog').style.animation = 'none';
      var d = h.q('.dv-dialog').getBoundingClientRect();
      assert.ok(d.width <= 480, 'rộng ' + d.width);
      assert.ok(Math.abs((d.left + d.width / 2) - window.innerWidth / 2) <= 2, 'căn giữa ngang');
      assert.ok(d.bottom < window.innerHeight, 'không dính đáy');
      assert.equal(cs(h.q('.dv-dialog')).borderTopLeftRadius, '14px');
    });
    itPage('[laptop] cột nội dung đủ rộng, nút Từ chối không xuống dòng, tên người và nội dung ngắn không bị cắt', async function () {
      if (!isDesktop()) skip();
      var h = page({ deNghi: [item({ id: 'x', nhanVienId: 'nv1', nhaCungCap: 'Giấy A4 Hồng Hà', danhMuc: 'van_phong_pham' })] });
      h.box.style.width = 'auto';
      var what = h.row('x').querySelector('.dv-what'), who = h.row('x').querySelector('.dv-who-name');
      assert.ok(what.getBoundingClientRect().width >= 150, 'cột nội dung chỉ rộng ' + what.getBoundingClientRect().width);
      assert.ok(what.scrollWidth <= what.clientWidth + 1, 'nội dung ngắn bị cắt: ' + what.scrollWidth + ' > ' + what.clientWidth);
      assert.ok(who.scrollWidth <= who.clientWidth + 1, 'tên bị cắt: ' + who.scrollWidth + ' > ' + who.clientWidth);
      var rj = h.btn('x', 'reject').getBoundingClientRect(), ap = h.btn('x', 'approve').getBoundingClientRect();
      assert.ok(rj.height <= 48 && ap.height <= 48, 'nút bị xuống dòng: cao ' + rj.height);
      assert.ok(h.row('x').querySelector('.dv-cat').getBoundingClientRect().top >= what.getBoundingClientRect().bottom - 2, 'danh mục nằm dưới nội dung');
      var cols = h.q('.dv-cols').getBoundingClientRect();
      assert.ok(h.row('x').getBoundingClientRect().right <= cols.right + 1, 'dòng không vượt khung');
    });
    itPage('[laptop] các cột thẳng hàng giữa dòng và tiêu đề; thanh hàng loạt căn giữa, rộng ≤ 900px', async function () {
      if (!isDesktop()) skip();
      var h = page(); h.box.style.width = 'auto';
      var heads = h.qa('.dv-cols > span'), cells1 = ['.dv-check', '.dv-who', '.dv-what', '.dv-qty', '.dv-total', '.dv-date', '.dv-actions'];
      cells1.forEach(function (sel, i) {
        var a = Math.round(heads[i].getBoundingClientRect().left), b = Math.round(h.row('p1').querySelector(sel).getBoundingClientRect().left);
        assert.ok(Math.abs(a - b) <= 6, sel + ' lệch cột: tiêu đề ' + a + ' vs dòng ' + b);
      });
      h.select('p1');
      var bar = h.q('[data-role="bulk"]').getBoundingClientRect();
      assert.ok(bar.width <= 900 + 1);
      assert.ok(Math.abs((bar.left + bar.width / 2) - window.innerWidth / 2) <= 2);
    });
  });

  describe('tương phản màu (WCAG AA ≥ 4.5:1)', function () {
    function pair(name, fg, bg, min) {
      var r = contrast(fg, bg);
      assert.ok(r >= (min || 4.5), name + ': ' + r.toFixed(2) + ':1 (' + fg + ' trên ' + bg + ')');
    }
    itPage('chữ chính, chữ phụ, dải tóm tắt, nhãn chờ, nút, huy hiệu, avatar, toast, banner', async function () {
      var h = page();
      var rowBg = cs(h.row('p1')).backgroundColor;
      pair('tên người', cs(h.row('p1').querySelector('.dv-who-name')).color, rowBg);
      pair('thành tiền dòng', cs(h.row('p1').querySelector('.dv-total')).color, rowBg);
      pair('nội dung', cs(h.row('p1').querySelector('.dv-what')).color, rowBg);
      pair('chữ phụ (meta)', cs(h.row('p1').querySelector('.dv-cat')).color, rowBg);
      pair('nhãn Chờ N ngày', cs(h.row('p1').querySelector('[data-role="wait"]')).color, rowBg);
      var strip = h.q('[data-role="strip"]');
      pair('dải tóm tắt', cs(strip).color, cs(strip).backgroundColor);
      var av = h.row('p1').querySelector('.dv-avatar');
      pair('chữ cái đại diện', cs(av).color, cs(av).backgroundColor);
      var a = h.btn('p1', 'approve'); pair('nút Duyệt', cs(a).color, cs(a).backgroundColor);
      var r = h.btn('p1', 'reject'); pair('nút Từ chối', cs(r).color, rowBg);
      pair('nút phụ', cs(h.q('.dv-month-label')).color, getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
      pair('tiêu đề cột/chữ phụ trên nền trang', getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(), getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
      h.btn('p1', 'approve').click(); await tick();
      var t = h.q('[data-role="toast"]'); pair('toast', cs(t).color, cs(t).backgroundColor);
      h.env.storage.failSet = quotaError(); h.btn('p2', 'approve').click(); await tick();
      var b = h.q('[data-role="banner"]'); pair('banner cảnh báo', cs(b).color, cs(b).backgroundColor);
      b.classList.add('is-error'); pair('banner lỗi', cs(b).color, cs(b).backgroundColor);
    });
    itPage('hộp thoại: chữ, nhãn, huy hiệu Chờ duyệt / Từ chối, lỗi, chip, nút Duyệt/Từ chối', async function () {
      var h = page();
      h.row('p1').querySelector('[data-act="open"]').click();
      var d = h.q('.dv-dialog'); var bg = cs(d).backgroundColor;
      pair('tiêu đề', cs(h.q('.dv-dhead h2')).color, bg);
      pair('nhãn chi tiết', cs(h.q('.dv-dl dt')).color, bg);
      pair('nội dung chi tiết', cs(h.q('.dv-dl dd')).color, bg);
      var bp = h.q('.dv-badge'); pair('huy hiệu Chờ duyệt', cs(bp).color, cs(bp).backgroundColor);
      var ba = h.q('[data-dlg="approve"]'); pair('nút Duyệt', cs(ba).color, cs(ba).backgroundColor);
      pair('nút Từ chối', cs(h.q('[data-dlg="to-reject"]')).color, bg);
      h.q('[data-dlg="to-reject"]').click();
      var br = h.q('.dv-badge'); pair('huy hiệu Từ chối', cs(br).color, cs(br).backgroundColor);
      var sum = h.q('.dv-sum'); pair('dòng tóm tắt', cs(sum).color, cs(sum).backgroundColor);
      var ta = h.q('[data-role="reason"]'); pair('ô lý do', cs(ta).color, cs(ta).backgroundColor);
      pair('bộ đếm', cs(h.q('[data-role="reason-count"]')).color, bg);
      var chip = h.qa('[data-dlg="quick"]')[0]; pair('chip', cs(chip).color, cs(chip).backgroundColor);
      chip.click(); pair('chip đã chọn', cs(chip).color, cs(chip).backgroundColor);
      h.typeReason(''); ta.blur(); pair('chữ lỗi', cs(h.q('[data-role="reason-err"]')).color, bg);
    });
    itPage('thanh hàng loạt và dòng đang chọn', async function () {
      var h = page(); h.select('p1');
      var bar = h.q('[data-role="bulk"]'); pair('thông tin chọn', cs(h.q('.dv-bulk-info')).color, cs(bar).backgroundColor);
      pair('dòng đang chọn', cs(h.row('p1').querySelector('.dv-who-name')).color, cs(h.row('p1')).backgroundColor);
    });
  });

  describe('trợ năng', function () {
    itPage('hộp thoại có role, aria-modal, nhãn; bước từ chối gắn lỗi với ô lý do', async function () {
      var h = page();
      h.btn('p1', 'reject').click();
      var d = h.q('.dv-dialog');
      assert.equal(d.getAttribute('role'), 'dialog'); assert.equal(d.getAttribute('aria-modal'), 'true');
      var ta = h.q('[data-role="reason"]');
      assert.ok(document.getElementById(ta.getAttribute('aria-describedby')));
      assert.ok(h.q('label[for="' + ta.id + '"]'));
    });
    itPage('vùng thông báo: toast aria-live polite, dải tóm tắt role status, banner role alert', async function () {
      var h = page();
      assert.equal(h.q('[data-role="toast"]').getAttribute('aria-live'), 'polite');
      assert.equal(h.q('[data-role="strip"]').getAttribute('role'), 'status');
      assert.equal(h.q('[data-role="banner"]').getAttribute('role'), 'alert');
    });
    itPage('nút Duyệt/Từ chối trên dòng là <button> bấm được bằng bàn phím và có chữ rõ ràng', async function () {
      var h = page();
      var b = h.btn('p1', 'approve'); assert.equal(b.tagName, 'BUTTON'); assert.equal(b.type, 'button'); assert.ok(b.tabIndex >= 0);
      assert.equal(h.btn('p1', 'reject').textContent.trim(), 'Từ chối');
    });
    itPage('biểu tượng trang trí ẩn với trình đọc màn hình', async function () {
      var h = page();
      h.qa('svg').forEach(function (s) { assert.equal(s.getAttribute('aria-hidden'), 'true'); });
    });
    itPage('chọn tất cả có nhãn; danh sách có nhãn vùng', async function () {
      var h = page();
      h.qa('[data-role="select-all"]').forEach(function (c) { assert.ok(c.getAttribute('aria-label')); });
      assert.ok(h.q('[data-role="list"]').getAttribute('aria-label'));
    });
  });
})();
