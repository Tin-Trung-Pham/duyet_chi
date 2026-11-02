# Sổ Đề Nghị Chi – Module 3: Thống kê

Phạm vi theo [PRD](../PRD.md) v1.1: **F-10** (thẻ tổng quan + so sánh tháng trước), **F-11** (biểu đồ tròn), **F-12** (cột theo nhân viên), **F-13** (chuyển tháng), **F-14** (tổng hợp theo nhân viên, nâng lên Must), **F-16** (so sánh chi theo tháng), **F-17** (so sánh danh mục = "lý do chi"), **F-18** (chỉ số khác), **F-19** (top nội dung/nhà cung cấp), **F-20** (điểm chính).
Giao diện theo [DESIGN](../DESIGN.md) v1.3, mục **11** (và 2–6, 8, 9, 10.5).
**Không** gồm: danh sách đề nghị theo ngày, Nhập liệu (module 1), Duyệt (module 2), quản lý nhân viên, xuất CSV. Module này **chỉ đọc**, không ghi gì vào dữ liệu.

## Chạy thử
Mở `index.html` bằng trình duyệt (không cần server). Bấm **Nạp dữ liệu mẫu (8 tháng)** để có 4 nhân viên và đủ 3 trạng thái, 7 danh mục. Đổi "Giả lập vai trò" sang một nhân viên để xem bản chỉ thấy số liệu của riêng mình. Đó chỉ là khung thử nghiệm, không thuộc module.

## Cấu trúc
| Tệp | Vai trò |
|---|---|
| `js/stats-model.js` | Logic thuần: làm sạch dữ liệu, tổng hợp theo tháng/danh mục/nhân viên/nhà cung cấp, so sánh, phần trăm cộng đúng 100, điểm chính, định dạng. Chạy được trong Node. |
| `js/stats-store.js` | Lớp **chỉ đọc**: `listDeNghi()`, `listNhanVien()`. Không có hàm ghi. |
| `js/stats-view.js` | Trang Thống kê: thẻ, biểu đồ SVG, bảng, lọc, sắp xếp, chú giải. API `DncStats.mount`. |
| `css/stats.css`, `css/tokens.css` | Style (tiền tố `dst-`) và token DESIGN. |
| `tests/`, `run-tests.sh` | Bộ test chạy trong Chrome headless. |

Module độc lập: các hàm tháng/định dạng được viết lại trong `stats-model.js` thay vì import từ module khác (module 1, 2 cũng tự có bản riêng). Khi có thư mục dùng chung nên gom lại.

## Hợp đồng với module khác
**Gắn vào trang:** `DncStats.mount(rootEl, { store, session, today?, month?, range?, onForbidden()? })` → `{ refresh(), getState(), destroy() }`.
- `session = { vaiTro:'quan_ly' }`: thấy tất cả, có ô lọc nhân viên, biểu đồ và bảng theo nhân viên.
- `session = { vaiTro:'nhan_vien', nhanVienId }`: chỉ thấy số liệu của người đó (bộ lọc bị khóa, không có phần theo nhân viên).
- Còn lại (null, thiếu `nhanVienId`, vai trò lạ): khối "Hãy chọn vai trò để xem thống kê" và gọi `onForbidden()`.

**Dữ liệu `localStorage` (chỉ đọc):** `dnc:v1:nhanVien`, `dnc:v1:deNghi` (cùng hợp đồng với module 1, 2). Tự làm mới khi `document` nhận `dnc:data-changed` từ bất kỳ module nào.

