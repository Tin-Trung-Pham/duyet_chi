"""Máy chủ cục bộ cho Sổ Đề Nghị Chi: phục vụ ứng dụng (file tĩnh) và API JSON trên products.db.

Chạy:  python3 server/server.py              → http://127.0.0.1:8000/trang-chu/
       python3 server/server.py --port 0     → chọn cổng trống (in ra địa chỉ)

API (JSON, UTF-8):
  GET   /api/health                       → {ok, db, count}
  GET   /api/products[?trang_thai=…]      → {items:[…], meta:{count,total,threshold,over_threshold}}
  GET   /api/summary                      → số liệu tổng hợp (theo trạng thái, phân loại, khoản vượt ngưỡng)
  GET   /api/products/<id>                → {item}
  POST  /api/products                     → ghi MỘT khoản (cùng ma_de_nghi thì cập nhật) → 201 tạo mới / 200 cập nhật
  POST  /api/products/bulk                → {items:[…]} ghi nhiều khoản trong một giao dịch
  PATCH /api/products/<id>                → {trang_thai} đổi trạng thái

Chỉ lắng nghe 127.0.0.1. Không phục vụ file .db/.py, thư mục server/ và các đường dẫn ẩn (.git…).
"""
import argparse
import json
import mimetypes
import os
import re
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit, parse_qs

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB = os.path.join(ROOT, "products.db")
MAX_BODY = 2 * 1024 * 1024
MAX_DRAIN = 16 * 1024 * 1024
BLOCKED_DIRS = {"server", "__pycache__", "node_modules"}
BLOCKED_EXT = {".db", ".sqlite", ".sqlite3", ".py", ".pyc", ".sh", ".db-journal", ".db-wal", ".db-shm"}
ID_RE = re.compile(r"^/api/products/(\d{1,18})$")

mimetypes.add_type("text/javascript; charset=utf-8", ".js")
mimetypes.add_type("text/css; charset=utf-8", ".css")
mimetypes.add_type("text/html; charset=utf-8", ".html")
mimetypes.add_type("text/plain; charset=utf-8", ".md")
mimetypes.add_type("text/plain; charset=utf-8", ".txt")


