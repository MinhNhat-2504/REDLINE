# Policy Lab — hướng dẫn chức năng và API

Policy Lab giúp thử chính sách trước khi tạo grant: chọn một cấu hình mẫu, đặt số tiền, số lần đề xuất, khoảng cách thời gian và tình huống, sau đó xem từng đề xuất đi qua bảy điều kiện kiểm soát.

Đây là mô phỏng giả định bắt đầu với ngân sách chưa sử dụng. Không đọc grant thật, không kết nối RPC, không ghi database, không yêu cầu ví và không gửi giao dịch. Kết quả không xác nhận số dư vault, phí, account constraints hay khả năng giao dịch thành công trên Solana. Việc ký và thực thi thật vẫn dùng các luồng Guardrails/Treasury có sẵn.

## Dùng trên giao diện

1. Từ trang Protocol, chọn **Try Policy Lab**.
2. Chọn Contributor payroll, Treasury operations hoặc Agent sandbox. Các mẫu được tải từ backend, không phải khuyến nghị tài chính hay chính sách đã được phê duyệt.
3. Điều chỉnh Amount per proposal, Attempts và Interval. USDC hiển thị với 6 chữ số thập phân; frontend chuyển sang base units bằng `BigInt`.
4. Chọn Scenario: tuân thủ chính sách, người nhận ngoài danh sách, tài sản ngoài danh sách, lặp nonce hoặc quyền đã thu hồi.
5. Chọn **Run simulation**, sau đó chọn số thứ tự đề xuất để xem `passed`, `blocked`, `skipped`, lý do và ngân sách còn lại.
6. Nút tải xuống xuất báo cáo JSON chứa input, từng bước và tổng kết. Đây là báo cáo mô phỏng, không phải bằng chứng on-chain.

Thay đổi input hoặc cấu hình mẫu sẽ xóa kết quả cũ. Kết quả trả về từ request cũ không được gắn vào input mới. Request có timeout 15 giây; lỗi tải cấu hình có nút thử lại.

## Chạy nhanh không cần Postgres

Terminal backend:

```powershell
cd backend
npm install
npm run dev:lab
```

Terminal frontend, từ thư mục gốc:

```powershell
npm install
$env:VITE_API_URL = 'http://127.0.0.1:8788'
npm run dev -- --host 127.0.0.1
```

Mở `http://127.0.0.1:5173`. Server `dev:lab` chỉ bind loopback, không đọc `.env`, không tạo executor, không chạy indexer hay kết nối database. Các API ngoài Policy Lab trả HTTP 503 với thông báo rõ ràng; số liệu live trên frontend sẽ không có dữ liệu. Dùng `LAB_PORT` để đổi cổng 8788.

Để chạy toàn bộ ứng dụng: cấu hình backend theo [backend README](../backend/README.md), chạy `npm run dev` trong backend và trỏ `VITE_API_URL` về API đầy đủ. Hai route mới tự đăng ký trong server chính; không cần migration database.

## API

### GET /policy/presets

Public. Trả `{ "version": 1, "presets": [...] }`. Mỗi preset gồm `id`, `name`, `description`, `policy`, `proposal`.

| Mẫu | Ngân sách giả định | Giới hạn số giao dịch | Cooldown | Thời hạn |
| --- | ---: | ---: | ---: | ---: |
| payroll | 1.000 USDC | 10 | 60 giây | 24 giờ |
| treasury | 5.000 USDC | 3 | 3.600 giây | 7 ngày |
| sandbox | 100 USDC | 5 | 30 giây | 1 giờ |

### POST /policy/simulate

Public, kể cả khi deployment có `REDLINE_API_KEY`. Đây là tính toán không có side effect; route không cấp thêm quyền cho `/runs`, `/intents` hay các thao tác tài sản. Giới hạn request theo cấu hình rate limit của server chính; bản `dev:lab` giới hạn 120 request/phút/IP.

