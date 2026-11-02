# PRD – Ứng dụng Đề nghị Chi cho Doanh nghiệp

> Phiên bản: 1.1 · Ngày: 2026-11-02 · Liên kết thiết kế: [DESIGN.md](DESIGN.md) · Thay đổi v1.1: **trang Thống kê** (F-16…F-20, US-19…US-25); v1.2: **màn Nhân viên** (F-02 chi tiết hơn, F-21, F-22, US-26…US-30); v1.3: **khung ứng dụng và Trang chủ điều hướng** (F-01 chi tiết hơn, F-23, F-24, US-31…US-35), xem mục 10

---

## 1. Tổng quan ứng dụng

**Tên tạm:** Sổ Đề Nghị Chi

Sổ Đề Nghị Chi là web app responsive để nhân viên mua hàng ghi lại các khoản **đề nghị chi** cho doanh nghiệp, và để quản lý **kiểm tra, duyệt hoặc từ chối** từng khoản theo từng nhân viên. Trang chủ cho xem tổng quan theo tháng bằng thẻ số liệu và biểu đồ. Ứng dụng chạy trên trình duyệt (điện thoại và laptop), không cần cài đặt; dữ liệu lưu trên chính trình duyệt đó.

**Bối cảnh:** Đề nghị chi thường nằm rải rác trong tin nhắn, bảng tính cá nhân; quản lý khó biết ai đề nghị gì, tháng này đã duyệt bao nhiêu, còn bao nhiêu khoản chưa xử lý. App gom tất cả về một chỗ: nhân viên nhập nhanh, quản lý nhìn rõ và xử lý nhanh.

**Giả định đã chốt khi làm rõ yêu cầu**

| Hạng mục | Quyết định |
|---|---|
| Nền tảng | Web app responsive (điện thoại + laptop) |
| Quy trình duyệt | Có. Trạng thái: **Chờ duyệt → Đã duyệt / Từ chối**. Từ chối bắt buộc nhập lý do |
| Tài khoản & lưu trữ | Không đăng nhập thật, không backend. Chọn vai trò (Nhân viên / Quản lý) ở màn hình đầu; dữ liệu lưu trong trình duyệt |
| Nhân viên | Có danh bạ nhân viên (thêm/sửa/xóa). Khi nhập đề nghị, chọn người đề nghị từ danh sách |
| Thông tin mỗi khoản | Nhà cung cấp / nội dung mua, danh mục chi, số lượng, đơn giá, ghi chú, ngày, người đề nghị |
| Thành tiền | = Số lượng × Đơn giá, tự tính, không nhập tay *(giả định)* |
| Tiền tệ / ngôn ngữ | VND (₫), tiếng Việt *(giả định)* |
| Phạm vi dữ liệu biểu đồ | Biểu đồ và "Tổng chi" chỉ tính khoản **Đã duyệt**; khoản Chờ duyệt hiện ở thẻ riêng *(giả định)* |

---

## 2. Mục tiêu ứng dụng

**Mục tiêu sản phẩm**
1. Nhân viên tạo một đề nghị chi trong **dưới 20 giây**.
2. Quản lý trả lời được "Tháng này ai đề nghị chi bao nhiêu, chi vào đâu, còn khoản nào chưa duyệt?" chỉ bằng **một lần mở Trang chủ**.
3. Quản lý duyệt hoặc từ chối một khoản trong **tối đa 3 thao tác**.
4. Dữ liệu sai có thể sửa/xóa được (khi còn Chờ duyệt), và tổng quan luôn khớp với danh sách.

**Mục tiêu người dùng:** Nhân viên biết đề nghị của mình đang ở trạng thái nào; quản lý kiểm soát được chi tiêu theo từng người mà không phải hỏi lại.

**Mục tiêu kỹ thuật:** Gọn nhẹ, mở nhanh, dùng được khi mất mạng sau lần tải đầu, không phụ thuộc server.

---

## 3. Đối tượng người dùng và User Stories

