"""Tạo products.db (bảng products + dữ liệu mẫu).

Dùng:  python3 server/init_db.py            (tạo nếu chưa có; không đụng dữ liệu đã có)
       python3 server/init_db.py --reset    (XÓA bảng products rồi tạo lại với dữ liệu mẫu)
       python3 server/init_db.py --db đường/dẫn/khác.db
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB = os.path.join(ROOT, "products.db")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=DEFAULT_DB, help="đường dẫn file SQLite (mặc định: products.db ở thư mục dự án)")
    ap.add_argument("--reset", action="store_true", help="xóa bảng products và tạo lại (MẤT dữ liệu hiện có)")
    ap.add_argument("--no-seed", action="store_true", help="không thêm dữ liệu mẫu")
    a = ap.parse_args(argv)
    db.init_db(a.db, seed=not a.no_seed, reset=a.reset)
    conn = db.connect(a.db)
    try:
        n = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    finally:
        conn.close()
    print("Đã sẵn sàng: %s (%d khoản chi)" % (a.db, n))


if __name__ == "__main__":
    main()
