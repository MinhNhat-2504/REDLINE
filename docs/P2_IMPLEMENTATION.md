# P2 — Sao chép cấu hình, báo cáo, thông báo và giải thích lỗi

Đã triển khai bốn hạng mục được yêu cầu trên `redline`, nối tiếp P0/P1. Chưa deploy và chưa gửi giao dịch Devnet thật.

## Tạo chính sách mới từ chính sách cũ

Trong từng chính sách có nút **Tạo mới từ chính sách này**, kể cả khi chính sách đã hết hạn hoặc thu hồi. Builder tải lại chính sách gốc và yêu cầu đúng ví đã đăng nhập. Chỉ khi chọn **Điền vào biểu mẫu mới** thì cấu hình mới thay biểu mẫu và bản nháp hiện tại.

Sao chép agent version, tổng ngân sách đã cấp (không dùng ngân sách còn lại), số lệnh tối đa, khoảng cách giữa lệnh và danh sách địa chỉ đầy đủ. Tên gợi nhớ lấy từ danh bạ của ví trên thiết bị. Thời hạn đề xuất tính từ thời hạn gốc, làm tròn lên theo giờ và được hiển thị để xem lại; lần ký mới dùng thời điểm mới. Điều kiện thuê và thời hạn thuê được kiểm tra lại qua luồng P0/P1.

Không chuyển chữ ký, PDA, agent instance ID, policy hash, counters, hire ID hoặc kết quả đánh giá cũ sang chính sách mới. Quyền mới vẫn qua đánh giá và ký đầy đủ. Quyền cũ giữ hiệu lực cho đến khi hết hạn hoặc được thu hồi; thao tác sao chép không tự thu hồi quyền cũ.

Không tự làm tròn ngân sách hoặc nới giới hạn để ép vào biểu mẫu. Chính sách có tài sản không hỗ trợ, allowlist bị che/không hợp lệ hoặc giới hạn không biểu diễn được sẽ có hướng dẫn tự cấu hình. Hạn mức biểu mẫu hiện tại: ngân sách nguyên 10–10.000 dUSDC, 1–500 lệnh, 1–168 giờ, khoảng cách 1–60 phút nguyên. Đổi ví rồi quay lại vẫn phải khôi phục nháp có xác nhận.

## Báo cáo CSV và JSON

Màn **Hoạt động** có nút **Xuất báo cáo**, phần xem lại phạm vi và lựa chọn CSV/JSON. Báo cáo dùng đúng các bản ghi khớp bộ lọc hiện tại, kể cả phần chưa bấm Xem thêm. Các giai đoạn của một intent và bản ghi executor/indexer trùng đã được gộp như UI P1.

Phạm vi là **cửa sổ tối đa 1.000 sự kiện gần nhất đã tải**, không phải toàn bộ lịch sử. File ghi schema, ví, mạng/program/mint/API, thời điểm tạo, thời điểm tải dữ liệu, múi giờ, bộ lọc, số sự kiện nguồn và số dòng báo cáo. Có event ID, run/grant/agent ID, loại sự kiện, kết quả, đơn vị gốc của số tiền, mint, người nhận, mã lý do và chữ ký. JSON giữ số tiền dưới dạng chuỗi chính xác; CSV cũng ghi đủ chữ số gốc, ứng dụng bảng tính có thể tự diễn giải kiểu số nên nên dùng JSON khi cần xử lý chính xác số nguyên lớn.

Chỉ xuất khi ví đã đăng nhập, dữ liệu đầy đủ và tải thành công. Kiểm tra lại session khi bấm tải; từ chối bản ghi bị che hoặc không chứng minh được thuộc ví này. Bản ghi gắn grant phải thuộc grant của ví; thao tác không gắn grant phải có actor ID khớp ví. Khi làm mới thất bại, dữ liệu cũ vẫn xem được nhưng không được xuất cho đến khi làm mới thành công.

File chỉ chứa các trường báo cáo đã chọn, không đưa raw payload hay session token vào file. CSV bao dấu nháy đúng cho dấu phẩy/xuống dòng/nháy kép và vô hiệu hóa tiền tố công thức bảng tính (`=`, `+`, `-`, `@`, khoảng trắng/tab/xuống dòng/BOM đi trước). Tải file diễn ra trên thiết bị, không upload báo cáo.

