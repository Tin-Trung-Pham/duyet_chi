/* Sổ Đề Nghị Chi – Module 5: Khung ứng dụng & Trang chủ điều hướng
 * Logic thuần: bảng định tuyến theo vai trò, phân tích địa chỉ (#/…), bảo vệ trang, phiên làm việc,
 * kiểm tra sức khỏe dữ liệu, số liệu cho Trang chủ. Chạy được trong trình duyệt và Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DncAppModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NV = 'nhan_vien', QL = 'quan_ly';
  var KEYS = { NV: 'dnc:v1:nhanVien', DN: 'dnc:v1:deNghi', SESSION: 'dnc:v1:session', ACK: 'dnc:v1:ui:ack', PROBE: 'dnc:v1:ui:probe' };

  var ROUTES = [
    { name: 'home', path: '/', title: 'Trang chủ', label: 'Trang chủ', roles: [NV, QL], icon: 'home' },
    { name: 'thong-ke', path: '/thong-ke', title: 'Thống kê', label: 'Thống kê', roles: [NV, QL], icon: 'chart' },
    { name: 'nhap-lieu', path: '/nhap-lieu', title: 'Thêm đề nghị chi', label: 'Thêm', roles: [NV], icon: 'plus' },
    { name: 'duyet', path: '/duyet', title: 'Duyệt đề nghị', label: 'Duyệt', roles: [QL], icon: 'check' },
    { name: 'nhan-vien', path: '/nhan-vien', title: 'Nhân viên', label: 'Nhân viên', roles: [QL], icon: 'users' },
    { name: 'vai-tro', path: '/vai-tro', title: 'Chọn vai trò', label: 'Chọn vai trò', roles: [], icon: 'shield', isPublic: true }
  ];
  var NAV = {}; NAV[NV] = ['home', 'thong-ke', 'nhap-lieu']; NAV[QL] = ['home', 'thong-ke', 'duyet', 'nhan-vien'];
  var ROLE_LABEL = {}; ROLE_LABEL[NV] = 'Nhân viên'; ROLE_LABEL[QL] = 'Quản lý';
  var APP_NAME = 'Sổ Đề Nghị Chi';

  function str(x) { return x == null ? '' : String(x); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function route(name) { for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].name === name) return ROUTES[i]; return null; }

  /* ---------- Địa chỉ ---------- */
  /* '#/duyet' → {name:'duyet', params:[], known:true}; '', '#', '#/' → trang chủ; địa chỉ lạ → trang chủ, known=false. */
  function parsePath(input) {
    var s = str(input).trim().replace(/^#/, '').replace(/[?].*$/, '');
    if (s.charAt(0) !== '/') s = '/' + s;
    var parts = s.split('/').filter(function (x) { return x !== ''; }).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    if (!parts.length) return { name: 'home', params: [], known: true, path: '/' };
    var r = route(parts[0]);
    if (!r || r.name === 'home') return { name: 'home', params: [], known: !!r, path: '/' };
    return { name: r.name, params: parts.slice(1), known: true, path: '/' + parts.map(encodeURIComponent).join('/') };
  }
  function buildPath(name, params) {
    var r = route(name); if (!r) return '/';
    if (name === 'home') return '/';
    return r.path + (params && params.length ? '/' + params.map(encodeURIComponent).join('/') : '');
  }

  /* ---------- Bảo vệ trang ---------- */
  function allowed(r, session) { return !!r && (r.isPublic || (!!session && r.roles.indexOf(session.vaiTro) >= 0)); }
  /* → {action:'show', route:parsed} | {action:'redirect', to, reason:'no-session'|'forbidden'|'unknown'} */
  function resolve(path, session) {
    var p = parsePath(path), r = route(p.name);
    if (!session) return p.name === 'vai-tro' ? { action: 'show', route: p } : { action: 'redirect', to: '/vai-tro', reason: 'no-session' };
    if (!p.known) return { action: 'redirect', to: '/', reason: 'unknown' };
    if (!allowed(r, session)) return { action: 'redirect', to: '/', reason: 'forbidden', route: p.name };
    return { action: 'show', route: p };
  }
  function navItems(session) {
    if (!session || !NAV[session.vaiTro]) return [];
    return NAV[session.vaiTro].map(function (n) { var r = route(n); return { name: r.name, path: r.path, label: r.label, title: r.title, icon: r.icon }; });
  }
  function forbiddenMessage(routeName) {
    var r = route(routeName); if (!r || r.isPublic) return 'Bạn không có quyền vào trang này.';
    return 'Trang này dành cho ' + r.roles.map(function (x) { return ROLE_LABEL[x]; }).join(' / ') + '.';
  }
  function pageTitle(routeName) { var r = route(routeName); return (r ? r.title : APP_NAME) + ' · ' + APP_NAME; }

  /* ---------- Phiên làm việc ---------- */
  function normalizeSession(x) {
    if (!x || typeof x !== 'object') return null;
    if (x.vaiTro === QL) return { vaiTro: QL };
    if (x.vaiTro === NV && typeof x.nhanVienId === 'string' && x.nhanVienId.trim() !== '') return { vaiTro: NV, nhanVienId: x.nhanVienId };
    return null;
  }
  function readSession(storage) {
    var raw;
    try { raw = storage.getItem(KEYS.SESSION); } catch (e) { return null; }
    if (raw == null || raw === '') return null;
    try { return normalizeSession(JSON.parse(raw)); } catch (e) { return null; }
  }
  function writeSession(storage, session) {
    var s = normalizeSession(session);
    if (!s) return false;
    try { storage.setItem(KEYS.SESSION, JSON.stringify(s)); return true; } catch (e) { return false; }
  }
  function clearSession(storage) { try { storage.removeItem(KEYS.SESSION); return true; } catch (e) { return false; } }

  function readList(storage, key) {
    var raw;
    try { raw = storage.getItem(key); } catch (e) { return { ok: false, error: 'blocked' }; }
    if (raw == null || raw === '') return { ok: true, data: [] };
    var d;
    try { d = JSON.parse(raw); } catch (e) { return { ok: false, error: 'corrupt' }; }
    return Array.isArray(d) ? { ok: true, data: d } : { ok: false, error: 'corrupt' };
  }
  /* Nhân viên đang hoạt động (cho ô "Tôi là…"). */
  function activeEmployees(storage) {
    var r = readList(storage, KEYS.NV); if (!r.ok) return [];
    var seen = {}, out = [];
    r.data.forEach(function (x) {
      if (!x || typeof x !== 'object' || x.id == null || x.id === '' || !x.hoTen || x.hoatDong === false) return;
      var id = String(x.id); if (seen[id]) return; seen[id] = true;
      out.push({ id: id, ma: x.ma ? String(x.ma) : '', hoTen: String(x.hoTen) });
    });
    return out;
  }
  function allEmployees(storage) {
    var r = readList(storage, KEYS.NV); if (!r.ok) return [];
    var out = [];
    r.data.forEach(function (x) { if (x && typeof x === 'object' && x.id != null && x.id !== '' && x.hoTen) out.push({ id: String(x.id), hoTen: String(x.hoTen), hoatDong: x.hoatDong !== false }); });
    return out;
  }
  /* Phiên còn hợp lệ không? Nhân viên phải còn tồn tại và đang hoạt động. */
  function sessionCheck(session, storage) {
    if (!session) return { ok: false, reason: 'none' };
    if (session.vaiTro === QL) return { ok: true };
    var e = allEmployees(storage).filter(function (x) { return x.id === session.nhanVienId; })[0];
    if (!e) return { ok: false, reason: 'missing' };
    if (!e.hoatDong) return { ok: false, reason: 'inactive' };
    return { ok: true, name: e.hoTen };
  }
  function roleLabel(session, storage) {
    if (!session) return '';
    if (session.vaiTro === QL) return ROLE_LABEL[QL];
    var c = sessionCheck(session, storage); return c.name || ROLE_LABEL[NV];
  }
  function initial(name) {
    var w = str(name).trim().split(/\s+/).filter(Boolean);
    return w.length ? Array.from(w[w.length - 1])[0].toUpperCase() : '?';
  }
  function colorIndex(key) { var h = 0, s = str(key); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return (h % 7) + 1; }

  /* ---------- Sức khỏe dữ liệu & banner (DESIGN 13.5) ---------- */
  function health(storage) {
    var blocked = false, corrupt = [];
    try { storage.setItem(KEYS.PROBE, '1'); storage.removeItem(KEYS.PROBE); } catch (e) { blocked = true; }
    [[KEYS.NV, 'nhanVien'], [KEYS.DN, 'deNghi']].forEach(function (k) { var r = readList(storage, k[0]); if (!r.ok && r.error === 'corrupt') corrupt.push(k[1]); if (!r.ok && r.error === 'blocked') blocked = true; });
    return { blocked: blocked, corrupt: corrupt };
  }
  function acked(storage) { try { return storage.getItem(KEYS.ACK) === '1'; } catch (e) { return false; } }
  function setAck(storage) { try { storage.setItem(KEYS.ACK, '1'); return true; } catch (e) { return false; } }
  /* Chọn đúng một banner theo thứ tự ưu tiên; ack chỉ ở Chọn vai trò và Trang chủ. */
  function pickBanner(h, ack, routeName) {
    if (h.corrupt.length) return 'corrupt';
    if (h.blocked) return 'blocked';
    if (!ack && (routeName === 'home' || routeName === 'vai-tro')) return 'notice';
    return null;
  }
  function resetData(storage) {
    var ok = true;
    [KEYS.NV, KEYS.DN, KEYS.SESSION].forEach(function (k) { try { storage.removeItem(k); } catch (e) { ok = false; } });
    return ok;
  }

  /* ---------- Số liệu cho Trang chủ ---------- */
  function amountOf(it) {
    if (!it || typeof it.soLuong !== 'number' || typeof it.donGia !== 'number') return NaN;
    if (!isFinite(it.soLuong) || !isFinite(it.donGia) || it.soLuong < 0 || it.donGia < 0 || it.donGia % 1 !== 0 || it.donGia > 1e12) return NaN;
    var milli = Math.round(it.soLuong * 1000);
    if (milli > 1e12) return NaN;
    return Number((BigInt(milli) * BigInt(it.donGia) + 500n) / 1000n);
  }
  function monthOf(d) { return /^\d{4}-\d{2}-\d{2}$/.test(str(d)) ? str(d).slice(0, 7) : null; }
  function todayStr(now) { var d = now || new Date(); return pad(d.getFullYear(), 4) + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }
  /* Quản lý: mọi người; Nhân viên: chỉ của mình. Tháng theo ngày đề nghị. Bỏ qua khoản dữ liệu lỗi. */
  function homeStats(items, session, month) {
    var out = { pending: { count: 0, total: 0 }, approved: { count: 0, total: 0 }, rejected: { count: 0, total: 0 }, pendingAll: 0, skipped: 0 };
    var sums = { pending: 0n, approved: 0n, rejected: 0n };
    (Array.isArray(items) ? items : []).forEach(function (it) {
      if (!it || typeof it !== 'object' || !it.id) { out.skipped++; return; }
      if (session && session.vaiTro === NV && String(it.nhanVienId) !== session.nhanVienId) return;
      var key = it.trangThai === 'cho_duyet' ? 'pending' : it.trangThai === 'da_duyet' ? 'approved' : it.trangThai === 'tu_choi' ? 'rejected' : null;
      var a = amountOf(it), m = monthOf(it.ngay);
      if (!key || !m || !isFinite(a)) { out.skipped++; return; }
      if (key === 'pending') out.pendingAll++;
      if (m !== month) return;
      out[key].count++; sums[key] += BigInt(a);
    });
    ['pending', 'approved', 'rejected'].forEach(function (k) { out[k].total = Number(sums[k]); });
    return out;
  }
  function groupDigits(d) { return str(d).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function formatVND(n) { return typeof n !== 'number' || !isFinite(n) ? '—' : (n < 0 ? '-' : '') + groupDigits(String(Math.abs(Math.round(n)))) + ' ₫'; }
  function monthLabel(m) { return /^\d{4}-\d{2}$/.test(str(m)) ? 'Tháng ' + (+m.slice(5, 7)) + '/' + m.slice(0, 4) : ''; }

  return {
    NV: NV, QL: QL, KEYS: KEYS, ROUTES: ROUTES, ROLE_LABEL: ROLE_LABEL, APP_NAME: APP_NAME,
    route: route, parsePath: parsePath, buildPath: buildPath, resolve: resolve, navItems: navItems, forbiddenMessage: forbiddenMessage, pageTitle: pageTitle,
    normalizeSession: normalizeSession, readSession: readSession, writeSession: writeSession, clearSession: clearSession,
    activeEmployees: activeEmployees, sessionCheck: sessionCheck, roleLabel: roleLabel, initial: initial, colorIndex: colorIndex,
    readList: readList, health: health, acked: acked, setAck: setAck, pickBanner: pickBanner, resetData: resetData,
    amountOf: amountOf, homeStats: homeStats, todayStr: todayStr, monthOf: monthOf, formatVND: formatVND, monthLabel: monthLabel
  };
});
