# Sổ Đề Nghị Chi – Cơ sở dữ liệu SQLite (`products.db`)

Theo [PRD](../PRD.md) v1.4 (**F-25**, **F-26**) và [DESIGN](../DESIGN.md) v1.6 (**mục 14**).

## Chạy
```bash
python3 server/server.py              # http://127.0.0.1:8000/trang-chu/   (Ctrl+C để dừng)
python3 server/server.py --port 0     # tự chọn cổng trống
python3 server/init_db.py             # tạo products.db nếu chưa có (không đụng dữ liệu cũ)
python3 server/init_db.py --reset     # XÓA bảng rồi tạo lại với dữ liệu mẫu
```
Chỉ cần Python 3 (đã thử với 3.11), **không cài thêm thư viện**. Mở địa chỉ trên, chọn **Quản lý**: Trang chủ có khối **"Tổng hợp chi từ cơ sở dữ liệu"**. Xem trực tiếp bằng SQLite: `sqlite3 products.db "SELECT * FROM products;"`.

> Máy chủ chỉ lắng nghe `127.0.0.1` (một máy). **Không dùng được trên GitHub Pages**: ở đó ứng dụng vẫn chạy bằng localStorage, còn khối tổng hợp hiện "Chưa kết nối".

## Dữ liệu ví dụ (10 nhân viên, ~90 đề nghị)
Mở `http://127.0.0.1:8000/du-lieu-mau/` rồi bấm **Nạp dữ liệu mẫu** (ghi đè dữ liệu trong trình duyệt; có hỏi xác nhận). Dữ liệu được ghi cả vào `products.db` khi máy chủ đang chạy. Chi tiết: [du-lieu-mau/](../du-lieu-mau/). Test: `du-lieu-mau/run-tests.sh`.

## Bảng `products`
| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Mã dòng |
| `ma_nhan_vien` | TEXT (1–20) | Mã số nhân viên |
| `ten_nhan_vien` | TEXT (1–60) | Tên nhân viên |
| `so_tien` | INTEGER ≥ 0 | Số tiền (VND, số nguyên) |
| `thoi_gian` | TEXT | Thời gian ghi nhận, UTC ISO 8601 (`2026-11-02T09:30:00Z`) |
| `phan_loai_chi` | TEXT | Một trong 7 phân loại tiếng Việt (Văn phòng phẩm, Vật tư, Thiết bị, Vận chuyển, Tiếp khách, Dịch vụ, Khác) |
| `trang_thai` | TEXT, CHECK | `cho_duyet` · `da_duyet` · `tu_choi` (mặc định `cho_duyet`) |
| `ma_de_nghi` | TEXT UNIQUE, NULL được | **Cột thêm ngoài yêu cầu**: mã đề nghị bên localStorage, để duyệt/từ chối/sửa cập nhật đúng dòng thay vì tạo dòng mới. Dữ liệu mẫu để NULL |

Dữ liệu mẫu: 9 dòng (đủ 3 trạng thái, 6 phân loại; **2 khoản trên 100 triệu**: 120.000.000 và 135.500.000; và 2 khoản sát ngưỡng 99.999.999 và 100.000.000 để kiểm tra "lớn hơn").

## Cách dữ liệu đi vào cơ sở dữ liệu (ghi song song)
localStorage vẫn là nguồn chính của ứng dụng (4 module cũ **không bị sửa**). Bộ đồng bộ `DncDb.createSync` (trong `js/db-client.js`) lắng nghe sự kiện `dnc:data-changed` mà các module đã phát:

| Hành động trong ứng dụng | Ghi vào `products` |
|---|---|
| Nhân viên nhập đề nghị (module Nhập liệu) | Thêm 1 dòng (`trang_thai = cho_duyet`) |
| Sửa đề nghị | Cập nhật đúng dòng (theo `ma_de_nghi`) |
| Quản lý duyệt / từ chối / duyệt hàng loạt / hoàn tác | Cập nhật `trang_thai` của các dòng tương ứng |
| Đổi mã/tên nhân viên | Cập nhật mã/tên ở các dòng của người đó (đối soát) |
| Mở ứng dụng, mạng/máy chủ trở lại, tab khác ghi | **Đối soát**: so sánh toàn bộ localStorage với CSDL và chỉ đẩy dòng thiếu/khác (chia lô 500) |

