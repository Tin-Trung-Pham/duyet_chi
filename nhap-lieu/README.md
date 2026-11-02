# Sổ Đề Nghị Chi – Module 1: Nhập liệu chi

Phạm vi theo [PRD](../PRD.md): **F-03 Thêm đề nghị chi**, **F-04 Danh mục cố định**, **F-08 Sửa đề nghị** (form + quy tắc khóa), phần báo lỗi nhập liệu.
Giao diện theo [DESIGN](../DESIGN.md) mục 2–6, 8, 9 (đặc biệt 4.3). Không đụng tới các module khác (Nhân viên, Danh sách, Duyệt, Tổng quan).

## Chạy thử
Mở `index.html` bằng trình duyệt (không cần server). Đó chỉ là **khung thử nghiệm**: giả lập vai trò, nút "Nạp 3 nhân viên mẫu" (danh bạ thật thuộc module Nhân viên) và danh sách thô có nút "Sửa" để kiểm tra dữ liệu.

## Cấu trúc
| Tệp | Vai trò |
|---|---|
| `js/entry-model.js` | Logic thuần: danh mục, phân tích số lượng/đơn giá, thành tiền (BigInt, không sai số), định dạng, kiểm tra hợp lệ, phát hiện thay đổi chưa lưu. Chạy được trong Node. |
| `js/entry-store.js` | Lớp lưu tối thiểu trên `localStorage`: **đọc** danh bạ nhân viên, **thêm/sửa** đề nghị. Kiểm tra lại dữ liệu ở tầng lưu và quy tắc khóa/sở hữu. |
| `js/entry-view.js` | Form Thêm/Sửa: lỗi theo ô, mặt nạ đơn giá, thành tiền tự tính, hộp thoại xác nhận, toast, banner lỗi lưu. API `DncEntry.mount`. |
| `css/entry.css`, `css/tokens.css` | Style (tiền tố `dn-`) và token DESIGN mục 2. `tokens.css` dùng chung tên biến với các module khác. |
| `index.html` | Khung thử nghiệm (không thuộc module). |
| `tests/`, `run-tests.sh` | Bộ test chạy trong Chrome headless. |

## Hợp đồng với module khác
**Gắn vào trang:** `DncEntry.mount(rootEl, { store, session, mode:'add'|'edit', id, onSaved(item), onCancel() })` → `{ destroy(), getState(), submit() }`.
`session`: `null` (không giả lập) · `{vaiTro:'nhan_vien', nhanVienId}` (khóa người đề nghị, chỉ sửa khoản của mình) · `{vaiTro:'quan_ly'}` (form bị chặn, đúng PRD: quản lý chỉ duyệt/từ chối).

**Dữ liệu (`localStorage`):**
- `dnc:v1:nhanVien` – module Nhân viên sở hữu; module này chỉ đọc `{id, ma, hoTen, hoatDong}`.
- `dnc:v1:deNghi` – mảng đề nghị: `id, nhanVienId, nhaCungCap, danhMuc, soLuong, donGia, ngay, ghiChu, trangThai ('cho_duyet'|'da_duyet'|'tu_choi'), lyDoTuChoi, ngayTao, ngayXuLy` (+ `ngayCapNhat` sau khi sửa).
- **Thành tiền không lưu.** Luôn tính: `DncModel.thanhTienOf(item)`.

**Báo thay đổi:** mỗi lần ghi thành công, `document` nhận `dnc:data-changed` với `detail = { source:'entry', action:'add'|'update', id, item }`.

**Mã lỗi của store:** `invalid` (kèm `errors` theo trường) · `notfound` · `locked` · `forbidden` · `full` · `blocked` · `corrupt`.
Store có thể thay bằng module khác miễn giữ các hàm `listNhanVien({includeId})`, `get(id)`, `add(value,{actorId})`, `update(id,value,{actorId})`, trả đồng bộ hoặc Promise.

