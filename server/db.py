"""Tầng cơ sở dữ liệu SQLite (products.db) cho Sổ Đề Nghị Chi.

Chỉ dùng thư viện chuẩn. Mọi truy vấn dùng tham số (không ghép chuỗi SQL).
Bảng `products`: id, ma_nhan_vien, ten_nhan_vien, so_tien, thoi_gian, phan_loai_chi, trang_thai
(+ ma_de_nghi: mã đề nghị bên localStorage, dùng để cập nhật đúng dòng khi duyệt/từ chối; NULL với dữ liệu mẫu).
"""
import sqlite3
from datetime import datetime, timezone

STATUSES = ("cho_duyet", "da_duyet", "tu_choi")
CATEGORIES = ("Văn phòng phẩm", "Vật tư", "Thiết bị", "Vận chuyển", "Tiếp khách", "Dịch vụ", "Khác")
THRESHOLD = 100_000_000          # cảnh báo khi MỘT khoản chi LỚN HƠN mức này (VND)
MAX_AMOUNT = 10 ** 13
MAX_BULK = 5000

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_nhan_vien  TEXT    NOT NULL CHECK (length(ma_nhan_vien) BETWEEN 1 AND 20),
    ten_nhan_vien TEXT    NOT NULL CHECK (length(ten_nhan_vien) BETWEEN 1 AND 60),
    so_tien       INTEGER NOT NULL CHECK (so_tien >= 0),
    thoi_gian     TEXT    NOT NULL,
    phan_loai_chi TEXT    NOT NULL,
    trang_thai    TEXT    NOT NULL DEFAULT 'cho_duyet' CHECK (trang_thai IN ('cho_duyet', 'da_duyet', 'tu_choi')),
    ma_de_nghi    TEXT    UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_products_thoi_gian ON products (thoi_gian);
