"""Test API + máy chủ tĩnh (server.py) bằng máy chủ thật ở luồng nền. Chạy: python3 -m unittest discover -s server -v"""
import http.client
import json
import os
import sqlite3
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db  # noqa: E402
import server as srvmod  # noqa: E402


def good(**over):
    d = {"ma_nhan_vien": "NV001", "ten_nhan_vien": "Nguyễn Văn An", "so_tien": 2_000_000,
         "thoi_gian": "2026-11-02T09:30:00Z", "phan_loai_chi": "Vận chuyển", "trang_thai": "cho_duyet"}
    d.update(over)
    return d


class ApiCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.dbp = os.path.join(cls.tmp.name, "products.db")
        cls.site = os.path.join(cls.tmp.name, "site")
        os.makedirs(os.path.join(cls.site, "app"))
        os.makedirs(os.path.join(cls.site, "server"))
        os.makedirs(os.path.join(cls.site, ".git"))
        for rel, txt in (("index.html", "<h1>gốc</h1>"), ("app/index.html", "<p>app</p>"), ("app/x.js", "var a=1;"), ("app/s.css", "a{}"),
                         ("app/ghi chú.txt", "xin chào"), ("server/db.py", "secret"), (".git/config", "secret"), ("app/a.db", "binh"), ("app/a.py", "py")):
            with open(os.path.join(cls.site, rel), "w", encoding="utf-8") as f:
                f.write(txt)
        with open(os.path.join(cls.tmp.name, "outside.txt"), "w") as f:
            f.write("NGOÀI THƯ MỤC")
        try:  # liên kết tượng trưng trỏ ra ngoài thư mục gốc: phải bị chặn
            os.symlink(os.path.join(cls.tmp.name, "outside.txt"), os.path.join(cls.site, "app", "link.txt"))
        except OSError:
            pass
        cls.srv, cls.url = srvmod.start_in_thread(db_path=cls.dbp, root=cls.site)
        cls.port = cls.srv.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()
        cls.tmp.cleanup()

    def setUp(self):
        db.init_db(self.dbp, reset=True)

    def req(self, method, path, body=None, ctype="application/json", raw=None, headers=None):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        h = dict(headers or {})
        data = raw
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        if data is not None and ctype:
            h["Content-Type"] = ctype
        c.request(method, path, body=data, headers=h)
        r = c.getresponse()
        payload = r.read()
        c.close()
        try:
            js = json.loads(payload.decode("utf-8")) if payload and r.getheader("Content-Type", "").startswith("application/json") else None
        except ValueError:
            js = None
        return r.status, js, payload, r


class TestRead(ApiCase):
    def test_health(self):
        s, js, _, _ = self.req("GET", "/api/health")
        self.assertEqual((s, js["ok"], js["db"], js["count"]), (200, True, "products.db", len(db.SEED)))

    def test_list_returns_all_columns_and_meta(self):
        s, js, _, _ = self.req("GET", "/api/products")
        self.assertEqual(s, 200)
        self.assertEqual(len(js["items"]), len(db.SEED))
        self.assertEqual(sorted(js["items"][0].keys()), sorted(db.COLUMNS))
        self.assertEqual(js["meta"], {"count": 9, "total": sum(r[2] for r in db.SEED), "threshold": 100_000_000, "over_threshold": 2})

    def test_list_filter_and_bad_filter(self):
        s, js, _, _ = self.req("GET", "/api/products?trang_thai=tu_choi")
        self.assertEqual((s, len(js["items"])), (200, 1))
        s, js, _, _ = self.req("GET", "/api/products?trang_thai=xyz")
        self.assertEqual((s, js["error"]), (400, "invalid"))

    def test_get_one_and_missing(self):
        s, js, _, _ = self.req("GET", "/api/products/4")
        self.assertEqual((s, js["item"]["so_tien"]), (200, 120_000_000))
        self.assertEqual(self.req("GET", "/api/products/999")[0], 404)
        self.assertEqual(self.req("GET", "/api/products/abc")[0], 404)
        self.assertEqual(self.req("GET", "/api/products/1;DROP")[0], 404)

    def test_summary(self):
        s, js, _, _ = self.req("GET", "/api/summary")
        self.assertEqual(s, 200)
        self.assertEqual(js["count"], 9)
        self.assertEqual([r["so_tien"] for r in js["over_threshold"]], [135_500_000, 120_000_000])

    def test_unknown_api_paths(self):
        for p in ("/api", "/api/", "/api/nope", "/api/products/1/x"):
            self.assertEqual(self.req("GET", p)[0], 404, p)

    def test_json_is_utf8_and_not_cached(self):
        _, _, raw, r = self.req("GET", "/api/products")
        self.assertIn("Nguyễn Văn An", raw.decode("utf-8"))
        self.assertEqual(r.getheader("Content-Type"), "application/json; charset=utf-8")
        self.assertEqual(r.getheader("Cache-Control"), "no-store")
        self.assertEqual(r.getheader("X-Content-Type-Options"), "nosniff")