## Quy tắc tính (cũng ghi trong PRD §4)
| Hạng mục | Quy tắc |
|---|---|
| Tháng của một khoản | Theo **ngày đề nghị** (`ngay`), không theo ngày duyệt |
| Tổng chi, biểu đồ, so sánh | Chỉ cộng khoản **Đã duyệt**. Chờ duyệt và Từ chối chỉ hiện ở thẻ riêng |
| "Lý do chi" | Hiểu là **danh mục chi**; cộng thêm top nội dung/nhà cung cấp |
| So sánh với tháng trước | Chênh lệch tiền và % (1 chữ số thập phân). Tháng trước = 0 và tháng này > 0 → "Mới", không tính % |
| Biểu đồ tròn | Bỏ danh mục 0; danh mục **< 3%** gộp vào "Khác"; phần trăm nguyên cộng **đúng 100** (phương pháp phần dư lớn nhất) |
| Tỷ lệ duyệt | Đã duyệt ÷ (Đã duyệt + Từ chối) của tháng |
| Thời gian xử lý | Trung bình từ lúc gửi (`ngayTao`) đến lúc xử lý (`ngayXuLy`); bỏ qua khoản thiếu hoặc ngày xử lý trước ngày gửi |
| Đề nghị lớn nhất | Thành tiền cao nhất; hòa thì ngày sớm hơn, rồi id nhỏ hơn |
| Top nội dung | Gộp không phân biệt hoa/thường và khoảng trắng thừa; tên hiển thị là dạng xuất hiện nhiều nhất |
| Bảng theo nhân viên | Mọi nhân viên **đang hoạt động** + người đã ngưng nhưng có đề nghị trong tháng (kèm huy hiệu "Ngưng") |
| "Từ trước đến nay" | Số đề nghị mọi tháng của **từng người được liệt kê**; hàng Tổng cộng cộng các hàng đang hiện nên không gồm nhân viên đã ngưng không có đề nghị trong tháng |
| Khoản dữ liệu hỏng | Thiếu id/nhân viên, trạng thái lạ, ngày hoặc số lỗi, id trùng → bỏ qua và báo "Đã bỏ qua N khoản dữ liệu lỗi" |
| Màu chênh lệch | **Không** dùng màu trạng thái; chỉ mũi tên + chữ (DESIGN 11.3) |

## Quyết định cần biết
- **Biểu đồ vẽ bằng SVG, nhãn chữ bằng HTML.** Phần đồ họa (cung, cột) là SVG đúng PRD §8; nhãn là HTML để giữ cỡ chữ ≥ 12px thật trên điện thoại. Mỗi biểu đồ có bảng dữ liệu ẩn thị giác cho trình đọc màn hình.
- **12 tháng trên điện thoại** chỉ hiện nhãn tiền của tháng đang chọn; các tháng khác xem bằng chạm/focus (DESIGN 11.4).
- **Bấm một cột tháng** chuyển sang tháng đó. Không xem được tháng tương lai; không lùi quá 01/2000.
- **Bấm một hàng/thanh nhân viên** (Quản lý) = lọc cả trang theo người đó.
- **Hiệu ứng đếm số khi đổi tháng** (DESIGN 8) chưa làm; chỉ có hiệu ứng mờ chéo và vẽ biểu đồ (đã ghi ở DESIGN 11.5).
- Tooltip dùng `position: fixed`, tự kẹp trong màn hình.
- Nút điều hướng "Thống kê" trên thanh dưới/đầu trang thuộc module khung, chưa có ở đây.

## Chạy test
```
./run-tests.sh
```
Cần Google Chrome (`CHROME_PATH=... ./run-tests.sh` để đổi). Không cần Node/npm. Chạy 4 lần: {sáng, tối} × {laptop 1280px, điện thoại}; ca layout tự bỏ qua khi không đúng cỡ. Mở `tests/test.html` để xem trực tiếp.

Nội dung test:
- **Logic thuần:** định dạng, tháng, làm sạch dữ liệu, thống kê tháng, so sánh, phần trăm (300 mảng ngẫu nhiên), danh mục, tháng/series, so sánh danh mục, nhân viên, top nhà cung cấp, điểm chính. Đáp án của bộ dữ liệu chuẩn được **tính tay**.
- **Bất biến ngẫu nhiên (250 bộ dữ liệu):** tổng theo danh mục = tổng theo nhân viên = tổng chuỗi tháng = tổng nhà cung cấp = tổng khi lọc từng người; % biểu đồ tròn cộng 100.
- **Giao diện thật:** số liệu từng thẻ/biểu đồ/bảng, hình học biểu đồ tròn và cột, vai trò, chuyển tháng, 6/12 tháng, lọc, sắp xếp, tooltip, trạng thái rỗng và biên, lỗi dữ liệu, đồng bộ sự kiện, XSS, hiệu năng 3.000–5.000 khoản.
- **Theo DESIGN:** cỡ chữ, bo góc, viền KPI, màu biểu đồ, bố cục lưới 5:7 / 7:5 trên laptop, thẻ trên điện thoại, không cuộn ngang, không dùng màu trạng thái cho chênh lệch.
- **Trợ năng:** tương phản WCAG AA (chữ ≥ 4.5:1, đồ họa ≥ 3:1), nhãn, caption, `aria-sort`, focus.
- **Chỉ đọc:** test khẳng định module không bao giờ gọi `setItem`/`removeItem`.

Ghi chú: Chrome headless trên macOS bỏ qua `--force-prefers-color-scheme`, nên script dùng `--blink-settings=preferredColorScheme` (0 = tối, 1 = sáng). Cửa sổ "điện thoại" bị ép tối thiểu ~500px.