class Handler(BaseHTTPRequestHandler):
    server_version = "SoDeNghiChi/1.0"
    protocol_version = "HTTP/1.1"

    # ------------------------------------------------------------------ tiện ích
    def log_message(self, fmt, *args):
        if getattr(self.server, "verbose", False):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, status, body=b"", ctype="application/json; charset=utf-8", extra=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status, obj, extra=None):
        self._send(status, json.dumps(obj, ensure_ascii=False).encode("utf-8"), extra=extra)

    def _error(self, status, code, message, details=None):
        body = {"error": code, "message": message}
        if details:
            body["details"] = details
        self._json(status, body)

    def _body_json(self):
        """Đọc thân JSON; trả (obj, None) hoặc (None, đã_gửi_lỗi=True)."""
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype != "application/json":
            self._error(415, "unsupported_media_type", "Content-Type phải là application/json")
            return None, True
        try:
            n = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            self._error(400, "bad_request", "Content-Length không hợp lệ")
            return None, True
        if n <= 0:
            self._error(400, "bad_request", "Thiếu thân yêu cầu")
            return None, True
        if n > MAX_BODY:
            self.close_connection = True
            if n <= MAX_DRAIN:  # đọc bỏ phần thừa để client nhận được mã 413 thay vì "connection reset"
                left = n
                while left > 0:
                    chunk = self.rfile.read(min(65536, left))
                    if not chunk:
                        break
                    left -= len(chunk)
            self._error(413, "payload_too_large", "Thân yêu cầu quá lớn (tối đa %d byte)" % MAX_BODY)
            return None, True
        raw = self.rfile.read(n)
        try:
            return json.loads(raw.decode("utf-8")), False
        except (UnicodeDecodeError, ValueError):
            self._error(400, "bad_json", "Thân yêu cầu không phải JSON hợp lệ")
            return None, True

    def _conn(self):
        return db.connect(self.server.db_path)

    # ------------------------------------------------------------------ định tuyến
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path.startswith("/api/") or path == "/api":
            return self._api_get(path)
        return self._static(path)

    def do_POST(self):
        path = urlsplit(self.path).path
        if not path.startswith("/api/"):
            return self._error(405, "method_not_allowed", "Không hỗ trợ phương thức này", None)
        if path == "/api/products":
            return self._api_write(lambda c, d: db.upsert_product(c, d), single=True)
        if path == "/api/products/bulk":
            return self._api_write(self._bulk, single=False)
        return self._error(404, "not_found", "Không có đường dẫn API này")

    def do_PATCH(self):
        path = urlsplit(self.path).path
        m = ID_RE.match(path)
        if not m:
            return self._error(404 if path.startswith("/api/") else 405, "not_found", "Không có đường dẫn API này")
        pid = int(m.group(1))
        data, failed = self._body_json()
        if failed:
            return
        if not isinstance(data, dict) or "trang_thai" not in data:
            return self._error(400, "invalid", "Cần trường trang_thai", {"trang_thai": "Bắt buộc"})
        conn = self._conn()
        try:
            self._json(200, {"item": db.set_status(conn, pid, data["trang_thai"])})
        except db.ValidationError as e:
            self._error(400, "invalid", "Dữ liệu không hợp lệ", e.errors)
        except db.NotFound as e:
            self._error(404, "not_found", str(e))
        finally:
            conn.close()

    def do_PUT(self):
        self._error(405, "method_not_allowed", "Không hỗ trợ phương thức này")

    do_DELETE = do_PUT   # chủ ý KHÔNG có API xóa: sổ chi chỉ ghi thêm/cập nhật trạng thái

    # ------------------------------------------------------------------ API
    @staticmethod
    def _bulk(conn, data):
        if not isinstance(data, dict) or "items" not in data:
            raise db.ValidationError({"items": "Cần trường items"})
        return db.bulk_upsert(conn, data["items"])

    def _api_get(self, path):
        parts = urlsplit(self.path)
        q = parse_qs(parts.query)
        conn = self._conn()
        try:
            if path == "/api/health":
                n = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
                return self._json(200, {"ok": True, "db": os.path.basename(self.server.db_path), "count": n})
            if path == "/api/products":
                status = q.get("trang_thai", [None])[0]
                items = db.list_products(conn, status)
                return self._json(200, {"items": items, "meta": {
                    "count": len(items), "total": sum(r["so_tien"] for r in items), "threshold": db.THRESHOLD,
                    "over_threshold": sum(1 for r in items if r["so_tien"] > db.THRESHOLD)}})
            if path == "/api/summary":
                return self._json(200, db.summary(conn))
            m = ID_RE.match(path)
            if m:
                return self._json(200, {"item": db.get_product(conn, int(m.group(1)))})
            return self._error(404, "not_found", "Không có đường dẫn API này")
        except db.ValidationError as e:
            return self._error(400, "invalid", "Tham số không hợp lệ", e.errors)
        except db.NotFound as e:
            return self._error(404, "not_found", str(e))
        finally:
            conn.close()

    def _api_write(self, fn, single):
        data, failed = self._body_json()
        if failed:
            return
        conn = self._conn()
        try:
            result = fn(conn, data)
            if single:
                item, created = result
                return self._json(201 if created else 200, {"item": item, "created": created})
            return self._json(200, result)
        except db.ValidationError as e:
            return self._error(400, "invalid", "Dữ liệu không hợp lệ", e.errors)
        finally:
            conn.close()

    # ------------------------------------------------------------------ file tĩnh
    def _static(self, path):
        try:
            rel = unquote(path, errors="strict")
        except UnicodeDecodeError:
            return self._error(400, "bad_request", "Đường dẫn không hợp lệ")
        if "\x00" in rel or "\\" in rel:
            return self._error(400, "bad_request", "Đường dẫn không hợp lệ")
        parts = [p for p in rel.split("/") if p not in ("", ".")]
        if any(p == ".." or p.startswith(".") for p in parts):
            return self._error(404, "not_found", "Không tìm thấy")
        if any(p.lower() in BLOCKED_DIRS for p in parts[:-1]) or (parts and parts[0].lower() in BLOCKED_DIRS):
            return self._error(404, "not_found", "Không tìm thấy")
        full = os.path.realpath(os.path.join(self.server.root, *parts))
        root = os.path.realpath(self.server.root)
        if full != root and not full.startswith(root + os.sep):
            return self._error(404, "not_found", "Không tìm thấy")
        if os.path.isdir(full):
            if not rel.endswith("/"):  # /trang-chu → /trang-chu/ để đường dẫn tương đối hoạt động
                return self._send(301, b"", extra={"Location": path + "/"}, ctype="text/plain")
            full = os.path.join(full, "index.html")
        ext = os.path.splitext(full)[1].lower()
        if ext in BLOCKED_EXT or os.path.basename(full).lower().endswith((".db-journal", ".db-wal", ".db-shm")):
            return self._error(404, "not_found", "Không tìm thấy")
        if not os.path.isfile(full):
            return self._error(404, "not_found", "Không tìm thấy")
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        with open(full, "rb") as f:
            self._send(200, f.read(), ctype=ctype)


def make_server(db_path=DEFAULT_DB, host="127.0.0.1", port=0, root=ROOT, verbose=False):
    db.init_db(db_path, seed=True)
    srv = ThreadingHTTPServer((host, port), Handler)
    srv.daemon_threads = True
    srv.db_path = db_path
    srv.root = root
    srv.verbose = verbose
    return srv


def start_in_thread(**kw):
    """Dùng cho test: chạy máy chủ ở luồng nền, trả (server, url_gốc)."""
    srv = make_server(**kw)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv, "http://127.0.0.1:%d" % srv.server_address[1]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8000, help="cổng (0 = tự chọn cổng trống)")
    ap.add_argument("--db", default=DEFAULT_DB, help="đường dẫn products.db")
    ap.add_argument("--verbose", action="store_true", help="in nhật ký từng yêu cầu")
    a = ap.parse_args(argv)
    srv = make_server(db_path=a.db, port=a.port, verbose=a.verbose)
    port = srv.server_address[1]
    print("Máy chủ đang chạy: http://127.0.0.1:%d/trang-chu/   (CSDL: %s)" % (port, a.db), flush=True)
    print("Nhấn Ctrl+C để dừng.", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng.")
    finally:
        srv.server_close()


if __name__ == "__main__":
    main()
