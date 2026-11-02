# Sổ Đề Nghị Chi – Module 2: Duyệt đề nghị

Phạm vi theo [PRD](../PRD.md): **F-07 Duyệt / Từ chối** và **F-07b Trang Duyệt đề nghị** (chỉ Quản lý).
Giao diện theo [DESIGN](../DESIGN.md) mục 2–6, 8, 9 và đặc biệt **4.4** (Chi tiết & Duyệt), **10.4** (Từ chối kèm lý do), **10.8** (Trang Duyệt đề nghị).
**Không** gồm: quản lý nhân viên (F-02), Trang chủ/biểu đồ, danh sách đầy đủ, nhập liệu (module 1). Không đụng vào module khác.

## Chạy thử
Mở `index.html` bằng trình duyệt (không cần server). Bấm **Nạp dữ liệu mẫu** để có 3 nhân viên và 6 khoản chờ duyệt. Đổi "Giả lập vai trò" sang Nhân viên để xem trang bị chặn. Đó chỉ là khung thử nghiệm, không thuộc module.

## Cấu trúc
| Tệp | Vai trò |
|---|---|
| `js/review-model.js` | Logic thuần: lọc/sắp xếp hàng đợi, tổng hợp, tháng, nhãn "Chờ N ngày", kiểm tra lý do từ chối, định dạng. Chạy được trong Node. |
| `js/review-store.js` | Lớp lưu: đọc danh bạ nhân viên (chỉ đọc), `approve`, `reject`, `approveMany`, `undo`. Ghi **một lần** mỗi thao tác. Chỉ chấp nhận `actor.vaiTro === 'quan_ly'`. |
| `js/review-view.js` | Trang Duyệt: bộ lọc, danh sách, chọn nhiều, hộp thoại chi tiết/từ chối/xác nhận, toast + Hoàn tác, banner lỗi. API `DncReview.mount`. |
| `css/review.css`, `css/tokens.css` | Style (tiền tố `dv-`) và token DESIGN. `tokens.css` giống module 1, thêm `--approve-contrast` cho chữ trên nút Duyệt. |
| `tests/`, `run-tests.sh` | Bộ test chạy trong Chrome headless. |

Module này **độc lập với module 1**: không import mã của nhau. Các hàm định dạng tiền/số lượng được viết lại nhỏ gọn trong `review-model.js`; khi có thư mục dùng chung có thể gộp lại.

## Hợp đồng với module khác
**Gắn vào trang:** `DncReview.mount(rootEl, { store, session, today?, month?, onChanged(action, ids)?, onForbidden()? })` → `{ refresh(), getState(), destroy() }`.
`session` phải là `{ vaiTro: 'quan_ly' }`; mọi giá trị khác (nhân viên, `null`) hiện khối "Trang này dành cho Quản lý" và gọi `onForbidden()` để host chuyển về Trang chủ (DESIGN 10.8).

**Dữ liệu `localStorage` (dùng chung với module 1):**
- `dnc:v1:nhanVien` – chỉ đọc.
- `dnc:v1:deNghi` – module này chỉ đổi các trường xử lý: `trangThai` (`cho_duyet` → `da_duyet` | `tu_choi`), `lyDoTuChoi`, `ngayXuLy` (ISO), `nguoiXuLy` (`'quan_ly'`). Hoàn tác đưa về `cho_duyet`, xóa `lyDoTuChoi`, `ngayXuLy`, `nguoiXuLy`.

**Sự kiện:** nghe `dnc:data-changed` từ module khác (nguồn khác `review`) để tự làm mới. Mỗi lần ghi thành công, `document` nhận `dnc:data-changed` với `detail = { source:'review', action:'approve'|'reject'|'approve_many'|'undo', ids }`.

**Mã lỗi của store:** `forbidden` · `invalid` (kèm `message`) · `notfound` · `processed` · `nothing` · `blocked` · `full` · `corrupt`.

