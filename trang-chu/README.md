# Sổ Đề Nghị Chi – Module 5: Khung ứng dụng và Trang chủ điều hướng

Phạm vi theo [PRD](../PRD.md) v1.3: **F-01** (chọn/đổi vai trò), **F-23** (khung, điều hướng theo vai trò, địa chỉ `#/…`, bảo vệ trang), **F-24** (Trang chủ điều hướng, banner hệ thống, đặt lại dữ liệu).
Giao diện theo [DESIGN](../DESIGN.md) v1.5: **4.1**, **10.2**, **10.7** và **mục 13** (cùng các mục 2–6, 8, 9).

Module này **nối 4 module đã có** (Nhập liệu, Duyệt, Thống kê, Nhân viên) thành một ứng dụng chạy được. Nó **không sửa** mã của các module đó: chỉ gọi API `mount` công khai và nạp CSS/JS của chúng.
**Không** gồm: danh sách đề nghị theo ngày (F-05, F-06, F-09), xuất CSV (F-15). Trang chủ phiên bản này là bảng điều khiển điều hướng.

## Chạy thử (ứng dụng hoàn chỉnh)
Mở [index.html](index.html) bằng trình duyệt (không cần server). Lần đầu chưa có dữ liệu: chọn **Quản lý** → vào **Nhân viên** → thêm vài nhân viên → đổi vai trò (chip trên đầu trang) sang **Nhân viên** → **Thêm** đề nghị → đổi lại **Quản lý** → **Duyệt**.
Mọi dữ liệu nằm trong `localStorage` của trình duyệt, dùng chung giữa 4 module.

## Cấu trúc
| Tệp | Vai trò |
|---|---|
| `js/app-model.js` | Logic thuần: bảng định tuyến theo vai trò, phân tích địa chỉ, bảo vệ trang, phiên làm việc, kiểm tra sức khỏe dữ liệu, chọn banner, số liệu Trang chủ. Chạy được trong Node. |
| `js/app-shell.js` | Khung: đầu trang, thanh điều hướng, màn Chọn vai trò, menu đổi vai trò, Trang chủ, banner, hộp thoại đặt lại, toast, định tuyến. API `DncApp.start`. |
| `js/app-modules.js` | Nối 4 module thật: `DncAppModules.real(storage)`. |
| `css/app.css`, `css/tokens.css` | Style (tiền tố `app-`) và token DESIGN. |
| `tests/`, `run-tests.sh` | Bộ test chạy trong Chrome headless (nạp cả 4 module thật). |

## Hợp đồng
**Khởi động:** `DncApp.start(rootEl, { storage, modules, nav?, today? })` → `{ navigate(path, {replace}?), getState(), toast(msg), destroy() }`.
- `modules`: `{ 'nhap-lieu' | 'duyet' | 'thong-ke' | 'nhan-vien': { mount(el, ctx) → { destroy() } } }`. `ctx = { session, params, storage, navigate(path), forbidden(), notifyChanged() }` (`session` là bản sao).
- `nav`: bộ điều hợp địa chỉ `{ get(), set(path, {replace}), listen(cb) → huỷ }`; mặc định `DncApp.hashNav()` dùng `location.hash` (test dùng bản trong bộ nhớ).

**Địa chỉ:** `#/` Trang chủ · `#/thong-ke` · `#/nhap-lieu` (và `#/nhap-lieu/sua/<id>`) · `#/duyet` · `#/nhan-vien` · `#/vai-tro`.

**Phiên:** `dnc:v1:session` = `{ vaiTro:'quan_ly' }` hoặc `{ vaiTro:'nhan_vien', nhanVienId }`. Khóa `dnc:v1:ui:ack` nhớ "Đã hiểu".

**Sự kiện nghe:** `dnc:data-changed` (từ mọi module) và `storage` (tab khác): cập nhật huy hiệu, chip, Trang chủ và kiểm tra lại phiên.

