/* Sổ Đề Nghị Chi – Module 3: Thống kê
 * Logic thuần (không DOM, không storage): chuẩn hóa dữ liệu, tổng hợp theo tháng / danh mục /
 * nhân viên / nhà cung cấp, so sánh, phần trăm, nhận xét. Chạy được trong trình duyệt và Node.
 * Độc lập với các module khác: chỉ dùng chung hợp đồng dữ liệu `dnc:v1:deNghi` (xem README).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DncStatsModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CHO = 'cho_duyet', DUYET = 'da_duyet', TU_CHOI = 'tu_choi';

  var DANH_MUC = [
    { id: 'van_phong_pham', ten: 'Văn phòng phẩm', cat: 1 },
    { id: 'vat_tu', ten: 'Vật tư', cat: 2 },
    { id: 'thiet_bi', ten: 'Thiết bị', cat: 3 },
    { id: 'van_chuyen', ten: 'Vận chuyển', cat: 4 },
    { id: 'tiep_khach', ten: 'Tiếp khách', cat: 5 },
    { id: 'dich_vu', ten: 'Dịch vụ', cat: 6 },
    { id: 'khac', ten: 'Khác', cat: 7 }
  ];
  var LIMITS = { SMALL_PCT: 3, TOP_N: 5, EMP_CHART_MAX: 8, MONTH_MIN: '2000-01', RANGES: [6, 12] };

  function str(x) { return x == null ? '' : String(x); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

  /* ---------- Danh mục ---------- */
  function danhMucOf(id) {
    for (var i = 0; i < DANH_MUC.length; i++) if (DANH_MUC[i].id === id) return DANH_MUC[i];
    return DANH_MUC[DANH_MUC.length - 1]; // id lạ → Khác
  }
  function danhMucTen(id) { return danhMucOf(id).ten; }

  /* ---------- Tiền & định dạng ---------- */
  function groupDigits(d) { return str(d).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function formatVND(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    return (n < 0 ? '-' : '') + groupDigits(String(Math.abs(Math.round(n)))) + ' ₫';
  }
  function trim1(x) { // 12.5 → "12,5"; 12 → "12"
    var s = (Math.round(x * 10 + 1e-9) / 10).toFixed(1); // +1e-9: tránh 6,55 → 6,5 do sai số nhị phân
    return s.replace(/\.0$/, '').replace('.', ',');
  }
  /* Số tiền rút gọn cho nhãn biểu đồ: 850 k · 6,6 tr · 1,25 tỷ */
  function formatCompact(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    var a = Math.abs(n), sign = n < 0 ? '-' : '';
    if (a < 1000) return sign + String(Math.round(a));
    if (a < 1e6) { // 999.999 làm tròn thành "1000 k" → đổi sang đơn vị lớn hơn
      if (Math.round(a / 1e3 * 10 + 1e-9) / 10 >= 1000) return sign + '1 tr';
      return sign + trim1(a / 1e3) + ' k';
    }
    if (a < 1e9) {
      if (Math.round(a / 1e6 * 10 + 1e-9) / 10 >= 1000) return sign + '1 tỷ';
      return sign + trim1(a / 1e6) + ' tr';
    }
    return sign + trim2(a / 1e9) + ' tỷ';
  }
  function trim2(x) {
    return (Math.round(x * 100 + 1e-9) / 100).toFixed(2).replace(/0$/, '').replace(/\.0$/, '').replace('.', ',');
  }
  function formatPct(p) { return typeof p === 'number' && isFinite(p) ? trim1(p) + '%' : '—'; }
  function formatDelta(pct) { // +12,5% · −3% · 0%
    if (typeof pct !== 'number' || !isFinite(pct)) return '—';
    if (pct === 0) return '0%';
    return (pct > 0 ? '+' : '−') + trim1(Math.abs(pct)) + '%';
  }
  function formatSignedVND(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    if (n === 0) return '0 ₫';
    return (n > 0 ? '+' : '−') + formatVND(Math.abs(n));
  }
  function formatHours(h) {
    if (typeof h !== 'number' || !isFinite(h) || h < 0) return '—';
    if (h < 1) return '< 1 giờ';
    if (h < 48) return Math.round(h) + ' giờ';
    return trim1(h / 24) + ' ngày';
  }

  /* ---------- Ngày / tháng ---------- */
  function todayStr(now) {
    var d = now || new Date();
    return pad(d.getFullYear(), 4) + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }
  function isValidDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
    if (!m) return false;
    var y = +m[1], mo = +m[2], da = +m[3];
    if (y < 1 || mo < 1 || mo > 12 || da < 1) return false;
    var d = new Date(0);
    d.setUTCFullYear(y, mo - 1, da);
    return d.getUTCFullYear() === y && d.getUTCMonth() === mo - 1 && d.getUTCDate() === da;
  }
  function monthOf(dateStr) { return isValidDate(dateStr) ? dateStr.slice(0, 7) : null; }
  function isValidMonth(m) {
    var x = /^(\d{4})-(\d{2})$/.exec(str(m));
    return !!x && +x[1] >= 1 && +x[2] >= 1 && +x[2] <= 12;
  }
  function shiftMonth(m, delta) {
    if (!isValidMonth(m)) return m;
    var y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + delta;
    y += Math.floor(mo / 12);
    mo = ((mo % 12) + 12) % 12;
    return pad(y, 4) + '-' + pad(mo + 1, 2);
  }
  function monthLabel(m) { return isValidMonth(m) ? 'Tháng ' + (+m.slice(5, 7)) + '/' + m.slice(0, 4) : ''; }
  function monthShort(m) { return isValidMonth(m) ? 'T' + (+m.slice(5, 7)) : ''; }

  /* ---------- Chuẩn hóa dữ liệu ----------
   * Mỗi khoản hợp lệ → { id, nv, dm, ncc, tt (trạng thái), ngay, month, amount, ngayTao, ngayXuLy }.
   * Khoản hỏng (thiếu id, trạng thái lạ, ngày/số lỗi) bị bỏ qua và được đếm. */
  function amountOf(it) {
    if (!it || typeof it.soLuong !== 'number' || typeof it.donGia !== 'number') return NaN;
    if (!isFinite(it.soLuong) || !isFinite(it.donGia) || it.soLuong < 0 || it.donGia < 0) return NaN;
    if (it.donGia % 1 !== 0 || it.donGia > 1e12) return NaN;
    var milli = Math.round(it.soLuong * 1000);
    if (milli > 1e12) return NaN;
    return Number((BigInt(milli) * BigInt(it.donGia) + 500n) / 1000n);
  }
  function prepare(items) {
    var rows = [], skipped = 0, seen = {};
    (Array.isArray(items) ? items : []).forEach(function (it) {
      if (!it || typeof it !== 'object' || !it.id || seen[it.id]) { skipped++; return; }
      var st = it.trangThai;
      var month = monthOf(it.ngay), amount = amountOf(it);
      if ((st !== CHO && st !== DUYET && st !== TU_CHOI) || !month || !isFinite(amount) || !it.nhanVienId) { skipped++; return; }
      seen[it.id] = true;
      rows.push({
        id: String(it.id), nv: String(it.nhanVienId), dm: danhMucOf(it.danhMuc).id, ncc: str(it.nhaCungCap).trim(),
        tt: st, ngay: it.ngay, month: month, amount: amount, ngayTao: it.ngayTao || null, ngayXuLy: it.ngayXuLy || null
      });
    });
    return { rows: rows, skipped: skipped };
  }

  function sum(list) {
    var t = 0n;
    list.forEach(function (r) { t += BigInt(r.amount); });
    return Number(t);
  }
  function pick(rows, month, f) {
    f = f || {};
    return rows.filter(function (r) {
      return (!month || r.month === month) && (!f.nhanVienId || r.nv === f.nhanVienId);
    });
  }
  function bucket(list) { return { count: list.length, total: sum(list) }; }

  /* ---------- Thống kê tháng ---------- */
  function monthStats(rows, month, f) {
    var list = pick(rows, month, f);
    var ap = list.filter(function (r) { return r.tt === DUYET; });
    var pe = list.filter(function (r) { return r.tt === CHO; });
    var re = list.filter(function (r) { return r.tt === TU_CHOI; });
    var a = bucket(ap), p = bucket(pe), r = bucket(re);
    var largest = null;
    ap.forEach(function (x) {
      if (!largest || x.amount > largest.amount || (x.amount === largest.amount && (x.ngay < largest.ngay || (x.ngay === largest.ngay && x.id < largest.id)))) largest = x;
    });
    var hours = [];
    ap.concat(re).forEach(function (x) {
      var t0 = x.ngayTao ? new Date(x.ngayTao).getTime() : NaN, t1 = x.ngayXuLy ? new Date(x.ngayXuLy).getTime() : NaN;
      if (isFinite(t0) && isFinite(t1) && t1 >= t0) hours.push((t1 - t0) / 3600000);
    });
    var processed = a.count + r.count;
    return {
      approved: a, pending: p, rejected: r, count: list.length,
      avgApproved: a.count ? Math.round(a.total / a.count) : null,
      largest: largest ? { id: largest.id, ncc: largest.ncc, nv: largest.nv, amount: largest.amount } : null,
      approvalRate: processed ? Math.round(a.count / processed * 1000) / 10 : null,
      avgProcessHours: hours.length ? hours.reduce(function (x, y) { return x + y; }, 0) / hours.length : null
    };
  }

  /* ---------- So sánh ---------- */
  function compare(cur, prev) {
    var diff = cur - prev;
    var isNew = prev === 0 && cur > 0;
    return {
      cur: cur, prev: prev, diff: diff, isNew: isNew,
      pct: prev === 0 ? null : Math.round(diff / prev * 1000) / 10,
      dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
    };
  }

  /* Phần trăm nguyên cộng đúng 100 (phương pháp phần dư lớn nhất). */
  function percentsSumTo100(values) {
    var total = values.reduce(function (a, b) { return a + b; }, 0);
    if (!(total > 0)) return values.map(function () { return 0; });
    var raw = values.map(function (v) { return v / total * 100; });
    var fl = raw.map(Math.floor);
    var left = 100 - fl.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (x, i) { return { i: i, rem: x - Math.floor(x) }; })
      .sort(function (a, b) { return b.rem - a.rem || a.i - b.i; });
    for (var k = 0; k < left; k++) fl[order[k].i]++;
    return fl;
  }

  /* Chi Đã duyệt theo danh mục (đủ 7 danh mục), giảm dần. */
  function byCategory(rows, month, f) {
    var ap = pick(rows, month, f).filter(function (r) { return r.tt === DUYET; });
    var total = sum(ap);
    var list = DANH_MUC.map(function (d) {
      var l = ap.filter(function (r) { return r.dm === d.id; });
      var t = sum(l);
      return { danhMuc: d.id, ten: d.ten, cat: d.cat, total: t, count: l.length, share: total > 0 ? t / total * 100 : 0 };
    });
    list.sort(function (a, b) { return b.total - a.total || a.cat - b.cat; });
    return { total: total, count: ap.length, list: list };
  }

  /* Phần dùng cho biểu đồ tròn: bỏ danh mục 0, gộp phần < 3% vào "Khác", phần trăm cộng đúng 100. */
  function pieSlices(cat) {
    if (!(cat.total > 0)) return [];
    var big = [], small = 0, smallCount = 0;
    cat.list.forEach(function (c) {
      if (c.total <= 0) return;
      if (c.danhMuc !== 'khac' && c.share < LIMITS.SMALL_PCT) { small += c.total; smallCount += c.count; } else big.push({ danhMuc: c.danhMuc, ten: c.ten, cat: c.cat, total: c.total, count: c.count });
    });
    if (small > 0) {
      var k = null;
      for (var i = 0; i < big.length; i++) if (big[i].danhMuc === 'khac') { k = big[i]; break; }
      if (k) { k.total += small; k.count += smallCount; } else big.push({ danhMuc: 'khac', ten: 'Khác', cat: 7, total: small, count: smallCount });
    }
    big.sort(function (a, b) {
      if (a.danhMuc === 'khac') return 1;
      if (b.danhMuc === 'khac') return -1;
      return b.total - a.total || a.cat - b.cat;
    });
    var pct = percentsSumTo100(big.map(function (s) { return s.total; }));
    return big.map(function (s, i) { s.pct = pct[i]; s.share = s.total / cat.total * 100; return s; });
  }

  /* n tháng liên tiếp kết thúc ở endMonth (cũ → mới). */
  function monthlySeries(rows, endMonth, n, f) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var m = shiftMonth(endMonth, -i);
      var ap = pick(rows, m, f).filter(function (r) { return r.tt === DUYET; });
      out.push({ month: m, total: sum(ap), count: ap.length });
    }
    return out;
  }

  /* So sánh từng danh mục giữa tháng đang chọn và tháng trước. */
  function categoryComparison(rows, month, f) {
    var cur = byCategory(rows, month, f), prev = byCategory(rows, shiftMonth(month, -1), f);
    var pm = {};
    prev.list.forEach(function (c) { pm[c.danhMuc] = c; });
    var list = cur.list.map(function (c) {
      var cmp = compare(c.total, pm[c.danhMuc].total);
      return { danhMuc: c.danhMuc, ten: c.ten, cat: c.cat, cur: c.total, prev: pm[c.danhMuc].total, diff: cmp.diff, pct: cmp.pct, isNew: cmp.isNew, dir: cmp.dir };
    }).filter(function (c) { return c.cur > 0 || c.prev > 0; });
    list.sort(function (a, b) { return b.cur - a.cur || b.prev - a.prev || a.cat - b.cat; });
    return { list: list, curTotal: cur.total, prevTotal: prev.total, total: compare(cur.total, prev.total) };
  }

  /* ---------- Theo nhân viên ---------- */
  function byEmployee(rows, month, employees) {
    var dir = {};
    (employees || []).forEach(function (e) { if (e && e.id) dir[e.id] = e; });
    var inMonth = rows.filter(function (r) { return r.month === month; });
    var ids = {};
    Object.keys(dir).forEach(function (id) { if (dir[id].hoatDong !== false) ids[id] = true; });
    inMonth.forEach(function (r) { ids[r.nv] = true; });
    var allApproved = sum(inMonth.filter(function (r) { return r.tt === DUYET; }));
    var out = Object.keys(ids).map(function (id) {
      var mine = inMonth.filter(function (r) { return r.nv === id; });
      var ap = bucket(mine.filter(function (r) { return r.tt === DUYET; }));
      var pe = bucket(mine.filter(function (r) { return r.tt === CHO; }));
      var re = bucket(mine.filter(function (r) { return r.tt === TU_CHOI; }));
      return {
        id: id, ten: dir[id] ? dir[id].hoTen : 'Nhân viên không rõ', ngung: !!(dir[id] && dir[id].hoatDong === false),
        monthCount: mine.length, approved: ap, pending: pe, rejected: re,
        share: allApproved > 0 ? ap.total / allApproved * 100 : 0,
        allTimeCount: rows.filter(function (r) { return r.nv === id; }).length
      };
    });
    return sortEmployees(out, 'approved', 'desc');
  }
  var SORT_VALUE = {
    approved: function (e) { return e.approved.total; }, pending: function (e) { return e.pending.total; },
    monthCount: function (e) { return e.monthCount; }, rejected: function (e) { return e.rejected.count; },
    allTime: function (e) { return e.allTimeCount; }, share: function (e) { return e.share; }
  };
  function sortEmployees(list, key, dirn) {
    var val = SORT_VALUE[key] || SORT_VALUE.approved, sgn = dirn === 'asc' ? 1 : -1;
    return list.slice().sort(function (a, b) {
      return (val(a) - val(b)) * sgn || a.ten.localeCompare(b.ten, 'vi') || (a.id < b.id ? -1 : 1);
    });
  }
  function employeeTotals(list) {
    var t = { monthCount: 0, approved: { count: 0, total: 0 }, pending: { count: 0, total: 0 }, rejected: { count: 0, total: 0 }, allTimeCount: 0 };
    list.forEach(function (e) {
      t.monthCount += e.monthCount; t.allTimeCount += e.allTimeCount;
      ['approved', 'pending', 'rejected'].forEach(function (k) { t[k].count += e[k].count; t[k].total += e[k].total; });
    });
    return t;
  }

  /* ---------- Top nội dung / nhà cung cấp ---------- */
  function normName(s) { return str(s).replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi'); }
  function topSuppliers(rows, month, f, n) {
    var ap = pick(rows, month, f).filter(function (r) { return r.tt === DUYET && r.ncc; });
    var map = {};
    ap.forEach(function (r) {
      var k = normName(r.ncc);
      var e = map[k] || (map[k] = { key: k, names: {}, total: 0, count: 0 });
      e.names[r.ncc] = (e.names[r.ncc] || 0) + 1; e.total += r.amount; e.count++;
    });
    var list = Object.keys(map).map(function (k) {
      var e = map[k], best = null;
      Object.keys(e.names).sort().forEach(function (nm) { if (!best || e.names[nm] > e.names[best]) best = nm; });
      return { name: best, total: e.total, count: e.count };
    });
    list.sort(function (a, b) { return b.total - a.total || a.name.localeCompare(b.name, 'vi'); });
    return list.slice(0, n || LIMITS.TOP_N);
  }

  /* ---------- Điểm chính ---------- */
  function highlights(rows, month, f, employees) {
    var st = monthStats(rows, month, f);
    var cc = categoryComparison(rows, month, f);
    var cat = byCategory(rows, month, f);
    var out = [];
    if (st.count === 0) { out.push({ kind: 'empty', text: 'Tháng này chưa có đề nghị nào.' }); return out; }
    if (cat.total > 0) {
      var top = cat.list[0];
      out.push({ kind: 'top-category', danhMuc: top.danhMuc, text: 'Chi nhiều nhất: ' + top.ten + ' – ' + formatPct(Math.round(top.share * 10) / 10) + ' (' + formatVND(top.total) + ')' });
      var t = cc.total;
      if (t.isNew) out.push({ kind: 'mom', text: 'Tháng trước chưa có khoản Đã duyệt nên chưa so sánh được.' });
      else if (t.prev > 0) out.push({ kind: 'mom', dir: t.dir, text: t.dir === 'same' ? 'Tổng chi Đã duyệt không đổi so với ' + monthLabel(shiftMonth(month, -1)) : 'Tổng chi Đã duyệt ' + (t.dir === 'up' ? 'tăng ' : 'giảm ') + formatPct(Math.abs(t.pct)) + ' so với ' + monthLabel(shiftMonth(month, -1)) });
      var rise = cc.list.filter(function (c) { return c.diff > 0; }).sort(function (a, b) { return b.diff - a.diff || a.cat - b.cat; })[0];
      if (rise && !rise.isNew && cc.prevTotal > 0) out.push({ kind: 'rise', danhMuc: rise.danhMuc, text: 'Tăng nhiều nhất so với tháng trước: ' + rise.ten + ' (' + formatSignedVND(rise.diff) + ')' });
      else if (rise && rise.isNew && cc.prevTotal > 0) out.push({ kind: 'rise', danhMuc: rise.danhMuc, text: 'Danh mục mới trong tháng: ' + rise.ten + ' (' + formatVND(rise.cur) + ')' });
    } else {
      out.push({ kind: 'no-approved', text: 'Chưa có khoản Đã duyệt trong tháng.' });
    }
    if (!(f && f.nhanVienId) && employees) {
      var emp = byEmployee(rows, month, employees)[0];
      if (emp && emp.approved.total > 0) out.push({ kind: 'top-employee', nhanVienId: emp.id, text: 'Nhân viên chi nhiều nhất: ' + emp.ten + ' (' + formatVND(emp.approved.total) + ')' });
    }
    if (st.pending.count > 0) out.push({ kind: 'pending', text: 'Còn ' + st.pending.count + ' khoản chờ duyệt, tổng ' + formatVND(st.pending.total) });
    return out;
  }

  return {
    CHO: CHO, DUYET: DUYET, TU_CHOI: TU_CHOI, DANH_MUC: DANH_MUC, LIMITS: LIMITS,
    danhMucOf: danhMucOf, danhMucTen: danhMucTen,
    groupDigits: groupDigits, formatVND: formatVND, formatCompact: formatCompact, formatPct: formatPct, formatDelta: formatDelta,
    formatSignedVND: formatSignedVND, formatHours: formatHours,
    todayStr: todayStr, isValidDate: isValidDate, monthOf: monthOf, isValidMonth: isValidMonth, shiftMonth: shiftMonth,
    monthLabel: monthLabel, monthShort: monthShort,
    amountOf: amountOf, prepare: prepare, monthStats: monthStats, compare: compare, percentsSumTo100: percentsSumTo100,
    byCategory: byCategory, pieSlices: pieSlices, monthlySeries: monthlySeries, categoryComparison: categoryComparison,
    byEmployee: byEmployee, sortEmployees: sortEmployees, employeeTotals: employeeTotals, topSuppliers: topSuppliers,
    highlights: highlights
  };
});