### 3.1 Đối tượng

| Vai trò | Mô tả | Thiết bị | Nhu cầu chính |
|---|---|---|---|
| **Nhân viên mua hàng** (chính) | Người đi mua/đề xuất mua hàng hóa, dịch vụ cho doanh nghiệp | Chủ yếu điện thoại, nhập ngay khi báo giá/đi mua | Tạo đề nghị nhanh, xem trạng thái, sửa khi nhập nhầm |
| **Quản lý** | Người kiểm tra và quyết định các khoản chi | Laptop và điện thoại | Xem tổng quan, lọc theo nhân viên/trạng thái, duyệt/từ chối, quản lý danh sách nhân viên |

Cả hai đều không chuyên kế toán; cần giao diện đơn giản, ít bước.

### 3.2 User Stories

| ID | Là một… | Tôi muốn… | Để… | Ưu tiên |
|---|---|---|---|---|
| US-01 | người dùng | chọn vai trò Nhân viên hoặc Quản lý khi mở app | vào đúng chức năng của mình | Must |
| US-02 | quản lý | thêm, sửa, ngưng hoạt động nhân viên | có danh sách người được đề nghị chi | Must |
| US-03 | nhân viên | tạo đề nghị chi (nhà cung cấp/nội dung, danh mục, số lượng, đơn giá, ngày, ghi chú) | gửi đề nghị để quản lý duyệt | Must |
| US-04 | nhân viên | thấy thành tiền tự tính khi nhập số lượng và đơn giá | khỏi tính tay và tránh sai | Must |
| US-05 | nhân viên | xem danh sách đề nghị của mình kèm trạng thái | biết khoản nào đã được duyệt | Must |
| US-06 | quản lý | xem danh sách đề nghị của tất cả nhân viên | kiểm tra toàn bộ chi tiêu | Must |
| US-07 | quản lý | lọc danh sách theo nhân viên, trạng thái, danh mục | tìm nhanh khoản cần xem | Must |
| US-08 | quản lý | duyệt một đề nghị | xác nhận cho phép chi | Must |
| US-09 | quản lý | từ chối một đề nghị và ghi lý do | nhân viên hiểu vì sao bị từ chối | Must |
| US-10 | người dùng | xem biểu đồ tròn chi theo danh mục trong tháng | biết tiền chi nhiều nhất vào đâu | Must |
| US-11 | quản lý | xem biểu đồ cột tổng chi theo từng nhân viên | so sánh mức đề nghị chi giữa các nhân viên | Must |
| US-12 | nhân viên | sửa đề nghị của mình khi còn Chờ duyệt | chỉnh lại khi nhập nhầm | Must |
| US-13 | nhân viên | xóa đề nghị của mình khi còn Chờ duyệt (có xác nhận, có hoàn tác) | bỏ khoản ghi sai/trùng | Must |
| US-14 | người dùng | chuyển sang tháng trước/sau | xem lại lịch sử | Must |
| US-15 | quản lý | xem thẻ "Chờ duyệt" (số khoản, tổng tiền) | biết còn bao nhiêu việc phải xử lý | Must |
| US-16 | quản lý | xem bảng tổng hợp theo nhân viên (số khoản, tổng đã duyệt, đang chờ) | kiểm tra từng người | Should |
| US-17 | quản lý | xuất danh sách tháng ra CSV | lưu trữ hoặc gửi kế toán | Could |
| US-18 | người dùng | dùng mượt trên cả điện thoại và laptop | nhập/duyệt ở đâu cũng tiện | Must |
| US-19 | quản lý | xem tổng chi Đã duyệt từng tháng trong 6 hoặc 12 tháng gần nhất | so sánh chi tiêu giữa các tháng và thấy xu hướng | Must |
| US-20 | quản lý | thấy tổng chi tháng này tăng/giảm bao nhiêu (số tiền và %) so với tháng trước | biết chi tiêu có đang tăng không | Must |
| US-21 | quản lý | so sánh chi từng danh mục giữa tháng này và tháng trước | tìm ra nguyên nhân (lý do chi) làm chi tăng nhiều nhất | Must |
| US-22 | quản lý | xem tổng số đề nghị chi của từng nhân viên (trong tháng và từ trước đến nay) | biết ai đề nghị nhiều, ai đề nghị ít | Must |
| US-23 | quản lý | xem chỉ số khác: chi trung bình mỗi đề nghị, đề nghị lớn nhất, tỷ lệ duyệt, thời gian xử lý trung bình | đánh giá chất lượng đề nghị và tốc độ duyệt | Should |
| US-24 | người dùng | xem nội dung/nhà cung cấp chi nhiều nhất trong tháng | biết tiền chi nhiều nhất cho khoản mua cụ thể nào | Should |
| US-25 | nhân viên | xem thống kê chi của riêng mình (không thấy người khác) | tự theo dõi các đề nghị của mình | Should |
| US-26 | quản lý | xem tổng hợp danh bạ: tổng số nhân viên, đang hoạt động, đã ngưng | nắm quy mô đội ngũ đề nghị chi | Must |
| US-27 | quản lý | xem mỗi nhân viên đã đề nghị bao nhiêu khoản, bao nhiêu đang chờ, tổng đã duyệt | biết ai đang hoạt động nhiều | Must |
| US-28 | quản lý | sửa mã, họ tên của một nhân viên | chỉnh thông tin khi nhập sai hoặc đổi tên | Must |
| US-29 | quản lý | tìm kiếm (không cần gõ dấu), lọc Hoạt động/Ngưng và sắp xếp danh sách | tìm đúng người khi danh sách dài | Should |
| US-30 | quản lý | xóa nhân viên nhập nhầm (chưa có đề nghị nào), có xác nhận và hoàn tác | giữ danh bạ gọn | Should |
| US-31 | người dùng | mở app và vào thẳng đúng vai trò đã chọn lần trước, đổi vai trò khi cần | không phải chọn lại mỗi lần | Must |
| US-32 | người dùng | có thanh điều hướng chỉ gồm các mục dành cho vai trò của mình | không lạc vào màn hình không dùng được | Must |
| US-33 | người dùng | mở một địa chỉ (#/duyet, #/thong-ke…) hoặc bấm Quay lại của trình duyệt và vào đúng màn hình | dùng được liên kết, nút Quay lại, đánh dấu trang | Must |
| US-34 | quản lý | thấy ngay ở Trang chủ số khoản đang chờ duyệt và lối tắt tới Duyệt, Thống kê, Nhân viên | xử lý việc cần làm nhanh | Must |
| US-35 | người dùng | được báo khi dữ liệu không lưu được, bị hỏng, hoặc chỉ nằm trên trình duyệt này, và có cách đặt lại | hiểu giới hạn của app và không bị kẹt | Should |

---

## 4. Danh sách chức năng chính

| # | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| F-01 | Chọn vai trò | Màn hình đầu: chọn Nhân viên (kèm chọn "tôi là ai" từ nhân viên **đang hoạt động**) hoặc Quản lý; nút **Vào** chỉ bật khi đã chọn xong. Nhớ lựa chọn trên trình duyệt; có nút đổi vai trò ở thanh đầu trang. Nếu nhân viên đã chọn bị ngưng hoạt động/xóa thì quay về màn Chọn vai trò kèm thông báo | **Must** |
| F-02 | Quản lý nhân viên | Quản lý **thêm, sửa** nhân viên (mã, họ tên, trạng thái Hoạt động/Ngưng). Mã bắt buộc, duy nhất (không phân biệt hoa/thường), ≤ 20 ký tự, tự viết hoa; họ tên bắt buộc, ≤ 60 ký tự. Nhân viên đã có đề nghị **không xóa được**, chỉ "Ngưng hoạt động"; chưa có đề nghị nào thì xóa được (có xác nhận, có hoàn tác) | **Must** |
| F-03 | Thêm đề nghị chi | Form: người đề nghị, nhà cung cấp/nội dung mua, danh mục, số lượng, đơn giá, ngày (mặc định hôm nay), ghi chú (tùy chọn). Thành tiền tự tính. Lưu với trạng thái Chờ duyệt | **Must** |
| F-04 | Danh mục chi cố định | Văn phòng phẩm, Vật tư, Thiết bị, Vận chuyển, Tiếp khách, Dịch vụ, Khác | **Must** |
| F-05 | Danh sách đề nghị | Các khoản của tháng đang chọn, nhóm theo ngày, mới nhất trước; mỗi dòng: nội dung, người đề nghị, danh mục, thành tiền, huy hiệu trạng thái. Nhân viên chỉ thấy khoản của mình; quản lý thấy tất cả | **Must** |
| F-06 | Bộ lọc | Lọc theo trạng thái, danh mục; quản lý lọc thêm theo nhân viên | **Must** |
| F-07 | Duyệt / Từ chối | Quản lý mở chi tiết khoản Chờ duyệt → Duyệt, hoặc Từ chối (bắt buộc lý do). Ghi lại người duyệt (vai trò) và thời điểm | **Must** |
| F-07b | Trang Duyệt đề nghị | Trang riêng cho Quản lý: hàng đợi khoản Chờ duyệt (cũ nhất trước), lọc theo nhân viên/danh mục, duyệt/từ chối từng khoản, duyệt hàng loạt. Từ chối vẫn phải có lý do | **Must** |
| F-08 | Sửa đề nghị | Chỉ khi Chờ duyệt và là khoản của chính nhân viên đó (quản lý không sửa nội dung, chỉ duyệt/từ chối) | **Must** |
| F-09 | Xóa đề nghị | Chỉ khi Chờ duyệt, của chính mình. Có hộp xác nhận và hoàn tác trong vài giây | **Must** |
| F-10 | Thẻ tổng quan tháng | Tổng chi **Đã duyệt** (kèm chênh lệch số tiền và % so với tháng trước), **Chờ duyệt** (số khoản + tiền), **Từ chối** (số khoản) | **Must** |
| F-11 | Biểu đồ tròn theo danh mục | Cơ cấu chi Đã duyệt theo danh mục; có chú thích phần trăm và số tiền | **Must** |
| F-12 | Biểu đồ cột theo nhân viên | Tổng chi Đã duyệt của từng nhân viên trong tháng (hiện với Quản lý) | **Must** |
| F-13 | Chuyển tháng | Nút trước/sau, hiển thị "Tháng M/YYYY". Thẻ, biểu đồ và danh sách cùng đổi theo | **Must** |
| F-14 | Bảng tổng hợp theo nhân viên | Mỗi nhân viên: **tổng số đề nghị** (trong tháng và từ trước đến nay), số khoản + tiền Đã duyệt, Chờ duyệt, Từ chối, tỷ trọng trong tổng chi; sắp xếp được; hàng Tổng cộng; bấm một hàng để xem thống kê riêng người đó | **Must** |
| F-15 | Xuất CSV | Xuất các khoản của tháng đang chọn | **Could** |
| F-16 | So sánh chi theo tháng | Biểu đồ cột tổng chi Đã duyệt của 6 hoặc 12 tháng gần nhất (đến tháng đang chọn); chạm một cột để xem số tiền hoặc chuyển sang tháng đó | **Must** |
| F-17 | So sánh danh mục (lý do chi) | Bảng so sánh chi từng danh mục giữa tháng đang chọn và tháng trước: số tiền, chênh lệch, %; chỉ ra danh mục chi nhiều nhất và danh mục tăng/giảm nhiều nhất | **Must** |
| F-18 | Chỉ số thống kê khác | Chi trung bình mỗi đề nghị Đã duyệt, đề nghị lớn nhất, tỷ lệ duyệt (Đã duyệt ÷ đã xử lý), thời gian xử lý trung bình | **Should** |
| F-19 | Nội dung/nhà cung cấp chi nhiều nhất | Top 5 nội dung hoặc nhà cung cấp theo tổng chi Đã duyệt trong tháng | **Should** |
| F-20 | Điểm chính | Vài câu nhận xét tự động ở đầu trang (danh mục chi nhiều nhất, tăng/giảm so với tháng trước, nhân viên chi nhiều nhất, số khoản chờ duyệt) | **Should** |
| F-23 | Khung ứng dụng và điều hướng | Thanh đầu trang (tên app, vai trò hiện tại, đổi vai trò) và thanh điều hướng theo vai trò (Nhân viên: Trang chủ · Thống kê · Thêm; Quản lý: Trang chủ · Thống kê · Duyệt (kèm số khoản chờ) · Nhân viên). Mỗi màn có một địa chỉ riêng (`#/…`), hỗ trợ nút Quay lại; vào màn không thuộc vai trò thì về Trang chủ kèm thông báo; chưa chọn vai trò thì về màn Chọn vai trò | **Must** |
| F-24 | Trang chủ điều hướng và thông báo hệ thống | Trang chủ: lời chào, thẻ tổng quan tháng (Chờ duyệt, Đã duyệt, Từ chối) và lối tắt tới các màn theo vai trò. Banner: "dữ liệu chỉ lưu trên trình duyệt này" (đóng được), "dữ liệu sẽ mất khi đóng tab" (khi bị chặn lưu trữ), "không đọc được dữ liệu" kèm **Đặt lại dữ liệu** (gõ XÓA để xác nhận) | **Must** |
| F-21 | Tổng hợp danh bạ nhân viên | Dải tóm tắt (tổng / đang hoạt động / đã ngưng) và với mỗi nhân viên: số đề nghị, số khoản chờ duyệt, tổng Đã duyệt | **Must** |
| F-22 | Tìm kiếm, lọc, sắp xếp nhân viên | Ô tìm kiếm theo mã hoặc tên (bỏ dấu), lọc Tất cả/Hoạt động/Ngưng, sắp xếp theo tên, mã, số đề nghị, tổng Đã duyệt | **Should** |

**Quy tắc nghiệp vụ**
- Thành tiền = Số lượng × Đơn giá; làm tròn về đồng (VND không có số lẻ).
- Khoản Đã duyệt hoặc Từ chối bị **khóa**: không sửa, không xóa. *(giả định)*
- Khoản bị Từ chối luôn hiển thị lý do cho nhân viên. Nhân viên muốn đề nghị lại thì tạo khoản mới. *(giả định)*
- Tổng chi và biểu đồ chỉ cộng khoản Đã duyệt; danh sách hiển thị đủ cả ba trạng thái.
- **Quy tắc thống kê** *(giả định)*: tháng của một khoản tính theo **ngày đề nghị** (`ngay`), không phải ngày duyệt. "Lý do chi" được hiểu là **danh mục chi**. Tỷ lệ duyệt = Đã duyệt ÷ (Đã duyệt + Từ chối) của tháng; thời gian xử lý = từ lúc gửi đến lúc duyệt/từ chối. Chênh lệch so với tháng trước khi tháng trước bằng 0 hiển thị là "Mới" (không tính %). Danh mục dưới 3% gộp vào "Khác" trên biểu đồ tròn; các phần trăm được làm tròn sao cho tổng đúng 100%.
- **Quy tắc nhân viên** *(giả định)*: mã được chuẩn hóa (cắt khoảng trắng, viết hoa) và chỉ gồm chữ cái không dấu, số, dấu `.` `_` `-`; họ tên được gộp khoảng trắng thừa; cho phép trùng họ tên (mã mới là khóa duy nhất). Ngưng hoạt động không xóa dữ liệu: nhân viên không còn xuất hiện trong ô chọn người đề nghị mới nhưng các đề nghị cũ vẫn hiển thị tên. Có thể bật lại hoạt động bất kỳ lúc nào.
- **Phạm vi theo vai trò:** Quản lý thấy toàn bộ và có thể lọc theo từng nhân viên; Nhân viên chỉ thấy số liệu của chính mình (không có biểu đồ/bảng theo nhân viên).
- Màu của chênh lệch (tăng/giảm) **không** dùng màu trạng thái duyệt; chỉ dùng mũi tên và chữ, vì chi tăng không mặc định là xấu.

---

## 5. Non-Goals – Không làm ở phiên bản này

- Đăng nhập thật, mật khẩu, phân quyền theo tài khoản; backend và đồng bộ giữa các máy/người dùng.
- Đính kèm hóa đơn, báo giá, chứng từ.
- Phòng ban, mã dự án, trung tâm chi phí; ảnh đại diện, email, số điện thoại của nhân viên; nhập danh sách nhân viên từ file.
- Duyệt nhiều cấp, ủy quyền duyệt, hạn mức/ngân sách.
- Thanh toán, hoàn ứng, đối soát với kế toán.
- Thông báo (email, đẩy, chat) khi có khoản mới hoặc khi được duyệt.
- Đa tiền tệ, thuế VAT, nhiều ngôn ngữ.
- Nhập khoản từ file, báo cáo theo quý/năm, dự báo chi, xuất báo cáo thống kê ra PDF/Excel (chỉ so sánh 6 hoặc 12 tháng gần nhất).

---

## 6. Luồng sử dụng chính

**A. Nhân viên tạo đề nghị chi**
1. Mở app → chọn **Nhân viên** → chọn tên mình.
2. Ở Trang chủ, bấm **+ Thêm đề nghị**.
3. Nhập nhà cung cấp/nội dung mua, chọn danh mục, nhập số lượng và đơn giá (thấy Thành tiền tự tính), chọn ngày, ghi chú nếu cần.
4. Bấm **Gửi đề nghị** → quay về Trang chủ, khoản mới xuất hiện với huy hiệu **Chờ duyệt** và các thẻ cập nhật.

**B. Quản lý duyệt / từ chối**
1. Mở app → chọn **Quản lý**.
2. Trang chủ cho thấy thẻ **Chờ duyệt**; bấm vào để mở trang **Duyệt đề nghị** (cũng vào được từ thanh điều hướng, mục "Duyệt" có số khoản đang chờ).
3. Xem danh sách khoản chờ; mở một khoản để xem chi tiết nếu cần.
4. Bấm **Duyệt**, hoặc **Từ chối** → nhập lý do → xác nhận. Có thể tick nhiều khoản rồi **Duyệt các khoản đã chọn**.
5. Khoản đổi trạng thái; thẻ và biểu đồ cập nhật ngay.

**C. Quản lý thêm nhân viên**
1. Chọn Quản lý → mở màn **Nhân viên** → **+ Thêm nhân viên** → nhập mã, họ tên → Lưu.
2. Nhân viên mới xuất hiện trong danh sách chọn khi tạo đề nghị.

**D. Xem tổng quan tháng**
1. Ở Trang chủ, đọc các thẻ và biểu đồ của tháng hiện tại.
2. Dùng nút trước/sau để đổi tháng. Quản lý lọc theo nhân viên để xem riêng từng người.

**F. Thống kê và so sánh chi**
1. Mở trang **Thống kê** → đọc phần **Điểm chính** và các thẻ của tháng hiện tại.
2. Xem biểu đồ tròn để biết danh mục chi nhiều nhất; xem biểu đồ cột 6/12 tháng để so sánh các tháng; chạm một cột để chuyển sang tháng đó.
3. Xem bảng so sánh danh mục (tháng này so với tháng trước) để tìm danh mục làm chi tăng nhiều nhất.
4. Quản lý xem bảng tổng hợp theo nhân viên, bấm một hàng (hoặc dùng ô lọc) để xem toàn bộ thống kê riêng của người đó.

**E. Sửa / xóa đề nghị**
1. Nhân viên mở khoản của mình còn **Chờ duyệt** → **Sửa** → chỉnh → Lưu. Hoặc **Xóa** → xác nhận (có thể **Hoàn tác**).
2. Khoản đã khóa chỉ cho xem; nút Sửa/Xóa bị ẩn kèm giải thích.

---

## 7. Giao diện dự kiến

Chi tiết tại [DESIGN.md](DESIGN.md).

| Màn hình | Nội dung chính | Ai dùng |
|---|---|---|
| **Chọn vai trò** | Hai thẻ lớn Nhân viên / Quản lý; với Nhân viên có ô chọn tên | Tất cả |
| **Trang chủ** | Chọn tháng, thẻ Đã duyệt/Chờ duyệt/Từ chối, biểu đồ tròn theo danh mục, biểu đồ cột theo nhân viên (Quản lý), bộ lọc, danh sách đề nghị | Tất cả (nội dung theo vai trò) |
| **Thống kê** | Chọn tháng, lọc nhân viên (Quản lý), Điểm chính, thẻ Đã duyệt/Chờ duyệt/Từ chối kèm so sánh tháng trước, chỉ số khác, biểu đồ tròn theo danh mục, biểu đồ cột 6/12 tháng, bảng so sánh danh mục, biểu đồ và bảng tổng hợp theo nhân viên, top nội dung/nhà cung cấp | Tất cả (nội dung theo vai trò) |
| **Trang Nhập liệu** | Form thêm/sửa đề nghị với Thành tiền tự tính | Nhân viên |
| **Duyệt đề nghị** (trang riêng) | Hàng đợi các khoản Chờ duyệt của mọi nhân viên; duyệt/từ chối ngay trên từng dòng, duyệt hàng loạt | Quản lý |
| **Chi tiết & Duyệt** | Hộp thoại/bottom sheet xem chi tiết khoản, nút Duyệt/Từ chối, ô lý do | Quản lý (xem: cả hai) |
| **Nhân viên** | Danh sách và form thêm/sửa nhân viên | Quản lý |

---

## 8. Ràng buộc kỹ thuật

- **Loại ứng dụng:** web tĩnh HTML/CSS/JavaScript thuần, không framework, không thư viện ngoài; biểu đồ vẽ bằng SVG.
- **Lưu trữ:** `localStorage`, khóa có số phiên bản (vd. `dnc:v1:*`) để dễ nâng cấp. Dữ liệu chỉ nằm trên trình duyệt đang dùng, **không chia sẻ giữa các máy**; cần ghi rõ cho người dùng.
- **Mô hình dữ liệu:**
  - Nhân viên: `id` (cố định, do hệ thống cấp), `ma`, `hoTen`, `hoatDong`, `ngayTao`, `ngayCapNhat`. Đổi `ma` hoặc `hoTen` **không** làm mất liên kết với các đề nghị cũ vì đề nghị tham chiếu theo `id`.
  - Đề nghị: `id`, `nhanVienId`, `nhaCungCap`, `danhMuc`, `soLuong`, `donGia`, `ngay`, `ghiChu`, `trangThai` (`cho_duyet` | `da_duyet` | `tu_choi`), `lyDoTuChoi`, `ngayTao`, `ngayXuLy`.
  - Thành tiền **không lưu**, luôn tính từ `soLuong × donGia` để tránh lệch.
- **Kiểm tra dữ liệu:** nhà cung cấp/nội dung không rỗng (≤ 120 ký tự); số lượng > 0 (tối đa 3 chữ số thập phân); đơn giá ≥ 0 và ≤ 1.000.000.000; ngày hợp lệ; lý do từ chối không rỗng (≤ 300 ký tự). Chống chèn HTML khi hiển thị.
- **Hiển thị:** định dạng tiền `1.234.567 ₫`; ngày `dd/MM/yyyy`; múi giờ theo thiết bị.
- **Tương thích:** trình duyệt hiện đại (Chrome, Safari, Edge, Firefox bản mới); màn hình từ 360px; hỗ trợ bàn phím và trình đọc màn hình ở mức cơ bản.
- **Hiệu năng:** mở trong < 2 giây; mượt với ≥ 1.000 khoản.
- **Hạn chế đã biết:** vai trò chỉ là lựa chọn giao diện, **không phải bảo mật**: ai cũng có thể chọn Quản lý. Chấp nhận ở phiên bản này.
- **Kiểm thử:** mỗi module có test tự động cho phần tính toán (thành tiền, tổng theo tháng/nhân viên/danh mục), quy tắc trạng thái và validate.
- **Thứ tự xây module đề xuất:** (1) Dữ liệu & nhân viên, (2) Nhập liệu đề nghị, (3) Danh sách & lọc, (4) Duyệt/từ chối, (5) Tổng quan & biểu đồ.

---

## 9. Tiêu chí thành công (Success Metrics)

| Chỉ số | Mục tiêu | Cách đo |
|---|---|---|
| Thời gian tạo một đề nghị | < 20 giây (nhân viên đã quen) | Bấm giờ khi thử với người dùng thật |
| Số thao tác để duyệt/từ chối | ≤ 3 từ Trang chủ | Kiểm theo luồng B |
| Thời gian tìm "ai đề nghị bao nhiêu trong tháng" | ≤ 1 lần mở Trang chủ, không cần thao tác thêm | Quan sát |
| Độ chính xác tổng quan | 100% khớp: tổng thẻ = tổng biểu đồ = tổng các dòng Đã duyệt | Test tự động |
| Tìm nguyên nhân chi nhiều nhất | Danh mục chi nhiều nhất và danh mục tăng nhiều nhất hiện ngay ở Điểm chính, không cần thao tác | Quan sát |
| Độ chính xác thống kê | 100% khớp: tổng các tháng = tổng danh mục = tổng các nhân viên; phần trăm biểu đồ tròn cộng đúng 100% | Test tự động |
| So sánh theo nhân viên | Quản lý thấy tổng số đề nghị của từng nhân viên trong ≤ 1 lần mở trang | Quan sát |
| Lỗi nhập sai lọt qua | 0 khoản có số lượng ≤ 0, đơn giá < 0, ngày sai | Test validate |
| Khóa đúng khoản đã xử lý | 0 trường hợp sửa/xóa được khoản Đã duyệt/Từ chối | Test quy tắc trạng thái |
| Dùng trên điện thoại | Không cuộn ngang, nút bấm ≥ 44px, dùng được ở 360px | Kiểm thử thủ công |
| Mức hài lòng | ≥ 4/5 từ 5 người thử (nhân viên + quản lý) | Hỏi nhanh sau buổi thử |

---

## 10. Nhật ký thay đổi

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 2026-11-02 | Bản đầu tiên (kèm trang Duyệt đề nghị F-07b) |
| 1.1 | 2026-11-02 | Thêm trang **Thống kê** (module 3): mở rộng F-10, F-14 (lên Must); thêm F-16…F-20 và US-19…US-25; sửa Non-Goals (cho phép so sánh 6/12 tháng); thêm luồng F, quy tắc thống kê, 3 chỉ số thành công |
| 1.2 | 2026-11-02 | Thêm màn **Nhân viên** (module 4): mở rộng F-02 (quy tắc mã/tên, xóa chỉ khi chưa có đề nghị); thêm F-21, F-22 và US-26…US-30; bổ sung Non-Goals (email/SĐT, nhập từ file), quy tắc nhân viên và mô hình dữ liệu (`ngayTao`, `ngayCapNhat`) |
| 1.3 | 2026-11-02 | Thêm **khung ứng dụng và Trang chủ điều hướng** (module 5): mở rộng F-01; thêm F-23, F-24 và US-31…US-35. Trang chủ phiên bản này là bảng điều khiển điều hướng; **danh sách đề nghị theo ngày** (F-05, F-06, F-09) sẽ là module riêng |
