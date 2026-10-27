# Tinh gọn nội dung giao diện

Đợt tiếp nối cải tiến trải nghiệm lần đầu: giảm nội dung phải đọc ở trạng thái mặc định, giữ thông tin cần thiết cho quyết định tài chính.

## Thay đổi

- Tổng quan cho người mới còn tiêu đề ngắn, một câu giải thích và hai lựa chọn: thử không cần ví / thiết lập với ví. Bỏ ba thẻ ví dụ tĩnh và các đoạn giới thiệu lặp lại. Checklist không xuất hiện trước khi đăng nhập.
- Người đã đăng nhập thấy một bước tiếp theo với hành động phù hợp trạng thái thực tế. Checklist đầy đủ nằm trong Tiến trình thiết lập; hướng dẫn và mô phỏng nâng cao nằm trong phần mở khi cần.
- Demo dùng số tiền và kết quả làm trọng tâm: ngân sách mỗi ví dụ, hai yêu cầu và số dư giả định sau kiểm tra. Giữ nhãn mô phỏng và không chuyển tiền.
- Form cấu hình rút ngắn nhãn/hướng dẫn, gộp số lệnh/thời hạn/khoảng cách vào một dòng có thể mở để chỉnh. Bước xem lại và ký vẫn hiển thị toàn bộ địa chỉ, tổng ngân sách, số lệnh, thời hạn, khoảng cách; vẫn giải thích việc một thanh toán có thể dùng hết ngân sách còn lại, yêu cầu ví và việc ký không tự chạy agent.
- Thẻ agent ưu tiên trạng thái và ngân sách quyền còn lại; phần giới thiệu agent mở khi cần. Quản lý quyền là hành động chính với quyền còn hiệu lực; tạo thêm quyền là hành động phụ.
- Cảnh báo được gộp theo chính sách, tránh lặp tên agent và cùng một nút trên nhiều dòng. Lỗi dữ liệu cũ vẫn hiển thị. Không có cảnh báo thì không thêm khối trống.
- Lịch sử hiện kết quả trước. Bộ lọc/xuất báo cáo và phạm vi dữ liệu nằm trong các phần đóng mặc định; bộ lọc đang áp dụng vẫn có chỉ báo và nút xóa bên ngoài.
- Ban đầu hiện tối đa 5 bản ghi. Mỗi bản ghi có một nút Chi tiết, chứa địa chỉ đầy đủ, trợ lý và bằng chứng. Rút ngắn trạng thái, bỏ tên agent lặp trên từng dòng trong cùng lượt chạy, bỏ giây trong thời gian mặc định. Timestamp gốc vẫn nằm trong dữ liệu API/báo cáo; bộ lọc dùng múi giờ thiết bị như trước.

Không đổi quy tắc đánh giá rủi ro, quyền được ký, nguồn dữ liệu, giao thức ví, phục hồi giao dịch hay phân quyền xuất báo cáo.

## Đo trước/sau

Số **ký tự hiển thị trong vùng main**, lấy từ `innerText`, cùng bộ fixture API/ví, ngôn ngữ English, khung desktop 1440px và trạng thái đóng mặc định. Nội dung mở khi cần vẫn được giữ trong ứng dụng; đây không phải số ký tự source hoặc số liệu thử người dùng.

| Màn hình | Trước | Sau | Giảm |
| --- | ---: | ---: | ---: |
| Trang đầu, chưa đăng nhập | 1.305 | 166 | 87,3% |
| Trang đầu mở demo, chưa chạy ví dụ | 1.644 | 294 | 82,1% |
| Thiết lập, có ví kết nối | 1.231 | 714 | 42,0% |
| Lịch sử, trạng thái mặc định | 1.360 | 526 | 61,3% |

Nguồn: `ui-review/concise/before.json`, `after.json` và ảnh cùng thư mục trong workspace. Kết quả này đo lượng nội dung phải đọc trong fixture, chưa chứng minh người mới hoàn thành tác vụ nhanh hơn. Nội dung thật, bản dịch VI và số bản ghi khác có thể cho kết quả khác.

## Kiểm chứng

- TypeScript và production build.
- 163 kiểm thử frontend hiện có.
- 20 trường hợp đo/chụp giao diện ở 360/390/768/1440px; không tràn ngang hoặc lỗi JavaScript.
- Luồng trình duyệt 22 trường hợp: demo và thử lại, nhập sai, BLOCK, sửa quyền hủy đánh giá, địa chỉ đầy đủ trước ký, chỉ ký khi bấm, phục hồi không phát lại, dừng khác thu hồi, hạn thuê, sao chép và xuất JSON. Thêm kiểm tra bộ lọc/chi tiết đóng mặc định nhưng mở được khi cần.

Script: `ui-review/concise-review.mjs` và `concise-flow-review.mjs`, ngoài Git repo `redline`. Kiểm thử dùng API/RPC/ví giả lập. Chưa deploy, chưa thử giao dịch Devnet thật hoặc quan sát nhóm người dùng mới trong đợt này.