class TestWrite(ApiCase):
    def test_post_creates_row_201_and_persists_in_file(self):
        s, js, _, _ = self.req("POST", "/api/products", good(so_tien=7_777_000, ma_de_nghi="dn_1"))
        self.assertEqual((s, js["created"]), (201, True))
        self.assertEqual(js["item"]["so_tien"], 7_777_000)
        c = sqlite3.connect(self.dbp)
        row = c.execute("SELECT ma_nhan_vien, ten_nhan_vien, so_tien, thoi_gian, phan_loai_chi, trang_thai FROM products WHERE ma_de_nghi='dn_1'").fetchone()
        c.close()
        self.assertEqual(row, ("NV001", "Nguyễn Văn An", 7_777_000, "2026-11-02T09:30:00Z", "Vận chuyển", "cho_duyet"))

    def test_post_same_request_id_updates_200(self):
        self.req("POST", "/api/products", good(ma_de_nghi="dn_1"))
        s, js, _, _ = self.req("POST", "/api/products", good(ma_de_nghi="dn_1", trang_thai="da_duyet"))
        self.assertEqual((s, js["created"], js["item"]["trang_thai"]), (200, False, "da_duyet"))
        self.assertEqual(len(self.req("GET", "/api/products")[1]["items"]), len(db.SEED) + 1)

    def test_post_validation_errors_400_with_details_and_no_write(self):
        s, js, _, _ = self.req("POST", "/api/products", good(so_tien=-5, phan_loai_chi="Xe", trang_thai="x"))
        self.assertEqual((s, js["error"]), (400, "invalid"))
        self.assertEqual(sorted(js["details"]), ["phan_loai_chi", "so_tien", "trang_thai"])
        self.assertEqual(len(self.req("GET", "/api/products")[1]["items"]), len(db.SEED))

    def test_post_requires_json_content_type(self):
        self.assertEqual(self.req("POST", "/api/products", raw=b"{}", ctype="text/plain")[0], 415)
        self.assertEqual(self.req("POST", "/api/products", raw=b"{}", ctype=None)[0], 415)
        self.assertEqual(self.req("POST", "/api/products", raw=json.dumps(good()).encode(), ctype="application/json; charset=utf-8")[0], 201)

    def test_post_bad_bodies(self):
        self.assertEqual(self.req("POST", "/api/products", raw=b"{khong json")[0], 400)
        self.assertEqual(self.req("POST", "/api/products", raw=b"\xff\xfe")[0], 400)
        self.assertEqual(self.req("POST", "/api/products", raw=b"")[0], 400)
        self.assertEqual(self.req("POST", "/api/products", raw=b"[1,2]")[0], 400)
        self.assertEqual(self.req("POST", "/api/products", raw=b"null")[0], 400)

    def test_post_too_large_413(self):
        s, js, _, _ = self.req("POST", "/api/products", raw=b"{" + b" " * (srvmod.MAX_BODY + 10) + b"}")
        self.assertEqual(s, 413)

    def test_bulk_upsert(self):
        rows = [good(ma_de_nghi="a"), good(ma_de_nghi="b", so_tien=5), good(ma_de_nghi="c", trang_thai="da_duyet")]
        s, js, _, _ = self.req("POST", "/api/products/bulk", {"items": rows})
        self.assertEqual((s, js), (200, {"created": 3, "updated": 0}))
        s, js, _, _ = self.req("POST", "/api/products/bulk", {"items": rows})
        self.assertEqual(js, {"created": 0, "updated": 3})

    def test_bulk_is_atomic_over_http(self):
        s, js, _, _ = self.req("POST", "/api/products/bulk", {"items": [good(ma_de_nghi="ok"), good(so_tien="x", ma_de_nghi="bad")]})
        self.assertEqual(s, 400)
        self.assertIn("items[1].so_tien", js["details"])
        self.assertEqual(len(self.req("GET", "/api/products")[1]["items"]), len(db.SEED))

    def test_bulk_bad_shapes(self):
        for body in ({}, {"items": "x"}, {"items": {"a": 1}}, [1]):
            self.assertEqual(self.req("POST", "/api/products/bulk", body)[0], 400, str(body))

    def test_patch_status(self):
        s, js, _, _ = self.req("PATCH", "/api/products/3", {"trang_thai": "da_duyet"})
        self.assertEqual((s, js["item"]["trang_thai"]), (200, "da_duyet"))
        self.assertEqual(self.req("GET", "/api/products/3")[1]["item"]["trang_thai"], "da_duyet")

    def test_patch_errors(self):
        self.assertEqual(self.req("PATCH", "/api/products/3", {"trang_thai": "xyz"})[0], 400)
        self.assertEqual(self.req("PATCH", "/api/products/3", {})[0], 400)
        self.assertEqual(self.req("PATCH", "/api/products/999", {"trang_thai": "da_duyet"})[0], 404)
        self.assertEqual(self.req("PATCH", "/api/products/abc", {"trang_thai": "da_duyet"})[0], 404)
        self.assertEqual(self.req("PATCH", "/api/products/3", raw=b"x", ctype="text/plain")[0], 415)
        self.assertEqual(self.req("GET", "/api/products/3")[1]["item"]["trang_thai"], "cho_duyet")

    def test_patch_cannot_change_other_fields(self):
        before = self.req("GET", "/api/products/3")[1]["item"]
        self.req("PATCH", "/api/products/3", {"trang_thai": "tu_choi", "so_tien": 1, "ten_nhan_vien": "Hack"})
        after = self.req("GET", "/api/products/3")[1]["item"]
        self.assertEqual({k: v for k, v in after.items() if k != "trang_thai"}, {k: v for k, v in before.items() if k != "trang_thai"})

    def test_no_delete_or_put_api(self):
        for m in ("DELETE", "PUT"):
            self.assertEqual(self.req(m, "/api/products/1")[0], 405, m)
        self.assertEqual(len(self.req("GET", "/api/products")[1]["items"]), len(db.SEED))

    def test_post_outside_api_not_allowed(self):
        self.assertEqual(self.req("POST", "/index.html", {"a": 1})[0], 405)

    def test_concurrent_writes_are_all_stored(self):
        def one(i):
            return self.req("POST", "/api/products", good(ma_de_nghi="c%d" % i, so_tien=i))[0]
        with ThreadPoolExecutor(8) as ex:
            codes = list(ex.map(one, range(60)))
        self.assertEqual(set(codes), {201})
        self.assertEqual(len(self.req("GET", "/api/products")[1]["items"]), len(db.SEED) + 60)

    def test_concurrent_upserts_of_same_request_id_keep_one_row(self):
        def one(i):
            return self.req("POST", "/api/products", good(ma_de_nghi="same", so_tien=i))[0]
        with ThreadPoolExecutor(8) as ex:
            codes = list(ex.map(one, range(40)))
        self.assertTrue(set(codes) <= {200, 201})
        c = sqlite3.connect(self.dbp)
        n = c.execute("SELECT COUNT(*) FROM products WHERE ma_de_nghi='same'").fetchone()[0]
        c.close()
        self.assertEqual(n, 1)


