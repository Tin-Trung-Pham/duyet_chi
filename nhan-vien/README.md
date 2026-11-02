# Sổ Đề Nghị Chi – Module 4: Nhân viên

Phạm vi theo [PRD](../PRD.md) v1.2: **F-02** (thêm, sửa, ngưng hoạt động, xóa có điều kiện), **F-21** (tổng hợp danh bạ), **F-22** (tìm kiếm, lọc, sắp xếp).
Giao diện theo [DESIGN](../DESIGN.md) v1.4: **4.5**, **10.3** và **mục 12** (cùng các mục 2–6, 8, 9).
**Không** gồm: nhập liệu (module 1), duyệt (module 2), thống kê (module 3), danh sách đề nghị. Chỉ **Quản lý** dùng màn này.

Đây là module **sở hữu** danh bạ nhân viên: ghi `dnc:v1:nhanVien`. Còn `dnc:v1:deNghi` chỉ được **đọc** (để đếm đề nghị, tổng Đã duyệt và để chặn xóa).

## Chạy thử
Mở `index.html` bằng trình duyệt (không cần server). Bấm **Nạp dữ liệu mẫu** để có 6 nhân viên (1 người đã ngưng) và vài đề nghị, nên một số người không xóa được. Đổi "Giả lập vai trò" sang Nhân viên để xem trang bị chặn. Đó chỉ là khung thử nghiệm.

## Cấu trúc
| Tệp | Vai trò |
|---|---|
| `js/emp-model.js` | Logic thuần: kiểm tra mã/họ tên, tìm kiếm không dấu, lọc, sắp xếp theo tên gọi, thống kê đề nghị theo nhân viên. Chạy được trong Node. |
| `js/emp-store.js` | Lớp lưu: `list`, `requestStats`, `add`, `update`, `remove`, `restore`. Chỉ Quản lý được ghi; mỗi thao tác ghi đúng một lần và chỉ vào khóa nhân viên. |
| `js/emp-view.js` | Màn Nhân viên: dải tóm tắt, tìm/lọc/sắp xếp, bảng (laptop) / thẻ (điện thoại), form Thêm/Sửa, xác nhận xóa, toast + Hoàn tác. API `DncEmployees.mount`. |
| `css/emp.css`, `css/tokens.css` | Style (tiền tố `de-`) và token DESIGN. |
| `tests/`, `run-tests.sh` | Bộ test chạy trong Chrome headless. |

## Hợp đồng với module khác
**Gắn vào trang:** `DncEmployees.mount(rootEl, { store, session, onChanged(action, id)?, onForbidden()? })` → `{ refresh(), getState(), destroy() }`. `session` phải là `{ vaiTro:'quan_ly' }`; còn lại hiện "Trang này dành cho Quản lý" và gọi `onForbidden()`.

**Dữ liệu `dnc:v1:nhanVien`** (mảng): `{ id, ma, hoTen, hoatDong, ngayTao, ngayCapNhat }`. Các module khác chỉ đọc `id`, `ma`, `hoTen`, `hoatDong`; `id` **không bao giờ đổi** nên đổi mã/tên không làm mất liên kết với đề nghị cũ. Module này giữ nguyên mọi trường lạ và mọi phần tử không thuộc về nó khi ghi lại.

**Sự kiện:** mỗi lần ghi thành công, `document` nhận `dnc:data-changed` với `detail = { source:'employees', action:'add'|'update'|'delete'|'restore', id }`. Màn này cũng tự làm mới khi nhận `dnc:data-changed` từ module khác.

**Mã lỗi của store:** `forbidden` · `invalid` (kèm `errors.ma`/`errors.hoTen`) · `notfound` · `hasRequests` (kèm `count`) · `conflict` · `blocked` · `full` · `corrupt`.

