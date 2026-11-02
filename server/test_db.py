"""Test tầng cơ sở dữ liệu (db.py). Chạy: python3 -m unittest discover -s server -v"""
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db  # noqa: E402


def good(**over):
    d = {"ma_nhan_vien": "NV001", "ten_nhan_vien": "Nguyễn Văn An", "so_tien": 1_500_000,
         "thoi_gian": "2026-11-02T09:30:00Z", "phan_loai_chi": "Thiết bị", "trang_thai": "cho_duyet"}
    d.update(over)
    return d


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.dir.name, "products.db")
        db.init_db(self.path)
        self.conn = db.connect(self.path)

    def tearDown(self):
        self.conn.close()
        self.dir.cleanup()


class TestSchemaAndSeed(Base):
    def test_table_and_exact_columns(self):
        cols = [r["name"] for r in self.conn.execute("PRAGMA table_info(products)")]
        self.assertEqual(cols, ["id", "ma_nhan_vien", "ten_nhan_vien", "so_tien", "thoi_gian", "phan_loai_chi", "trang_thai", "ma_de_nghi"])
        names = [r["name"] for r in self.conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        self.assertEqual(names, ["products"])

    def test_primary_key_autoincrement(self):
        info = {r["name"]: r for r in self.conn.execute("PRAGMA table_info(products)")}
        self.assertEqual(info["id"]["pk"], 1)
        self.assertIn("AUTOINCREMENT", self.conn.execute("SELECT sql FROM sqlite_master WHERE name='products'").fetchone()[0])

    def test_seed_has_at_least_five_rows_with_all_statuses(self):
        rows = db.list_products(self.conn)
        self.assertGreaterEqual(len(rows), 5)
        self.assertEqual({r["trang_thai"] for r in rows}, set(db.STATUSES))
        self.assertGreaterEqual(len({r["phan_loai_chi"] for r in rows}), 4)

    def test_seed_rows_all_pass_validation(self):
        for r in db.list_products(self.conn):
            db.validate({k: v for k, v in r.items() if k != "id"})

    def test_seed_has_over_threshold_and_boundary_cases(self):
        amounts = sorted(r["so_tien"] for r in db.list_products(self.conn))
        self.assertEqual(sum(1 for a in amounts if a > db.THRESHOLD), 2)
        self.assertIn(100_000_000, amounts)   # đúng ngưỡng: KHÔNG cảnh báo
        self.assertIn(99_999_999, amounts)

    def test_init_is_idempotent_and_does_not_duplicate_seed(self):
        n = len(db.list_products(self.conn))
        db.init_db(self.path)
        db.init_db(self.path)
        self.assertEqual(len(db.list_products(self.conn)), n)

    def test_init_does_not_touch_existing_data(self):
        db.create_product(self.conn, good(ma_de_nghi="x1"))
        db.init_db(self.path)
        self.assertEqual(len(db.list_products(self.conn)), len(db.SEED) + 1)

    def test_reset_recreates_seed_only(self):
        db.create_product(self.conn, good(ma_de_nghi="x1"))
        db.init_db(self.path, reset=True)
        self.assertEqual(len(db.list_products(self.conn)), len(db.SEED))

    def test_no_seed_gives_empty_table(self):
        p = os.path.join(self.dir.name, "empty.db")
        db.init_db(p, seed=False)
        c = db.connect(p)
        self.assertEqual(db.list_products(c), [])
        c.close()

    def test_check_constraints_reject_bad_rows_at_sql_level(self):
        bad = [
            ("", "A", 1, "t", "Khác", "cho_duyet"), ("X" * 21, "A", 1, "t", "Khác", "cho_duyet"), ("N1", "", 1, "t", "Khác", "cho_duyet"),
            ("N1", "A" * 61, 1, "t", "Khác", "cho_duyet"), ("N1", "A", -1, "t", "Khác", "cho_duyet"), ("N1", "A", 1, "t", "Khác", "nhap"),
        ]
        for row in bad:
            with self.assertRaises(sqlite3.IntegrityError, msg=str(row)):
                self.conn.execute("INSERT INTO products (ma_nhan_vien, ten_nhan_vien, so_tien, thoi_gian, phan_loai_chi, trang_thai) VALUES (?,?,?,?,?,?)", row)

    def test_default_status_is_cho_duyet(self):
        self.conn.execute("INSERT INTO products (ma_nhan_vien, ten_nhan_vien, so_tien, thoi_gian, phan_loai_chi) VALUES ('N1','A',1,'2026-01-01T00:00:00Z','Khác')")
        self.assertEqual(self.conn.execute("SELECT trang_thai FROM products ORDER BY id DESC LIMIT 1").fetchone()[0], "cho_duyet")

    def test_ma_de_nghi_unique_but_null_allowed_many_times(self):
        for _ in range(3):
            db.create_product(self.conn, good())
        db.create_product(self.conn, good(ma_de_nghi="a"))
        with self.assertRaises(db.ValidationError):
            db.create_product(self.conn, good(ma_de_nghi="a"))


class TestValidate(unittest.TestCase):
    def test_valid_row_normalised(self):
        c = db.validate(good(ma_nhan_vien="  NV001 ", ten_nhan_vien="  Nguyễn   Văn  An "))
        self.assertEqual(c["ma_nhan_vien"], "NV001")
        self.assertEqual(c["ten_nhan_vien"], "Nguyễn Văn An")
        self.assertIsNone(c["ma_de_nghi"])

    def test_default_status(self):
        d = good(); del d["trang_thai"]
        self.assertEqual(db.validate(d)["trang_thai"], "cho_duyet")

    def test_every_required_field_missing(self):
        for k in ("ma_nhan_vien", "ten_nhan_vien", "so_tien", "thoi_gian", "phan_loai_chi"):
            d = good(); del d[k]
            with self.assertRaises(db.ValidationError, msg=k) as cm:
                db.validate(d)
            self.assertIn(k, cm.exception.errors)

    def test_amount_rules(self):
        for ok in (0, 1, 100_000_000, 10 ** 13):
            self.assertEqual(db.validate(good(so_tien=ok))["so_tien"], ok)
        for bad in (-1, 10 ** 13 + 1, 1.5, 2.0, "100", None, True, False, [1], float("nan")):
            with self.assertRaises(db.ValidationError, msg=repr(bad)):
                db.validate(good(so_tien=bad))

    def test_text_length_limits(self):
        self.assertTrue(db.validate(good(ma_nhan_vien="M" * 20)))
        self.assertTrue(db.validate(good(ten_nhan_vien="T" * 60)))
        for k, n in (("ma_nhan_vien", 21), ("ten_nhan_vien", 61)):
            with self.assertRaises(db.ValidationError):
                db.validate(good(**{k: "x" * n}))
        for bad in ("", "   ", None, 5):
            for k in ("ma_nhan_vien", "ten_nhan_vien"):
                with self.assertRaises(db.ValidationError):
                    db.validate(good(**{k: bad}))

    def test_category_must_be_known(self):
        for c in db.CATEGORIES:
            self.assertEqual(db.validate(good(phan_loai_chi=c))["phan_loai_chi"], c)
        for bad in ("", "thiet_bi", "THIẾT BỊ", None, "Xe hơi"):
            with self.assertRaises(db.ValidationError):
                db.validate(good(phan_loai_chi=bad))

    def test_status_must_be_known(self):
        for s in db.STATUSES:
            self.assertEqual(db.validate(good(trang_thai=s))["trang_thai"], s)
        for bad in ("", "approved", "DA_DUYET", None, 1):
            with self.assertRaises(db.ValidationError):
                db.validate(good(trang_thai=bad))

    def test_time_normalised_to_utc(self):
        cases = {
            "2026-11-02T09:30:00Z": "2026-11-02T09:30:00Z", "2026-11-02T09:30:00z": "2026-11-02T09:30:00Z",
            "2026-11-02T09:30:00": "2026-11-02T09:30:00Z", "2026-11-02T16:30:00+07:00": "2026-11-02T09:30:00Z",
            "2026-11-02T09:30:00.123Z": "2026-11-02T09:30:00Z", "2026-11-02": "2026-11-02T00:00:00Z",
            "2026-11-02T00:30:00+07:00": "2026-11-01T17:30:00Z",
        }
        for src, want in cases.items():
            self.assertEqual(db.validate(good(thoi_gian=src))["thoi_gian"], want, src)

    def test_invalid_times_rejected(self):
        for bad in ("", "hôm nay", "2026-13-01T00:00:00Z", "2026-02-30T00:00:00Z", "1969-12-31T23:59:59Z", "2101-01-01T00:00:00Z", None, 1700000000, "02/11/2026"):
            with self.assertRaises(db.ValidationError, msg=repr(bad)):
                db.validate(good(thoi_gian=bad))

    def test_ma_de_nghi_rules(self):
        self.assertEqual(db.validate(good(ma_de_nghi="dn_abc"))["ma_de_nghi"], "dn_abc")
        self.assertIsNone(db.validate(good(ma_de_nghi=None))["ma_de_nghi"])
        for bad in ("", "x" * 81, 5):
            with self.assertRaises(db.ValidationError):
                db.validate(good(ma_de_nghi=bad))

    def test_all_errors_reported_together(self):
        with self.assertRaises(db.ValidationError) as cm:
            db.validate({"so_tien": -5})
        self.assertGreaterEqual(len(cm.exception.errors), 5)

    def test_non_object_rejected(self):
        for bad in (None, [], "x", 5):
            with self.assertRaises(db.ValidationError):
                db.validate(bad)

    def test_unknown_fields_are_ignored(self):
        self.assertNotIn("id", db.validate(good(id=999, tuy_y="x")))


class TestOperations(Base):
    def test_create_returns_row_with_id(self):
        r = db.create_product(self.conn, good(so_tien=7_000_000))
        self.assertGreater(r["id"], len(db.SEED))
        self.assertEqual(r["so_tien"], 7_000_000)
        self.assertEqual(db.get_product(self.conn, r["id"]), r)

    def test_create_invalid_writes_nothing(self):
        n = len(db.list_products(self.conn))
        with self.assertRaises(db.ValidationError):
            db.create_product(self.conn, good(so_tien=-1))
        self.assertEqual(len(db.list_products(self.conn)), n)

    def test_list_orders_newest_first_then_id_desc(self):
        rows = db.list_products(self.conn)
        keys = [(r["thoi_gian"], r["id"]) for r in rows]
        self.assertEqual(keys, sorted(keys, reverse=True))

    def test_list_filter_by_status(self):
        for s in db.STATUSES:
            rows = db.list_products(self.conn, s)
            self.assertTrue(rows)
            self.assertTrue(all(r["trang_thai"] == s for r in rows))
        with self.assertRaises(db.ValidationError):
            db.list_products(self.conn, "khong_co")

    def test_get_missing_raises(self):
        with self.assertRaises(db.NotFound):
            db.get_product(self.conn, 99999)

    def test_upsert_creates_then_updates_same_row(self):
        a, created = db.upsert_product(self.conn, good(ma_de_nghi="dn1", so_tien=1000))
        self.assertTrue(created)
        n = len(db.list_products(self.conn))
        b, created2 = db.upsert_product(self.conn, good(ma_de_nghi="dn1", so_tien=2000, trang_thai="da_duyet"))
        self.assertFalse(created2)
        self.assertEqual(b["id"], a["id"])
        self.assertEqual((b["so_tien"], b["trang_thai"]), (2000, "da_duyet"))
        self.assertEqual(len(db.list_products(self.conn)), n)

    def test_upsert_is_idempotent(self):
        for _ in range(5):
            db.upsert_product(self.conn, good(ma_de_nghi="dn1"))
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM products WHERE ma_de_nghi='dn1'").fetchone()[0], 1)

    def test_upsert_without_request_id_always_inserts(self):
        n = len(db.list_products(self.conn))
        db.upsert_product(self.conn, good())
        db.upsert_product(self.conn, good())
        self.assertEqual(len(db.list_products(self.conn)), n + 2)

    def test_set_status_changes_only_that_row(self):
        before = db.list_products(self.conn)
        r = db.set_status(self.conn, 3, "da_duyet")
        self.assertEqual(r["trang_thai"], "da_duyet")
        after = {x["id"]: x for x in db.list_products(self.conn)}
        for b in before:
            if b["id"] != 3:
                self.assertEqual(after[b["id"]], b)

    def test_set_status_errors(self):
        with self.assertRaises(db.NotFound):
            db.set_status(self.conn, 99999, "da_duyet")
        with self.assertRaises(db.ValidationError):
            db.set_status(self.conn, 1, "xyz")
        self.assertEqual(db.get_product(self.conn, 1)["trang_thai"], "da_duyet")

    def test_bulk_upsert_counts_created_and_updated(self):
        db.upsert_product(self.conn, good(ma_de_nghi="a", so_tien=1))
        r = db.bulk_upsert(self.conn, [good(ma_de_nghi="a", so_tien=2), good(ma_de_nghi="b"), good(ma_de_nghi="c")])
        self.assertEqual(r, {"created": 2, "updated": 1})

    def test_bulk_is_all_or_nothing(self):
        n = len(db.list_products(self.conn))
        with self.assertRaises(db.ValidationError) as cm:
            db.bulk_upsert(self.conn, [good(ma_de_nghi="ok1"), good(so_tien=-5, ma_de_nghi="bad"), good(ma_de_nghi="ok2")])
        self.assertIn("items[1].so_tien", cm.exception.errors)
        self.assertEqual(len(db.list_products(self.conn)), n)

    def test_bulk_duplicate_request_ids_rejected(self):
        with self.assertRaises(db.ValidationError):
            db.bulk_upsert(self.conn, [good(ma_de_nghi="a"), good(ma_de_nghi="a")])

    def test_bulk_limits_and_types(self):
        for bad in (None, {}, "x", 5):
            with self.assertRaises(db.ValidationError):
                db.bulk_upsert(self.conn, bad)
        with self.assertRaises(db.ValidationError):
            db.bulk_upsert(self.conn, [good()] * (db.MAX_BULK + 1))
        self.assertEqual(db.bulk_upsert(self.conn, []), {"created": 0, "updated": 0})

    def test_bulk_large_batch_performance(self):
        rows = [good(ma_de_nghi="r%d" % i, so_tien=i) for i in range(2000)]
        import time
        t = time.time()
        self.assertEqual(db.bulk_upsert(self.conn, rows)["created"], 2000)
        self.assertLess(time.time() - t, 5)

    def test_sql_injection_strings_are_stored_literally(self):
        evil = "'; DROP TABLE products; --"
        r = db.create_product(self.conn, good(ten_nhan_vien=evil[:60], ma_nhan_vien="N';--", ma_de_nghi=evil))
        self.assertEqual(db.get_product(self.conn, r["id"])["ma_de_nghi"], evil)
        self.assertGreaterEqual(len(db.list_products(self.conn)), len(db.SEED) + 1)
        db.list_products(self.conn)  # bảng vẫn còn

    def test_unicode_roundtrip(self):
        r = db.create_product(self.conn, good(ten_nhan_vien="Đỗ Thị Ánh ☕ 😀", ma_nhan_vien="Đ-01"))
        self.assertEqual(db.get_product(self.conn, r["id"])["ten_nhan_vien"], "Đỗ Thị Ánh ☕ 😀")

    def test_huge_amount_roundtrip_exact(self):
        r = db.create_product(self.conn, good(so_tien=10 ** 13))
        self.assertEqual(db.get_product(self.conn, r["id"])["so_tien"], 10 ** 13)


class TestSummary(Base):
    def test_totals_are_consistent(self):
        s = db.summary(self.conn)
        rows = db.list_products(self.conn)
        self.assertEqual(s["count"], len(rows))
        self.assertEqual(s["total"], sum(r["so_tien"] for r in rows))
        self.assertEqual(sum(v["count"] for v in s["by_status"].values()), s["count"])
        self.assertEqual(sum(v["total"] for v in s["by_status"].values()), s["total"])
        cat_total = sum(v["total"] for c in s["by_category"].values() for v in c.values())
        self.assertEqual(cat_total, s["total"])

    def test_over_threshold_is_strictly_greater_and_sorted(self):
        s = db.summary(self.conn)
        amounts = [r["so_tien"] for r in s["over_threshold"]]
        self.assertEqual(amounts, [135_500_000, 120_000_000])
        self.assertNotIn(100_000_000, amounts)
        self.assertEqual(s["threshold"], 100_000_000)

    def test_new_over_threshold_row_is_detected(self):
        db.create_product(self.conn, good(so_tien=100_000_001))
        self.assertEqual(len(db.summary(self.conn)["over_threshold"]), 3)
        db.create_product(self.conn, good(so_tien=100_000_000))
        self.assertEqual(len(db.summary(self.conn)["over_threshold"]), 3)

    def test_empty_database_summary(self):
        p = os.path.join(self.dir.name, "e.db")
        db.init_db(p, seed=False)
        c = db.connect(p)
        s = db.summary(c)
        c.close()
        self.assertEqual((s["count"], s["total"], s["over_threshold"], s["by_category"]), (0, 0, [], {}))


if __name__ == "__main__":
    unittest.main(verbosity=2)
