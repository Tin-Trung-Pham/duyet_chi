# DESIGN – Ứng dụng Đề nghị Chi cho Doanh nghiệp

> Phiên bản: 1.5 · Ngày: 2026-11-02 · Liên kết yêu cầu: [PRD.md](PRD.md) · Thay đổi gần nhất: xem **mục 10** (v1.1–v1.2) và **mục 11** (trang Thống kê, v1.3), **mục 12** (màn Nhân viên, v1.4), **mục 13** (khung ứng dụng và Trang chủ điều hướng, v1.5)

---

## 1. Tổng quan

**Tên tạm:** Sổ Đề Nghị Chi

**Tinh thần thiết kế:** Gọn, rõ, đáng tin, như một phiếu đề nghị chi được số hóa. Con số và trạng thái là nhân vật chính; màu sắc chỉ dùng để truyền nghĩa (trạng thái duyệt, danh mục, cảnh báo).

**Nguyên tắc**
1. **Nhập nhanh trước tiên** – form ngắn, thành tiền tự tính ngay khi gõ.
2. **Trạng thái luôn thấy** – mỗi khoản đều có huy hiệu Chờ duyệt / Đã duyệt / Từ chối.
3. **Màu có ý nghĩa** – cam = chờ, xanh lá = đã duyệt, đỏ = từ chối; không dùng ba màu này cho việc khác.
4. **Không chỉ dựa vào màu** – huy hiệu trạng thái luôn có biểu tượng + chữ.
5. **Mobile-first** – thiết kế cho ngón cái trước, mở rộng lên laptop sau.
6. **Theo vai trò** – cùng một màn hình, Nhân viên và Quản lý thấy phần việc của mình, không rối.

**Bảy màn hình:** Chọn vai trò · Trang chủ (tổng quan + danh sách) · Trang Nhập liệu · Chi tiết & Duyệt · Nhân viên · Duyệt đề nghị (chỉ Quản lý, xem mục 10.8) · **Thống kê** (xem mục 11).

---

## 2. Màu sắc

Định nghĩa bằng biến CSS ở `:root`, ghi đè trong chế độ tối (`prefers-color-scheme: dark`). Hệ token cùng họ với app Sổ Thu Chi để đồng bộ.

### 2.1 Màu thương hiệu & trạng thái

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--primary` | `#2F6FED` | `#6C9BFF` | Nút chính, liên kết, mục đang chọn, focus |
| `--primary-contrast` | `#FFFFFF` | `#0B1220` | Chữ trên nền primary |
| `--status-pending` | `#8A5A00` | `#F2B84E` | Chữ/biểu tượng Chờ duyệt |
| `--status-pending-soft` | `#FFF1D6` | `#3A2C10` | Nền huy hiệu/thẻ Chờ duyệt |
| `--status-approved` | `#12805C` | `#3DD598` | Chữ/biểu tượng Đã duyệt |
| `--status-approved-soft` | `#E3F5EE` | `#12372C` | Nền huy hiệu/thẻ Đã duyệt |
| `--status-rejected` | `#B3261E` | `#F2766D` | Chữ/biểu tượng Từ chối |
| `--status-rejected-soft` | `#FCE8E6` | `#3F1B18` | Nền huy hiệu/thẻ Từ chối |
| `--danger` | `#B3261E` | `#F2766D` | Nút Xóa, lỗi validate |

### 2.2 Màu nền & chữ

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--bg` | `#F6F7F9` | `#0F1115` | Nền trang |
| `--surface` | `#FFFFFF` | `#181B21` | Thẻ, modal, thanh điều hướng |
| `--surface-2` | `#EEF0F4` | `#222630` | Ô nhập, chip chưa chọn, nền thanh biểu đồ |
| `--border` | `#DDE1E8` | `#2E3340` | Viền, đường kẻ |
| `--text` | `#14181F` | `#ECEFF4` | Chữ chính |
| `--text-muted` | `#5B6472` | `#A0A8B6` | Chữ phụ, nhãn, ghi chú |

Tỷ lệ tương phản chữ/nền ≥ 4.5:1 cho chữ thường, ≥ 3:1 cho chữ lớn và biểu tượng.

### 2.3 Màu biểu đồ (theo danh mục)

Bảy màu phân biệt được ở cả nền sáng và tối, token `--cat-1…7`. Mỗi phần luôn kèm nhãn chữ, không chỉ dựa vào màu.

| Danh mục | Sáng | Tối |
|---|---|---|
| Văn phòng phẩm | `#2F6FED` | `#6C9BFF` |
| Vật tư | `#E8743B` | `#FF9A66` |
| Thiết bị | `#7A4FD6` | `#B091F5` |
| Vận chuyển | `#0E8A9B` | `#4FD0E0` |
| Tiếp khách | `#C23B7A` | `#F27FB0` |
| Dịch vụ | `#6B8E23` | `#A9D15A` |
| Khác | `#6B7380` | `#9AA3B2` |

Biểu đồ cột theo nhân viên dùng một màu duy nhất `--primary`, vì mỗi cột đã có tên nhân viên.

---

## 3. Chữ viết