## Quy tắc đã cài
| Trường | Quy tắc |
|---|---|
| Mã | Bắt buộc; tự cắt khoảng trắng và **viết hoa**; ≤ 20 ký tự; chỉ gồm chữ cái không dấu, số, `.` `_` `-` và phải bắt đầu bằng chữ/số; **duy nhất không phân biệt hoa/thường** (kể cả với người đã ngưng). Lỗi trùng nêu tên người đang dùng |
| Họ và tên | Bắt buộc; gộp khoảng trắng thừa; ≤ 60 ký tự (emoji tính 1); cấm ký tự điều khiển; **cho phép trùng tên** |
| Hoạt động | Mặc định bật khi thêm. Tắt = ngưng: không còn trong ô chọn người đề nghị mới, đề nghị cũ giữ nguyên. Bật lại được bất kỳ lúc nào |
| Xóa | **Chỉ khi chưa có đề nghị nào** (mọi trạng thái, kể cả dữ liệu lỗi). Không kiểm tra được đề nghị (dữ liệu hỏng/bị chặn) thì **không** cho xóa. Có xác nhận và Hoàn tác 4 giây |
| Hoàn tác xóa | Chèn lại đúng vị trí cũ; thất bại (`conflict`) nếu id hoặc mã đã bị chiếm trong lúc đó |
| Sửa | Lưu chỉ bật khi hợp lệ **và** có thay đổi thật (khác khoảng trắng/chữ hoa không tính). Cập nhật `ngayCapNhat` |
| Tìm kiếm | Theo mã hoặc họ tên, không phân biệt hoa/thường và dấu (kể cả đ/Đ); nhiều từ = phải khớp tất cả |
| Sắp xếp | Mặc định **theo tên gọi** (từ cuối: An, Bình, Cường…), rồi họ tên đầy đủ, rồi mã; còn: mã, số đề nghị nhiều nhất, tổng Đã duyệt nhiều nhất |

## Quyết định cần biết
- **Mã đổi được** nhưng phải duy nhất; hoán đổi mã giữa hai người phải qua một mã tạm (không cho trùng tạm thời).
- **Ngưng hoạt động không cần xác nhận** (có thể bật lại ngay). Xóa thì cần xác nhận.
- **Không thêm email/SĐT/phòng ban** (PRD Non-Goals). "Chỉnh sửa thông tin nhân viên" gồm mã, họ tên và trạng thái.
- Dải tóm tắt luôn là tổng toàn bộ danh bạ, không đổi theo tìm kiếm hoặc bộ lọc.
- Màn này chặn khi **dữ liệu đề nghị bị hỏng** (không đếm được thì không an toàn để xóa) dù danh bạ đọc được.
- Huy hiệu Hoạt động/Ngưng cố ý **không** dùng màu trạng thái duyệt (xanh/cam/đỏ); phân biệt bằng viền/nền xám, biểu tượng và chữ.
- Công tắc "Hoạt động" khi tắt dùng viền `--text-muted` thay vì `--border` như bản nháp DESIGN, vì viền `--border` chỉ đạt ~1,3:1 (yêu cầu ≥ 3:1). Đã cập nhật DESIGN 12.3.
- Chưa làm: nhập danh sách từ file, xuất CSV nhân viên.

## Chạy test
```
./run-tests.sh
```
Cần Google Chrome (`CHROME_PATH=... ./run-tests.sh` để đổi). Không cần Node/npm. Chạy 4 lần: {sáng, tối} × {laptop 1280px, điện thoại}; ca layout tự bỏ qua khi không đúng cỡ. Mở `tests/test.html` để xem trực tiếp.

Nội dung test: kiểm tra mã/tên theo từng biên, tìm kiếm không dấu, thống kê đề nghị (kể cả dữ liệu lỗi), lọc/sắp xếp (200 bộ ngẫu nhiên: hoán vị, tập con, tổng khớp), lớp lưu (quyền, trùng mã, xóa có điều kiện, hoàn tác và xung đột, lỗi lưu trữ, **chỉ ghi khóa nhân viên**, 1.000 nhân viên), giao diện thật (danh sách, tìm/lọc/sắp xếp, thêm, sửa, ngưng, xóa + hoàn tác, hủy/xác nhận, xung đột đồng thời, đồng bộ sự kiện, XSS), bố cục/màu/font theo DESIGN trên điện thoại và laptop, tương phản WCAG AA, trợ năng.

Ghi chú: Chrome headless trên macOS bỏ qua `--force-prefers-color-scheme`, nên script dùng `--blink-settings=preferredColorScheme` (0 = tối, 1 = sáng). Cửa sổ "điện thoại" bị ép tối thiểu ~500px. Đồng hồ hoạt ảnh/chuyển tiếp CSS không chạy theo thời gian ảo của headless, nên test đo kích thước/màu sau khi tắt hoạt ảnh.