## Quy tắc đã cài
| Hạng mục | Quy tắc |
|---|---|
| Vào app | Có phiên hợp lệ → vào thẳng Trang chủ. Chưa có/hỏng → Chọn vai trò. Địa chỉ sâu khi chưa có phiên → Chọn vai trò |
| Phiên Nhân viên | Phải còn tồn tại và **đang hoạt động**; nếu không (kể cả bị ngưng ở tab khác khi đang dùng) → xóa phiên, về Chọn vai trò, báo "Nhân viên này không còn hoạt động. Hãy chọn lại vai trò." |
| Bảo vệ trang | Nhân viên: Trang chủ, Thống kê, Thêm. Quản lý: Trang chủ, Thống kê, Duyệt, Nhân viên. Vào trang không thuộc vai trò → Trang chủ + "Trang này dành cho …" (thay thế lịch sử, nên nút Quay lại không kẹt). Địa chỉ lạ → Trang chủ, không báo |
| Chuyển màn | Hủy module cũ (gỡ listener), mount module mới, focus vào `h1`, đổi tiêu đề tab. Bấm lại mục đang mở không mount lại |
| Module lỗi | Module ném lỗi khi mount → khối "Không tải được màn hình" + Thử lại; các màn khác vẫn dùng được |
| Huy hiệu Duyệt | Số khoản **Chờ duyệt ở mọi tháng**; ẩn khi 0; `99+` khi > 99 |
| Trang chủ | Thẻ tổng quan tháng hiện tại (theo ngày đề nghị): Chờ duyệt, Đã duyệt, Từ chối. Quản lý thấy tất cả, Nhân viên chỉ của mình. Quản lý thấy thêm "còn N khoản ở tháng khác" |
| Banner | 1 banner/lần, ưu tiên: dữ liệu hỏng > bị chặn lưu trữ > nhắc lần đầu (chỉ ở Trang chủ và Chọn vai trò) |
| Đặt lại dữ liệu | Gõ **XÓA** (không phân biệt hoa/thường) mới bật nút; xóa danh bạ, đề nghị, phiên; **giữ** "Đã hiểu"; về Chọn vai trò |

## Quyết định cần biết
- **Khung chỉ truy vấn phần tử của chính nó** (`:scope >`). Test phát hiện lỗi thật: toast của khung từng bị ghi nhầm vào `data-role="toast"` của module Nhập liệu (trùng tên, nằm trước trong DOM) rồi biến mất cùng module.
- **Thành phần cố định của module con được đẩy lên trên thanh điều hướng đáy bằng CSS của khung** (`.app-main .dv-bulk { bottom: … }`, `.dn-actions`, các toast). Không sửa file của module con. Nếu module con đổi tên lớp CSS thì test điện thoại sẽ báo.
- **Mục đang mở**: nhãn `--text` đậm + biểu tượng `--primary` + vạch 3px, không phải chữ `--primary`, vì `--primary` trên `--primary-soft` chỉ đạt 3,9:1. Đã cập nhật DESIGN 13.2.
- **Giảm chuyển động**: chỉ rút ngắn chuyển tiếp của các phần tử thực sự có hiệu ứng (80ms), không đặt `transition: all`.
- Module Nhập liệu khi **Hủy** gọi `onCancel` → khung đưa về Trang chủ. Chế độ sửa (`#/nhap-lieu/sua/<id>`) đã nối sẵn nhưng chưa có màn danh sách để đi tới.
- Hộp thoại đặt lại chưa có liên kết "Xuất CSV trước khi xóa" (F-15 chưa làm).
- Quản lý không thể tự thêm đề nghị (đúng PRD): mục Thêm chỉ dành cho Nhân viên.
- Vai trò chỉ là lựa chọn giao diện, **không phải bảo mật** (PRD mục 8).

## Chạy test
```
./run-tests.sh
```
Cần Google Chrome (`CHROME_PATH=... ./run-tests.sh` để đổi). Không cần Node/npm. Chạy 4 lần: {sáng, tối} × {laptop 1280px, điện thoại}; ca layout tự bỏ qua khi không đúng cỡ. Mở `tests/test.html` để xem trực tiếp.

Nội dung test: định tuyến/bảo vệ trang/phiên/sức khỏe dữ liệu/số liệu Trang chủ (logic thuần); khung với module giả (khởi động, chọn vai trò, điều hướng, bảo vệ trang, lỗi module, menu đổi vai trò, huy hiệu, Trang chủ, banner, đặt lại dữ liệu, vòng đời, `hashNav`); **va chạm tên với module con**; bố cục/màu/font theo DESIGN 13 trên điện thoại và laptop; tương phản WCAG AA; trợ năng; và **tích hợp với 4 module thật** (nhập đề nghị → duyệt → thống kê → Trang chủ khớp số; thêm nhân viên → chọn được ở Chọn vai trò; nhân viên bị ngưng ở tab khác → khung đưa về Chọn vai trò).

Ghi chú: Chrome headless trên macOS bỏ qua `--force-prefers-color-scheme`, nên script dùng `--blink-settings=preferredColorScheme`. Cửa sổ "điện thoại" bị ép tối thiểu ~500px. Chrome headless luôn báo `prefers-reduced-motion: reduce` và không chạy đồng hồ chuyển tiếp/hoạt ảnh CSS, nên test đo vị trí/màu sau khi tắt hoạt ảnh/chuyển tiếp.