**Họ phông:** `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Không tải phông ngoài (nhanh, dùng được offline, hỗ trợ đủ dấu tiếng Việt).

| Vai trò | Cỡ / Dòng | Độ đậm | Dùng cho |
|---|---|---|---|
| Hiển thị số | 28 / 34 | 700 | Số tiền ở thẻ tổng quan |
| Tiêu đề trang | 22 / 28 | 700 | Tên màn hình |
| Tiêu đề mục | 17 / 24 | 600 | Tiêu đề thẻ, nhóm ngày |
| Nội dung | 15 / 22 | 400 | Văn bản chính, nội dung khoản chi |
| Nhãn | 13 / 18 | 500 | Nhãn form, chip, huy hiệu |
| Chú thích | 12 / 16 | 400 | Ghi chú phụ, chú thích biểu đồ |

- Dùng `font-variant-numeric: tabular-nums` cho mọi số tiền để cột số thẳng hàng; số tiền **căn phải**.
- Định dạng tiền `1.234.567 ₫`; ngày `dd/MM/yyyy`; ở nhóm ngày dùng "Hôm nay", "Hôm qua", còn lại "Thứ ba, 28/10".
- Nội dung dài: cắt một dòng với dấu `…` trong danh sách, hiển thị đầy đủ trong chi tiết.
- Cỡ chữ ô nhập ≥ 16px trên điện thoại (tránh trình duyệt tự phóng to).

---

## 4. Khoảng cách & Bố cục

**Thang khoảng cách (cơ sở 4px):** `4 · 8 · 12 · 16 · 24 · 32 · 48`.

**Điểm ngắt**

| Tên | Rộng | Bố cục |
|---|---|---|
| Điện thoại | < 640px | 1 cột, lề 16px, thanh điều hướng dưới |
| Máy tính bảng | 640–1023px | 1–2 cột, lề 24px |
| Laptop | ≥ 1024px | Khung tối đa 1120px, căn giữa, lề 32px, thanh điều hướng trên |

**Lưới:** 4 cột (điện thoại) / 8 cột (tablet) / 12 cột (laptop), khoảng cách 16px.

**Thanh điều hướng:** điện thoại ở đáy (Nhân viên: Trang chủ · Thống kê · Thêm; Quản lý: Trang chủ · Thống kê · Duyệt (kèm số khoản đang chờ) · Nhân viên); laptop ở trên cùng. Vùng chạm ≥ 44×44px.

### 4.1 Màn Chọn vai trò
- **Bố cục:** căn giữa dọc/ngang, tên app và một câu giới thiệu, hai thẻ lớn xếp dọc (điện thoại) hoặc ngang (laptop).
- **Thành phần:** thẻ **Nhân viên** (kèm ô chọn "Tôi là…"), thẻ **Quản lý**, dòng chú thích "Dữ liệu lưu trên trình duyệt này".
- **Điện thoại:** hai thẻ rộng 100%, cao ≥ 96px.

### 4.2 Trang chủ
- **Bố cục (điện thoại), từ trên xuống:** (1) thanh tiêu đề + chọn tháng ‹ Tháng 11/2026 ›; (2) hàng thẻ KPI cuộn ngang hoặc xếp 2 cột; (3) thẻ biểu đồ tròn; (4) thẻ biểu đồ cột theo nhân viên (chỉ Quản lý); (5) thanh lọc; (6) danh sách nhóm theo ngày; (7) nút nổi **+** (chỉ Nhân viên).
- **Bố cục (laptop):** hàng 1: 3 thẻ KPI cạnh nhau; hàng 2: biểu đồ tròn (5 cột) + biểu đồ cột (7 cột); hàng 3: bộ lọc và danh sách rộng đủ 12 cột dạng bảng.
- **Nhân viên:** không có biểu đồ cột theo nhân viên; biểu đồ tròn và KPI chỉ tính khoản của mình.
- **Quản lý:** thẻ **Chờ duyệt** nổi bật, bấm vào để mở trang **Duyệt đề nghị** (10.8).
- Phần phân tích chi tiết hơn (so sánh tháng, so sánh danh mục, tổng hợp theo nhân viên) nằm ở trang **Thống kê** (mục 11); thẻ và biểu đồ ở đây dùng cùng thành phần.

### 4.3 Trang Nhập liệu (thêm / sửa)
- **Bố cục:** một cột, rộng tối đa 560px, căn giữa trên laptop; tiêu đề "Thêm đề nghị chi" / "Sửa đề nghị".
- **Thứ tự trường:** Người đề nghị → Nhà cung cấp / nội dung mua → Danh mục → Số lượng + Đơn giá (cùng hàng) → **Thành tiền** (ô chỉ đọc, nổi bật) → Ngày → Ghi chú.
- **Hành động:** nút **Gửi đề nghị** (chính) và **Hủy**; trên điện thoại hai nút dính đáy màn hình.
- **Điện thoại:** Số lượng và Đơn giá chia 40/60 cùng hàng; bàn phím số (`inputmode="decimal"`).

### 4.4 Chi tiết & Duyệt
- **Bố cục:** bottom sheet trên điện thoại (cao tối đa 85% màn hình); hộp thoại giữa màn hình rộng 480px trên laptop.
- **Nội dung:** huy hiệu trạng thái, nội dung mua, người đề nghị, danh mục, số lượng × đơn giá, **Thành tiền**, ngày, ghi chú; nếu đã xử lý: người/thời điểm xử lý và lý do từ chối.
- **Hành động:** Quản lý + Chờ duyệt: **Duyệt** (xanh lá), **Từ chối** (viền đỏ, mở ô lý do). Nhân viên + Chờ duyệt (khoản của mình): **Sửa**, **Xóa**. Khoản đã khóa: chỉ có **Đóng**.

### 4.5 Màn Nhân viên (Quản lý)
- **Bố cục:** danh sách thẻ nhân viên (mã, họ tên, huy hiệu Hoạt động / Ngưng), nút **+ Thêm nhân viên**; bấm một dòng để sửa trong bottom sheet/hộp thoại.
- **Laptop:** bảng 3 cột (Mã, Họ tên, Trạng thái) + cột hành động; có thêm cột số khoản và tổng Đã duyệt (phục vụ F-14).
- **Điện thoại:** mỗi nhân viên là một thẻ; số khoản và tổng nằm ở dòng phụ.
- Chi tiết đầy đủ (dải tóm tắt, tìm kiếm, lọc, sắp xếp, các trạng thái) xem **mục 12**.

---

## 5. Hình khối & Chiều sâu

| Yếu tố | Giá trị |
|---|---|
| Bo góc | Nút/ô nhập `10px`; thẻ `14px`; bottom sheet `20px` phía trên; huy hiệu/chip `999px` |
| Viền | 1px `--border` cho thẻ và ô nhập (ưu tiên viền hơn bóng) |
| Đổ bóng | Thẻ: gần như không bóng (chỉ viền). Nút nổi +: `0 6px 16px rgba(0,0,0,.18)`. Modal/sheet: `0 12px 32px rgba(0,0,0,.22)` |
| Lớp phủ | `rgba(0,0,0,.45)` sáng, `rgba(0,0,0,.6)` tối |
| Cấp độ | Nền `--bg` → thẻ `--surface` → ô nhập `--surface-2` → sheet/modal (cao nhất) |
| Focus | Vòng 2px `--primary`, cách 2px, luôn thấy rõ khi dùng bàn phím |

Giữ phẳng, ít hiệu ứng; chiều sâu chỉ để tách lớp sheet/modal/nút nổi.

---

## 6. Thành phần giao diện

### 6.1 Nút
| Loại | Kiểu | Dùng cho |
|---|---|---|
| Chính | Nền `--primary`, chữ `--primary-contrast` | Gửi đề nghị, Lưu |
| Duyệt | Nền `--status-approved`, chữ trắng/đen theo token tương phản | Duyệt |
| Phụ | Nền `--surface-2`, chữ `--text` | Hủy, Đóng |
| Nguy hiểm | Viền + chữ `--danger` | Xóa, Từ chối |
| Nút nổi (+) | Tròn 56px, `--primary`, góc dưới phải | Thêm đề nghị (điện thoại, Nhân viên) |

Cao tối thiểu 44px; nút có đang xử lý hiển thị vòng quay và bị vô hiệu hóa.

### 6.2 Ô nhập
Nhãn phía trên (13px/500), ô cao 48px, nền `--surface-2`, viền `--border`; khi focus viền `--primary`; khi lỗi viền `--danger` + thông báo ngay bên dưới. Thành tiền là ô chỉ đọc: nền `--primary` nhạt, số lớn 22px/700, căn phải.

### 6.3 Chọn danh mục
Dạng chip một hàng cuộn ngang (điện thoại) hoặc lưới 4 cột (laptop); chip chọn: nền `--primary`, chữ tương phản; chưa chọn: `--surface-2`. Mỗi chip có biểu tượng danh mục.

### 6.4 Huy hiệu trạng thái
Viên thuốc cao 24px, nền `*-soft`, chữ + biểu tượng cùng màu trạng thái.

| Trạng thái | Biểu tượng | Nhãn |
|---|---|---|
| Chờ duyệt | Đồng hồ | Chờ duyệt |
| Đã duyệt | Dấu tick | Đã duyệt |
| Từ chối | Dấu × | Từ chối |

### 6.5 Thẻ KPI
Thẻ `--surface`, nhãn phía trên, số tiền 28px/700, dòng phụ (vd. "5 khoản"). Ba thẻ:
- **Đã duyệt** (viền trái 4px `--status-approved`): tổng tiền.
- **Chờ duyệt** (viền trái `--status-pending`): tổng tiền + số khoản; với Quản lý là thẻ bấm được để lọc.
- **Từ chối** (viền trái `--status-rejected`): số khoản.

### 6.6 Biểu đồ
- **Tròn/doughnut theo danh mục (SVG):** lỗ giữa hiển thị tổng Đã duyệt; chú thích bên cạnh (laptop) hoặc phía dưới (điện thoại) gồm chấm màu, tên danh mục, %, số tiền. Danh mục chiếm < 3% gộp vào "Khác".
- **Cột ngang theo nhân viên (SVG):** mỗi hàng: tên nhân viên, thanh `--primary` có độ dài theo tiền, số tiền ở cuối thanh; sắp xếp giảm dần; hiển thị tối đa 8 người, còn lại cuộn/“Xem tất cả”.
- Chạm/di chuột vào một phần hiện chú giải (tên + số tiền + %). Có nội dung thay thế dạng bảng cho trình đọc màn hình.

### 6.7 Danh sách đề nghị
- **Tiêu đề nhóm ngày:** "Hôm nay · 02/11" kèm tổng ngày (nhỏ, muted).
- **Dòng (điện thoại):** biểu tượng danh mục tròn 40px | nội dung (1 dòng) + dòng phụ "Tên NV · Danh mục" | cột phải: thành tiền (đậm) + huy hiệu trạng thái bên dưới.
- **Dòng (laptop):** bảng cột Ngày · Nội dung · Người đề nghị · Danh mục · SL × Đơn giá · Thành tiền · Trạng thái.
- Bấm dòng mở Chi tiết & Duyệt.

### 6.8 Thanh lọc
Chip trạng thái (Tất cả · Chờ duyệt · Đã duyệt · Từ chối) + menu chọn Danh mục; Quản lý có thêm menu chọn Nhân viên. Có nút "Xóa lọc" khi đang lọc.

### 6.9 Chọn tháng
Hàng gồm nút ‹ , nhãn "Tháng 11/2026" (bấm để về tháng hiện tại), nút ›. Nút › bị mờ khi đang ở tháng hiện tại.

### 6.10 Hộp thoại xác nhận & Toast
- **Xác nhận xóa:** tiêu đề "Xóa đề nghị này?", mô tả ngắn, nút **Xóa** (nguy hiểm) và **Hủy**.
- **Từ chối:** ô nhiều dòng "Lý do từ chối" (bắt buộc), bộ đếm ký tự.
- **Toast:** hiện dưới đáy 4 giây, có nút **Hoàn tác** sau khi xóa; `aria-live="polite"`.

---

## 7. Biểu tượng & Hình ảnh

- **Bộ biểu tượng:** SVG nội tuyến, nét 1.75px, bo tròn đầu nét, kích thước 20px (24px trong nút nổi và biểu tượng danh mục), dùng `currentColor`.
- **Biểu tượng cần có:** Trang chủ, Thêm (+), Nhân viên, Sửa, Xóa, Duyệt (tick), Từ chối (×), Chờ (đồng hồ), Lọc, Chuyển tháng (‹ ›), Xuất, Đổi vai trò.
- **Biểu tượng danh mục (7):** Văn phòng phẩm (bút/kẹp giấy), Vật tư (hộp), Thiết bị (màn hình), Vận chuyển (xe tải), Tiếp khách (ly cà phê), Dịch vụ (cờ lê/tia sáng), Khác (dấu ba chấm). Đặt trong vòng tròn nền `--cat-n` ở độ mờ 15%, biểu tượng màu `--cat-n`.
- **Ảnh minh họa:** chỉ dùng cho trạng thái rỗng (nét đơn giản một màu, ≤ 96px). Không dùng ảnh chụp, không ảnh nền.
- **Chữ cái đại diện:** nhân viên hiển thị vòng tròn 32px chứa chữ cái cuối của tên, màu nền chọn theo mã nhân viên từ `--cat-1…7`.
- **Favicon & logo:** biểu tượng tờ phiếu có dấu tick trên nền `--primary`.

---

## 8. Chuyển động

| Tình huống | Hiệu ứng | Thời lượng |
|---|---|---|
| Hover/nhấn nút, thẻ | Đổi nền nhẹ; nhấn: thu nhỏ `scale(.98)` | 120ms |
| Mở bottom sheet / modal | Trượt từ đáy (sheet) hoặc mờ dần + phóng nhẹ (modal); lớp phủ mờ dần | 220ms |
| Đóng sheet / modal | Ngược lại | 160ms |
| Đổi tháng | Nội dung mờ chéo; số tiền đếm nhẹ lên giá trị mới | 200ms |
| Vẽ biểu đồ | Cung tròn và thanh mọc từ 0 đến giá trị | 400ms |
| Đổi trạng thái khoản | Huy hiệu đổi màu mờ dần; dòng nháy nền `*-soft` một lần | 300ms |
| Thêm khoản mới | Dòng mới trượt xuống và nhấn nền nhẹ | 250ms |
| Xóa khoản | Dòng thu chiều cao và mờ dần; Toast hiện lên | 200ms |
| Toast | Trượt lên từ đáy, tự ẩn sau 4 giây | 200ms |

Đường cong: `cubic-bezier(.2, .8, .2, 1)`. Khi người dùng bật `prefers-reduced-motion: reduce`: tắt phóng/trượt/đếm số, chỉ giữ mờ dần rất ngắn (≤ 80ms) và vẽ biểu đồ ngay lập tức.

---

## 9. Trạng thái giao diện

### 9.1 Trạng thái chung
| Trạng thái | Cách hiển thị |
|---|---|
| Mặc định | Như mô tả ở mục 6 |
| Hover (laptop) | Dòng/thẻ đổi nền `--surface-2`; con trỏ `pointer` |
| Focus | Vòng focus 2px `--primary` |
| Đang nhấn | Thu nhỏ nhẹ, nền đậm hơn |
| Vô hiệu hóa | Độ mờ 45%, con trỏ `not-allowed`, kèm lý do khi hover/chạm giữ |
| Đang xử lý | Nút hiện vòng quay, giữ nguyên chiều rộng |
| Chế độ tối | Đổi toàn bộ token theo cột "Tối" ở mục 2 |

### 9.2 Theo màn hình / thành phần
| Tình huống | Hiển thị |
|---|---|
| **Chưa chọn vai trò** | Hiện màn Chọn vai trò; nút **Vào** vô hiệu cho đến khi chọn xong (Nhân viên phải chọn tên) |
| **Danh sách rỗng (tháng trống)** | Minh họa + "Tháng này chưa có đề nghị nào"; Nhân viên thấy nút **+ Thêm đề nghị** |
| **Lọc không có kết quả** | "Không có khoản nào khớp bộ lọc" + nút **Xóa lọc** |
| **Biểu đồ không có dữ liệu** | Vòng xám nhạt, giữa ghi "0 ₫"; chú thích "Chưa có khoản Đã duyệt trong tháng" |
| **Chỉ có Chờ duyệt** | Biểu đồ rỗng như trên; thẻ Chờ duyệt vẫn hiện số liệu |
| **Chưa có nhân viên** | Màn Nhân viên và ô chọn người đề nghị hiện "Chưa có nhân viên. Quản lý hãy thêm trước"; nút Gửi đề nghị bị vô hiệu |
| **Form: đang nhập** | Thành tiền cập nhật theo từng lần gõ; hiển thị "—" khi thiếu số lượng/đơn giá |
| **Form: lỗi** | Viền đỏ + thông báo dưới ô ("Số lượng phải lớn hơn 0"); cuộn tới ô lỗi đầu tiên; không gửi |
| **Form: có thay đổi chưa lưu** | Bấm Hủy/quay lại → hỏi "Bỏ các thay đổi?" |
| **Khoản đã khóa** | Ẩn Sửa/Xóa, hiện dòng "Khoản đã được xử lý nên không thể chỉnh sửa" |
| **Khoản bị từ chối** | Khối nền `--status-rejected-soft` ghi "Lý do: …" ở đầu chi tiết |
| **Từ chối khi chưa nhập lý do** | Nút **Xác nhận từ chối** vô hiệu; ô lý do báo lỗi khi rời ô |
| **Xóa thành công** | Toast "Đã xóa đề nghị" + **Hoàn tác** (4 giây) |
| **Duyệt/Từ chối thành công** | Toast "Đã duyệt…" / "Đã từ chối…"; thẻ KPI và biểu đồ cập nhật |
| **Xóa nhân viên đã có khoản** | Không cho xóa; hiện "Nhân viên đã có đề nghị. Hãy chọn Ngưng hoạt động" |
| **Nhân viên ngưng hoạt động** | Huy hiệu xám "Ngưng"; không xuất hiện trong ô chọn người đề nghị mới, nhưng các khoản cũ vẫn hiển thị tên |
| **Lưu trữ đầy / lỗi ghi** | Banner `--status-pending`: "Không lưu được dữ liệu. Hãy xóa bớt hoặc xuất CSV"; dữ liệu đang nhập được giữ lại |
| **Trình duyệt chặn lưu trữ** | Banner cảnh báo "Dữ liệu sẽ mất khi đóng tab" (chế độ ẩn danh) |
| **Mất kết nối** | Không ảnh hưởng (app chạy offline); không hiển thị lỗi mạng |
| **Dữ liệu hỏng/không đọc được** | Thông báo và đề nghị đặt lại dữ liệu, có xác nhận |

### 9.3 Trợ năng (accessibility)
- Mọi biểu tượng bấm được có `aria-label`; huy hiệu trạng thái có chữ, không phụ thuộc màu.
- Hộp thoại giữ focus bên trong, đóng bằng `Esc`, trả focus về nút đã mở.
- Thứ tự Tab theo thứ tự đọc; biểu đồ có bảng số liệu thay thế.

---

## 10. Bổ sung v1.1 – Các phần PRD chưa có giao diện

Phần này chỉ **bổ sung**; mục 1–9 giữ nguyên. Mọi màu, cỡ chữ, bo góc, khoảng cách dùng đúng token và thang ở mục 2–5. Mỗi phần có 4 ý: bố cục, thành phần, màu & chữ, hiển thị điện thoại.

### 10.1 Đối chiếu PRD ↔ DESIGN

| Phần PRD | Trước v1.1 | Bổ sung tại |
|---|---|---|
| F-01 Đổi vai trò / đổi người dùng sau khi vào app | Chưa có | 10.2 |
| F-02 Form thêm/sửa nhân viên, Ngưng hoạt động | Mới có danh sách | 10.3 |
| F-07 Bước từ chối kèm lý do | Mới nhắc ngắn | 10.4 |
| F-14 Bảng tổng hợp theo nhân viên | Mới nhắc 2 cột | 10.5 |
| F-15 Xuất CSV | Mới có biểu tượng | 10.6 |
| Mục 8 PRD: lưu trữ đầy, dữ liệu hỏng, dữ liệu chỉ nằm trên trình duyệt | Mới có dòng trong bảng 9.2 | 10.7 |

### 10.2 Thanh đầu trang & Đổi vai trò (F-01)

**(1) Bố cục tổng thể**
- Thanh đầu trang cố định phía trên mọi màn hình (trừ Chọn vai trò), cao 56px, nền `--surface`, viền dưới 1px `--border`.
- Trái → phải: logo + tên "Sổ Đề Nghị Chi" · (khoảng trống) · **chip vai trò/người dùng** · nút chế độ tối (nếu bật thủ công).
- Bấm chip mở **menu đổi vai trò** (popover trên laptop, bottom sheet trên điện thoại).

**(2) Thành phần**
- **Chip vai trò:** vòng tròn chữ cái 32px (xem mục 7) + tên rút gọn + mũi tên ▾. Quản lý: biểu tượng khiên thay chữ cái, nhãn "Quản lý".
- **Menu đổi vai trò:** tiêu đề "Bạn đang dùng với vai trò"; hai dòng chọn một (radio): **Nhân viên**, **Quản lý**; khi chọn Nhân viên hiện ô chọn "Tôi là…" (danh sách nhân viên đang hoạt động); nút **Áp dụng**; dòng nhắc nhỏ: "Chọn vai trò chỉ thay đổi giao diện, không phải đăng nhập."
- **Menu đóng/mở:** bấm ngoài, `Esc`, hoặc nút Đóng.

**(3) Màu & chữ**
- Chip: nền `--surface-2`, chữ `--text` 13px/500; focus vòng `--primary`. Dòng đang chọn: nền `--primary` ở độ mờ 12%, chữ `--primary`, có dấu tick.
- Tiêu đề menu 17px/600; dòng nhắc 12px `--text-muted`.

**(4) Điện thoại**
- Thanh đầu trang 52px; chip chỉ hiện chữ cái đại diện + ▾ (ẩn tên) khi rộng < 400px.
- Menu là bottom sheet bo góc trên 20px, nút **Áp dụng** rộng 100%, cao 48px.
- Đổi sang Nhân viên khác hoặc đổi vai trò: về Trang chủ và hiện toast "Đang dùng với vai trò …".

### 10.3 Form Thêm / Sửa nhân viên (F-02)

**(1) Bố cục tổng thể**
- Mở từ nút **+ Thêm nhân viên** hoặc bấm một dòng nhân viên ở màn Nhân viên (4.5).
- Laptop: hộp thoại giữa màn hình rộng 480px. Điện thoại: bottom sheet cao tối đa 85%.
- Thứ tự: tiêu đề ("Thêm nhân viên" / "Sửa nhân viên") → Mã nhân viên → Họ và tên → công tắc **Hoạt động** (chỉ khi sửa) → vùng thông tin phụ (chỉ khi sửa) → hàng nút.

**(2) Thành phần**
- **Mã nhân viên:** ô nhập chữ, bắt buộc, không trùng, ≤ 20 ký tự, tự viết hoa.
- **Họ và tên:** ô nhập chữ, bắt buộc, ≤ 60 ký tự.
- **Công tắc Hoạt động / Ngưng hoạt động:** khi tắt hiện dòng giải thích "Không còn xuất hiện khi tạo đề nghị mới; các khoản cũ vẫn giữ nguyên".
- **Vùng thông tin phụ (khi sửa):** "Đã có N đề nghị · Tổng Đã duyệt X ₫" (chỉ đọc).
- **Nút Xóa nhân viên:** chỉ hiện khi nhân viên **chưa có khoản nào**; nếu đã có khoản, thay bằng dòng "Nhân viên đã có đề nghị nên chỉ có thể Ngưng hoạt động".
- **Nút:** **Lưu** (chính), **Hủy** (phụ).

**(3) Màu & chữ**
- Dùng đúng kiểu ô nhập ở 6.2 (cao 48px, nền `--surface-2`, lỗi viền `--danger`).
- Công tắc bật: nền `--status-approved`; tắt: `--border`. Nhãn 15px/400.
- Nút Xóa nhân viên: kiểu Nguy hiểm (6.1). Dòng giải thích: 13px `--text-muted`.

**(4) Điện thoại**
- Hai nút dính đáy sheet, mỗi nút rộng 50%. Bàn phím mở không che nút (sheet cuộn). Mã nhân viên dùng `autocapitalize="characters"`.

### 10.4 Hộp thoại Từ chối kèm lý do (F-07)

**(1) Bố cục tổng thể**
- Là bước 2 của màn **Chi tiết & Duyệt** (4.4): bấm **Từ chối** → phần nút Duyệt/Từ chối được thay bằng khối nhập lý do ngay trong sheet/hộp thoại, không mở hộp thoại thứ hai.
- Thứ tự: tóm tắt khoản (1 dòng: người đề nghị · nội dung · thành tiền) → nhãn "Lý do từ chối" → ô nhiều dòng → bộ đếm ký tự → hàng nút.

**(2) Thành phần**
- **Dòng tóm tắt:** chỉ đọc, nền `--surface-2`, bo 10px.
- **Ô lý do:** nhiều dòng, tối thiểu 3 dòng, tự giãn tối đa 6 dòng; giới hạn 300 ký tự, bộ đếm "42/300".
- **Chip gợi ý nhanh (tùy chọn chạm để điền):** "Vượt ngân sách", "Chưa rõ nhu cầu", "Giá chưa hợp lý", "Cần thêm thông tin".
- **Nút:** **Xác nhận từ chối** (kiểu Nguy hiểm, vô hiệu khi lý do rỗng), **Quay lại** (phụ).

**(3) Màu & chữ**
- Tiêu đề khối dùng huy hiệu Từ chối (6.4) cạnh chữ "Từ chối đề nghị này"; nhãn 13px/500.
- Ô nhập theo 6.2; khi lỗi thông báo "Hãy nhập lý do từ chối" màu `--danger`.
- Chip gợi ý: nền `--surface-2`, chữ 13px; chip đã chạm: nền `--status-rejected-soft`, chữ `--status-rejected`.

**(4) Điện thoại**
- Ô lý do tự lấy focus; sheet nâng lên trên bàn phím. Chip gợi ý cuộn ngang một hàng. Nút **Xác nhận từ chối** rộng 100%, cao 48px, đặt trên nút Quay lại.
- Sau khi xác nhận: sheet đóng, dòng khoản đổi sang Từ chối (theo 8, "Đổi trạng thái khoản") và hiện toast "Đã từ chối đề nghị".

### 10.5 Bảng tổng hợp theo nhân viên (F-14)

**(1) Bố cục tổng thể**
- Chỉ hiện với **Quản lý**, trên Trang chủ, đặt ngay dưới biểu đồ cột theo nhân viên và trên bộ lọc/danh sách. Là thẻ `--surface` có tiêu đề "Tổng hợp theo nhân viên · Tháng M/YYYY".
- Laptop: bảng đầy đủ rộng 12 cột. Điện thoại: danh sách thẻ.

**(2) Thành phần**
- **Cột bảng:** Nhân viên (chữ cái đại diện + họ tên) · Số khoản · Đã duyệt (₫) · Chờ duyệt (₫) · Từ chối (số khoản) · hành động "Xem khoản" (›).
- **Hàng Tổng cộng** ở cuối, in đậm, ngăn cách bằng viền trên 1px.
- **Sắp xếp:** bấm tiêu đề cột Đã duyệt / Chờ duyệt để đổi chiều (mặc định: Đã duyệt giảm dần).
- **Hành động:** bấm một hàng → áp bộ lọc **Nhân viên = người đó** lên danh sách phía dưới và cuộn tới danh sách.
- **Nhân viên ngưng hoạt động:** chỉ hiện khi có khoản trong tháng, kèm huy hiệu xám "Ngưng".

**(3) Màu & chữ**
- Tiêu đề thẻ 17px/600; tiêu đề cột 13px/500 `--text-muted`; nội dung hàng 15px/400; số tiền `tabular-nums`, căn phải.
- Cột Đã duyệt: chữ `--status-approved`; cột Chờ duyệt: chữ `--status-pending`; cột Từ chối: `--status-rejected`. Luôn đi kèm tiêu đề cột bằng chữ nên không phụ thuộc màu.
- Hover hàng (laptop): nền `--surface-2`. Hàng Tổng cộng: nền `--surface-2`.

**(4) Điện thoại**
- Mỗi nhân viên là một thẻ: dòng 1 = chữ cái đại diện + họ tên + mũi tên ›; dòng 2 = ba ô nhỏ cạnh nhau **Đã duyệt / Chờ duyệt / Từ chối** (nhãn 12px phía trên, số 15px/600 phía dưới).
- Thẻ **Tổng cộng** đặt đầu danh sách. Không cuộn ngang.
- Với nhiều nhân viên: hiện 5 người đầu, nút "Xem tất cả" mở rộng tại chỗ.

### 10.6 Xuất CSV (F-15)

**(1) Bố cục tổng thể**
- Chỉ Quản lý thấy. Nút **Xuất CSV** (biểu tượng tải xuống) nằm ở **hàng tiêu đề của danh sách** (cạnh chữ "Đề nghị trong tháng"), bên phải; không chiếm chỗ trên thanh điều hướng.
- Bấm nút mở hộp thoại xác nhận nhỏ, rồi tải file.

**(2) Thành phần**
- **Nút Xuất CSV:** kiểu Phụ (6.1), biểu tượng Xuất + chữ; vô hiệu khi tháng không có khoản nào.
- **Hộp thoại xác nhận:** tiêu đề "Xuất danh sách Tháng M/YYYY?"; dòng mô tả "N khoản" (đếm theo **bộ lọc đang áp dụng**, nêu rõ nếu có lọc); hai lựa chọn radio "Chỉ các khoản đang hiển thị" / "Tất cả khoản của tháng"; nút **Tải về** (chính), **Hủy**.
- **Tên file gợi ý:** `de-nghi-chi-YYYY-MM.csv`.
- **Cột trong file:** Ngày · Mã NV · Họ tên · Nhà cung cấp/nội dung · Danh mục · Số lượng · Đơn giá · Thành tiền · Trạng thái · Lý do từ chối · Ngày xử lý.
- **Toast kết quả:** "Đã xuất N khoản".

**(3) Màu & chữ**
- Nút theo 6.1; hộp thoại theo 6.10 (tiêu đề 17px/600, mô tả 15px/400). Số khoản đậm 600.
- Dòng nhắc "Thành tiền là kết quả Số lượng × Đơn giá" dùng 12px `--text-muted`.

**(4) Điện thoại**
- Nút co thành nút chỉ có biểu tượng 44×44px, có `aria-label="Xuất CSV"`. Hộp thoại là bottom sheet; nút **Tải về** rộng 100%.
- Nếu trình duyệt không cho tải: toast lỗi "Không tải được file. Hãy thử trình duyệt khác".

### 10.7 Banner hệ thống & Đặt lại dữ liệu (ràng buộc lưu trữ, mục 8 PRD)

**(1) Bố cục tổng thể**
- **Banner:** thanh ngang rộng hết khung, đặt ngay dưới thanh đầu trang, đẩy nội dung xuống (không che). Mỗi lần chỉ hiện một banner, theo thứ tự ưu tiên: lỗi dữ liệu > lưu không được > cảnh báo ẩn danh > nhắc dữ liệu chỉ nằm trên máy.
- **Hộp thoại Đặt lại dữ liệu:** giữa màn hình (laptop) / bottom sheet (điện thoại).

**(2) Thành phần**
- **Banner nhắc lần đầu:** "Dữ liệu chỉ lưu trên trình duyệt này, không chia sẻ giữa các máy." + nút **Đã hiểu** (ẩn vĩnh viễn, nhớ lựa chọn). Hiện một lần, ở màn Chọn vai trò và Trang chủ lần đầu.
- **Banner cảnh báo ẩn danh / chặn lưu trữ:** "Dữ liệu sẽ mất khi đóng tab." Không đóng được cho tới khi lưu trữ hoạt động.
- **Banner lưu không được:** "Không lưu được dữ liệu. Hãy xuất CSV rồi xóa bớt." + nút **Xuất CSV** (nếu là Quản lý). Dữ liệu đang nhập giữ nguyên trong form.
- **Banner dữ liệu hỏng:** "Không đọc được dữ liệu đã lưu." + nút **Đặt lại dữ liệu**.
- **Hộp thoại Đặt lại dữ liệu:** tiêu đề "Xóa toàn bộ dữ liệu?"; mô tả "Toàn bộ nhân viên và đề nghị sẽ bị xóa, không hoàn tác được"; ô xác nhận gõ chữ **XÓA**; nút **Xóa toàn bộ** (Nguy hiểm, vô hiệu đến khi gõ đúng), **Hủy**. Nếu là Quản lý, có liên kết "Xuất CSV trước khi xóa".

**(3) Màu & chữ**
- Banner nhắc thông tin: nền `--surface-2`, chữ `--text`, biểu tượng thông tin `--primary`.
- Banner cảnh báo (ẩn danh, lưu không được): nền `--status-pending-soft`, chữ `--status-pending`, biểu tượng cảnh báo.
- Banner lỗi (dữ liệu hỏng): nền `--status-rejected-soft`, chữ `--status-rejected`.
- Chữ banner 13px/500; nút trong banner cao 36px (kiểu Phụ). Tương phản ≥ 4.5:1 theo 2.2.

**(4) Điện thoại**
- Banner xếp dọc: dòng chữ (tối đa 2 dòng, có thể mở rộng) rồi nút bên dưới, rộng 100%, lề 16px; chiều cao tối thiểu 44px cho vùng chạm.
- Hộp thoại Đặt lại dữ liệu là bottom sheet; ô gõ **XÓA** dùng bàn phím chữ; nút **Xóa toàn bộ** rộng 100%, nằm trên nút Hủy.
- Banner có `role="status"` (nhắc/cảnh báo) hoặc `role="alert"` (lỗi) cho trình đọc màn hình.

### 10.8 Trang Duyệt đề nghị (F-07b, chỉ Quản lý)

**(1) Bố cục tổng thể**
- Màn hình thứ sáu, vào từ thanh điều hướng (mục **Duyệt**, kèm số khoản đang chờ) hoặc bấm thẻ **Chờ duyệt** ở Trang chủ.
- Từ trên xuống: tiêu đề "Duyệt đề nghị" + chọn tháng (6.9) → dải tóm tắt "N khoản chờ · tổng X ₫" → thanh lọc (Nhân viên, Danh mục) → danh sách khoản **Chờ duyệt**, cũ nhất trước → thanh hành động hàng loạt (hiện khi có khoản được tick).
- Laptop: bảng rộng 12 cột. Điện thoại: danh sách thẻ.

**(2) Thành phần**
- **Dải tóm tắt:** thẻ nền `--status-pending-soft`, biểu tượng đồng hồ, số khoản và tổng tiền.
- **Mỗi dòng/thẻ:** ô tick · chữ cái đại diện + tên nhân viên · nhà cung cấp/nội dung · danh mục · SL × đơn giá · **thành tiền** · ngày đề nghị · nút **Duyệt** (xanh lá) và **Từ chối** (viền đỏ).
- **Bấm vào phần chữ của dòng:** mở Chi tiết & Duyệt (4.4) để xem đủ thông tin.
- **Từ chối:** mở khối nhập lý do như 10.4.
- **Thanh hành động hàng loạt:** "Đã chọn N khoản · X ₫", nút **Duyệt các khoản đã chọn**, nút **Bỏ chọn**; ô "Chọn tất cả" ở đầu danh sách. Từ chối không làm hàng loạt, vì mỗi khoản cần lý do riêng.
- **Xác nhận duyệt hàng loạt:** hộp thoại ngắn "Duyệt N khoản, tổng X ₫?" với **Duyệt** và **Hủy**.
- **Sau khi xử lý:** dòng thu gọn và biến mất khỏi hàng đợi; toast "Đã duyệt…" / "Đã từ chối…", có **Hoàn tác** trong 4 giây (chỉ hoàn tác ngay sau thao tác).

**(3) Màu & chữ**
- Nền thẻ `--surface`, viền `--border`; tên nhân viên 15px/600; nội dung 15px/400; thành tiền 17px/600, `tabular-nums`, căn phải.
- Nút Duyệt nền `--status-approved`; nút Từ chối kiểu Nguy hiểm (6.1). Huy hiệu Chờ duyệt theo 6.4.
- Khoản chờ **quá 3 ngày** có chấm và chữ "Chờ 3 ngày" màu `--status-pending` (có chữ, không chỉ dựa vào màu).

**(4) Điện thoại**
- Mỗi khoản là một thẻ: dòng 1 tên nhân viên + thành tiền; dòng 2 nội dung (1 dòng); dòng 3 danh mục · ngày; dòng cuối hai nút **Duyệt** / **Từ chối** chia 50/50, cao 44px.
- Ô tick ở góc trái thẻ (vùng chạm 44px). Thanh hành động hàng loạt dính đáy, nằm trên thanh điều hướng.
- Vuốt không dùng để duyệt, tránh bấm nhầm.

**Trạng thái**
| Tình huống | Hiển thị |
|---|---|
| Không còn khoản chờ | Minh họa dấu tick + "Đã xử lý hết đề nghị" |
| Lọc không có kết quả | "Không có khoản chờ khớp bộ lọc" + **Xóa lọc** |
| Nhân viên không phải Quản lý vào địa chỉ trang | Quay về Trang chủ, toast "Trang này dành cho Quản lý" |

---

## 11. Trang Thống kê (F-10, F-11, F-12, F-13, F-14, F-16…F-20)

Phần này **bổ sung**; mục 1–10 giữ nguyên. Dùng đúng token, thang khoảng cách và kiểu thẻ ở mục 2–6. Mục tiêu: trả lời nhanh "tháng này chi bao nhiêu, so với tháng trước thế nào, chi vào đâu nhiều nhất, ai đề nghị nhiều nhất".

### 11.1 Bố cục tổng thể
- **Từ trên xuống:** (1) tiêu đề "Thống kê" + chọn tháng (6.9); (2) hàng điều khiển: ô lọc **Nhân viên** (chỉ Quản lý) và nhóm nút chọn **6 tháng / 12 tháng**; (3) thẻ **Điểm chính**; (4) hàng **thẻ KPI** (Đã duyệt · Chờ duyệt · Từ chối); (5) hàng **chỉ số khác** (4 thẻ nhỏ); (6) thẻ **Cơ cấu chi theo danh mục** (biểu đồ tròn) và thẻ **So sánh chi theo tháng** (biểu đồ cột); (7) thẻ **So sánh danh mục với tháng trước**; (8) thẻ **Chi theo nhân viên** (biểu đồ cột ngang) và thẻ **Nội dung/nhà cung cấp chi nhiều nhất**; (9) thẻ **Tổng hợp theo nhân viên** (bảng).
- **Laptop (≥ 1024px):** khung tối đa 1120px; KPI 3 thẻ cạnh nhau; chỉ số khác 4 thẻ cạnh nhau; hàng (6) chia 5 cột + 7 cột; (8) chia 7 cột + 5 cột; các thẻ còn lại rộng 12 cột.
- **Điện thoại (< 640px):** một cột, lề 16px; KPI và chỉ số khác xếp 1 cột (KPI) và lưới 2×2 (chỉ số khác); mọi thẻ rộng 100%.
- **Nhân viên:** không có ô lọc nhân viên, thẻ (8) "Chi theo nhân viên" và (9) "Tổng hợp theo nhân viên"; mọi số liệu chỉ của chính mình. Thẻ "Top nội dung" vẫn có (rộng 12 cột).
- **Quản lý chọn một nhân viên:** biểu đồ/bảng theo nhân viên ẩn; mọi số liệu còn lại chỉ của người đó; có dòng nhắc "Đang xem: Họ tên · Xem tất cả".

### 11.2 Thành phần giao diện
- **Điểm chính (F-20):** thẻ `--surface` có tiêu đề "Điểm chính", 2–5 dòng gạch đầu dòng. Ví dụ: "Chi nhiều nhất: **Thiết bị** – 46% (4.850.000 ₫)"; "Tổng chi Đã duyệt **tăng 12,5%** so với Tháng 10/2026"; "Tăng nhiều nhất so với tháng trước: **Vận chuyển** (+1.250.000 ₫)"; "Nhân viên chi nhiều nhất: **Nguyễn Văn An** (1.700.000 ₫)"; "Còn **3 khoản** chờ duyệt, tổng 6.550.000 ₫".
- **Thẻ KPI (F-10, 6.5):** như 6.5; thẻ Đã duyệt có thêm dòng **chênh lệch** dưới số tiền: mũi tên ▲/▼/＝ + "+12,5% (+700.000 ₫) so với Tháng 10/2026", hoặc "Mới (tháng trước chưa có)".
- **Chỉ số khác (F-18):** 4 thẻ nhỏ, nhãn 13px + giá trị 22px/700: **Trung bình mỗi đề nghị** (Đã duyệt), **Đề nghị lớn nhất** (số tiền + dòng phụ "nội dung · người đề nghị"), **Tỷ lệ duyệt** (vd. 75%, dòng phụ "3 duyệt · 1 từ chối"), **Thời gian xử lý TB** (vd. "1,5 ngày").
- **Biểu đồ tròn theo danh mục (F-11, 6.6):** doughnut SVG; giữa lỗ ghi "Đã duyệt" + tổng tiền; chú thích gồm chấm màu `--cat-n`, tên, **%** (cộng đúng 100%), số tiền; phần < 3% gộp vào "Khác"; dòng "Danh mục chi nhiều nhất" ở đầu thẻ.
- **So sánh chi theo tháng (F-16):** biểu đồ cột dọc; mỗi cột một tháng (mới nhất bên phải); nhóm nút **6 tháng | 12 tháng** (`aria-pressed`); cột tháng đang chọn màu `--primary`, các tháng khác màu `--cat-7` (xám); nhãn số tiền rút gọn phía trên cột ("6,6 tr", "1,2 tỷ"); nhãn tháng phía dưới ("T11" hoặc "11/26"); dưới biểu đồ ghi chênh lệch tháng đang chọn so với tháng liền trước. Bấm/chạm một cột: chuyển sang tháng đó.
- **So sánh danh mục (F-17):** bảng, mỗi hàng một danh mục: chấm màu + tên · **Tháng trước** · **Tháng này** · **Chênh lệch** (mũi tên + số tiền + %) · hai thanh nhỏ (xám = tháng trước, màu danh mục = tháng này). Sắp xếp theo tháng này giảm dần. Hàng danh mục tăng nhiều nhất có nhãn chữ "Tăng nhiều nhất", hàng chi nhiều nhất có nhãn "Chi nhiều nhất". Hàng **Tổng cộng** ở cuối.
- **Chi theo nhân viên (F-12):** cột ngang; mỗi hàng: tên · thanh `--primary` · số tiền; giảm dần; tối đa 8 người, nút "Xem tất cả" mở rộng.
- **Top nội dung/nhà cung cấp (F-19):** danh sách đánh số 1–5: nội dung (cắt 1 dòng), thanh nhỏ, số tiền, "N lần".
- **Tổng hợp theo nhân viên (F-14, 10.5):** bảng với cột **Nhân viên · Đề nghị trong tháng · Đã duyệt (₫) · Chờ duyệt (₫) · Từ chối (số khoản) · Tỷ trọng · Từ trước đến nay**; hàng **Tổng cộng**; bấm tiêu đề cột số để đổi chiều sắp xếp (mặc định Đã duyệt giảm dần); bấm một hàng để lọc cả trang theo người đó.
- **Chú giải (tooltip):** chạm/di chuột/focus vào một phần biểu đồ hiện "tên · số tiền · %". Có bảng dữ liệu ẩn thị giác cho trình đọc màn hình ở mọi biểu đồ.

### 11.3 Màu sắc và chữ
- Số liệu lớn 28px/700 (KPI), 22px/700 (chỉ số khác), nhãn 13px/500, chú thích biểu đồ ≥ 12px, tất cả số `tabular-nums`, số tiền căn phải trong bảng.
- Biểu đồ tròn và chấm danh mục dùng `--cat-1…7` (2.3). Cột tháng: `--primary` (đang chọn) và `--cat-7` (khác). Thanh nhân viên: `--primary`. Rãnh thanh: `--surface-2`.
- **Chênh lệch tăng/giảm KHÔNG dùng `--status-*` hay `--danger`** (các màu này chỉ dành cho trạng thái duyệt/lỗi); dùng chữ `--text` kèm biểu tượng ▲ ▼ ＝ và từ "tăng/giảm" khi đọc bằng trình đọc màn hình.
- Thẻ KPI giữ viền trái trạng thái như 6.5. Tương phản chữ ≥ 4.5:1, biểu đồ/biểu tượng ≥ 3:1 so với nền thẻ.

### 11.4 Hiển thị trên điện thoại
- Biểu đồ tròn rộng tối đa 220px, căn giữa; chú giải xếp phía dưới thành danh sách một cột.
- Biểu đồ cột tháng: 6 tháng hiện đủ nhãn số tiền; **12 tháng chỉ hiện nhãn số tiền của tháng đang chọn** (các tháng khác xem bằng chạm); nhãn tháng dạng "T11".
- Bảng so sánh danh mục và bảng tổng hợp nhân viên chuyển thành **thẻ**: dòng 1 tên + chênh lệch/tổng; dòng 2 các ô nhỏ (tháng trước · tháng này, hoặc Đã duyệt · Chờ duyệt · Từ chối) với nhãn 12px phía trên; không cuộn ngang.
- Nhóm nút 6/12 tháng và các nút lọc cao ≥ 44px.

### 11.5 Chuyển động
- Vẽ biểu đồ: cung tròn và cột mọc từ 0 trong 400ms (8). Đổi tháng/lọc: nội dung mờ chéo 200ms. Khi `prefers-reduced-motion: reduce`: không hoạt ảnh.
- Hiệu ứng "đếm số" ở 8 **chưa làm** ở v1.3 (số hiện thẳng giá trị mới).

### 11.6 Trạng thái giao diện
| Tình huống | Hiển thị |
|---|---|
| Chưa chọn vai trò / vai trò Nhân viên không có mã nhân viên | Khối "Hãy chọn vai trò để xem thống kê" |
| Tháng chưa có khoản nào | Mọi thẻ hiện 0; Điểm chính: "Tháng này chưa có đề nghị nào"; biểu đồ tròn là vòng xám nhạt "0 ₫" |
| Chỉ có khoản Chờ duyệt | Biểu đồ tròn rỗng + "Chưa có khoản Đã duyệt trong tháng"; thẻ Chờ duyệt vẫn có số liệu |
| 6/12 tháng đều 0 | Biểu đồ cột hiện các cột rỗng và dòng "Chưa có khoản Đã duyệt trong giai đoạn này" |
| Tháng trước bằng 0, tháng này > 0 | Chênh lệch ghi "Mới (tháng trước chưa có)", không hiện % |
| Cả hai tháng bằng 0 | Chênh lệch ghi "Không đổi" |
| Chưa có nhân viên nào | Bảng/biểu đồ theo nhân viên hiện "Chưa có nhân viên" |
| Nhân viên đã ngưng hoạt động nhưng có khoản trong tháng | Vẫn hiện hàng, kèm huy hiệu xám "Ngưng" |
| Dữ liệu hỏng / bị chặn đọc | Khối lỗi + nút **Thử lại** (như 10.7) |
| Khoản có dữ liệu hỏng (ngày/số lỗi) | Bỏ qua khỏi thống kê, hiện dòng nhắc "Đã bỏ qua N khoản dữ liệu lỗi" |

---

## 12. Màn Nhân viên – bổ sung chi tiết (F-02, F-21, F-22)

Phần này **bổ sung** cho 4.5 và 10.3; mục 1–11 giữ nguyên. Dùng đúng token, thang khoảng cách, kiểu thẻ/bảng/hộp thoại ở mục 2–6 và 11. Chỉ **Quản lý** thấy màn này.

### 12.1 Bố cục tổng thể
- **Từ trên xuống:** (1) tiêu đề "Nhân viên" + nút **+ Thêm nhân viên** (kiểu Chính, cao ≥ 44px); (2) **dải tóm tắt** "N nhân viên · M đang hoạt động · K đã ngưng"; (3) hàng điều khiển: **ô tìm kiếm**, nhóm lọc **Tất cả · Hoạt động · Ngưng**, ô chọn **Sắp xếp**; (4) danh sách; (5) trạng thái rỗng khi cần.
- **Laptop (≥ 1024px):** khung tối đa 1120px; danh sách là **bảng** 7 cột: Nhân viên (chữ cái đại diện + họ tên) · Mã · Trạng thái · Số đề nghị · Chờ duyệt · Tổng Đã duyệt · cột hành động (nút **Sửa**). Hàng điều khiển nằm một dòng.
- **Điện thoại (< 640px):** danh sách là **thẻ**: dòng 1 chữ cái đại diện + họ tên + huy hiệu trạng thái; dòng 2 mã; dòng 3 ba ô nhỏ (Số đề nghị · Chờ duyệt · Tổng Đã duyệt) có nhãn 12px phía trên; nút **Sửa** rộng 100%, cao 44px. Nút **+ Thêm nhân viên** rộng 100%. Không cuộn ngang.

### 12.2 Thành phần giao diện
- **Dải tóm tắt (F-21):** thẻ `--surface` bo 14px; ba số 22px/700 kèm nhãn 13px. Không dùng màu trạng thái.
- **Ô tìm kiếm (F-22):** ô 44px, biểu tượng kính lúp, nút xóa nhanh (×) khi có chữ; tìm theo **mã hoặc họ tên, không phân biệt hoa/thường và dấu** ("binh" tìm được "Trần Thị Bình"); nhiều từ = phải khớp tất cả.
- **Lọc trạng thái:** nhóm nút 3 lựa chọn (`aria-pressed`), kiểu như nhóm 6/12 tháng ở 11.2; kèm số lượng trong ngoặc, ví dụ "Hoạt động (3)".
- **Sắp xếp:** ô chọn: *Tên A–Z (theo tên gọi)* · *Mã* · *Số đề nghị nhiều nhất* · *Tổng Đã duyệt nhiều nhất*.
- **Huy hiệu trạng thái:** viên thuốc cao 24px. **Hoạt động**: viền `--border`, chữ `--text`, biểu tượng dấu tick. **Ngưng**: nền `--surface-2`, chữ `--text-muted`, biểu tượng tạm dừng. Không dùng `--status-*` (các màu đó dành cho trạng thái duyệt).
- **Chữ cái đại diện:** vòng tròn 32px như mục 7 (màu theo `id`).
- **Form Thêm/Sửa:** đúng 10.3. Bổ sung: nút **Lưu** chỉ bật khi dữ liệu hợp lệ **và** (khi sửa) có thay đổi; lỗi hiện dưới từng ô khi rời ô hoặc bấm Lưu; Enter trong ô văn bản = Lưu.
- **Xóa nhân viên:** nút kiểu Nguy hiểm trong form sửa, chỉ khi nhân viên chưa có đề nghị nào. Bấm → hộp thoại "Xóa nhân viên này?" (tên + mã) với **Xóa** / **Hủy**; sau khi xóa hiện toast "Đã xóa … · Hoàn tác" 4 giây.
- **Toast:** "Đã thêm nhân viên", "Đã lưu thay đổi", "Đã xóa …" (kèm Hoàn tác), "Đã hoàn tác".

### 12.3 Màu sắc và chữ
- Tiêu đề 22px/700; số tóm tắt 22px/700; tên nhân viên 15px/600; mã và số liệu phụ 13–14px; nhãn cột 13px/500 `--text-muted`; số `tabular-nums`, căn phải trong bảng.
- Nền thẻ `--surface`, viền 1px `--border`, bo 14px; hàng khi hover (laptop) nền `--surface-2`; nút Sửa kiểu Phụ; nút Xóa kiểu Nguy hiểm. Công tắc Hoạt động bật: nền `--primary`, núm `--primary-contrast`; tắt: nền `--surface-2`, viền 2px và núm `--text-muted` (để viền đạt tương phản ≥ 3:1; không dùng màu trạng thái duyệt).
- Tương phản chữ ≥ 4.5:1, biểu tượng/viền điều khiển ≥ 3:1.

### 12.4 Trạng thái giao diện
| Tình huống | Hiển thị |
|---|---|
| Chưa có nhân viên nào | Khối rỗng "Chưa có nhân viên" + mô tả "Thêm nhân viên để họ có thể được chọn khi tạo đề nghị" + nút **+ Thêm nhân viên** |
| Tìm/lọc không có kết quả | "Không tìm thấy nhân viên khớp" + nút **Xóa tìm kiếm và lọc** |
| Mã trùng | Lỗi dưới ô Mã: "Mã này đã được dùng bởi {họ tên}" |
| Mã sai định dạng | "Mã chỉ gồm chữ cái không dấu, số và các dấu . _ -" |
| Họ tên rỗng / quá 60 ký tự | "Nhập họ và tên" / "Tối đa 60 ký tự (đang nhập N)" |
| Nhân viên đã có đề nghị | Không có nút Xóa; thay bằng dòng "Nhân viên đã có N đề nghị nên chỉ có thể Ngưng hoạt động" |
| Bật/tắt Hoạt động | Dòng giải thích dưới công tắc: tắt = "Không còn xuất hiện khi tạo đề nghị mới; các khoản cũ vẫn giữ nguyên" |
| Có thay đổi chưa lưu, bấm Hủy/Esc/nền | Hỏi "Bỏ các thay đổi?" |
| Bộ nhớ đầy / bị chặn | Banner trong form, dữ liệu đang nhập giữ nguyên, nút Lưu dùng lại được |
| Dữ liệu hỏng / bị chặn đọc | Khối lỗi + nút **Thử lại** |
| Nhân viên đã bị xóa/đổi ở nơi khác khi đang sửa | Banner "Không tìm thấy nhân viên này (có thể đã bị xóa)" hoặc lỗi trùng mã; không ghi đè |
| Vai trò không phải Quản lý | Khối "Trang này dành cho Quản lý" |

---

## 13. Khung ứng dụng và Trang chủ điều hướng (F-01, F-23, F-24)

Phần này **bổ sung** cho 4.1, 4.2, 10.2 và 10.7; mục 1–12 giữ nguyên. Dùng đúng token và thành phần ở mục 2–6.

### 13.1 Bố cục khung
- **Thanh đầu trang** cố định phía trên (cao 56px, điện thoại 52px, nền `--surface`, viền dưới 1px `--border`): trái → phải: logo + "Sổ Đề Nghị Chi" (bấm = về Trang chủ) · (laptop) **thanh điều hướng** · khoảng trống · **chip vai trò**. Ở màn Chọn vai trò chỉ có logo và tên.
- **Điện thoại (< 1024px):** thanh điều hướng nằm ở **đáy** (cố định, cao 64px, 3–4 mục đều nhau, mỗi mục = biểu tượng 24px + nhãn 12px, vùng chạm ≥ 44px). **Laptop (≥ 1024px):** các mục nằm ngang trong thanh đầu trang, mục đang mở có gạch chân 2px `--primary`.
- **Nội dung** (`main`) nằm dưới thanh đầu trang; trên điện thoại chừa chỗ phía dưới bằng chiều cao thanh điều hướng.
- **Banner hệ thống** nằm ngay dưới thanh đầu trang, đẩy nội dung xuống (không che).
- **Toast** nổi phía trên thanh điều hướng (điện thoại) hoặc góc dưới giữa (laptop). Hộp thoại/bottom sheet nằm **trên** thanh điều hướng.
- Các thành phần cố định của từng màn (thanh duyệt hàng loạt, nút Gửi/Hủy, toast) được đẩy lên **trên** thanh điều hướng đáy, không bị che.

### 13.2 Thanh điều hướng
| Vai trò | Mục (theo thứ tự) |
|---|---|
| Nhân viên | Trang chủ · Thống kê · Thêm |
| Quản lý | Trang chủ · Thống kê · Duyệt · Nhân viên |

- Mục đang mở: `aria-current="page"`, nhãn `--text` đậm, biểu tượng `--primary`, nền `--primary-soft` và vạch 3px `--primary` ở mép trên (điện thoại) hoặc gạch chân 2px `--primary` (laptop). Nhãn dùng `--text` thay vì `--primary` vì `--primary` trên `--primary-soft` chỉ đạt 3,9:1 (< 4,5:1 cho chữ 12px).
- Mục **Duyệt** có huy hiệu số khoản đang chờ (tất cả các tháng); ẩn khi bằng 0; có chữ ẩn "N khoản chờ duyệt" cho trình đọc màn hình.
- Mỗi mục là liên kết thật (`<a href="#/…">`), dùng được bàn phím, nút Quay lại và đánh dấu trang. Địa chỉ: `#/` Trang chủ · `#/thong-ke` · `#/nhap-lieu` · `#/duyet` · `#/nhan-vien` · `#/vai-tro`.
- Vào địa chỉ không thuộc vai trò → về Trang chủ + toast "Trang này dành cho …"; chưa chọn vai trò → về màn Chọn vai trò.

