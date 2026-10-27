# Cải thiện trải nghiệm lần đầu — mục 1–4

Đã triển khai trên `redline` ngày 27/10/2026, dựa trên `HACKATHON_UX_PLAN.md`. Chưa deploy, chưa kiểm thử với ví/RPC Devnet thật và chưa có vòng thử người dùng mới.

## 1. Màn đầu và demo nhanh

- Tiêu đề giải thích trực tiếp việc giới hạn thanh toán của agent; nút chính **Thử không cần ví**, nút phụ **Tự thiết lập với ví thử nghiệm**.
- Người chưa đăng nhập không thấy ba ô số liệu trống. Người có dữ liệu vẫn xem số dư, quyền hiệu lực, lượt chạy và việc cần xử lý.
- Demo ngắn gọi API mô phỏng chỉ đọc, mỗi ví dụ khởi đầu độc lập với 100 dUSDC giả định: yêu cầu 20 được phép, còn 80; yêu cầu 120 vượt ngân sách, còn 100.
- UI ghi rõ mô phỏng, không ký/chuyển tiền/cấp quyền. Xác minh response khớp ví dụ trước khi hiển thị kết quả. Dịch vụ lỗi thì báo chưa kết nối được và cho thử lại; không dùng kết quả dựng sẵn thay thế.
- Policy Lab đầy đủ vẫn có trong phần Công cụ mô phỏng nâng cao, đóng mặc định.

## 2. Thiết lập ba bước

**Người nhận & ngân sách → Xem lại quyền → Ký & theo dõi.**

- Kết nối ví chủ sở hữu trước khi nhập người nhận để gắn nháp đúng ví. Người chưa có ví có đường về demo.
- Chọn build có sẵn; lựa chọn mặc định tránh agent đã biết cần thuê. Agent được chỉ định qua URL vẫn giữ đúng lựa chọn và bị chặn nếu chưa đủ điều kiện. Không có build thì giải thích và dẫn sang danh mục/demo; không tự xuất bản agent thay thế.
- Nhập ngân sách trực tiếp. Mặc định cho thiết lập mới: **100 dUSDC, tối đa 5 lệnh, 24 giờ, khoảng cách 1 phút**. Tất cả được hiển thị và có phần chỉnh số lệnh/thời gian. Mẫu hoặc bản sao có thể điền các giá trị khác sau thao tác rõ ràng của người dùng.
- Mẫu/nháp và danh bạ vẫn dùng phạm vi ví/mạng/program/mint của P1/P2. Đổi ví không mang dữ liệu người nhận sang ví mới; khôi phục nháp vẫn cần chọn rõ ràng.
- **Kiểm tra và xem lại** chạy đánh giá, kiểm tra kết quả cũ không còn hiệu lực sau thay đổi. BLOCK không cho sang ký; REVIEW vẫn cần chấp nhận rủi ro ở bước ký. Hiển thị đầy đủ địa chỉ và quyền ở phần xem lại và trước khi mở ví.
- Tạo thành công không tự chạy: có nút mở đúng chính sách để kiểm tra số dư và dùng nút chạy hiện có. Nút chạy vẫn kiểm tra điều kiện, phiên và số dư mới nhất.
- Giữ nguyên preflight backend, khóa thao tác, lưu receipt trước broadcast và phục hồi P0. Thay đổi thời hạn từ preflight quay lại cấu hình để đánh giá lại.

## 3. Agent theo tác vụ

- Thanh chính còn **Tổng quan, Agent của tôi, Quỹ, Hoạt động**; Hạn mức chi và công cụ khác vẫn có trong Thêm và các CTA theo agent. URL/slug và liên kết cũ được giữ.
- Empty state giải thích chưa có agent liên quan, cho thử demo hoặc khám phá danh mục. Xuất bản phiên bản nằm trong phần dành cho người tạo agent.
- Thẻ tác vụ hiển thị trạng thái chạy/sẵn sàng/cần xem lại/cần quyền, ngân sách còn được cấp và thời điểm quyền hết hạn sớm nhất. Số tiền tính bằng BigInt từ các quyền còn hiệu lực của đúng ví; không dùng tổng đã chi hoặc số dư quỹ để thay thế. Không cộng tài sản không tương thích thành dUSDC.
- Nhiều chính sách có nhãn giải thích phạm vi tổng hợp. CTA đến chính sách đang chạy/cần xử lý và kết quả của đúng chính sách.
- Bổ sung **Dừng lượt chạy này** qua API stop hiện có, tách khỏi **Thu hồi quyền**. Dừng không gửi giao dịch thu hồi và vẫn giữ quyền chi; UI có giải thích. Thu hồi vẫn có xác nhận và chữ ký khi cần.

