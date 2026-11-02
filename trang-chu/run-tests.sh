#!/usr/bin/env bash
# Chạy toàn bộ test bằng Chrome headless (không cần Node/npm).
# Chạy 4 lần: {sáng, tối} × {laptop 1280px, điện thoại ≤640px (Chrome headless ép tối thiểu ~500px)}; ca test layout tự bỏ qua khi không đúng cỡ.
# Dùng: ./run-tests.sh            CHROME_PATH=... để đổi trình duyệt.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
URL="file://$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$DIR/tests/test.html")"
PROFILE="$(mktemp -d)"
trap 'rm -rf "$PROFILE"' EXIT

status=0
for cfg in "light 1280,900" "dark 1280,900" "light 390,844" "dark 390,844"; do
  set -- $cfg
  scheme="$1"; size="$2"
  # Chrome headless trên macOS bỏ qua --force-prefers-color-scheme; blink-settings: 0 = tối, 1 = sáng.
  if [ "$scheme" = "light" ]; then pcs=1; else pcs=0; fi
  OUT="$("$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" \
    --allow-file-access-from-files --blink-settings=preferredColorScheme="$pcs" --window-size="$size" \
    --virtual-time-budget=60000 --dump-dom "$URL" 2>/dev/null)"
  SUMMARY="$(printf '%s' "$OUT" | python3 -c '
import sys,re,html
s=sys.stdin.read()
m=re.search(r"<pre id=\"summary\"[^>]*>(.*?)</pre>",s,re.S)
print(html.unescape(m.group(1)) if m else "KHONG DOC DUOC KET QUA")
')"
  echo "=== $scheme $size"
  echo "$SUMMARY"
  printf '%s' "$OUT" | grep -q 'data-done="1"' || { echo "Test chưa chạy xong"; status=2; continue; }
  printf '%s' "$SUMMARY" | grep -q '^LOI: 0$' || status=1
done
[ $status -eq 0 ] && echo "TẤT CẢ ĐẠT" || echo "CÓ LỖI (mã $status)"
exit $status