### 13.3 Màn Chọn vai trò (4.1) và đổi vai trò (10.2)
- **Bố cục:** căn giữa, rộng tối đa 560px: tên app 22px/700, một câu hướng dẫn, hai thẻ lớn **Nhân viên** / **Quản lý** (mỗi thẻ cao ≥ 96px, biểu tượng + tên 17px/600 + mô tả 13px; xếp dọc trên điện thoại, ngang trên laptop), dưới là ô chọn **"Tôi là…"** (chỉ hiện khi chọn Nhân viên), nút **Vào** (Chính, rộng 100% trên điện thoại) và dòng chú thích "Dữ liệu lưu trên trình duyệt này." (12px `--text-muted`).
- **Thẻ được chọn:** viền 2px `--primary`, nền `--primary-soft`, dấu tick; thẻ là radio thật (mũi tên chuyển, Space chọn).
- **Nút Vào** vô hiệu cho đến khi chọn xong (Nhân viên phải chọn tên). Chưa có nhân viên nào đang hoạt động: ô chọn bị khóa kèm "Chưa có nhân viên. Hãy vào với vai trò Quản lý để thêm trước."
- **Chip vai trò** (thanh đầu trang): vòng tròn chữ cái 32px (Quản lý: biểu tượng khiên) + tên rút gọn + ▾; ẩn tên khi rộng < 400px. Bấm mở **menu đổi vai trò** (popover trên laptop, bottom sheet trên điện thoại) với cùng hai lựa chọn + ô "Tôi là…" + **Áp dụng** + dòng nhắc "Chọn vai trò chỉ thay đổi giao diện, không phải đăng nhập." Áp dụng → về Trang chủ + toast "Đang dùng với vai trò …".