## Thông báo trong ứng dụng

Biểu tượng chuông trên thanh đầu trang hiển thị thông báo theo ví đã đăng nhập:

- Gần hết hạn trong 6 giờ, ngân sách dùng ít nhất 80%.
- Chính sách/thời gian thuê đã hết hạn, ngân sách hoặc số lệnh đã hết.
- Lượt chạy gần nhất báo lỗi, dẫn đến đúng lượt chạy trong Hoạt động.
- Thiết lập chưa hoàn tất trên thiết bị, dẫn đến thao tác phục hồi P0. Có chữ ký đã lưu không đồng nghĩa đã xác nhận giao dịch.

Thông báo suy ra từ bản ghi hiện có; điều kiện đã được giải quyết thì biến mất. Có đánh dấu từng mục/tất cả đã đọc, lưu riêng theo ví/mạng/API/program/mint trong trình duyệt, giới hạn 200 ID đã đọc gần nhất. Không đồng bộ nhiều thiết bị và không gửi email, Telegram hoặc push khi ứng dụng đóng. Có thời điểm tải và cảnh báo dữ liệu cũ khi mất kết nối; không hiển thị dữ liệu ví trước khi đổi ví/đăng xuất. Panel hỗ trợ bàn phím, Escape và đóng khi bấm ra ngoài.

## Trợ lý giải thích lỗi theo ngữ cảnh

Phần **Trợ lý giải thích lỗi** nằm cạnh lỗi cấp quyền/phục hồi, quỹ, quản lý chính sách và bản ghi hoạt động bị chặn/lỗi/chưa xác nhận. Phần này đóng mặc định, giải thích nguyên nhân mà bằng chứng hỗ trợ và bước kiểm tra tiếp theo; liên kết đến chính sách, quỹ hoặc Explorer phù hợp.

Đây là giải thích **theo quy tắc trên thiết bị**, dựa trên mã lỗi, khu vực thao tác, chữ ký và trạng thái đã ghi nhận. Không gọi LLM, không gửi payload ra dịch vụ AI, không tự sửa/nới quyền, ký hoặc gửi lại giao dịch. Bao phủ ngân sách, số lệnh, cooldown, allowlist, nonce replay, hết hạn/thu hồi, phiên đăng nhập, hủy yêu cầu ví, số dư/phí mạng, kết nối, chuẩn bị giao dịch và lỗi chưa rõ nguyên nhân.

Ưu tiên trạng thái giao dịch chưa rõ khi đã có chữ ký; không đổi timeout thành thất bại chắc chắn hoặc khuyên gửi lại ngay. Phân biệt hết hạn chính sách với khung thời gian giao dịch, hủy trong ví với bị từ chối trên chain, precheck block với bằng chứng on-chain. Nếu chưa đủ dữ liệu thì nói rõ chưa xác định được nguyên nhân. Trợ lý hội thoại AI mở rộng chưa nằm trong bản triển khai này.

## Kiểm chứng và giới hạn

- 157 tests frontend; 284 tests backend; TypeScript và production build.
- Chrome giả lập API/ví/RPC: 15 trường hợp bố cục P2 ở 360, 390, 768, 1024, 1440px. Kiểm tra copy có xác nhận/đánh giá lại/không tự ký; đổi ví A → B → A giữ nháp đúng; CSV/JSON khớp bộ lọc, không có payload riêng tư; không xuất bản công khai hoặc dữ liệu tải lỗi; lưu trạng thái thông báo đã đọc; giải thích đúng precheck.
- Kiểm tra hồi quy trình duyệt P0/P1 được ghi trong `ui-review/p0` và `ui-review/p1`. Ảnh, file báo cáo thử và kết quả P2 ở `ui-review/p2` trong workspace, ngoài Git repo `redline`.

Kiểm thử dùng fixture và RPC giả lập; chưa chứng minh giao dịch trên PostgreSQL/RPC Devnet triển khai thực tế. Chưa có buổi thử trực tiếp với người dùng mới. Không đổi schema hoặc yêu cầu migration backend trong đợt P2 này. Phân trang toàn bộ lịch sử, đồng bộ thông báo nhiều thiết bị, hội thoại AI và tài sản/thực thi mới cần triển khai riêng khi có yêu cầu.
