# P0 — Kết quả triển khai

P0 đã được triển khai trong source local `redline/`. Đây là kết quả kiểm tra bằng test và môi trường trình duyệt giả lập; chưa phải xác nhận hoạt động với ví và hạ tầng Devnet thật.

## Phạm vi hoàn thành

| Nhóm | Thay đổi |
| --- | --- |
| P0-01 | Builder chỉ cho dUSDC phù hợp mint được cấu hình. Lựa chọn, kiểm tra trước khi ký và giao dịch dùng chung cấu hình tài sản. Bỏ Avg/Tx, giải thích ngân sách tổng; hiển thị người nhận đầy đủ và phiên bản agent ở bản xem lại. Thời hạn thuê bị rút ngắn cần đánh giá lại trước khi ký; rental còn dưới một giờ không được cấp quyền mới. Backend đối chiếu cả hash và giới hạn thực tế on-chain. |
| P0-02 | Milestone thanh toán đầu tiên dựa trên bộ đếm giao dịch xác nhận, không dựa vào nút bấm hoặc trạng thái running/stopped. Hoàn tất lần đầu không mất khi chính sách hết hạn/thu hồi. Trạng thái hiện tại tách khỏi lịch sử làm quen. Số dư, chính sách và lượt chạy tải độc lập, có trạng thái lỗi/dữ liệu cũ và không hiển thị dữ liệu ví trước khi đổi/ngắt ví. |
| P0-03 | Có bước kiểm tra, chờ ví, gửi, xác nhận và đồng bộ. SDK mô phỏng và thay giới hạn compute tạm trước ký. Lưu chữ ký trước phát giao dịch; khóa thao tác đồng thời. Khôi phục theo API, RPC, program, mint và ví, giữ nguyên PDA chính sách. Backend đăng ký lại cùng PDA trả bản ghi cũ; tạo grant và audit được commit trong một database transaction, feed chỉ phát sau commit. Đồng bộ một quyền đã ký trong thời gian thuê vẫn được phép sau khi rental hết hạn. Không tự chạy agent sau khi tạo quyền. |
| P0-04 | Rút tiền xử lý số nguyên token, kiểm tra định dạng/độ chính xác/giới hạn/số dư mới nhất; xem lại số tiền và ví nhận trước khi ký. Giao dịch chưa xác minh chỉ được kiểm tra lại, không tự phát lại. Yêu cầu rút hết hạn có bước kiểm tra và xác nhận riêng trước khi lưu vào lịch sử để xem lại yêu cầu mới. Thu hồi một hoặc nhiều quyền có bước xác nhận và kết quả theo từng quyền: đã thu hồi, chờ đồng bộ, chưa xác nhận, chưa thu hồi. |
| P0-05 | Có lý do cho các thao tác chính bị khóa, trạng thái có chữ ngoài màu sắc, EN/VI cho luồng mới, thời gian có múi giờ, focus bàn phím và bố cục cho màn hình nhỏ. Hướng dẫn trong ứng dụng đã khớp tài sản và nạp tiền tự động. |

## Kiểm chứng

- Frontend: `npm test` — 135 tests đạt; `npm run build` (bao gồm TypeScript) thành công.
- Backend: `npm test` — 280 tests đạt; `npm run typecheck` thành công.
- Unit/integration test bao gồm parser tiền, quyền theo ví, bằng chứng thanh toán đầu tiên, xác nhận/timeout/expiry, lưu và khôi phục, khóa thao tác, giao dịch ký/serialize với SDK thật qua RPC giả lập, đăng ký idempotent, race đăng ký, rollback audit và kết quả thu hồi từng phần.
- Browser QA: `ui-review/p0-review.mjs` ở workspace root; ảnh và kết quả trong `ui-review/p0/`. 34 trường hợp bố cục đạt, không tràn ngang hoặc lỗi JavaScript chưa xử lý. Kiểm tra các màn hình chính ở 1440/1024/768/390/360px, xác nhận thu hồi/rút ở mobile, dữ liệu lỗi một phần, milestone sau hết hạn/thu hồi, đăng nhập/ngắt ví và chuyển ngôn ngữ.
- Kịch bản browser đầy đủ giả lập lỗi backend sau khi grant đã xác nhận: lần khôi phục chỉ tăng số lần đăng ký, không tăng số lần ký/gửi. Kịch bản rút lỗi mạng sau broadcast cũng chỉ đọc lại trạng thái khi người dùng kiểm tra, không phát thêm giao dịch.

Các test backend dùng Prisma/RPC fixture, không thay thế kiểm thử concurrency và transaction trên database triển khai thật. Browser dùng ví, API và RPC giả lập; bộ kiểm thử serialize riêng dùng keypair được sinh trong test và không gửi lên mạng.

## Cấu hình và lưu ý vận hành

- Frontend cần `VITE_DEMO_USDC_MINT` khớp `DEMO_USDC_MINT` của backend, cùng program và mạng Devnet. Thiếu cấu hình thì UI giải thích và chặn ký; không dùng mint giả định trong source production.
- Không có thay đổi Prisma schema và không chạy migration/database push trong lượt triển khai này.
- Cần cập nhật frontend và backend cùng nhau để có đăng ký idempotent, số dư 0 khi ATA thực sự chưa tồn tại và dữ liệu lượt chạy trên danh sách chính sách.
- Local storage chứa thông tin chính sách và chữ ký công khai để khôi phục, không chứa private key/seed phrase. Chặn storage sẽ chặn phát giao dịch có theo dõi; xóa dữ liệu trình duyệt sẽ làm mất bản khôi phục local.
- Khi kết quả mạng còn chưa biết, UI giữ trạng thái chưa xác nhận và liên kết Explorer; không khẳng định giao dịch thất bại hoặc tự gửi lại. Lưu yêu cầu rút hết hạn vào lịch sử không hủy giao dịch đã gửi và không tự tạo lệnh rút mới.
- Ví thật, PostgreSQL triển khai và RPC Devnet thật chưa được nghiệm thu do workspace hiện chưa có `.env` cho ứng dụng/backend và không có phiên ví thật được kết nối. Thử trực tiếp các luồng cấp quyền, chuyển, thu hồi và rút trước khi phát hành.

## Chạy browser QA đã cấu hình giả lập

Trong `redline/`, cấu hình mint công khai giả lập chỉ cho tiến trình QA rồi chạy Vite:

```powershell
$env:VITE_DEMO_USDC_MINT = '11111111111111111111111111111111'
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Từ workspace root chạy `node ui-review/p0-review.mjs`. Script chặn API/RPC bằng fixture và dùng hồ sơ Chrome riêng. Giá trị mint ở lệnh trên chỉ phục vụ fixture; không dùng làm cấu hình Devnet thật.
