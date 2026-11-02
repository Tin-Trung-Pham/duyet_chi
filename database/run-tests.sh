#!/usr/bin/env bash
# Chạy toàn bộ test của phần cơ sở dữ liệu:
#   1) test Python (CSDL SQLite + API + máy chủ tĩnh) bằng unittest;
#   2) test trình duyệt trong Chrome headless, 4 lần {sáng, tối} x {laptop, điện thoại}. Mỗi lần dựng một máy chủ THẬT
#      với bản sao products.db sạch, nên các test LIVE gọi API thật và ghi vào SQLite thật.
# Dùng: ./run-tests.sh      (CHROME_PATH=... để đổi trình duyệt)
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$DIR")"
CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"
PROFILE="$TMP/profile"; mkdir -p "$PROFILE"
SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; rm -rf "$TMP"; }
trap cleanup EXIT

status=0
echo "=== Python: CSDL + API"
( cd "$ROOT" && python3 -m unittest discover -s server -t server 2>&1 | tail -4 ) || status=1
( cd "$ROOT" && python3 -m unittest discover -s server >/dev/null 2>&1 ) || status=1

for cfg in "light 1280,900" "dark 1280,900" "light 390,844" "dark 390,844"; do
  set -- $cfg; scheme="$1"; size="$2"
  if [ "$scheme" = "light" ]; then pcs=1; else pcs=0; fi   # Chrome headless macOS: 1 = sáng, 0 = tối
  rm -f "$TMP/products.db"
  python3 "$ROOT/server/init_db.py" --db "$TMP/products.db" >/dev/null
  python3 "$ROOT/server/server.py" --port 0 --db "$TMP/products.db" > "$TMP/server.out" 2>&1 &
  SERVER_PID=$!
  PORT=""
  for _ in $(seq 1 50); do
    PORT="$(grep -o 'http://127.0.0.1:[0-9]*' "$TMP/server.out" 2>/dev/null | head -1 | grep -o '[0-9]*$')"
    [ -n "$PORT" ] && break; sleep 0.1
  done
  if [ -z "$PORT" ]; then echo "Không khởi động được máy chủ"; status=2; kill "$SERVER_PID" 2>/dev/null; continue; fi
  URL="http://127.0.0.1:$PORT/database/tests/test.html"
  OUT="$("$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" --blink-settings=preferredColorScheme="$pcs" \
    --window-size="$size" --virtual-time-budget=90000 --dump-dom "$URL" 2>/dev/null)"
  kill "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID" 2>/dev/null; SERVER_PID=""
  SUMMARY="$(printf '%s' "$OUT" | python3 -c '
import sys,re,html
s=sys.stdin.read()
m=re.search(r"<pre id=\"summary\"[^>]*>(.*?)</pre>",s,re.S)
print(html.unescape(m.group(1)) if m else "KHONG DOC DUOC KET QUA")')"
  echo "=== $scheme $size (máy chủ thật, cổng $PORT)"
  echo "$SUMMARY"
  printf '%s' "$OUT" | grep -q 'data-done="1"' || { echo "Test chưa chạy xong"; status=2; continue; }
  printf '%s' "$SUMMARY" | grep -q '^LOI: 0$' || status=1
done
[ $status -eq 0 ] && echo "TẤT CẢ ĐẠT" || echo "CÓ LỖI (mã $status)"
exit $status