Ghi tuần tự (không chồng lấn), idempotent (gửi lại không nhân dòng). Mất kết nối: trạng thái `offline`, tự thử lại sau 15 giây và khi trình duyệt báo `online`; không mất dữ liệu vì lần đối soát sau sẽ bù. **Không bao giờ xóa dòng** trong CSDL (sổ chi chỉ ghi thêm/cập nhật trạng thái).

## API (JSON, UTF-8)
| Phương thức | Đường dẫn | Chức năng |
|---|---|---|
| GET | `/api/health` | `{ok, db, count}` |
| GET | `/api/products[?trang_thai=…]` | `{items:[…], meta:{count,total,threshold,over_threshold}}` (mới nhất trước) |
| GET | `/api/summary` | Tổng hợp theo trạng thái/phân loại + các khoản vượt ngưỡng |
| GET | `/api/products/<id>` | Một dòng |
| POST | `/api/products` | Ghi một khoản; cùng `ma_de_nghi` thì cập nhật. **201** tạo mới / **200** cập nhật |
| POST | `/api/products/bulk` | `{items:[…]}` trong **một giao dịch**: một dòng sai thì không dòng nào được ghi |
| PATCH | `/api/products/<id>` | `{trang_thai}` |

Lỗi: `{error, message, details?}` với mã 400 (không hợp lệ, kèm lỗi theo từng trường), 404, 405, 413 (> 2 MB), 415 (không phải `application/json`). Không có `DELETE`/`PUT` (trả 405).

## Bảo mật cơ bản
Mọi truy vấn dùng tham số (chuỗi `'; DROP TABLE …` được lưu nguyên văn); kiểm tra hợp lệ ở cả `CHECK` của SQLite lẫn Python; lắng nghe `127.0.0.1`; chặn path traversal (kể cả symlink ra ngoài thư mục gốc); không phục vụ `.db`, `.py`, thư mục `server/`, đường dẫn ẩn (`.git`…). Đây là công cụ cục bộ một người dùng, **không có xác thực**: đừng mở cổng ra mạng.

## Cảnh báo > 100 triệu
Ngưỡng là **lớn hơn** 100.000.000 ₫ (hằng `THRESHOLD` ở `server/db.py` và `DncDb.THRESHOLD`), áp cho mọi trạng thái. Khối hiện ở Trang chủ của Quản lý: tiêu đề "Cảnh báo: có N khoản chi trên 100 triệu đồng", danh sách từng khoản, dòng vi phạm trong bảng có nhãn "Trên 100 triệu", thẻ số liệu và nhãn trên biểu đồ.

## Cấu trúc
| Tệp | Vai trò |
|---|---|
| `../products.db` | Cơ sở dữ liệu SQLite (có dữ liệu mẫu; **thay đổi khi bạn dùng ứng dụng**) |
| `../server/db.py` | Schema, dữ liệu mẫu, kiểm tra hợp lệ, upsert/bulk/trạng thái, tổng hợp |
| `../server/server.py` | Máy chủ HTTP: API + phục vụ file tĩnh |
| `../server/init_db.py` | Tạo/đặt lại `products.db` |
| `../server/test_db.py`, `test_api.py` | 80 test Python |
| `js/db-client.js` | Client API (`DncDb.createClient`) + bộ đồng bộ ghi song song (`createSync`) |
| `js/db-panel.js`, `css/db.css` | Khối "Tổng hợp chi từ cơ sở dữ liệu" (`DncDbPanel.mount`) |
| `tests/`, `run-tests.sh` | Test trình duyệt (chạy với **máy chủ thật**) |

Khung ứng dụng nhận khối này qua tùy chọn `homeExtras` của `DncApp.start` (xem `trang-chu/index.html`), nên khung không phụ thuộc vào cơ sở dữ liệu.

## Chạy test
```bash
./database/run-tests.sh
```
Chạy 80 test Python, rồi 4 lần Chrome headless {sáng, tối} × {laptop, điện thoại}; **mỗi lần dựng một máy chủ thật với bản sao `products.db` sạch**, nên các test `LIVE` gọi API thật, ghi vào SQLite thật, kể cả kịch bản đầy đủ: nhân viên nhập đề nghị 120 triệu qua form → dòng xuất hiện trong SQLite → Quản lý thấy cảnh báo và đủ dòng trong bảng → duyệt → trạng thái trong SQLite đổi → bảng cập nhật. Cần Google Chrome và Python 3. Chạy riêng test Python: `python3 -m unittest discover -s server -v`.