CREATE INDEX IF NOT EXISTS idx_products_trang_thai ON products (trang_thai);
"""

# Dữ liệu mẫu (9 dòng): đủ 3 trạng thái, nhiều phân loại, 2 khoản > 100 triệu, và 2 khoản sát ngưỡng (không cảnh báo).
SEED = (
    ("NV001", "Nguyễn Văn An", 4_850_000, "2026-10-28T02:15:00Z", "Thiết bị", "da_duyet"),
    ("NV002", "Trần Thị Bình", 450_000, "2026-10-29T03:30:00Z", "Văn phòng phẩm", "da_duyet"),
    ("NV003", "Lê Hoàng Cường", 1_250_000, "2026-10-30T07:45:00Z", "Vận chuyển", "cho_duyet"),
    ("NV001", "Nguyễn Văn An", 120_000_000, "2026-11-01T01:00:00Z", "Thiết bị", "cho_duyet"),
    ("NV004", "Phạm Thu Dung", 650_000, "2026-11-01T04:20:00Z", "Dịch vụ", "tu_choi"),
    ("NV005", "Đỗ Minh Khôi", 2_400_000, "2026-11-01T08:05:00Z", "Tiếp khách", "da_duyet"),
    ("NV002", "Trần Thị Bình", 135_500_000, "2026-11-02T02:00:00Z", "Vật tư", "da_duyet"),
    ("NV003", "Lê Hoàng Cường", 99_999_999, "2026-11-02T03:10:00Z", "Dịch vụ", "cho_duyet"),
    ("NV005", "Đỗ Minh Khôi", 100_000_000, "2026-11-02T05:40:00Z", "Thiết bị", "da_duyet"),
)

COLUMNS = ("id", "ma_nhan_vien", "ten_nhan_vien", "so_tien", "thoi_gian", "phan_loai_chi", "trang_thai", "ma_de_nghi")


class ValidationError(ValueError):
    """Dữ liệu không hợp lệ. `errors` = {tên_trường: thông báo}."""

    def __init__(self, errors):
        super().__init__("; ".join("%s: %s" % kv for kv in errors.items()))
        self.errors = errors


class NotFound(LookupError):
    pass


def connect(path):
    conn = sqlite3.connect(path, timeout=10, isolation_level=None)  # tự quản lý giao dịch
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path, seed=True, reset=False):
    """Tạo bảng (và dữ liệu mẫu nếu bảng đang trống). reset=True: xóa bảng làm lại."""
    conn = connect(path)
    try:
        if reset:
            conn.execute("DROP TABLE IF EXISTS products")
        conn.executescript(SCHEMA)
        if seed and conn.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
            conn.execute("BEGIN")
            conn.executemany(
                "INSERT INTO products (ma_nhan_vien, ten_nhan_vien, so_tien, thoi_gian, phan_loai_chi, trang_thai) VALUES (?,?,?,?,?,?)",
                SEED,
            )
            conn.execute("COMMIT")
    finally:
        conn.close()


# ----------------------------------------------------------------------------- kiểm tra hợp lệ
def _norm_time(value):
    """Chuẩn hóa về 'YYYY-MM-DDTHH:MM:SSZ' (UTC). Chuỗi không có múi giờ được coi là UTC."""
    if not isinstance(value, str) or not value.strip():
        return None
    s = value.strip()
    if s.endswith(("Z", "z")):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    if not 1970 <= dt.astimezone(timezone.utc).year <= 2100:
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def validate(data):
    """Trả về dict sạch (đủ trường) hoặc ném ValidationError."""
    errors = {}
    if not isinstance(data, dict):
        raise ValidationError({"_": "Dữ liệu phải là một đối tượng JSON"})
    clean = {}

    ma = data.get("ma_nhan_vien")
    if not isinstance(ma, str) or not 1 <= len(ma.strip()) <= 20:
        errors["ma_nhan_vien"] = "Mã nhân viên bắt buộc, 1–20 ký tự"
    else:
        clean["ma_nhan_vien"] = ma.strip()

    ten = data.get("ten_nhan_vien")
    if not isinstance(ten, str) or not 1 <= len(" ".join(ten.split())) <= 60:
        errors["ten_nhan_vien"] = "Tên nhân viên bắt buộc, 1–60 ký tự"
    else:
        clean["ten_nhan_vien"] = " ".join(ten.split())

    tien = data.get("so_tien")
    if isinstance(tien, bool) or not isinstance(tien, int) or not 0 <= tien <= MAX_AMOUNT:
        errors["so_tien"] = "Số tiền phải là số nguyên đồng từ 0 đến %d" % MAX_AMOUNT
    else:
        clean["so_tien"] = tien

    t = _norm_time(data.get("thoi_gian"))
    if t is None:
        errors["thoi_gian"] = "Thời gian không hợp lệ (định dạng ISO 8601, năm 1970–2100)"
    else:
        clean["thoi_gian"] = t

    loai = data.get("phan_loai_chi")
    if loai not in CATEGORIES:
        errors["phan_loai_chi"] = "Phân loại chi phải là một trong: " + ", ".join(CATEGORIES)
    else:
        clean["phan_loai_chi"] = loai

    tt = data.get("trang_thai", "cho_duyet")
    if tt not in STATUSES:
        errors["trang_thai"] = "Trạng thái phải là: " + ", ".join(STATUSES)
    else:
        clean["trang_thai"] = tt

    mdn = data.get("ma_de_nghi")
    if mdn is None:
        clean["ma_de_nghi"] = None
    elif not isinstance(mdn, str) or not 1 <= len(mdn) <= 80:
        errors["ma_de_nghi"] = "Mã đề nghị (nếu có) dài 1–80 ký tự"
    else:
        clean["ma_de_nghi"] = mdn

    if errors:
        raise ValidationError(errors)
    return clean


def _row(r):
    return {k: r[k] for k in COLUMNS} if r is not None else None


# ----------------------------------------------------------------------------- truy vấn
def list_products(conn, status=None):
    if status is not None and status not in STATUSES:
        raise ValidationError({"trang_thai": "Trạng thái lọc không hợp lệ"})
    sql = "SELECT * FROM products"
    args = []
    if status is not None:
        sql += " WHERE trang_thai = ?"
        args.append(status)
    sql += " ORDER BY thoi_gian DESC, id DESC"
    return [_row(r) for r in conn.execute(sql, args).fetchall()]


def get_product(conn, pid):
    r = _row(conn.execute("SELECT * FROM products WHERE id = ?", (pid,)).fetchone())
    if r is None:
        raise NotFound("Không tìm thấy khoản chi #%s" % pid)
    return r


def create_product(conn, data):
    c = validate(data)
    try:
        cur = conn.execute(
            "INSERT INTO products (ma_nhan_vien, ten_nhan_vien, so_tien, thoi_gian, phan_loai_chi, trang_thai, ma_de_nghi) VALUES (?,?,?,?,?,?,?)",
            (c["ma_nhan_vien"], c["ten_nhan_vien"], c["so_tien"], c["thoi_gian"], c["phan_loai_chi"], c["trang_thai"], c["ma_de_nghi"]),
        )
    except sqlite3.IntegrityError:
        raise ValidationError({"ma_de_nghi": "Mã đề nghị đã tồn tại"})
    return get_product(conn, cur.lastrowid)


def _upsert(conn, c):
    """Chèn hoặc cập nhật theo ma_de_nghi (đã validate). Trả (id, created)."""
    if c["ma_de_nghi"] is None:
        cur = conn.execute(
            "INSERT INTO products (ma_nhan_vien, ten_nhan_vien, so_tien, thoi_gian, phan_loai_chi, trang_thai, ma_de_nghi) VALUES (?,?,?,?,?,?,NULL)",
            (c["ma_nhan_vien"], c["ten_nhan_vien"], c["so_tien"], c["thoi_gian"], c["phan_loai_chi"], c["trang_thai"]),
        )
        return cur.lastrowid, True
    row = conn.execute("SELECT id FROM products WHERE ma_de_nghi = ?", (c["ma_de_nghi"],)).fetchone()
    if row is None:
        cur = conn.execute(
            "INSERT INTO products (ma_nhan_vien, ten_nhan_vien, so_tien, thoi_gian, phan_loai_chi, trang_thai, ma_de_nghi) VALUES (?,?,?,?,?,?,?)",
            (c["ma_nhan_vien"], c["ten_nhan_vien"], c["so_tien"], c["thoi_gian"], c["phan_loai_chi"], c["trang_thai"], c["ma_de_nghi"]),
        )
        return cur.lastrowid, True
    conn.execute(
        "UPDATE products SET ma_nhan_vien=?, ten_nhan_vien=?, so_tien=?, thoi_gian=?, phan_loai_chi=?, trang_thai=? WHERE id=?",
        (c["ma_nhan_vien"], c["ten_nhan_vien"], c["so_tien"], c["thoi_gian"], c["phan_loai_chi"], c["trang_thai"], row["id"]),
    )
    return row["id"], False


def upsert_product(conn, data):
    """Ghi một khoản chi: cùng ma_de_nghi thì cập nhật (idempotent). Trả (dòng, created)."""
    c = validate(data)
    conn.execute("BEGIN IMMEDIATE")
    try:
        pid, created = _upsert(conn, c)
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return get_product(conn, pid), created


def bulk_upsert(conn, rows):
    """Ghi nhiều khoản trong MỘT giao dịch: có một dòng sai thì không ghi dòng nào."""
    if not isinstance(rows, list):
        raise ValidationError({"items": "items phải là một mảng"})
    if len(rows) > MAX_BULK:
        raise ValidationError({"items": "Tối đa %d dòng mỗi lần" % MAX_BULK})
    cleaned, errs = [], {}
    for i, r in enumerate(rows):
        try:
            cleaned.append(validate(r))
        except ValidationError as e:
            for k, v in e.errors.items():
                errs["items[%d].%s" % (i, k)] = v
    if errs:
        raise ValidationError(errs)
    seen = set()
    for i, c in enumerate(cleaned):
        if c["ma_de_nghi"] is not None:
            if c["ma_de_nghi"] in seen:
                raise ValidationError({"items[%d].ma_de_nghi" % i: "Trùng mã đề nghị trong cùng một lần gửi"})
            seen.add(c["ma_de_nghi"])
    created = updated = 0
    conn.execute("BEGIN IMMEDIATE")
    try:
        for c in cleaned:
            _, was_created = _upsert(conn, c)
            created += 1 if was_created else 0
            updated += 0 if was_created else 1
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return {"created": created, "updated": updated}


def set_status(conn, pid, status):
    if status not in STATUSES:
        raise ValidationError({"trang_thai": "Trạng thái phải là: " + ", ".join(STATUSES)})
    cur = conn.execute("UPDATE products SET trang_thai = ? WHERE id = ?", (status, pid))
    if cur.rowcount == 0:
        raise NotFound("Không tìm thấy khoản chi #%s" % pid)
    return get_product(conn, pid)


def summary(conn):
    """Số liệu tổng hợp cho trang quản lý: tổng, theo trạng thái, theo phân loại, các khoản vượt ngưỡng."""
    rows = list_products(conn)
    out = {"count": len(rows), "total": sum(r["so_tien"] for r in rows), "threshold": THRESHOLD,
           "by_status": {s: {"count": 0, "total": 0} for s in STATUSES}, "by_category": {}, "over_threshold": []}
    for r in rows:
        s = out["by_status"][r["trang_thai"]]
        s["count"] += 1
        s["total"] += r["so_tien"]
        c = out["by_category"].setdefault(r["phan_loai_chi"], {s_: {"count": 0, "total": 0} for s_ in STATUSES})
        c[r["trang_thai"]]["count"] += 1
        c[r["trang_thai"]]["total"] += r["so_tien"]
        if r["so_tien"] > THRESHOLD:
            out["over_threshold"].append(r)
    out["over_threshold"].sort(key=lambda r: (-r["so_tien"], r["id"]))
    return out
