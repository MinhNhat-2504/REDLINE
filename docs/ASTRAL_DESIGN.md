# REDLINE Astral — mô tả thiết kế

## Ý tưởng

Thiết kế gợi không gian giả tưởng khoa học: nền xanh đêm, chữ trắng ngà, điểm nhấn vàng champagne, quỹ đạo và tinh thể có chiều sâu. Tham chiếu cách dẫn chuyện và trình bày thế giới của [HoYoverse](https://www.hoyoverse.com/en-us/) và [Honkai: Star Rail](https://hsr.hoyoverse.com/). Đây là thiết kế riêng cho REDLINE, không sử dụng logo, nhân vật hay template độc quyền của HoYoverse. Hình nền dùng lại các tài sản REDLINE sẵn có trong repository.

## Cấu trúc trải nghiệm

- Hero: tiêu đề lớn, CTA Launch the protocol đưa đến Guardrails; Try Policy Lab cuộn đến công cụ mô phỏng.
- Sentinel Core: lõi tinh thể và ba vòng quỹ đạo; thay đổi góc nhìn theo con trỏ.
- Three worlds: chuyển giữa Citadel/Guardrails, Vault/Treasury và Observatory/Audit. Nút Enter this world mở đúng trang chức năng.
- Policy Lab: công cụ tương tác kết nối API thực, phân biệt rõ kết quả mô phỏng với dữ liệu on-chain.
- Các chương protocol hiện có tiếp tục cung cấp pipeline 7 gate, feed, grant và console. Thanh điều hướng chương chỉ hiện khi người dùng đến phần nội dung này.
- Navigation: trên desktop giữ đầy đủ các trang; trên mobile có menu Explore, đóng sau khi chọn trang hoặc nhấn Escape.

## Màu sắc

| Vai trò | Mã màu |
| --- | --- |
| Nền | `#080d19` |
| Panel | `#121c30` |
| Panel phụ | `#17243a` |
| Viền | `#2d3b53` |
| Chữ chính | `#f2eee5` |
| Chữ phụ | `#c4cddd` |
| Chữ mờ | `#9fadc3` |
| Điểm nhấn | `#dfc38c` |
| Thông tin | `#8dcced` |
| Cho phép | `#85dbc0` |
| Từ chối | `#ff93a4` |

Token TypeScript nằm trong `src/app/theme.ts`; semantic variables và style nằm trong `src/styles/astral.css`. Khi đổi màu, cập nhật cả hai. `astral.css` được import sau CSS hiện có để duy trì bố cục các trang nghiệp vụ. Inter dùng cho giao diện, Georgia italic cho điểm nhấn tiêu đề, JetBrains Mono cho số và metadata.

## 3D và khả năng tiếp cận

`CelestialCore.tsx` sử dụng CSS perspective, preserve-3d, các mặt tinh thể và nhiều lớp quỹ đạo. Không thêm thư viện WebGL hoặc tải model 3D. Thành phần chỉ trang trí, có `aria-hidden`; người dùng không cần tương tác với 3D để sử dụng sản phẩm.

Trên màn hình nhỏ, lõi chuyển xuống dưới nội dung; form Policy Lab chuyển thành một cột. Với `prefers-reduced-motion`, chuyển động CSS được giảm và parallax ngừng phản ứng. Button/input có focus rõ; trạng thái gate luôn có chữ passed/blocked/skipped bên cạnh màu; kết quả và lỗi dùng live region/alert. Navigation bị ẩn cũng được đặt inert để không nhận focus ngoài ý muốn.

## Bố cục và chuyển cảnh theo viewport

`src/styles/layout.css` là nơi quản lý kích thước, breakpoint và khoảng cách, được import sau phần màu sắc Astral. Header nằm trong luồng bố cục, main là vùng cuộn duy nhất trong khung `100dvh`; không dùng một margin cứng để đoán chiều cao header.

Các trang nghiệp vụ giới hạn chiều rộng 1.600px; chiều cao banner thích ứng theo chiều cao cửa sổ (150–240px). Cột dữ liệu dùng `minmax(0, …)` và chuyển về một cột ở 1.180px, đồng thời reset vị trí hàng/cột để không sinh cột ẩn. Trên điện thoại, thanh hành trình hiển thị tên trang và nút trước/sau; menu Explore thay cho hàng navigation dài. Hero tự điều chỉnh chữ và kích thước lõi 3D theo cả chiều rộng lẫn chiều cao.

`PageTransition` hiển thị trang được chọn ngay, với fade/slide ngắn 280ms theo hướng điều hướng. Ảnh banner và nội dung nằm chung một khung chuyển động; không chờ trang cũ kết thúc và không giữ hàng đợi trang cũ khi bấm liên tục. Trang Protocol chỉ fade để các thanh điều hướng fixed không bị đổi hệ tọa độ. Bộ chọn Three worlds crossfade ảnh 400ms, giữ nguyên chiều cao nội dung. Tất cả chuyển động tôn trọng thiết lập giảm chuyển động của hệ điều hành.

Mỗi trang có một màu định danh riêng trên banner, focus, card hover và vệt chuyển trang. Sound control trong header mặc định tắt và lưu lựa chọn của người dùng; khi bật, Web Audio tạo các tín hiệu ngắn cho chuyển trang, thành công, cảnh báo và lỗi. Không tải file âm thanh, không autoplay và lỗi audio không được phép làm gián đoạn thao tác tài chính.

Các thao tác chuyển tiền trên Guardrails dùng preflight trước khi gửi. Frontend chỉ chấp nhận địa chỉ giải mã đúng 32 byte, BE lặp lại kiểm tra địa chỉ và giới hạn số tiền trong `1..u64::MAX`. Nút gửi an toàn dùng nonce từ preview; endpoint thực thi vẫn đọc lại policy live và không có cờ bỏ qua kết quả từ chối. Policy Lab là nơi thử các trường hợp vượt hạn mức, replay và sai allowlist mà không tạo transaction lỗi.

## Phạm vi

Thiết kế giữ các luồng ví, ký grant, marketplace, treasury và audit. Tài liệu API và chế độ preview không database: [POLICY_LAB.md](POLICY_LAB.md). Preview chỉ chạy công cụ mô phỏng; các trang live cần backend đầy đủ và cấu hình Solana tương ứng.
