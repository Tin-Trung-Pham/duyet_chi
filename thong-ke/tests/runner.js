/* Bộ chạy test tối giản (không phụ thuộc thư viện) chạy trong trình duyệt. */
(function (g) {
  var tests = [];
  var stack = [];

  g.describe = function (name, fn) { stack.push(name); fn(); stack.pop(); };
  g.it = function (name, fn) { tests.push({ name: stack.concat(name).join(' › '), fn: fn }); };

  function fmt(x) { try { return typeof x === 'string' ? JSON.stringify(x) : JSON.stringify(x); } catch (e) { return String(x); } }
  function fail(msg, extra) { throw new Error(msg + (extra === undefined ? '' : '\n    ' + extra)); }

  g.assert = {
    ok: function (v, msg) { if (!v) fail(msg || 'Kỳ vọng giá trị đúng, nhận ' + fmt(v)); },
    equal: function (a, b, msg) { if (a !== b) fail(msg || 'Kỳ vọng ' + fmt(b) + ', nhận ' + fmt(a)); },
    deepEqual: function (a, b, msg) { if (fmt(a) !== fmt(b)) fail(msg || 'Kỳ vọng ' + fmt(b) + ', nhận ' + fmt(a)); },
    notEqual: function (a, b, msg) { if (a === b) fail(msg || 'Kỳ vọng khác ' + fmt(b)); },
    match: function (s, re, msg) { if (!re.test(s)) fail(msg || 'Kỳ vọng ' + fmt(s) + ' khớp ' + re); }
  };

  /* Bỏ qua ca test không áp dụng cho kích thước cửa sổ hiện tại (không tính là lỗi). */
  g.skip = function () { var e = new Error('skip'); e.isSkip = true; throw e; };
  g.isMobile = function () { return window.innerWidth < 640; };
  g.isDesktop = function () { return window.innerWidth >= 1024; };
  g.isDark = function () { return matchMedia('(prefers-color-scheme: dark)').matches; };

  g.tick =function (ms) { return new Promise(function (r) { setTimeout(r, ms || 0); }); };

  g.runAll = async function () {
    var out = document.getElementById('summary');
    var pass = 0, skipped = 0, failed = [];
    for (var i = 0; i < tests.length; i++) {
      try { await tests[i].fn(); pass++; }
      catch (e) {
        if (e && e.isSkip) skipped++;
        else failed.push(tests[i].name + '\n    ' + (e && e.message ? e.message : e));
      }
    }
    var lines = ['CUA SO: ' + window.innerWidth + 'x' + window.innerHeight + ' · ' +
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'toi' : 'sang'),
      'TONG: ' + tests.length, 'DAT: ' + pass, 'BO QUA: ' + skipped, 'LOI: ' + failed.length];
    failed.forEach(function (f) { lines.push('FAIL ' + f); });
    out.textContent = lines.join('\n');
    out.setAttribute('data-done', '1');
    document.title = (failed.length ? 'FAIL ' : 'PASS ') + pass + '/' + tests.length;
  };
})(window);