## 4. Kết quả trước timeline

- Tóm tắt theo bộ lọc và cửa sổ lịch sử đang tải: thanh toán xác nhận, yêu cầu bị chặn, giao dịch lỗi, chưa rõ kết quả.
- Dedupe theo chữ ký, không đếm hai lần executor/indexer. Bằng chứng mâu thuẫn được xếp chưa xác nhận. Tổng tiền dùng số nguyên chính xác, tách theo mint; thiếu hoặc mâu thuẫn metadata thì không cộng và có nhãn tổng chưa đầy đủ.
- Không cộng yêu cầu bị chặn, giao dịch lỗi hoặc chưa xác nhận vào tiền đã chuyển. Không diễn giải việc dừng script là bằng chứng thanh toán thành công.
- Explorer, mã lỗi và JSON nằm trong Bằng chứng kỹ thuật, đóng mặc định; trợ lý giải thích lỗi P2 vẫn có khi cần.
- Giữ bộ lọc, liên kết tới lượt chạy/chính sách và xuất báo cáo CSV/JSON của P2. Bộ lọc agent cũng nhận URL `?agent=`.

## Nội dung và hành vi thực tế

Runtime hiện yêu cầu tối đa ba thanh toán theo kịch bản, vẫn chịu ngân sách, số lệnh, thời hạn và quyền được ký. Đã sửa mô tả EN/VI trong phần ký, quản lý chính sách và hướng dẫn, bỏ lời hứa kịch bản sẽ chủ động tạo yêu cầu vượt ngân sách. Tình huống vượt ngân sách có trong mô phỏng. Không đổi quy tắc thực thi, schema hoặc triển khai program trong đợt này.

## Kiểm chứng

- Frontend: 163 tests; backend: 284 tests. TypeScript và production build đã qua.
- Chrome dùng API/ví/RPC giả lập: 22 trường hợp bố cục ở 360/390/768/1024/1440px, gồm màn demo, thiết lập, agent, lịch sử và hai bước xem lại/ký ở mobile. Không tràn ngang hoặc uncaught JavaScript exception.
- Kiểm tra demo được phép/bị chặn, lỗi kết nối và thử lại; không ký/gửi giao dịch trong demo.
- Kiểm tra địa chỉ/ngân sách sai, BLOCK, chỉnh cấu hình hủy đánh giá, địa chỉ đầy đủ trước ký, và chỉ ký khi người dùng bấm nút.
- Kịch bản API ghi nhận thất bại sau khi giao dịch xác nhận: phục hồi chỉ đăng ký tiếp, không ký hoặc broadcast lại. Counter fixture: hai lần ký/gửi (khởi tạo quỹ + cấp quyền), hai lần đăng ký (lần đầu lỗi), một lần nạp quỹ khi trống.
- Kiểm tra dừng lượt chạy không thu hồi quyền, hủy xác nhận thu hồi không gửi giao dịch; sao chép không mang đánh giá cũ; thuê hết hạn bị chặn; xuất JSON giữ đúng bộ lọc và số tiền gốc.

Script và ảnh QA nằm ở `ui-review/ux-review.mjs`, `ui-review/ux/` trong workspace, ngoài Git repo `redline`. Script này phản ánh luồng ba bước mới; các script P0/P1/P2 trước đó là bằng chứng của giao diện bốn bước trước, không được dùng làm bằng chứng chạy lại toàn bộ sau lần thay đổi này.

Chưa có dữ liệu chứng minh các mục tiêu “hiểu sau 20 giây”, “tự hoàn tất demo trong 90 giây” đã đạt. Bước tiếp theo là thử với người dùng mới và nghiệm thu luồng Devnet trên môi trường triển khai thực tế.
