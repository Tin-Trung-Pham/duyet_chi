#!/usr/bin/env bash
# Test dữ liệu mẫu trong Chrome headless: 4 lần {sáng, tối} x {laptop, điện thoại}.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="$(mktemp -d)"; trap 'rm -rf "$PROFILE"' EXIT
status=0
for cfg in "1 1280,900" "0 1280,900" "1 390,844" "0 390,844"; do
  set -- $cfg
  OUT="$("$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" --blink-settings=preferredColorScheme="$1" --window-size="$2" --virtual-time-budget=20000 --dump-dom "file://$DIR/tests/test.html" 2>/dev/null)"
  SUMMARY="$(printf '%s' "$OUT" | python3 -c '
import sys,re,html
m=re.search(r"<pre id=\"summary\"[^>]*>(.*?)</pre>",sys.stdin.read(),re.S)
print(html.unescape(m.group(1)) if m else "KHONG DOC DUOC KET QUA")')"
  echo "=== $2 scheme=$1"; echo "$SUMMARY"
  printf '%s' "$SUMMARY" | grep -q '^LOI: 0$' || status=1
done
[ $status -eq 0 ] && echo "TẤT CẢ ĐẠT" || echo "CÓ LỖI"
exit $status