class TestStatic(ApiCase):
    def test_serves_files_with_types(self):
        s, _, raw, r = self.req("GET", "/app/x.js")
        self.assertEqual((s, raw), (200, b"var a=1;"))
        self.assertTrue(r.getheader("Content-Type").startswith("text/javascript"))
        self.assertTrue(self.req("GET", "/app/s.css")[3].getheader("Content-Type").startswith("text/css"))
        self.assertTrue(self.req("GET", "/app/index.html")[3].getheader("Content-Type").startswith("text/html"))

    def test_directory_serves_index_and_redirects_without_slash(self):
        self.assertEqual(self.req("GET", "/")[2], "<h1>gốc</h1>".encode("utf-8"))
        s, _, _, r = self.req("GET", "/app")
        self.assertEqual((s, r.getheader("Location")), (301, "/app/"))
        self.assertEqual(self.req("GET", "/app/")[2], b"<p>app</p>")

    def test_unicode_and_encoded_names(self):
        self.assertEqual(self.req("GET", "/app/gh%C3%AD%20ch%C3%BA.txt")[0], 404)  # "ghí chú" không tồn tại
        self.assertEqual(self.req("GET", "/app/ghi%20ch%C3%BA.txt")[2], "xin chào".encode("utf-8"))

    def test_head_has_no_body(self):
        s, _, raw, r = self.req("HEAD", "/app/x.js")
        self.assertEqual((s, raw, r.getheader("Content-Length")), (200, b"", "8"))

    def test_path_traversal_is_blocked(self):
        for p in ("/../outside.txt", "/app/../../outside.txt", "/%2e%2e/outside.txt", "/app/%2e%2e/%2e%2e/outside.txt", "/..%2foutside.txt",
                  "/app/..%5c..%5coutside.txt", "/%252e%252e/outside.txt", "//outside.txt", "/app/%00x"):
            s, _, raw, _ = self.req("GET", p)
            self.assertIn(s, (400, 404), p)
            self.assertNotIn(b"NGO", raw, p)

    def test_symlink_pointing_outside_root_is_blocked(self):
        if not os.path.islink(os.path.join(self.site, "app", "link.txt")):
            self.skipTest("hệ điều hành không cho tạo symlink")
        s, _, raw, _ = self.req("GET", "/app/link.txt")
        self.assertEqual(s, 404)
        self.assertNotIn(b"NGO", raw)

    def test_sensitive_files_are_never_served(self):
        for p in ("/server/db.py", "/server/", "/.git/config", "/.git", "/app/a.db", "/app/a.py", "/products.db", "/app/A.DB", "/app/a.db-journal"):
            self.assertEqual(self.req("GET", p)[0], 404, p)

    def test_missing_file_404_and_no_directory_listing(self):
        self.assertEqual(self.req("GET", "/khong-co.html")[0], 404)
        os.makedirs(os.path.join(self.site, "empty"), exist_ok=True)
        s, _, raw, _ = self.req("GET", "/empty/")
        self.assertEqual(s, 404)
        self.assertNotIn(b"Index of", raw)

    def test_real_project_files_are_served_from_default_root(self):
        srv, url = srvmod.start_in_thread(db_path=self.dbp)  # gốc = thư mục dự án thật
        try:
            port = srv.server_address[1]
            for p, needle in (("/trang-chu/", b"DncApp"), ("/trang-chu/js/app-shell.js", b"DncApp"), ("/duyet/js/review-model.js", b"DncReviewModel")):
                c = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
                c.request("GET", p)
                r = c.getresponse()
                body = r.read()
                c.close()
                if r.status == 404 and p == "/trang-chu/":
                    self.skipTest("trang-chu chưa có")
                self.assertEqual(r.status, 200, p)
                self.assertIn(needle, body, p)
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
            c.request("GET", "/products.db")
            self.assertEqual(c.getresponse().status, 404)
            c.close()
        finally:
            srv.shutdown()
            srv.server_close()

    def test_server_binds_to_loopback_only(self):
        self.assertEqual(self.srv.server_address[0], "127.0.0.1")


if __name__ == "__main__":
    unittest.main(verbosity=2)
