# P1 — Giảm nhập lại và làm rõ hoạt động

Đã triển khai trên source `redline`, tiếp nối P0. Chưa triển khai lên môi trường đang phục vụ người dùng.

## Phạm vi hoàn thành

- **P1-01:** hai mẫu Trial (50 dUSDC / 5 lệnh) và Daily (500 dUSDC / 50 lệnh), thời hạn 24 giờ; tự chỉnh ngân sách, số lệnh và lịch. Mẫu chỉ điền hạn mức. Nháp tự lưu theo ví + API + RPC + program + mint + schema v1; không tự khôi phục. Có nút khôi phục và xóa; đổi ví xóa dữ liệu biểu mẫu đang hiển thị. Nháp bị xóa sau khi tạo chính sách thành công, kể cả phục hồi đăng ký P0.
- **P1-02:** tên gợi nhớ từng người nhận, chặn địa chỉ không hợp lệ/trùng. Danh bạ cục bộ cho phép lưu, chọn và xóa; không tự thêm địa chỉ khi dán. Tên không nằm trong policy hay giao dịch được ký. Bản xem lại vẫn hiện địa chỉ đầy đủ; thay địa chỉ hủy đánh giá cũ.
- **P1-03:** lịch sử nhóm theo `runId`, lọc agent/ngày/kết quả và tìm chữ ký/địa chỉ/mã lý do. Gộp các giai đoạn cùng intent, tránh đếm trùng giao dịch executor/indexer. Phân biệt thanh toán xác nhận, bị chặn tại precheck, giao dịch lỗi và yêu cầu chưa có kết quả. JSON nằm trong phần chi tiết đóng mặc định.
- **P1-04:** tổng quan có việc cần xử lý: hết hạn trong 6 giờ, đã dùng ít nhất 80% ngân sách, lượt chạy gần nhất lỗi. Tính ngân sách bằng số nguyên chính xác. Liên kết đến đúng chính sách/lượt chạy. Dữ liệu chưa làm mới được có nhãn cảnh báo.
- **P1-05:** mặc định danh sách agent có quan hệ với ví qua người xuất bản, chính sách hoặc hợp đồng thuê. Danh mục chung là lựa chọn riêng; xuất bản vẫn là hành động phụ. Phân biệt sở hữu, thuê còn hạn, thuê hết hạn, cần thuê và agent có thể cấp quyền. Giữ agent trong liên kết sang cấu hình và thuê; kiểm tra điều kiện trước bước ký, backend preflight vẫn quyết định cuối cùng.

## Backend và dữ liệu

`GET /audit?order=latest&limit=1000` lấy cửa sổ gần nhất trước khi giới hạn; API cũ không có `order=latest` vẫn giữ thứ tự tăng dần. Giới hạn được chuẩn hóa về 1–1000. Phạm vi chủ ví và phép che dữ liệu công khai được giữ nguyên.

Audit mới của executor ghi thêm `runId`, và metadata số tiền/mint/đích trên kết quả giao dịch. Với dữ liệu cũ, API nối qua **intent ID và grant ID khớp nhau** để bổ sung metadata từ TransactionIntent hiện có. Không suy đoán lượt chạy theo thời gian, không sửa dữ liệu lịch sử, không đổi schema database. Bản ghi không có liên kết vẫn được hiển thị riêng.

Nháp và danh bạ chỉ ở localStorage của trình duyệt, không đồng bộ thiết bị. Danh bạ tối đa 50 địa chỉ mỗi phạm vi. Tên do người dùng đặt không xác minh danh tính. Khi trình duyệt chặn lưu trữ, UI báo không lưu được.

## Kiểm chứng

- Frontend: 145 tests; backend: 284 tests, bao gồm cách ly ví/mạng/schema, địa chỉ trùng, bằng chứng kết quả, liên kết lịch sử, ngưỡng ngân sách và phép che dữ liệu.
- TypeScript frontend/backend và production build đã qua.
- Chrome với API, ví và RPC giả lập: 20 trường hợp bố cục P1 từ 360px đến 1440px, không tràn ngang hoặc lỗi JavaScript. Kiểm tra tải lại và khôi phục nháp có xác nhận, đổi ví, mẫu cấu hình, danh bạ, lọc lịch sử, liên kết cảnh báo, quan hệ agent và thuê hết hạn.
- Hồi quy trình duyệt P0: 34 trường hợp; giữ nguyên kiểm chứng phục hồi sau giao dịch xác nhận/API lỗi, rút tiền, không phát lại khi kiểm tra trạng thái và xác nhận thu hồi.

Ảnh và kết quả kiểm tra ở `ui-review/p1` và `ui-review/p0` trong workspace (ngoài Git repo `redline`). Test không chứng minh giao dịch trên Devnet thật: chưa có ví người dùng, PostgreSQL triển khai hoặc RPC thật trong đợt này. Chưa có vòng thử trực tiếp với người dùng mới.

Lịch sử hiển thị tối đa 1.000 sự kiện gần nhất (bản công khai tối đa 50), bộ lọc áp dụng trên cửa sổ đó theo múi giờ thiết bị. Chưa có phân trang toàn bộ lịch sử hoặc xuất báo cáo; các mục này thuộc đợt sau.