```json
{
  "policy": {
    "spendCapUnits": "1000000000",
    "maxTransactions": 10,
    "cooldownSeconds": 60,
    "durationSeconds": 86400
  },
  "proposal": {
    "amountUnits": "250000000",
    "attempts": 5,
    "intervalSeconds": 60,
    "destinationAllowed": true,
    "mintAllowed": true,
    "active": true,
    "replayNonce": false
  }
}
```

| Trường | Quy tắc |
| --- | --- |
| `spendCapUnits`, `amountUnits` | Chuỗi số nguyên dương dạng thập phân, không leading zero, tối đa u64 (`18446744073709551615`). Không nhận số âm, số 0, số thập phân hay exponent. |
| `maxTransactions` | Số nguyên từ 1 đến 1.000. |
| `cooldownSeconds`, `intervalSeconds` | Số nguyên từ 0 đến 604.800. |
| `durationSeconds` | Số nguyên từ 1 đến 31.536.000, tính từ lúc bắt đầu mô phỏng. |
| `attempts` | Số nguyên từ 1 đến 50. |
| `destinationAllowed`, `mintAllowed`, `active` | Boolean, mặc định `true`. Mô tả giả định của kịch bản, không phải địa chỉ hoặc grant thật. |
| `replayNonce` | Boolean, mặc định `false`. Khi bật, mọi đề xuất sử dụng nonce 0. |

Các trường ngoài schema bị từ chối. Đầu vào sai trả HTTP 400 với `error` và `details` theo Zod; không có kết quả mô phỏng một phần.

Phản hồi thành công có:

- `mode: "simulation"` và `notice` mô tả giới hạn.
- `input`: cấu hình đã chuẩn hóa, gồm các boolean mặc định.
- `steps`: `attempt`, `elapsedSeconds`, `nonce`, `verdict`, `gates`, `spentUnits`, `remainingUnits`.
- `summary`: tổng `allowed`, `blocked`, `spentUnits`, `remainingUnits`, `nextNonce`.

Với input trên, bốn đề xuất đầu được phép; đề xuất thứ năm bị `SPEND_CAP_EXCEEDED` tại gate 6. Gate 7 là `skipped`, không được mô tả là đã kiểm tra. Tổng chi là `1000000000`, ngân sách còn lại là `0`, nonce tiếp theo là `4`.

## Quy tắc mô phỏng

Engine dùng trực tiếp `evaluateIntent` và `applyExecution` mà mock chain/runtime đang dùng. Thứ tự: Active → Expiry → Nonce → Asset → Recipient → Budget (transaction count trước spend cap) → Cooldown. Điều kiện sai đầu tiên quyết định kết quả.

Thời gian đề xuất thứ `i` là `i × intervalSeconds`, với `i` bắt đầu từ 0. Thời hạn chặn ngay tại `elapsedSeconds >= durationSeconds`. Chỉ đề xuất được phép mới tăng spent, transaction count, nonce và last execution. Vì vậy một lần bị chặn do cooldown không làm kéo dài cooldown; lần sau vẫn có thể được phép khi đủ thời gian.

Mốc thời gian nội bộ khác 0 để tránh trùng sentinel “chưa thực thi” trong engine. Mô phỏng có tính xác định và không phụ thuộc đồng hồ mock đang tăng tốc. Các giới hạn input ở đây dành cho mô phỏng; việc tạo grant thật vẫn chịu kiểm tra riêng của API và program.

## Kiểm thử và thay đổi liên quan

`backend/test/simulation.test.ts` bao phủ ngân sách đúng biên, từ chối không tăng counters, cooldown và retry, hết hạn đúng biên, các tình huống từ chối, độ chính xác số nguyên lớn, quyền truy cập API và validation. `backend/test/protocol-overview.test.ts` kiểm tra sửa lỗi đếm grant: quyền đã thu hồi hoặc hết hạn không còn được tính trong `activeGrants` của `/protocol/overview`.

```powershell
cd backend
npm test
npm run build
```

Không thay đổi Solana program. Kết quả mock/API không thay thế kiểm thử on-chain; bộ LiteSVM hiện có vẫn yêu cầu Linux/macOS.