## Quy tắc đã cài
| Trường | Quy tắc |
|---|---|
| Người đề nghị | Bắt buộc, phải là nhân viên **đang hoạt động** (khi sửa, giữ được người cũ dù đã ngưng) |
| Nhà cung cấp / nội dung | Bắt buộc, ≤ 120 ký tự (emoji tính 1), gộp khoảng trắng thừa |
| Danh mục | Bắt buộc, 1 trong 7 |
| Số lượng | > 0, ≤ 1.000.000, tối đa 3 chữ số thập phân; chấp nhận `,` hoặc `.` làm dấu thập phân |
| Đơn giá | Số nguyên đồng, 0 ≤ giá ≤ 1.000.000.000; gõ tự thêm dấu chấm nghìn; dán `1.250.000đ` được làm sạch |
| Thành tiền | = Số lượng × Đơn giá, làm tròn nửa lên về đồng |
| Ngày | Có thật trong lịch, từ 01/01/2000 đến **hôm nay** |
| Ghi chú | Tùy chọn, ≤ 500 ký tự |
| Sửa/xóa | Chỉ khi **Chờ duyệt** và là khoản của chính mình; đã duyệt/từ chối bị khóa (kể cả bị khóa giữa lúc đang mở form) |

## Quyết định cần biết
- **Không cho nhập ngày tương lai.** PRD chỉ ghi "ngày hợp lệ"; chọn vậy vì Trang chủ có nút chuyển tháng bị mờ ở tháng hiện tại, khoản tương lai sẽ không bao giờ xem được. Muốn cho phép: bỏ nhánh `ngay > today` trong `validate()` và thuộc tính `max` của ô ngày.
- **Ghi chú tối đa 500 ký tự** và **đơn giá phải là số nguyên**: PRD không quy định chi tiết, tôi đặt giá trị này.
- **Mặt nạ đơn giá bỏ mọi ký tự không phải chữ số** khi gõ. Dán `1,5` sẽ thành `15` (thấy ngay trong ô và ở Thành tiền).
- Vai trò chỉ là lựa chọn giao diện, không phải bảo mật (đúng PRD mục 8).
- Quản lý bị chặn ở form này (PRD: nhân viên tạo, quản lý duyệt). Nếu muốn quản lý nhập hộ, đổi điều kiện ở `init()` trong `entry-view.js`.
- Nút **Hủy**: nếu host không truyền `onCancel`, form tự đặt lại; có `onCancel` thì host điều hướng.
- Chưa làm (thuộc module khác): xóa đề nghị + Hoàn tác (F-09), danh sách (F-05), duyệt (F-07).

## Chạy test
```
./run-tests.sh
```
Cần Google Chrome (đường dẫn khác: `CHROME_PATH=... ./run-tests.sh`). Không cần Node/npm. Script chạy 4 lần: {sáng, tối} × {laptop 1280px, điện thoại}; các ca layout tự bỏ qua khi không đúng cỡ cửa sổ. Mở `tests/test.html` bằng trình duyệt để xem kết quả trực tiếp.

Bộ test gồm: logic thuần (số, tiền, ngày, validate, biên), lớp lưu (thêm/sửa/khóa/sở hữu/lỗi lưu trữ/hiệu năng 1.000 khoản), giao diện thật (hiển thị, lỗi theo ô, gửi, chống bấm đôi, lỗi lưu không mất dữ liệu, hủy/xác nhận, vai trò, chế độ sửa, XSS, kích thước/bo góc/font theo DESIGN, tương phản WCAG, trợ năng).

Ghi chú: Chrome headless trên macOS bỏ qua `--force-prefers-color-scheme`, nên script dùng `--blink-settings=preferredColorScheme` (0 = tối, 1 = sáng); cửa sổ "điện thoại" bị Chrome ép tối thiểu ~500px nên kiểm layout di động ở 500px, không phải 360px.
