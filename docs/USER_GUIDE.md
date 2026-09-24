# Tài liệu hướng dẫn sử dụng — REDLINE

Hướng dẫn này mô tả từng bước thao tác thực tế trên dashboard REDLINE: kết nối ví, tạo vault, tạo policy (grant), chạy agent, theo dõi live feed và audit trail, revoke/withdraw. Tất cả các bước dưới đây khớp với luồng UI hiện có trong `src/app`.

## 0. Trước khi bắt đầu

Bạn cần:

- Một ví hỗ trợ **Wallet Standard** đã cài trên trình duyệt (ví dụ Phantom, Solflare), chuyển sang mạng **Devnet**.
- Một ít SOL Devnet trong ví để trả phí giao dịch (xin từ [Solana faucet](https://faucet.solana.com)).
- Backend REDLINE đang chạy — dùng bản hosted (`https://redline-api-ku3s.onrender.com`) qua [demo trực tuyến](https://redline-dashboard-28t9.onrender.com), hoặc chạy local (xem mục 1).

> ℹ️ Mọi số liệu trên dashboard đều lấy từ chuỗi hoặc từ audit trail — không còn dữ liệu mô phỏng. Những chỉ số không thể đo được một cách trung thực (P&L, APY, win rate, uptime) đã bị bỏ hẳn thay vì bịa số: hệ thống chỉ ghi nhận *đã chi bao nhiêu, bao nhiêu giao dịch được duyệt/bị chặn, quyết định mất bao lâu*, và không có nguồn giá nào để tính lời lỗ.

## 1. (Tuỳ chọn) Chạy backend ở local

Nếu không dùng bản hosted, chạy backend ở chế độ `mock` (không cần ví thật, không cần RPC):

```bash
cd backend
npm install
cp .env.example .env        # để CHAIN=mock, không cần điền gì thêm
npm run db:push
npm run dev                 # http://localhost:8787
```

Ở gốc repo, tạo `.env` cho dashboard:

```bash
cp .env.example .env
```

Các biến quan trọng trong `.env`:

| Biến | Ý nghĩa |
|---|---|
| `VITE_API_URL` | URL backend (mặc định `http://localhost:8787`) |
| `VITE_REDLINE_PROGRAM_ID` | Program id trên Devnet |
| `VITE_DEMO_USDC_MINT` / `VITE_DEMO_OPS_DESTINATION` | Mint và địa chỉ đích duy nhất được phép trong mọi grant — **bắt buộc phải có giá trị thì mới tạo được grant**; lấy bằng `npm run devnet:setup` trong `backend/` |
| `VITE_API_KEY` | Phải trùng với `REDLINE_API_KEY` ở backend nếu backend có bật khoá ghi |

Chạy dashboard:

```bash
npm install
npm run dev                 # http://localhost:5173
```

## 2. Kết nối ví

Ở góc trên bên phải, bấm **"Connect Solana"**.

- Nếu chưa cài ví Wallet Standard nào, dropdown báo: *"No compatible wallet detected. Install Phantom, Solflare, or another Wallet Standard wallet."*
- Nếu có ví, chọn ví trong danh sách và bấm **"Connect"**.
- Trong lúc kết nối, nút hiển thị **"Connecting"**; nếu bạn từ chối trong ví hoặc kết nối lỗi, dashboard báo *"Wallet connection was rejected or unavailable."*
- Kết nối thành công: nút chuyển thành số dư SOL + địa chỉ ví rút gọn (chấm xanh nhấp nháy). Bấm vào đó để ngắt kết nối.

Mạng luôn cố định là **Devnet**, không chọn được mạng khác.

## 3. Khởi tạo Vault (Treasury)

Vào mục **Treasury** ở sidebar. Khối **"Program vault"** hiển thị:

- Nếu chưa kết nối ví: *"Connect a wallet to see its vault."*
- Nếu ví chưa có vault: dòng vàng *"vault not initialised — sign a grant first"* — vault sẽ được tự động khởi tạo ở **bước đầu tiên khi bạn ký tạo grant** (mục 5), không có nút "Init Vault" riêng.
- Sau khi có vault: hiển thị số dư (`X dUSDC`), địa chỉ vault PDA và vault ATA (link Explorer), giao dịch gần nhất.

Hai thao tác có thể làm ở đây:

| Nút | Chức năng |
|---|---|
| **Refill 1,000 (devnet)** | Gọi faucet devnet, mint 1.000 dUSDC demo vào vault |
| **Withdraw** | Nhập số lượng dUSDC rồi rút — ký trực tiếp bằng ví, không qua bất kỳ giới hạn nào (đây là quyền của chủ vault, không phải quyền agent) |

## 4. Tạo Policy (Grant) — mục Guardrails

Vào mục **Guardrails** ở sidebar. Wizard gồm 4 bước:

### Bước 1 — Scope
Chọn **agent version** mà grant này uỷ quyền: grant ghi lại `agentHash` của nó, nên đây chính là bản build mà chính sách gắn vào. Nếu chưa publish agent nào, ký grant sẽ tự publish một cái mặc định — muốn đặt tên riêng thì publish ở trang Agents trước.

Sau đó chọn (toggle) các token mà agent được phép nhắc tới: `SOL, USDC, JUP, JTO, BONK, PYTH`.

### Bước 2 — Spend Limits
Kéo hai thanh trượt:
- **Total Spend Cap**: 10–10.000 USDC
- **Max Transactions / Session**: 1–500 giao dịch

Dashboard tự tính mức rủi ro tham khảo (LOW/MED/HIGH) dựa trên hạn mức.

### Bước 3 — Time Bounds
Kéo hai thanh trượt:
- **Session Duration**: 1–168 giờ (quyết định thời điểm hết hạn `expiresAt`)
- **Execution Cooldown**: 1–60 phút giữa hai lần thực thi

### Bước 4 — Review & Sign
Xem lại bảng tóm tắt policy, sau đó bấm **"Run AI risk assessment"**. Copilot AI trả về điểm rủi ro (0–100), verdict `ALLOW` / `REVIEW` / `BLOCK`, tóm tắt và tối đa 3 phát hiện. Nếu verdict là `BLOCK`, nút ký ở bước tiếp theo sẽ bị khoá (*"Blocked by risk policy"*) — đây là rule floor xác định, AI không thể ký thay hay hạ mức rủi ro.

> **Danh sách đích được phép** (`allowedDestinations`) nhập trực tiếp ở bước 1, tối đa 4 địa chỉ — đây chính là ranh giới mà chương trình kiểm tra ở mọi lệnh chuyển: địa chỉ không nằm trong danh sách này thì không thể nhận tiền, dù agent đề xuất gì. Ô đầu tiên điền sẵn `VITE_DEMO_OPS_DESTINATION` cho tiện demo, bạn xoá và thay được.
>
> `allowedMints` vẫn lấy cố định từ `VITE_DEMO_USDC_MINT`: vault demo chỉ giữ đúng loại token đó, nên thêm mint khác vào danh sách cũng không có gì để chuyển.

## 5. Ký & tạo Grant on-chain

Ngay dưới kết quả risk assessment là nút ký (label thay đổi theo trạng thái):

`Sign & create on-chain grant` → nếu chưa nối ví: `Connect wallet to sign grant` → nếu bị BLOCK: `Blocked by risk policy`.

Khi bấm, quá trình chạy qua 3 pha, **tất cả ký trong ví của bạn**, backend không bao giờ chạm vào private key:

1. **vault** — nếu ví chưa có vault PDA, ký `init_vault`, rồi backend mint demo USDC vào vault. Nút hiển thị *"Creating vault…"*.
2. **grant** — build policy, tính hash SHA-256 của policy, ký `create_grant`. Nút hiển thị *"Sign create_grant…"*.
3. **register** — đăng ký thông tin agent và grant với backend. Nút hiển thị *"Registering…"*.

Thành công: dòng xanh **"Grant live on Devnet · id `<6 ký tự cuối>`"** + link Explorer xem giao dịch `create_grant`, kèm gợi ý: *"Open Agent Guardrails → Active Policy Accounts to start the agent."*

Lỗi: dòng đỏ, ví dụ *"Transaction was rejected or could not reach Solana Devnet."*

## 6. Quản lý Grant & chạy Agent — "Active Policy Accounts"

Vẫn ở trang **Guardrails**, phía trên wizard là danh sách **"Active Policy Accounts"**. Mỗi dòng grant hiển thị tên agent, grant PDA, policy hash, thanh tiến độ chi tiêu (`đã chi/hạn mức`), số giao dịch (`n/max`), nonce, **thời gian còn lại trước khi hết hạn**, và trạng thái: `ACTIVE` / `AGENT RUNNING` / `EXPIRED` / `REVOKED`.

Thời gian còn lại chuyển vàng khi dưới 1 giờ và đỏ khi đã hết. Đây là cổng 2 (`EXPIRED`): quá hạn thì mọi lệnh chuyển đều bị từ chối, và nếu không hiển thị thì một agent ngừng vì hết hạn trông y hệt một agent bị hỏng. Grant chạy dưới hợp đồng thuê có thêm nhãn `rented`.

Bấm **"Show every proposal this agent made"** ở cuối mỗi dòng để mở lịch sử đầy đủ: từng đề xuất kèm nonce, số tiền, địa chỉ đích, lý do agent đưa ra, và kết quả. Nhãn kết quả phân biệt rõ *precheck* (engine off-chain đoán trước) với *kết quả on-chain thật* — `moved` nghĩa là tiền đã chuyển, còn mã lỗi như `SPEND_CAP_EXCEEDED` nghĩa là chuỗi từ chối. Có link Explorer cho mọi giao dịch thật.

Ba nút thao tác (ẩn nếu grant đã bị revoke):

| Nút | Chức năng |
|---|---|
| **Run safe sequence** | Lần đầu ví sẽ xin **chữ ký đăng nhập** (ký thông điệp, không phải giao dịch — không mất phí, không chuyển gì). Sau đó runtime chạy ba giao dịch hợp lệ, mỗi giao dịch bằng 20% hạn mức và tự chờ đúng cooldown. |
| **Send `<số tiền>` USDC safely** | Kiểm tra trước bằng `/intents/preview`, giữ đúng nonce vừa kiểm tra và chỉ gửi lên Solana khi cả bảy cổng đều cho phép. Nếu trạng thái thay đổi trước lúc gửi, backend và chương trình sẽ kiểm tra lại. Các tình huống vượt cap hoặc sai địa chỉ được thử trong Policy Lab, không tốn phí. |
| **Revoke** | Ký `revoke_grant` bằng ví chủ (hoặc revoke qua backend nếu đang ở chế độ mock); sau khi revoke, mọi lệnh thực thi tiếp theo đều bị từ chối với lỗi `Revoked` |

> Đây là nơi **duy nhất** trong toàn dashboard để khởi động agent. Trang Agents chỉ để publish agent version và xem số liệu thật của chúng (số grant, tổng đã chi, số lần chuyển).

## 7. Theo dõi kết quả

### Dashboard
- Khối **"Live Grants · ON-CHAIN"**: tổng hợp số grant đang hoạt động/đã revoke, thanh tiến độ chi tiêu tổng, tối đa 3 grant gần nhất kèm link Explorer. Bấm **"Go to Guardrails →"** để quay lại trang quản lý grant.
- Khối **Live Feed** (dạng terminal): stream trực tiếp mọi sự kiện qua SSE — ví dụ `grant created`, `agent runtime started`, `intent #n · transfer X USDC → <đích>`, `precheck · all gates passed`, `on-chain ALLOW · spent X USDC`, `on-chain REJECT · <mã lỗi> · nothing moved`, `owner revoked grant`. Nếu backend chưa chạy: *"Start the backend (cd backend && npm run dev) to see live events."*

### Audit
Vào mục **Audit** để xem đầy đủ lịch sử (không chỉ 12 dòng gần nhất như Live Feed):
- 4 thẻ thống kê: Total Events, On-chain Sigs, **Corroborated**, TX Rejected.
- Ô tìm kiếm theo sự kiện/chữ ký/mã lỗi, dropdown lọc theo grant, nút **Refresh**.
- Bảng chi tiết: Thời gian, Sự kiện, Mô tả, **Source**, chữ ký (link Explorer nếu là giao dịch thật).

> **Về cột Source và thẻ Corroborated.** Bảng này có *hai* nguồn ghi độc lập: runtime ghi lại thứ nó gửi đi và kết quả nhận về, còn indexer tự giải mã log của chính program rồi ghi bản của riêng nó — cho cả giao dịch của hệ thống lẫn của bất kỳ ai khác. Dòng gắn nhãn `chain log` đến từ nguồn thứ hai.
>
> Khi một chữ ký có đủ cả hai bản ghi, dòng đó mang biểu tượng khiên và được đếm vào **Corroborated**: lời khai của server khớp với log của chuỗi. Đây là điểm mấu chốt — bạn không cần tin server, vì có một bản ghi thứ hai đọc thẳng từ chuỗi để đối chiếu.
- Nếu backend không kết nối được: banner đỏ **"Backend Unreachable"** kèm hướng dẫn khởi động lại backend.

## 8. Các mã lỗi khi bị từ chối (theo đúng thứ tự kiểm tra on-chain)

`REVOKED` → `EXPIRED` → `NONCE_REPLAY` → `MINT_NOT_ALLOWED` → `DESTINATION_NOT_ALLOWED` → `TX_CAP_EXCEEDED` / `SPEND_CAP_EXCEEDED` → `COOLDOWN_ACTIVE`

Chỉ cần một điều kiện không thoả, chương trình từ chối và **không có gì được chuyển** — số dư token trước/sau giao dịch giữ nguyên.

## 9. Xử lý sự cố nhanh

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| Không thấy ví nào trong dropdown "Connect Solana" | Chưa cài ví hỗ trợ Wallet Standard (Phantom, Solflare...) |
| Nút ký báo "Backend offline" | Backend chưa chạy hoặc `VITE_API_URL` sai |
| "vault not initialised — sign a grant first" mãi không hết | Chưa hoàn tất bước ký `create_grant` đầu tiên (vault được tạo trong chính bước đó) |
| Không tạo được grant / thiếu allowlist | Backend/`.env` chưa có `VITE_DEMO_USDC_MINT`/`VITE_DEMO_OPS_DESTINATION` — chạy `npm run devnet:setup` trong `backend/` |
| Live Feed / Audit báo mất kết nối | Backend đang tắt hoặc SSE bị chặn — kiểm tra `cd backend && npm run dev` |
| Giao dịch bị `Revoked` dù mới tạo grant | Grant đã được revoke trước đó (kiểm tra trạng thái ở "Active Policy Accounts") |

## 10. Marketplace, Agents và Analytics

Ba trang này dùng dữ liệu thật, không phải mô phỏng:

- **Agents** — bấm **Publish Agent Version** để đăng ký một phiên bản agent thật (`agentHash` là SHA-256 thật của model/code/config). Mỗi agent hiển thị số grant, tổng đã chi, số giao dịch và lần hoạt động gần nhất.
- **Marketplace** — mỗi agent đã publish tự sinh một listing. Publisher bấm **Claim** để đặt ví nhận tiền và **đơn giá cho mỗi 24 giờ**; người khác chọn thời hạn (1d/3d/7d) rồi bấm **Rent** — ví sẽ gửi SOL thật, và backend đọc lại giao dịch đó trên Devnet để kiểm tra người ký, người nhận và số tiền (`đơn giá × số kỳ 24h`) trước khi ghi nhận hợp đồng.
  - Ví nhận tiền là **write-once**: listing đã có chủ thì ví khác không đổi được (403). Bạn cũng không thể tự thuê agent do chính mình publish.
- **Analytics** — tính từ audit trail của các grant thuộc ví đang kết nối: tổng volume, tỉ lệ được duyệt, độ trễ quyết định trung bình, volume 7 ngày.

## Tài liệu liên quan

- [docs/TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) — kiến trúc chi tiết
- [docs/SECURITY.md](SECURITY.md) — mô hình đe doạ và các nguyên tắc an toàn
- [docs/DEMO_SCRIPT.md](DEMO_SCRIPT.md) — kịch bản demo 3 phút
- [backend/README.md](../backend/README.md) — API, biến môi trường, chế độ `mock`/`solana`
