/* Test giao diện thật (DOM + sự kiện) của trang Thống kê. */
(function () {
  var S = DncStatsModel;
  function cs(el) { return getComputedStyle(el); }

  describe('hiển thị trang (DESIGN 11)', function () {
    itStats('tiêu đề, tháng hiện tại, nút tháng', async function () {
      var h = mountStats();
      assert.equal(h.text('.dst-title'), 'Thống kê');
      assert.equal(h.month(), 'Tháng 11/2026');
      assert.equal(h.q('[data-act="next"]').disabled, true);
      assert.equal(h.q('[data-act="prev"]').disabled, false);
    });
    itStats('Điểm chính: đủ 5 nhận xét, đúng nội dung', async function () {
      var h = mountStats();
      assert.deepEqual(h.highlights(), [
        'Chi nhiều nhất: Thiết bị – 71,6% (4.850.000 ₫)',
        'Tổng chi Đã duyệt tăng 54% so với Tháng 10/2026',
        'Tăng nhiều nhất so với tháng trước: Thiết bị (+2.850.000 ₫)',
        'Nhân viên chi nhiều nhất: Nguyễn Văn An (6.325.000 ₫)',
        'Còn 1 khoản chờ duyệt, tổng 720.000 ₫'
      ]);
    });
    itStats('ba thẻ KPI: số tiền, số khoản, chênh lệch so với tháng trước', async function () {
      var h = mountStats();
      assert.equal(h.kpi('approved'), '6.775.000 ₫'); assert.equal(h.text('[data-kpi="approved"] .dst-kpi-sub'), '4 khoản');
      assert.equal(h.kpi('pending'), '720.000 ₫'); assert.equal(h.text('[data-kpi="pending"] .dst-kpi-sub'), '1 khoản');
      assert.equal(h.kpi('rejected'), '1 khoản'); assert.equal(h.text('[data-kpi="rejected"] .dst-kpi-sub'), 'tổng 1.950.000 ₫');
      var d = h.q('[data-kpi="approved"] [data-role="delta"]');
      assert.equal(d.getAttribute('data-dir'), 'up'); assert.equal(d.textContent.trim(), '+54% (+2.375.000 ₫) so với Tháng 10/2026');
      assert.equal(d.getAttribute('aria-label'), 'Tăng 54% so với Tháng 10/2026');
    });
    itStats('4 chỉ số khác', async function () {
      var h = mountStats();
      assert.equal(h.metric('avg'), '1.693.750 ₫'); assert.equal(h.metric('largest'), '4.850.000 ₫'); assert.equal(h.metric('rate'), '80%'); assert.equal(h.metric('time'), '19 giờ');
      assert.equal(h.text('[data-metric="largest"] .dst-metric-sub'), 'Máy in Canon · Nguyễn Văn An');
      assert.equal(h.text('[data-metric="rate"] .dst-metric-sub'), '4 duyệt · 1 từ chối');
    });
    itStats('biểu đồ tròn: 3 phần đúng danh mục, %, số tiền; tổng ở giữa; chú thích cộng 100%', async function () {
      var h = mountStats();
      assert.deepEqual(h.legend(), ['thiet_bi', 'van_chuyen', 'van_phong_pham']);
      assert.deepEqual(h.qa('[data-legend] .dst-pct').map(function (e) { return e.textContent; }), ['72%', '18%', '10%']);
      assert.deepEqual(h.qa('[data-legend] .dst-amt').map(function (e) { return e.textContent; }), ['4.850.000 ₫', '1.250.000 ₫', '675.000 ₫']);
      assert.equal(h.text('[data-role="donut-total"]'), '6.775.000 ₫');
      assert.equal(h.text('[data-role="pie-top"]'), 'Danh mục chi nhiều nhất: Thiết bị');
      assert.equal(h.slices().length, 3);
      assert.equal(h.qa('[data-legend] .dst-pct').reduce(function (a, e) { return a + parseInt(e.textContent, 10); }, 0), 100);
    });
    itStats('hình học biểu đồ tròn: các cung nối tiếp nhau, tổng độ dài + khe = 100%, màu theo danh mục', async function () {
      var h = mountStats(), sl = h.slices(), off = 0, total = 0;
      sl.forEach(function (c, i) {
        var len = parseFloat(c.getAttribute('data-len')), share = parseFloat(c.getAttribute('data-share'));
        assert.ok(Math.abs(parseFloat(c.getAttribute('stroke-dashoffset')) + off) < 0.01, 'cung ' + i + ' bắt đầu ' + c.getAttribute('stroke-dashoffset') + ' vs ' + off);
        assert.ok(Math.abs((share - len) - 0.6) < 0.01, 'khe giữa các cung');
        assert.equal(c.getAttribute('pathLength'), '100');
        off += share; total += share;
      });
      assert.ok(Math.abs(total - 100) < 0.01, 'tổng ' + total);
      assert.equal(sl[0].getAttribute('stroke'), 'var(--cat-3)'); assert.equal(sl[1].getAttribute('stroke'), 'var(--cat-4)'); assert.equal(sl[2].getAttribute('stroke'), 'var(--cat-1)');
    });
    itStats('biểu đồ cột tháng: 6 cột, cột cuối cao nhất và được chọn, chiều cao tỷ lệ', async function () {
      var h = mountStats(), c = h.cols();
      assert.equal(c.length, 6); assert.deepEqual(c.map(function (x) { return x.getAttribute('data-month'); }), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
      assert.deepEqual(c.map(function (x) { return +x.getAttribute('data-total'); }), [0, 0, 0, 3000000, 4400000, 6775000]);
      assert.deepEqual(c.map(function (x) { return x.classList.contains('is-selected'); }), [false, false, false, false, false, true]);
      var hh = c.map(function (x) { return parseFloat(x.getAttribute('data-h')); });
      assert.equal(hh[5], 100); assert.ok(Math.abs(hh[4] - 4400000 / 6775000 * 100) < 0.01); assert.equal(hh[0], 0);
      var rect = c[5].querySelector('rect'); assert.equal(rect.getAttribute('height'), '100'); assert.equal(rect.getAttribute('y'), '0');
      assert.deepEqual(c.map(function (x) { return x.querySelector('.dst-col-val').textContent; }), ['0', '0', '0', '3 tr', '4,4 tr', '6,8 tr']);
      assert.deepEqual(c.map(function (x) { return x.querySelector('.dst-col-lab').textContent; }), ['T6', 'T7', 'T8', 'T9', 'T10', 'T11']);
      assert.equal(c[5].getAttribute('aria-current'), 'true');
    });
    itStats('dòng chênh lệch dưới biểu đồ cột', async function () {
      var h = mountStats();
      assert.equal(h.text('[data-role="month-foot"]'), 'Tháng 11/2026: 6.775.000 ₫ · +54% (+2.375.000 ₫) so với Tháng 10/2026');
    });
    itStats('bảng so sánh danh mục: thứ tự, số tiền, chênh lệch, nhãn "Chi nhiều nhất" và "Tăng nhiều nhất", tổng cộng', async function () {
      var h = mountStats();
      assert.deepEqual(h.cmpRows(), ['thiet_bi', 'van_chuyen', 'van_phong_pham', 'tiep_khach']);
      var r = h.q('tr[data-cat="thiet_bi"]');
      assert.equal(r.querySelector('[data-role="cmp-prev"]').textContent, '2.000.000 ₫'); assert.equal(r.querySelector('[data-role="cmp-cur"]').textContent, '4.850.000 ₫');
      assert.equal(r.querySelector('[data-role="cmp-delta"]').textContent.trim(), '+142,5% · +2.850.000 ₫');
      assert.equal(h.qa('[data-tag="top"]').length, 1); assert.equal(h.q('[data-tag="top"]').closest('tr').getAttribute('data-cat'), 'thiet_bi');
      assert.equal(h.qa('[data-tag="rise"]').length, 1); assert.equal(h.q('[data-tag="rise"]').closest('tr').getAttribute('data-cat'), 'thiet_bi');
      var t = h.q('tr[data-cat="tiep_khach"] [data-role="cmp-delta"]'); assert.equal(t.textContent.trim(), '−100% · −1.000.000 ₫'); assert.equal(t.querySelector('.dst-delta').getAttribute('data-dir'), 'down');
      var tot = h.q('[data-role="cmp-total"]');
      assert.equal(tot.cells[1].textContent, '4.400.000 ₫'); assert.equal(tot.cells[2].textContent, '6.775.000 ₫'); assert.equal(tot.cells[3].textContent.trim(), '+54% · +2.375.000 ₫');
    });
    itStats('thanh nhỏ so sánh: tỷ lệ theo giá trị lớn nhất của cả hai tháng', async function () {
      var h = mountStats(), r = h.q('tr[data-cat="thiet_bi"]');
      assert.equal(r.querySelector('.dst-cur').getAttribute('width'), '100'); assert.equal(r.querySelector('.dst-prev').getAttribute('width'), String(Math.round(2000000 / 4850000 * 100 * 1000) / 1000));
      assert.equal(h.q('tr[data-cat="tiep_khach"] .dst-cur').getAttribute('width'), '0');
    });
    itStats('biểu đồ cột nhân viên: giảm dần, chỉ người có chi Đã duyệt; bảng tổng hợp đủ người', async function () {
      var h = mountStats();
      assert.deepEqual(h.qa('[data-card="emp-chart"] .dst-hrow').map(function (e) { return e.getAttribute('data-nv'); }), ['nv1', 'nv2']);
      assert.deepEqual(h.qa('[data-card="emp-chart"] .dst-amt').map(function (e) { return e.textContent; }), ['6.325.000 ₫', '450.000 ₫']);
      var w = h.qa('[data-card="emp-chart"] .dst-bar').map(function (e) { return parseFloat(e.getAttribute('width')); }); assert.equal(w[0], 100); assert.ok(Math.abs(w[1] - 450000 / 6325000 * 100) < 0.01);
      assert.deepEqual(h.tableRows(), ['nv1', 'nv2', 'nv3']);
    });
    itStats('bảng tổng hợp theo nhân viên: tổng số đề nghị từng người và hàng Tổng cộng', async function () {
      var h = mountStats();
      var r1 = h.q('[data-card="emp-table"] tr[data-nv="nv1"]');
      assert.equal(r1.querySelector('[data-role="e-count"]').textContent, '3'); assert.match(r1.querySelector('[data-role="e-approved"]').textContent, /^6\.325\.000 ₫/);
      assert.equal(r1.querySelector('[data-role="e-share"]').textContent, '93,4%'); assert.equal(r1.querySelector('[data-role="e-all"]').textContent, '5 đề nghị');
      var r2 = h.q('[data-card="emp-table"] tr[data-nv="nv2"]');
      assert.equal(r2.querySelector('[data-role="e-count"]').textContent, '2'); assert.equal(r2.querySelector('[data-role="e-rejected"]').textContent, '1 khoản'); assert.equal(r2.querySelector('[data-role="e-all"]').textContent, '3 đề nghị');
      var r3 = h.q('[data-card="emp-table"] tr[data-nv="nv3"]'); assert.match(r3.querySelector('[data-role="e-pending"]').textContent, /^720\.000 ₫/); assert.equal(r3.querySelector('[data-role="e-share"]').textContent, '0%');
      var t = h.q('[data-role="emp-total"]');
      assert.equal(t.cells[1].textContent, '6'); assert.match(t.cells[2].textContent, /^6\.775\.000 ₫/); assert.match(t.cells[3].textContent, /^720\.000 ₫/); assert.equal(t.cells[4].textContent, '1 khoản'); assert.equal(t.cells[5].textContent, '100%'); assert.equal(t.cells[6].textContent, '10 đề nghị');
    });
    itStats('top nội dung/nhà cung cấp', async function () {
      var h = mountStats(), rows = h.qa('[data-card="suppliers"] .dst-hrow');
      assert.equal(rows.length, 3);
      assert.deepEqual(rows.map(function (r) { return r.querySelector('.dst-name').title; }), ['Máy in Canon', 'Cước vận chuyển', 'Giấy A4']);
      assert.match(rows[2].textContent, /675\.000 ₫ · 2 lần/);
    });
    itStats('tên nội dung/nhà cung cấp và tên nhân viên ngắn không bị cắt chữ ở bất kỳ kích thước nào', async function () {
      var h = mountStats(); h.box.style.width = 'auto';
      h.qa('[data-card="suppliers"] .dst-name, [data-card="emp-chart"] .dst-name').forEach(function (n) {
        assert.ok(n.scrollWidth <= n.clientWidth + 1, 'bị cắt: "' + n.textContent + '" ' + n.scrollWidth + ' > ' + n.clientWidth);
      });
      var rows = h.qa('[data-card="suppliers"] .dst-hrow');
      rows.forEach(function (r) { var b = r.querySelector('svg').getBoundingClientRect(), n = r.querySelector('.dst-name').getBoundingClientRect(); assert.ok(b.top >= n.bottom - 1, 'thanh nằm dưới tên'); });
    });
    itStats('nhân viên đã ngưng có khoản trong tháng vẫn hiện, kèm huy hiệu "Ngưng"', async function () {
      var h = mountStats({ month: '2026-10' });
      var r = h.q('[data-card="emp-table"] tr[data-nv="nv4"]'); assert.ok(r); assert.equal(r.querySelector('.dst-badge-off').textContent, 'Ngưng');
    });
    itStats('khoản dữ liệu hỏng bị bỏ qua và có dòng nhắc', async function () {
      var d = DS(); d.push({ id: 'bad', trangThai: 'x' }, null);
      var h = mountStats({ deNghi: d });
      assert.equal(h.text('[data-role="skipped"]'), 'Đã bỏ qua 2 khoản dữ liệu lỗi.'); assert.equal(h.kpi('approved'), '6.775.000 ₫');
      assert.equal(mountStats().q('[data-role="skipped"]'), null);
    });
  });

  describe('vai trò', function () {
    [['không có session', null], ['vai trò lạ', { vaiTro: 'admin' }], ['nhân viên thiếu mã', { vaiTro: 'nhan_vien' }], ['nhân viên mã rỗng', { vaiTro: 'nhan_vien', nhanVienId: '' }], ['rỗng', {}]].forEach(function (c) {
      itStats('bị chặn: ' + c[0], async function () {
        var h = mountStats({ session: c[1] });
        assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'role'); assert.match(h.q('[data-role="blocked"]').textContent, /chọn vai trò/);
        assert.equal(h.q('[data-role="content"]'), null); assert.equal(h.calls.forbidden, 1); assert.equal(h.ctrl.getState().allowed, false);
      });
    });
    itStats('Nhân viên chỉ thấy số liệu của chính mình, không có lọc/biểu đồ/bảng nhân viên', async function () {
      var h = mountStats({ session: emp('nv2') });
      assert.equal(h.q('[data-filter="nv"]'), null); assert.equal(h.q('[data-card="emp-chart"]'), null); assert.equal(h.q('[data-card="emp-table"]'), null);
      assert.match(h.text('[data-role="viewing"]'), /Đang xem số liệu của bạn: Trần Thị Bình/);
      assert.equal(h.kpi('approved'), '450.000 ₫'); assert.equal(h.kpi('rejected'), '1 khoản'); assert.equal(h.kpi('pending'), '0 ₫');
      assert.deepEqual(h.legend(), ['van_phong_pham']); assert.equal(h.text('[data-role="donut-total"]'), '450.000 ₫');
      assert.ok(h.q('[data-card="suppliers"]')); assert.ok(h.q('[data-card="suppliers"]').classList.contains('dst-span-12'));
      assert.ok(h.highlights().every(function (t) { return t.indexOf('Nhân viên chi nhiều nhất') < 0; }));
    });
    itStats('Nhân viên không thể xem người khác: bấm vào bất kỳ chỗ nào cũng không đổi bộ lọc', async function () {
      var h = mountStats({ session: emp('nv2') });
      h.box.dispatchEvent(new Event('click', { bubbles: true }));
      h.qa('[data-nv]').forEach(function (e) { e.click(); });
      assert.equal(h.ctrl.getState().nhanVienId, 'nv2'); assert.equal(h.kpi('approved'), '450.000 ₫');
    });
    itStats('Nhân viên không có số liệu của người khác ở bất kỳ tháng nào', async function () {
      var h = mountStats({ session: emp('nv3') });
      h.q('[data-act="prev"]').click();
      assert.equal(h.kpi('approved'), '1.000.000 ₫'); assert.ok(h.text('[data-role="content"]').indexOf('Nguyễn Văn An') < 0);
      assert.ok(h.text('[data-role="content"]').indexOf('Trần Thị Bình') < 0);
    });
    itStats('Nhân viên chưa có đề nghị nào: trang vẫn hiển thị bình thường', async function () {
      var h = mountStats({ session: emp('nv_moi') });
      assert.equal(h.kpi('approved'), '0 ₫'); assert.deepEqual(h.highlights(), ['Tháng này chưa có đề nghị nào.']);
    });
  });

  describe('chuyển tháng và khoảng so sánh', function () {
    itStats('‹ về tháng trước: mọi số liệu đổi theo', async function () {
      var h = mountStats();
      h.q('[data-act="prev"]').click();
      assert.equal(h.month(), 'Tháng 10/2026'); assert.equal(h.kpi('approved'), '4.400.000 ₫'); assert.equal(h.kpi('pending'), '0 ₫');
      assert.equal(h.q('[data-act="next"]').disabled, false);
      assert.equal(h.q('[data-kpi="approved"] [data-role="delta"]').textContent.trim(), '+46,7% (+1.400.000 ₫) so với Tháng 9/2026');
      assert.equal(h.cols().filter(function (c) { return c.classList.contains('is-selected'); })[0].getAttribute('data-month'), '2026-10');
      assert.equal(h.cols()[5].getAttribute('data-month'), '2026-10', 'biểu đồ kết thúc ở tháng đang chọn');
    });
    itStats('› và bấm nhãn quay về tháng hiện tại; › bị khóa ở tháng hiện tại', async function () {
      var h = mountStats();
      h.q('[data-act="prev"]').click(); h.q('[data-act="prev"]').click();
      assert.equal(h.month(), 'Tháng 9/2026');
      h.q('[data-act="next"]').click(); assert.equal(h.month(), 'Tháng 10/2026');
      h.q('[data-act="prev"]').click(); h.q('[data-role="month-label"]').click(); assert.equal(h.month(), 'Tháng 11/2026');
      h.q('[data-act="next"]').click(); assert.equal(h.month(), 'Tháng 11/2026');
    });
    itStats('không lùi quá tháng 1/2000; qua biên năm', async function () {
      var h = mountStats({ month: '2000-01' }); assert.equal(h.q('[data-act="prev"]').disabled, true); h.q('[data-act="prev"]').click(); assert.equal(h.month(), 'Tháng 1/2000');
      var g = mountStats({ month: '2026-01' }); g.q('[data-act="prev"]').click(); assert.equal(g.month(), 'Tháng 12/2025');
    });
    itStats('tham số tháng sai → dùng tháng hiện tại', async function () { assert.equal(mountStats({ month: 'abc' }).month(), 'Tháng 11/2026'); });
    itStats('nhóm nút 6/12 tháng: mặc định 6, đổi sang 12 có 12 cột, chế độ "dày" ẩn nhãn tiền của các cột không chọn', async function () {
      var h = mountStats();
      assert.equal(h.q('[data-range="6"]').getAttribute('aria-pressed'), 'true'); assert.equal(h.q('[data-range="12"]').getAttribute('aria-pressed'), 'false');
      assert.equal(h.q('[data-role="month-cols"]').classList.contains('is-dense'), false);
      h.q('[data-range="12"]').click();
      assert.equal(h.cols().length, 12); assert.equal(h.cols()[0].getAttribute('data-month'), '2025-12'); assert.equal(h.cols()[11].getAttribute('data-month'), '2026-11');
      assert.equal(h.q('[data-range="12"]').getAttribute('aria-pressed'), 'true'); assert.equal(h.q('[data-range="6"]').getAttribute('aria-pressed'), 'false');
      assert.ok(h.q('[data-role="month-cols"]').classList.contains('is-dense'));
      assert.equal(cs(h.cols()[3].querySelector('.dst-col-val')).visibility, 'hidden'); assert.equal(cs(h.cols()[11].querySelector('.dst-col-val')).visibility, 'visible');
      h.q('[data-range="6"]').click(); assert.equal(h.cols().length, 6);
    });
    itStats('tham số range = 12 khi mount', async function () { assert.equal(mountStats({ range: 12 }).cols().length, 12); assert.equal(mountStats({ range: 7 }).cols().length, 6); });
    itStats('bấm một cột chuyển sang tháng đó (và giữ chế độ 12 tháng)', async function () {
      var h = mountStats({ range: 12 });
      h.q('.dst-col[data-month="2026-10"]').click();
      assert.equal(h.month(), 'Tháng 10/2026'); assert.equal(h.cols().length, 12); assert.equal(h.cols()[11].getAttribute('data-month'), '2026-10');
    });
    itStats('bấm cột của tháng đang chọn không làm gì; sau khi chuyển, focus ở cột mới', async function () {
      var h = mountStats();
      h.q('.dst-col[data-month="2026-11"]').click(); assert.equal(h.month(), 'Tháng 11/2026');
      h.q('.dst-col[data-month="2026-09"]').click();
      assert.equal(document.activeElement.getAttribute('data-month'), '2026-09');
    });
    itStats('chuyển tháng giữ nguyên bộ lọc nhân viên và khoảng 12 tháng', async function () {
      var h = mountStats({ range: 12 }); h.filter('nv2'); h.q('[data-act="prev"]').click();
      assert.equal(h.ctrl.getState().nhanVienId, 'nv2'); assert.equal(h.ctrl.getState().range, 12); assert.equal(h.kpi('approved'), '1.000.000 ₫');
    });
  });

  describe('lọc theo nhân viên (Quản lý)', function () {
    itStats('ô lọc liệt kê nhân viên đang hoạt động + người có đề nghị (kể cả đã ngưng)', async function () {
      var h = mountStats();
      assert.deepEqual(h.qa('[data-filter="nv"] option').map(function (o) { return o.textContent; }), ['Tất cả nhân viên', 'Lê Hoàng Cường', 'Nguyễn Văn An', 'Phạm Thu Dung', 'Trần Thị Bình']);
    });
    itStats('chọn một nhân viên: mọi số liệu theo người đó, ẩn biểu đồ/bảng nhân viên, hiện "Đang xem"', async function () {
      var h = mountStats(); h.filter('nv1');
      assert.equal(h.kpi('approved'), '6.325.000 ₫'); assert.equal(h.kpi('rejected'), '0 khoản');
      assert.equal(h.q('[data-card="emp-chart"]'), null); assert.equal(h.q('[data-card="emp-table"]'), null);
      assert.match(h.text('[data-role="viewing"]'), /Đang xem: Nguyễn Văn An/); assert.ok(h.q('[data-act="clear-nv"]'));
      assert.deepEqual(h.legend(), ['thiet_bi', 'van_chuyen', 'van_phong_pham']);
      assert.ok(h.highlights().every(function (t) { return t.indexOf('Nhân viên chi nhiều nhất') < 0; }));
      assert.equal(h.q('[data-card="suppliers"]').classList.contains('dst-span-12'), true);
    });
    itStats('"Xem tất cả" bỏ lọc, trở lại toàn bộ', async function () {
      var h = mountStats(); h.filter('nv1'); h.q('[data-act="clear-nv"]').click();
      assert.equal(h.kpi('approved'), '6.775.000 ₫'); assert.ok(h.q('[data-card="emp-table"]')); assert.equal(h.q('[data-filter="nv"]').value, '');
    });
    itStats('bấm một hàng trong bảng tổng hợp = lọc theo người đó; focus chuyển tới dòng "Đang xem"', async function () {
      var h = mountStats(); h.q('[data-card="emp-table"] tr[data-nv="nv2"]').click();
      assert.equal(h.ctrl.getState().nhanVienId, 'nv2'); assert.equal(h.kpi('approved'), '450.000 ₫'); assert.equal(h.q('[data-filter="nv"]').value, 'nv2');
      assert.equal(document.activeElement, h.q('[data-role="viewing"]'));
    });
    itStats('bấm một thanh trong biểu đồ nhân viên cũng lọc theo người đó', async function () {
      var h = mountStats(); h.q('[data-card="emp-chart"] .dst-hrow[data-nv="nv1"]').click();
      assert.equal(h.ctrl.getState().nhanVienId, 'nv1');
    });
    itStats('bàn phím: Enter/Space trên hàng bảng lọc theo người đó', async function () {
      var h = mountStats(), tr = h.q('[data-card="emp-table"] tr[data-nv="nv3"]');
      tr.focus(); tr.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      assert.equal(h.ctrl.getState().nhanVienId, 'nv3');
      var h2 = mountStats(), t2 = h2.q('[data-card="emp-table"] tr[data-nv="nv2"]');
      t2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); assert.equal(h2.ctrl.getState().nhanVienId, 'nv2');
    });
    itStats('lọc người chỉ có khoản chờ: biểu đồ tròn rỗng + thông báo, thẻ Chờ duyệt vẫn đủ', async function () {
      var h = mountStats(); h.filter('nv3');
      assert.equal(h.kpi('pending'), '720.000 ₫'); assert.equal(h.slices().length, 0);
      assert.equal(h.text('[data-role="pie-empty"]'), 'Chưa có khoản Đã duyệt trong tháng (còn 1 khoản chờ duyệt).');
      assert.equal(h.text('[data-role="donut-total"]'), '0 ₫'); assert.equal(h.metric('avg'), '—'); assert.equal(h.metric('rate'), '—'); assert.equal(h.metric('time'), '—');
    });
  });

  describe('sắp xếp bảng tổng hợp (10.5)', function () {
    itStats('mặc định Đã duyệt giảm dần, có aria-sort', async function () {
      var h = mountStats();
      assert.equal(h.q('th[aria-sort]').getAttribute('aria-sort'), 'descending'); assert.equal(h.q('th[aria-sort] .dst-sort').getAttribute('data-sort'), 'approved');
      assert.deepEqual(h.ctrl.getState().sort, { key: 'approved', dir: 'desc' });
    });
    itStats('bấm tiêu đề cột đang chọn đổi chiều; cột khác sắp xếp giảm dần', async function () {
      var h = mountStats();
      h.q('[data-sort="approved"]').click(); assert.deepEqual(h.tableRows(), ['nv3', 'nv2', 'nv1']); assert.equal(h.q('th[aria-sort]').getAttribute('aria-sort'), 'ascending');
      h.q('[data-sort="pending"]').click(); assert.deepEqual(h.tableRows(), ['nv3', 'nv1', 'nv2']); assert.equal(h.q('th[aria-sort] .dst-sort').getAttribute('data-sort'), 'pending');
      h.q('[data-sort="monthCount"]').click(); assert.deepEqual(h.tableRows(), ['nv1', 'nv2', 'nv3']);
      h.q('[data-sort="allTime"]').click(); assert.deepEqual(h.tableRows(), ['nv1', 'nv2', 'nv3']);
      assert.equal(document.activeElement.getAttribute('data-sort'), 'allTime', 'focus được giữ ở nút sắp xếp');
    });
    itStats('hàng Tổng cộng không bị sắp xếp lẫn vào', async function () {
      var h = mountStats(); h.q('[data-sort="rejected"]').click();
      assert.equal(h.q('[data-card="emp-table"] tfoot tr').getAttribute('data-role'), 'emp-total'); assert.equal(h.tableRows().length, 3);
    });
    itStats('ô chọn sắp xếp (điện thoại) và nút đổi chiều', async function () {
      var h = mountStats(), sel = h.q('[data-role="sort-select"]');
      assert.equal(sel.options.length, 6); sel.value = 'monthCount'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      assert.deepEqual(h.ctrl.getState().sort, { key: 'monthCount', dir: 'desc' }); assert.deepEqual(h.tableRows(), ['nv1', 'nv2', 'nv3']);
      h.q('[data-act="sort-dir"]').click(); assert.deepEqual(h.tableRows(), ['nv3', 'nv2', 'nv1']);
    });
    itStats('giữ cách sắp xếp khi đổi tháng', async function () {
      var h = mountStats(); h.q('[data-sort="pending"]').click(); h.q('[data-act="prev"]').click();
      assert.deepEqual(h.ctrl.getState().sort, { key: 'pending', dir: 'desc' });
    });
  });

  describe('chú giải (tooltip) và tương tác biểu đồ', function () {
    itStats('focus vào một cung hiện "tên · số tiền · %"; mất focus thì ẩn', async function () {
      var h = mountStats(), s = h.slices()[0];
      s.focus(); assert.equal(h.tip(), 'Thiết bị · 4.850.000 ₫ · 72%'); s.blur(); assert.equal(h.tip(), '');
    });
    itStats('di chuột vào cột tháng và thanh nhân viên hiện chú giải', async function () {
      var h = mountStats(), col = h.q('.dst-col[data-month="2026-10"]');
      col.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); assert.equal(h.tip(), 'Tháng 10/2026 · 4.400.000 ₫ · 4 khoản');
      col.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body })); assert.equal(h.tip(), '');
      var bar = h.q('[data-card="emp-chart"] .dst-hrow'); bar.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      assert.equal(h.tip(), 'Nguyễn Văn An · 6.325.000 ₫ · 93,4%');
    });
    itStats('Esc ẩn chú giải; chú giải nằm trong màn hình', async function () {
      var h = mountStats(), s = h.slices()[1]; s.focus();
      var r = h.q('[data-role="tip"]').getBoundingClientRect();
      assert.ok(r.left >= 0 && r.right <= document.documentElement.clientWidth + 1 && r.top >= 0, 'ngoài màn hình ' + JSON.stringify(r));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); assert.equal(h.tip(), '');
    });
    itStats('các phần biểu đồ có thể focus bằng bàn phím và có nhãn đọc được', async function () {
      var h = mountStats();
      h.slices().forEach(function (s) { assert.equal(s.tabIndex, 0); assert.ok(s.getAttribute('aria-label').length > 5); });
      h.cols().forEach(function (c) { assert.equal(c.tagName, 'BUTTON'); assert.ok(c.getAttribute('aria-label').indexOf('₫') > 0); });
    });
    itStats('mỗi biểu đồ có bảng dữ liệu thay thế cho trình đọc màn hình', async function () {
      var h = mountStats();
      var t1 = h.q('[data-card="pie"] table.dst-sr'), t2 = h.q('[data-card="months"] table.dst-sr');
      assert.equal(t1.rows.length, 4); assert.equal(t1.rows[1].cells[2].textContent, '4.850.000 ₫'); assert.equal(t2.rows.length, 7); assert.equal(t2.rows[6].cells[1].textContent, '6.775.000 ₫');
      assert.ok(t1.caption.textContent.length > 0); assert.ok(cs(t1).position === 'absolute', 'ẩn thị giác');
    });
    itStats('"Xem tất cả" khi có hơn 8 nhân viên có chi', async function () {
      var emps = [], items = [];
      for (var i = 1; i <= 11; i++) { emps.push({ id: 'e' + i, ma: 'E' + i, hoTen: 'Người ' + String(i).padStart(2, '0'), hoatDong: true }); items.push(mk({ id: 'm' + i, nv: 'e' + i, dg: 1000 * i, ngay: '2026-11-01' })); }
      var h = mountStats({ nhanVien: emps, deNghi: items });
      assert.equal(h.qa('[data-card="emp-chart"] .dst-hrow').length, 8); assert.equal(h.q('[data-act="toggle-emp"]').textContent, 'Xem tất cả (11)');
      h.q('[data-act="toggle-emp"]').click(); assert.equal(h.qa('[data-card="emp-chart"] .dst-hrow').length, 11); assert.equal(h.q('[data-act="toggle-emp"]').textContent, 'Thu gọn');
      assert.equal(h.tableRows().length, 11, 'bảng luôn hiện đủ');
      h.q('[data-act="toggle-emp"]').click(); assert.equal(h.qa('[data-card="emp-chart"] .dst-hrow').length, 8);
    });
  });

  describe('trạng thái rỗng và trường hợp biên (DESIGN 11.6)', function () {
    itStats('tháng chưa có khoản nào', async function () {
      var h = mountStats({ month: '2026-08' });
      assert.deepEqual(h.highlights(), ['Tháng này chưa có đề nghị nào.']); assert.equal(h.kpi('approved'), '0 ₫'); assert.equal(h.kpi('rejected'), '0 khoản');
      assert.equal(h.slices().length, 0); assert.equal(h.text('[data-role="pie-empty"]'), 'Chưa có khoản Đã duyệt trong tháng.');
      assert.equal(h.text('[data-role="cmp-empty"]'), 'Chưa có khoản Đã duyệt trong hai tháng này.');
      assert.equal(h.q('[data-role="emp-empty"]').textContent, 'Chưa có khoản Đã duyệt trong tháng.');
      assert.equal(h.q('[data-role="sup-empty"]').textContent, 'Chưa có khoản Đã duyệt trong tháng.');
    });
    itStats('vòng tròn rỗng vẫn hiện (nền xám) cùng "0 ₫"', async function () {
      var h = mountStats({ month: '2026-08' });
      assert.ok(h.q('.dst-ring')); assert.equal(h.text('[data-role="donut-total"]'), '0 ₫');
    });
    itStats('6 tháng đều bằng 0: cột rỗng và dòng thông báo', async function () {
      var h = mountStats({ month: '2026-03' });
      assert.equal(h.cols().length, 6); assert.ok(h.cols().every(function (c) { return c.getAttribute('data-total') === '0'; }));
      assert.equal(h.text('[data-role="month-foot"]'), 'Chưa có khoản Đã duyệt trong giai đoạn này.');
      assert.ok(h.cols().every(function (c) { return c.querySelector('rect').getAttribute('height') === '0'; }));
    });
    itStats('tháng trước bằng 0, tháng này > 0: "Mới", không hiện %', async function () {
      var h = mountStats({ month: '2026-09' });
      var d = h.q('[data-kpi="approved"] [data-role="delta"]'); assert.equal(d.getAttribute('data-dir'), 'new'); assert.equal(d.textContent.trim(), 'Mới (tháng trước chưa có)'); assert.ok(d.textContent.indexOf('%') < 0);
      assert.match(h.text('[data-role="month-foot"]'), /Mới \(tháng trước chưa có\)/);
    });
    itStats('hai tháng bằng nhau: "Không đổi"', async function () {
      var h = mountStats({ deNghi: [mk({ id: 'p', ngay: '2026-10-05', dg: 1000 }), mk({ id: 'q', ngay: '2026-11-05', dg: 1000 })], nhanVien: NV });
      var d = h.q('[data-kpi="approved"] [data-role="delta"]'); assert.equal(d.getAttribute('data-dir'), 'same'); assert.match(d.textContent, /Không đổi so với Tháng 10\/2026/);
      assert.match(h.text('[data-role="month-foot"]'), /Không đổi so với tháng trước/);
    });
    itStats('chi giảm: mũi tên xuống và dấu trừ', async function () {
      var h = mountStats({ deNghi: [mk({ id: 'p', ngay: '2026-10-05', dg: 2000000 }), mk({ id: 'q', ngay: '2026-11-05', dg: 500000 })], nhanVien: NV });
      var d = h.q('[data-kpi="approved"] [data-role="delta"]'); assert.equal(d.getAttribute('data-dir'), 'down'); assert.equal(d.textContent.trim(), '−75% (−1.500.000 ₫) so với Tháng 10/2026');
      assert.equal(d.getAttribute('aria-label'), 'Giảm 75% so với Tháng 10/2026');
    });
    itStats('danh bạ nhân viên trống: báo "Chưa có nhân viên"', async function () {
      var h = mountStats({ nhanVien: [], deNghi: [] });
      assert.equal(h.q('[data-role="emp-table-empty"]').textContent, 'Chưa có nhân viên.'); assert.equal(h.q('[data-role="emp-empty"]').textContent, 'Chưa có nhân viên.');
    });
    itStats('chưa có dữ liệu nào trong storage: trang trống nhưng không lỗi', async function () {
      var h = mountStats({ nhanVien: null, deNghi: null });
      assert.equal(h.kpi('approved'), '0 ₫'); assert.equal(h.ctrl.getState().loadError, null);
    });
    itStats('biểu đồ tròn một danh mục = 100%, một cung đầy', async function () {
      var h = mountStats({ deNghi: [mk({ id: 'z', dm: 'vat_tu', dg: 5, ngay: '2026-11-01' })], nhanVien: NV });
      assert.equal(h.slices().length, 1); assert.equal(h.text('[data-legend] .dst-pct'), '100%'); assert.equal(parseFloat(h.slices()[0].getAttribute('data-len')), 100);
    });
    itStats('số tiền rất lớn hiển thị đúng và không tràn khỏi thẻ', async function () {
      var h = mountStats({ deNghi: [mk({ id: 'big', sl: 1000000, dg: 1e9, ngay: '2026-11-01' })], nhanVien: NV });
      assert.equal(h.kpi('approved'), '1.000.000.000.000.000 ₫');
      var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang');
    });
  });

  describe('lỗi dữ liệu và đồng bộ', function () {
    itStats('dữ liệu hỏng: khối lỗi + Thử lại; sửa dữ liệu rồi Thử lại thì hiện thống kê', async function () {
      var env = makeEnv(); env.storage.m[DncStatsStore.KEY_DN] = '{hỏng';
      var h = mountStats({ env: env });
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'corrupt'); assert.equal(h.q('[data-role="blocked"]').getAttribute('role'), 'alert'); assert.match(h.q('[data-role="blocked"]').textContent, /Không đọc được dữ liệu/);
      env.storage.m[DncStatsStore.KEY_DN] = JSON.stringify(DS());
      h.q('[data-act="retry"]').click(); assert.equal(h.kpi('approved'), '6.775.000 ₫'); assert.equal(h.q('[data-role="blocked"]'), null);
    });
    itStats('trình duyệt chặn đọc storage: khối lỗi "blocked"', async function () {
      var env = makeEnv(); env.storage.failGet = true;
      assert.equal(mountStats({ env: env }).q('[data-role="blocked"]').getAttribute('data-code'), 'blocked');
    });
    itStats('dữ liệu nhân viên hỏng cũng báo lỗi', async function () {
      var env = makeEnv(); env.storage.m[DncStatsStore.KEY_NV] = 'x';
      assert.equal(mountStats({ env: env }).q('[data-role="blocked"]').getAttribute('data-code'), 'corrupt');
    });
    itStats('khi module khác thay đổi dữ liệu (dnc:data-changed), thống kê tự cập nhật', async function () {
      var h = mountStats(); assert.equal(h.kpi('approved'), '6.775.000 ₫');
      var all = JSON.parse(h.env.storage.m[DncStatsStore.KEY_DN]); all.filter(function (x) { return x.id === 'a4'; })[0].trangThai = 'da_duyet'; all.filter(function (x) { return x.id === 'a4'; })[0].ngayXuLy = new Date().toISOString();
      h.env.storage.m[DncStatsStore.KEY_DN] = JSON.stringify(all);
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: { source: 'review', action: 'approve', ids: ['a4'] } }));
      assert.equal(h.kpi('approved'), '7.495.000 ₫'); assert.equal(h.kpi('pending'), '0 ₫');
    });
    itStats('cập nhật giữ tháng, bộ lọc và cách sắp xếp đang chọn', async function () {
      var h = mountStats(); h.q('[data-act="prev"]').click(); h.q('[data-sort="pending"]').click();
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: {} }));
      assert.equal(h.month(), 'Tháng 10/2026'); assert.deepEqual(h.ctrl.getState().sort, { key: 'pending', dir: 'desc' });
    });
    itStats('sự kiện làm dữ liệu hỏng: chuyển sang khối lỗi, không ném lỗi', async function () {
      var h = mountStats(); h.env.storage.m[DncStatsStore.KEY_DN] = 'hỏng';
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: {} }));
      assert.equal(h.q('[data-role="blocked"]').getAttribute('data-code'), 'corrupt');
    });
    itStats('refresh() tải lại dữ liệu', async function () {
      var h = mountStats(); h.env.storage.m[DncStatsStore.KEY_DN] = JSON.stringify([mk({ id: 'only', ngay: '2026-11-01', dg: 777 })]);
      h.ctrl.refresh(); assert.equal(h.kpi('approved'), '777 ₫');
    });
    itStats('destroy gỡ giao diện và listener; sự kiện sau đó không lỗi', async function () {
      var h = mountStats(), btn = h.q('[data-act="prev"]'); h.ctrl.destroy();
      assert.equal(h.box.innerHTML, ''); btn.click();
      document.dispatchEvent(new CustomEvent('dnc:data-changed', { detail: {} })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      assert.equal(h.box.innerHTML, ''); assert.equal(h.ctrl.getState().destroyed, true);
    });
    itStats('mount nhiều lần liên tiếp không nhân đôi listener', async function () {
      var env = makeEnv(), box = document.createElement('div'); document.body.appendChild(box);
      for (var i = 0; i < 3; i++) DncStats.mount(box, { store: env.store, session: MGR, today: TODAY }).destroy();
      var c = DncStats.mount(box, { store: env.store, session: MGR, today: TODAY });
      box.querySelector('[data-act="prev"]').click();
      assert.equal(box.querySelector('[data-role="month-label"]').textContent, 'Tháng 10/2026'); c.destroy(); box.remove();
    });
  });

  describe('an toàn (XSS) và hiệu năng', function () {
    itStats('tên nhân viên, nội dung mua chứa HTML được thoát ký tự ở mọi nơi', async function () {
      window.__xss = 0;
      var evil = '<img src=x onerror="window.__xss=1">';
      var h = mountStats({ nhanVien: [{ id: 'e', ma: 'E', hoTen: evil + 'Tèo', hoatDong: true }], deNghi: [mk({ id: 'x', nv: 'e', ncc: evil + '<script>window.__xss=2<\/script>', dg: 50000, ngay: '2026-11-01' })] });
      h.q('.dst-slice').focus(); h.q('[data-card="emp-chart"] .dst-hrow').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      await tick(20);
      assert.equal(window.__xss, 0); assert.equal(h.box.querySelectorAll('img').length, 0); assert.equal(h.box.querySelectorAll('script').length, 0);
      assert.ok(h.text('[data-card="suppliers"]').indexOf('<img src=x') >= 0); assert.ok(h.tip().indexOf('<img') >= 0);
    });
    itStats('id nhân viên chứa ký tự đặc biệt vẫn lọc đúng', async function () {
      var id = 'a"b\'c<d>';
      var h = mountStats({ nhanVien: [{ id: id, ma: 'E', hoTen: 'Đặc Biệt', hoatDong: true }], deNghi: [mk({ id: 'x', nv: id, dg: 1000, ngay: '2026-11-01' })] });
      h.q('[data-card="emp-table"] tr[data-nv]').click(); assert.equal(h.ctrl.getState().nhanVienId, id); assert.equal(h.kpi('approved'), '1.000 ₫');
    });
    itStats('kết xuất 3.000 khoản dưới 2 giây', async function () {
      var items = [], rnd = rng(99);
      for (var i = 0; i < 3000; i++) items.push(mk({ id: 'k' + i, ngay: '2026-' + String(1 + (i % 11)).padStart(2, '0') + '-' + String(1 + (i % 28)).padStart(2, '0'), nv: 'nv' + (1 + (i % 4)), dm: S.DANH_MUC[i % 7].id, dg: Math.floor(rnd() * 1e6) }));
      var t0 = Date.now(); var h = mountStats({ deNghi: items }); h.q('[data-range="12"]').click(); h.q('[data-act="prev"]').click();
      assert.ok(Date.now() - t0 < 2000, 'chậm ' + (Date.now() - t0) + 'ms'); assert.equal(h.cols().length, 12);
    });
  });

  describe('kiểu dáng theo DESIGN (bố cục, màu, font)', function () {
    itStats('tiêu đề 22px/700; KPI 28px/700; chỉ số khác 22px/700; số đều nét; font hệ thống', async function () {
      var h = mountStats();
      var t = cs(h.q('.dst-title')); assert.equal(t.fontSize, '22px'); assert.equal(t.fontWeight, '700');
      var k = cs(h.q('[data-role="kpi-approved"]')); assert.equal(k.fontSize, '28px'); assert.equal(k.fontWeight, '700'); assert.match(k.fontVariantNumeric, /tabular-nums/);
      var m = cs(h.q('[data-role="metric-val"]')); assert.equal(m.fontSize, '22px'); assert.equal(m.fontWeight, '700'); assert.match(m.fontVariantNumeric, /tabular-nums/);
      assert.match(cs(h.box).fontFamily, /system-ui|-apple-system|Segoe UI|Roboto|Arial/);
      assert.equal(cs(h.q('.dst-kpi h3')).fontSize, '13px');
    });
    itStats('thẻ bo 14px, viền 1px; KPI có viền trái 4px đúng màu trạng thái (6.5)', async function () {
      var h = mountStats();
      assert.equal(cs(h.q('.dst-card')).borderTopLeftRadius, '14px'); assert.equal(cs(h.q('.dst-card')).borderTopWidth, '1px');
      var D = isDark();
      assert.equal(cs(h.q('[data-kpi="approved"]')).borderLeftWidth, '4px'); assert.equal(cs(h.q('[data-kpi="approved"]')).borderLeftColor, D ? 'rgb(61, 213, 152)' : 'rgb(18, 128, 92)');
      assert.equal(cs(h.q('[data-kpi="pending"]')).borderLeftColor, D ? 'rgb(242, 184, 78)' : 'rgb(138, 90, 0)');
      assert.equal(cs(h.q('[data-kpi="rejected"]')).borderLeftColor, D ? 'rgb(242, 118, 109)' : 'rgb(179, 38, 30)');
    });
    itStats('màu biểu đồ: cung tròn dùng --cat-n; cột tháng đang chọn --primary, các cột khác --cat-7; thanh nhân viên --primary', async function () {
      var h = mountStats(), D = isDark();
      var P = D ? 'rgb(108, 155, 255)' : 'rgb(47, 111, 237)', G = D ? 'rgb(154, 163, 178)' : 'rgb(107, 115, 128)';
      assert.equal(cs(h.cols()[5].querySelector('.dst-bar')).fill, P); assert.equal(cs(h.cols()[4].querySelector('.dst-bar')).fill, G);
      assert.equal(cs(h.q('[data-card="emp-chart"] .dst-bar')).fill, P);
      assert.equal(cs(h.slices()[0]).stroke, D ? 'rgb(176, 145, 245)' : 'rgb(122, 79, 214)', 'Thiết bị = --cat-3');
      assert.equal(cs(h.q('.dst-ring')).stroke, D ? 'rgb(34, 38, 48)' : 'rgb(238, 240, 244)');
    });
    itStats('chênh lệch tăng/giảm KHÔNG dùng màu trạng thái hay màu lỗi (DESIGN 11.3)', async function () {
      var h = mountStats();
      var banned = ['--status-approved', '--status-rejected', '--status-pending', '--danger'].map(function (v) { var m = cssVar(v); return m; });
      var rgb = function (hex) { var x = parseInt(hex.slice(1), 16); return 'rgb(' + (x >> 16) + ', ' + ((x >> 8) & 255) + ', ' + (x & 255) + ')'; };
      var bad = banned.map(rgb);
      h.qa('.dst-delta').forEach(function (d) { assert.ok(bad.indexOf(cs(d).color) < 0, 'màu chênh lệch trùng màu trạng thái: ' + cs(d).color); assert.equal(cs(d).color, cs(h.q('.dst-title')).color); });
      assert.ok(h.qa('.dst-delta').length >= 5);
      assert.ok(h.qa('.dst-delta svg').length === h.qa('.dst-delta').length, 'mỗi chênh lệch đều có mũi tên');
    });
    itStats('nút chọn 6/12 tháng: đang chọn nền primary, cao ≥ 40px; nút tháng ≥ 44px', async function () {
      var h = mountStats(), D = isDark();
      assert.equal(cs(h.q('[data-range="6"]')).backgroundColor, D ? 'rgb(108, 155, 255)' : 'rgb(47, 111, 237)');
      h.qa('[data-range]').forEach(function (b) { assert.ok(b.getBoundingClientRect().height >= 40, 'cao ' + b.getBoundingClientRect().height); });
      ['prev', 'next', 'today'].forEach(function (a) { var r = h.q('[data-act="' + a + '"]').getBoundingClientRect(); assert.ok(r.width >= 44 && r.height >= 44, a); });
      assert.ok(h.q('[data-filter="nv"]').getBoundingClientRect().height >= 44);
    });
    itStats('chú thích biểu đồ ≥ 12px; nhãn số tiền cột và nhãn tháng 12px', async function () {
      var h = mountStats();
      assert.equal(cs(h.q('.dst-col-val')).fontSize, '12px'); assert.equal(cs(h.q('.dst-col-lab')).fontSize, '12px'); assert.ok(parseFloat(cs(h.q('.dst-legend li')).fontSize) >= 14);
    });
    itStats('[điện thoại] một cột, không cuộn ngang; KPI 1 cột; chỉ số khác lưới 2×2; bảng thành thẻ', async function () {
      if (!isMobile()) skip();
      var h = mountStats(); h.box.style.width = 'auto';
      var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang ' + de.scrollWidth + ' > ' + de.clientWidth);
      var kp = h.qa('.dst-kpi').map(function (e) { return Math.round(e.getBoundingClientRect().left); }); assert.equal(new Set(kp).size, 1, 'KPI xếp dọc');
      var mt = h.qa('.dst-metric').map(function (e) { return Math.round(e.getBoundingClientRect().top); }); assert.equal(new Set(mt).size, 2, 'chỉ số khác 2 hàng');
      var pie = h.q('[data-card="pie"]').getBoundingClientRect(), mo = h.q('[data-card="months"]').getBoundingClientRect();
      assert.ok(mo.top >= pie.bottom - 1, 'biểu đồ tròn và cột xếp dọc'); assert.ok(Math.abs(pie.width - mo.width) < 2, 'cùng chiều rộng');
      assert.equal(cs(h.q('[data-card="emp-table"] tbody tr')).display, 'grid', 'hàng bảng thành thẻ'); assert.equal(cs(h.q('[data-card="emp-table"] thead')).position, 'absolute');
      assert.ok(h.q('.dst-donut').getBoundingClientRect().width <= 220.5);
      h.qa('.dst-col').forEach(function (c) { var r = c.getBoundingClientRect(); assert.ok(r.left >= 0 && r.right <= window.innerWidth + 0.5, 'cột ra ngoài'); });
      h.q('[data-range="12"]').click(); assert.ok(de.scrollWidth <= de.clientWidth, '12 tháng tràn ngang');
      assert.equal(cs(h.q('.dst-col:not(.is-selected) .dst-col-val')).visibility, 'hidden'); h.qa('.dst-col').forEach(function (c) { assert.ok(c.getBoundingClientRect().right <= window.innerWidth + 0.5); });
    });
    itStats('[điện thoại] thẻ nhân viên: 3 ô nhỏ cạnh nhau, nhãn nhỏ phía trên giá trị', async function () {
      if (!isMobile()) skip();
      var h = mountStats(); h.box.style.width = 'auto';
      var tds = h.qa('[data-card="emp-table"] tbody tr[data-nv="nv1"] td');
      var tops = tds.slice(1, 4).map(function (t) { return Math.round(t.getBoundingClientRect().top); }); assert.equal(new Set(tops).size, 1, 'ba ô cùng hàng');
      var before = cs(tds[1], '::before'); assert.equal(getComputedStyle(tds[1], '::before').fontSize, '12px');
      assert.equal(getComputedStyle(tds[1], '::before').content.replace(/"/g, ''), 'Đề nghị trong tháng');
    });
    itStats('[laptop] lưới 12 cột: biểu đồ tròn (5) cạnh biểu đồ cột (7); nhân viên (7) cạnh top nội dung (5); KPI 3 thẻ một hàng; bảng thật', async function () {
      if (!isDesktop()) skip();
      var h = mountStats(); h.box.style.width = 'auto';
      var de = document.documentElement; assert.ok(de.scrollWidth <= de.clientWidth, 'tràn ngang');
      assert.ok(h.q('.dst-main').getBoundingClientRect().width <= 1120);
      var pie = h.q('[data-card="pie"]').getBoundingClientRect(), mo = h.q('[data-card="months"]').getBoundingClientRect();
      assert.equal(Math.round(pie.top), Math.round(mo.top), 'cùng hàng'); assert.ok(Math.abs(pie.width / mo.width - (5 / 7)) < 0.1, 'tỉ lệ 5:7 ' + (pie.width / mo.width));
      var ec = h.q('[data-card="emp-chart"]').getBoundingClientRect(), sp = h.q('[data-card="suppliers"]').getBoundingClientRect();
      assert.equal(Math.round(ec.top), Math.round(sp.top)); assert.ok(ec.width > sp.width);
      var kp = h.qa('.dst-kpi').map(function (e) { return Math.round(e.getBoundingClientRect().top); }); assert.equal(new Set(kp).size, 1);
      assert.equal(new Set(h.qa('.dst-metric').map(function (e) { return Math.round(e.getBoundingClientRect().top); })).size, 1);
      assert.equal(cs(h.q('[data-card="emp-table"] table')).display, 'table'); assert.notEqual(cs(h.q('[data-card="emp-table"] thead')).position, 'absolute');
      assert.equal(cs(h.q('.dst-sortbar')).display, 'none', 'ô chọn sắp xếp chỉ dành cho điện thoại');
      assert.equal(h.q('[data-card="emp-table"] table').getBoundingClientRect().right <= h.q('[data-card="emp-table"]').getBoundingClientRect().right, true, 'bảng không tràn thẻ');
    });
    itStats('[laptop] bảng so sánh danh mục không bị cắt chữ; cột số căn phải', async function () {
      if (!isDesktop()) skip();
      var h = mountStats(); h.box.style.width = 'auto';
      var tb = h.q('[data-role="cmp-table"]'); assert.ok(tb.scrollWidth <= tb.parentElement.clientWidth + 1);
      h.qa('[data-role="cmp-cur"], [data-role="cmp-prev"]').forEach(function (td) { assert.equal(cs(td).textAlign, 'right'); assert.ok(td.scrollWidth <= td.clientWidth + 1, 'tiền bị cắt'); });
    });
  });

  describe('tương phản màu và trợ năng', function () {
    function pair(name, fg, bg, min) { var r = contrast(fg, bg); assert.ok(r >= (min || 4.5), name + ': ' + r.toFixed(2) + ':1 (' + fg + ' trên ' + bg + ')'); }
    itStats('chữ trong thẻ, KPI, chỉ số, chú giải, nhãn, bảng đạt AA ≥ 4.5:1', async function () {
      var h = mountStats(), card = cs(h.q('.dst-card')).backgroundColor, bg = cssVar('--bg');
      pair('tiêu đề trên nền trang', cs(h.q('.dst-title')).color, bg);
      pair('tiêu đề thẻ', cs(h.q('.dst-card h2')).color, card); pair('điểm chính', cs(h.q('.dst-hl li')).color, card);
      pair('mô tả thẻ', cs(h.q('.dst-sub')).color, card);
      var kpi = cs(h.q('.dst-kpi')).backgroundColor; pair('nhãn KPI', cs(h.q('.dst-kpi h3')).color, kpi); pair('số KPI', cs(h.q('.dst-kpi-val')).color, kpi); pair('phụ KPI', cs(h.q('.dst-kpi-sub')).color, kpi); pair('chênh lệch', cs(h.q('.dst-kpi .dst-delta')).color, kpi);
      var mt = cs(h.q('.dst-metric')).backgroundColor; pair('chỉ số', cs(h.q('.dst-metric-val')).color, mt); pair('phụ chỉ số', cs(h.q('.dst-metric-sub')).color, mt); pair('nhãn chỉ số', cs(h.q('.dst-metric h3')).color, mt);
      pair('% chú thích', cs(h.q('.dst-pct')).color, card); pair('số tiền chú thích', cs(h.q('.dst-amt')).color, card); pair('giữa vòng tròn', cs(h.q('[data-role="donut-total"]')).color, card); pair('nhãn giữa vòng tròn', cs(h.q('.dst-donut-center span')).color, card);
      pair('nhãn số tiền cột', cs(h.q('.dst-col-val')).color, card); pair('nhãn tháng', cs(h.q('.dst-col-lab')).color, card); pair('nhãn tháng đang chọn', cs(h.q('.dst-col.is-selected .dst-col-lab')).color, card);
      pair('dòng chênh lệch tháng', cs(h.q('.dst-foot')).color, card);
      pair('ô bảng', cs(h.q('[data-card="compare"] td')).color, card); pair('tiêu đề bảng', cs(h.q('[data-card="compare"] th')).color, card);
      var tag = h.q('.dst-tag'); pair('nhãn Chi nhiều nhất', cs(tag).color, cs(tag).backgroundColor);
      pair('tiêu đề cột sắp xếp', cs(h.q('.dst-sort')).color, card); pair('tên nhân viên', cs(h.q('.dst-person')).color, card);
      var av = h.q('.dst-avatar'); pair('chữ cái đại diện', cs(av).color, cs(av).backgroundColor);
      var ft = h.q('[data-role="emp-total"] td'); pair('hàng tổng cộng', cs(ft).color, effBg(ft));
      pair('nút tháng', cs(h.q('.dst-month-label')).color, bg); pair('nút lọc', cs(h.q('.dst-select')).color, cs(h.q('.dst-select')).backgroundColor);
      var sel = h.q('[data-range="6"]'); pair('nút 6 tháng (đang chọn)', cs(sel).color, cs(sel).backgroundColor);
      pair('nút 12 tháng', cs(h.q('[data-range="12"]')).color, cs(h.q('.dst-seg')).backgroundColor);
      pair('đang xem', cs(h.q('.dst-card')).color, bg);
    });
    itStats('chú giải (tooltip) và khối lỗi đạt AA', async function () {
      var h = mountStats(); h.slices()[0].focus();
      var tip = h.q('[data-role="tip"]'); pair('chú giải', cs(tip).color, cs(tip).backgroundColor);
      var env = makeEnv(); env.storage.failGet = true; var g = mountStats({ env: env }); pair('khối lỗi', cs(g.q('.dst-panel p')).color, cs(g.q('.dst-panel')).backgroundColor);
    });
    itStats('đồ họa biểu đồ đạt ≥ 3:1 trên nền thẻ (WCAG 1.4.11)', async function () {
      var h = mountStats(), card = cs(h.q('.dst-card')).backgroundColor;
      for (var n = 1; n <= 7; n++) pair('--cat-' + n, cssVar('--cat-' + n), card, 3);
      pair('--primary', cssVar('--primary'), card, 3); pair('cột xám --cat-7', cs(h.cols()[4].querySelector('.dst-bar')).fill, card, 3);
      pair('viền trái KPI duyệt', cssVar('--status-approved'), card, 3); pair('viền trái KPI chờ', cssVar('--status-pending'), card, 3); pair('viền trái KPI từ chối', cssVar('--status-rejected'), card, 3);
      pair('mũi tên chênh lệch', cs(h.q('.dst-delta svg')).color, card, 3);
    });
    itStats('cấu trúc trợ năng: tiêu đề thẻ gắn vùng, bảng có caption/scope, nhóm nút có nhãn, biểu tượng ẩn', async function () {
      var h = mountStats();
      h.qa('section.dst-card').forEach(function (s) { var id = s.getAttribute('aria-labelledby'); assert.ok(id && document.getElementById(id), 'thẻ thiếu nhãn'); });
      h.qa('table.dst-table').forEach(function (t) { assert.ok(t.querySelector('caption')); t.querySelectorAll('thead th').forEach(function (th) { assert.equal(th.getAttribute('scope'), 'col'); }); });
      assert.equal(h.q('.dst-seg').getAttribute('role'), 'group'); assert.ok(h.q('.dst-seg').getAttribute('aria-label'));
      h.qa('svg').forEach(function (s) { if (s.closest('.dst-donut')) return; assert.equal(s.getAttribute('aria-hidden'), 'true'); });
      assert.equal(h.q('[data-role="month-label"]').getAttribute('aria-live'), 'polite'); assert.equal(h.q('[data-role="tip"]').getAttribute('role'), 'tooltip');
      assert.equal(h.q('[data-act="prev"]').getAttribute('aria-label'), 'Tháng trước');
    });
    itStats('mọi nút, hàng bảng, cung tròn đều focus được và có vòng focus (outline)', async function () {
      var h = mountStats();
      var els = h.qa('button, select, tr[data-nv], .dst-slice'); assert.ok(els.length > 20);
      els.forEach(function (e) { assert.ok(e.tabIndex >= 0, 'không focus được: ' + e.outerHTML.slice(0, 60)); });
      var b = h.q('[data-act="prev"]'); b.focus(); assert.equal(cs(b).outlineStyle, 'solid'); assert.equal(cs(b).outlineWidth, '2px');
    });
  });
})();