## Quy tắc đã cài
- Hàng đợi = khoản **Chờ duyệt** có **ngày đề nghị** thuộc tháng đang chọn, **cũ nhất trước** (ngày, rồi giờ gửi). Không xem được tháng tương lai; không lùi quá 01/2000.
- **Từ chối bắt buộc có lý do** (≤ 300 ký tự, emoji tính 1). Nút xác nhận vô hiệu khi lý do rỗng/quá dài. 4 chip gợi ý chạm để điền.
- **Duyệt hàng loạt** có hộp thoại xác nhận nêu số khoản và tổng tiền; **từ chối không làm hàng loạt**. Ghi một lần: lỗi lưu thì **không khoản nào đổi**.
- **Không ghi đè thao tác khác:** nếu khoản đã được xử lý ở nơi khác (tab khác), thao tác bị từ chối (`processed`), giao diện làm mới và báo "không còn ở trạng thái chờ duyệt". Duyệt hàng loạt vẫn duyệt các khoản còn lại và báo số khoản bị bỏ qua.
- **Hoàn tác** (toast 4 giây): chỉ hoàn tác khoản chưa bị thay đổi kể từ lần xử lý đó. Chỉ giữ một lần hoàn tác gần nhất.
- Đổi tháng hoặc đổi bộ lọc **bỏ chọn** các khoản không còn hiển thị, nên "Duyệt các khoản đã chọn" không bao giờ duyệt khoản đang bị ẩn.
- Nhãn **"Chờ N ngày"** hiện từ **3 ngày** trở lên, tính theo ngày lịch kể từ ngày gửi (`ngayTao`). DESIGN ghi "quá 3 ngày … Chờ 3 ngày"; tôi hiểu là từ ngày thứ 3.
- Chống thao tác đồng thời: khi đang lưu, mọi nút khác bị khóa (con trỏ `progress`).
- Mọi nội dung người dùng (tên, nội dung mua, ghi chú, lý do) đều được thoát ký tự HTML.

## Quyết định cần biết
- Ngày dùng để chia tháng là **ngày đề nghị (`ngay`)**, không phải ngày gửi. Khoản của tháng khác không mất: dải tóm tắt ghi "Còn N khoản chờ ở tháng khác".
- Bộ lọc nhân viên chỉ liệt kê người có khoản chờ trong tháng đang xem.
- Trên laptop, **danh mục nằm dưới nội dung** (bảng 7 cột). Lúc đầu làm 8 cột nhưng cột nội dung bị co còn vài ký tự ở 1280px; có test hồi quy cho việc này.
- Trên điện thoại, ô "Chọn tất cả" nằm đầu danh sách; trên laptop nằm ở hàng tiêu đề cột.
- Thanh nút Duyệt hàng loạt dính đáy màn hình điện thoại; trên laptop là thanh nổi ở giữa, rộng ≤ 900px.
- Chưa có thanh điều hướng "Duyệt (n)" (thuộc module khung/Trang chủ). Có thể dùng `DncReviewModel.countPending(items)` để lấy số khoản chờ.

## Chạy test
```
./run-tests.sh
```
Cần Google Chrome (`CHROME_PATH=... ./run-tests.sh` để đổi). Không cần Node/npm. Chạy 4 lần: {sáng, tối} × {laptop 1280px, điện thoại}; ca layout tự bỏ qua khi không đúng cỡ. Mở `tests/test.html` để xem trực tiếp.

Nội dung test: logic thuần (tiền, tháng, nhãn chờ, lọc/sắp xếp, lý do), lớp lưu (quyền, xử lý trùng, nguyên tử, hoàn tác, lỗi lưu trữ, hiệu năng 1.000 khoản), giao diện thật (hàng đợi, lọc, duyệt, từ chối, chi tiết, chọn nhiều, hoàn tác, lỗi lưu, đồng bộ sự kiện, XSS, hủy giữa chừng), bố cục/màu/font theo DESIGN trên điện thoại và laptop, tương phản WCAG AA, trợ năng.

Ghi chú: Chrome headless trên macOS bỏ qua `--force-prefers-color-scheme`, nên script dùng `--blink-settings=preferredColorScheme` (0 = tối, 1 = sáng). Cửa sổ "điện thoại" bị ép tối thiểu ~500px. Đồng hồ hoạt ảnh CSS không chạy theo thời gian ảo của headless, nên test đo vị trí hộp thoại sau khi tắt hoạt ảnh.