### 13.4 Trang chủ điều hướng
- **Từ trên xuống:** lời chào "Xin chào, {tên}" (Quản lý: "Xin chào, Quản lý") 22px/700 và dòng mô tả vai trò; hàng **thẻ tổng quan tháng** (cùng kiểu thẻ KPI 6.5): *Chờ duyệt* (số khoản + tiền), *Đã duyệt tháng này* (tiền + số khoản), *Từ chối tháng này* (số khoản); lưới **lối tắt** (thẻ bấm được: biểu tượng, tên, mô tả một dòng, mũi tên ›).
- **Lối tắt theo vai trò:** Quản lý: *Duyệt đề nghị* (kèm huy hiệu số khoản chờ, nổi bật bằng viền trái `--primary`), *Thống kê*, *Nhân viên*. Nhân viên: *Thêm đề nghị chi* (nổi bật), *Thống kê của tôi*.
- Nhân viên: mọi số liệu chỉ của chính mình. Laptop: thẻ tổng quan 3 cột, lối tắt 3 cột; điện thoại: một cột.
- Thẻ "Chờ duyệt" của Quản lý bấm được → màn Duyệt. Danh sách đề nghị theo ngày (6.7) **chưa có** ở phiên bản này.

### 13.5 Banner hệ thống và Đặt lại dữ liệu (10.7)
| Thứ tự ưu tiên | Banner | Khi nào | Đóng được |
|---|---|---|---|
| 1 | **Dữ liệu hỏng** (`--status-rejected-soft`, `role="alert"`) + nút **Đặt lại dữ liệu** | Danh bạ hoặc đề nghị không đọc được (JSON hỏng/không phải mảng) | Không |
| 2 | **Bị chặn lưu trữ** (`--status-pending-soft`) "Dữ liệu sẽ mất khi đóng tab." | Không ghi được vào bộ nhớ trình duyệt (chế độ ẩn danh/chặn) | Không |
| 3 | **Nhắc lần đầu** (`--surface-2`) "Dữ liệu chỉ lưu trên trình duyệt này, không chia sẻ giữa các máy." + **Đã hiểu** | Chưa bấm Đã hiểu; chỉ hiện ở Chọn vai trò và Trang chủ | Có, nhớ lựa chọn |
- Mỗi lần chỉ một banner. **Hộp thoại Đặt lại dữ liệu:** "Xóa toàn bộ dữ liệu?" + mô tả "Toàn bộ nhân viên và đề nghị sẽ bị xóa, không hoàn tác được", ô gõ **XÓA**, nút **Xóa toàn bộ** (Nguy hiểm, vô hiệu đến khi gõ đúng) và **Hủy**; xong → về màn Chọn vai trò. (Liên kết "Xuất CSV trước khi xóa" sẽ có khi làm F-15.)

### 13.6 Trạng thái và trợ năng
| Tình huống | Hiển thị |
|---|---|
| Chưa chọn vai trò | Màn Chọn vai trò, không có thanh điều hướng/chip |
| Nhân viên đã chọn bị ngưng/xóa | Về màn Chọn vai trò + toast "Nhân viên này không còn hoạt động. Hãy chọn lại vai trò." |
| Địa chỉ không tồn tại | Về Trang chủ |
| Màn hình con không tải được | Khối lỗi "Không tải được màn hình" + nút **Thử lại** (các màn khác vẫn dùng được) |
| Chuyển màn | Focus chuyển tới tiêu đề của màn mới; tiêu đề tab trình duyệt đổi theo "Tên màn · Sổ Đề Nghị Chi" |
- Có liên kết **Bỏ qua tới nội dung** (hiện khi focus). Thanh điều hướng là `<nav>` có nhãn; menu đổi vai trò là hộp thoại có bẫy focus, đóng bằng `Esc`/bấm ra ngoài.
