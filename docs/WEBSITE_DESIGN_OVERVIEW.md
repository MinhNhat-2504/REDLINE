# 🌐 BẢN MÔ TẢ THIẾT KẾ & TỔNG QUAN HỆ THỐNG REDLINE DAPP

Document Version: 1.0  
Status: Live on Solana Devnet  
Repository: NguyenPhong2912/REDLINE  

---

## 💡 1. TỔNG QUAN VỀ REDLINE
**REDLINE** là lớp bảo vệ lập trình được (**Programmable Safety Layer**) dành cho các Agent tài chính tự động (AI DeFi Agents) trên mạng lưới **Solana Blockchain**.

* **Triết lý cốt lõi:** *"The agent proposes. The chain decides."* (AI Agent đề xuất — Smart Contract trên Blockchain quyết định).
* **Bài toán giải quyết:** Ngăn chặn rủi ro Agent bị hack, lỗi mã nguồn hoặc bị prompt injection gây thất thoát tài sản. Chủ sở hữu đặt ra giới hạn cứng (hạn mức chi tiêu, địa chỉ nhận, thời gian hết hạn, cooldown) và ký xác nhận **1 lần**. Smart Contract bắt buộc thực thi 100% các quy định này cho mọi giao dịch.

---

## 🏗️ 2. KIẾN TRÚC THIẾT KẾ & CÔNG NGHỆ (TECH STACK)

```text
[ Browser (React 19 + Wallet Standard) ]
       │
       ├─► Ký giao dịch on-chain (init_vault, create_grant, revoke, withdraw) ──► Solana Devnet (Anchor Program)
       │
       └─► Gọi REST API / Nhận dữ liệu thời gian thực (SSE) ──────────────────► REDLINE Backend (Fastify + Postgres)
```

* **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion (Animations), Recharts (Biểu đồ), `@solana/kit` (Ví Phantom / Solflare).
* **Backend:** Node.js, Fastify 5, Prisma ORM, PostgreSQL database, SSE (Server-Sent Events) live feed.
* **Smart Contract (On-Chain):** Rust, Anchor Framework 0.32, Solana Devnet (`Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4`).

---

## 🗺️ 3. BẢN ĐỒ GIAO DIỆN WEB (FULL PAGE BREAKDOWN)

Hệ thống bao gồm 8 phân khu giao diện chính nằm trên thanh Menu chính (Sidebar):

### 1️⃣ Protocol (Trang Chủ / Overview)
* **Spatial Hero Backdrop:** Giao diện nghệ thuật giới thiệu sứ mệnh bảo vệ tài chính tự động.
* **Live Policy Backbone (`ProtocolSpine`):** Sơ đồ luồng hiển thị 7 cổng kiểm tra trực quan từ `AGENT` ➔ `Cổng 01-07` ➔ `VAULT`.
* **4 Chương Giới Thiệu (Chapters):**
  1. *Chapter 01 / Enforcement:* Mô hình 7 cổng chặn giao dịch.
  2. *Chapter 02 / Evidence:* Bằng chứng xác minh on-chain qua Live Feed thời gian thực.
  3. *Chapter 03 / Ownership:* Danh sách các chính sách đang hoạt động (`Live Grants`).
  4. *Chapter 04 / Interrogate:* **Protocol Console** — Khung lệnh tương tác cho phép hỏi đáp bằng tiếng Anh/Việt hoặc gõ lệnh tra cứu (`gates`, `explain SPEND_CAP_EXCEEDED`).

### 2️⃣ Guardrails (Trung Tâm Cấu Hình & Chạy Agent)
Đây là **trụ sở điều khiển chính** của người dùng:
* **Khối Active Policy Accounts:** 
  * Quản lý các Grant (chính sách) đang hoạt động.
  * Hiển thị đếm ngược thời gian hết hạn (`expiresAt`), số tiền đã tiêu / tổng hạn mức, số giao dịch đã thực hiện.
  * **Nút bấm điều khiển:**
    * `Start agent (scripted)`: Khởi động Agent chạy tự động theo chính sách đã ký.
    * `Force <cap> USDC (over cap)`: Cố tình gửi lệnh vượt hạn mức để test khả năng chặn của Smart Contract.
    * `Revoke`: Hủy quyền hoạt động của Agent ngay lập tức từ ví chủ.
    * `Show every proposal`: Mở nhật ký chi tiết từng đề xuất của Agent kèm link Solana Explorer.
* **Wizard 4 bước tạo Policy mới:**
  1. *Scope:* Chọn Agent, loại Token cho phép (SOL, USDC, JUP...), danh sách địa chỉ nhận (`allowedDestinations`).
  2. *Spend Limits:* Cài đặt hạn mức chi tiêu tổng (USDC) & số giao dịch tối đa.
  3. *Time Bounds:* Cài đặt thời hạn chính sách (giờ) & thời gian nghỉ giữa các lần thực thi (cooldown phút).
  4. *Review & Sign:* **AI Risk Copilot** đánh giá điểm rủi ro (ALLOW / REVIEW / BLOCK), sau đó người dùng bấm `Sign & create on-chain grant` để ký ví tạo Grant thật trên Solana.

### 3️⃣ Treasury (Quản Lý Quỹ & Vault)
* **Program Vault (PDA):** Nơi giữ tài sản an toàn thuộc sở hữu của chương trình Solana (chỉ có chương trình mới có quyền chuyển tiền khi hợp lệ).
* **Số dư:** Hiển thị số dư SOL trong ví chủ và dUSDC trong Vault.
* **Thao tác:**
  * `Refill 1,000 (devnet)`: Nạp tiền dUSDC demo miễn phí để thử nghiệm.
  * `Withdraw`: Rút tiền dUSDC từ Vault về lại ví chủ (ký trực tiếp bằng ví chủ, không qua rào cản Agent).

### 4️⃣ Audit (Nhật Ký & Bằng Chứng On-Chain)
* **Bảng đối soát dữ liệu:** Hiển thị 100% lịch sử giao dịch và sự kiện.
* **Tính năng Corroborated Evidence (Bằng chứng đối chiếu):** So sánh dữ liệu ghi nhận bởi Backend Server với Nhật ký sự kiện giải mã trực tiếp từ Solana Blockchain. Dòng nào có biểu tượng khiên bảo vệ nghĩa là thông tin server hoàn toàn trùng khớp với Blockchain.

### 5️⃣ Marketplace (Chợ Thuê Agent)
* Nơi đăng tải các phiên bản Agent đã đóng gói.
* Người dùng có thể chọn thời hạn (1 ngày / 3 ngày / 7 ngày) và bấm **Rent** để thuê Agent bằng SOL thật.
* Backend tự động đối chiếu giao dịch chuyển SOL trên Solana Devnet trước khi cấp quyền thuê.

### 6️⃣ Agents (Quản Lý Phiên Bản Agent)
* Quản lý danh sách các phiên bản Agent (`AgentVersion`) do người dùng phát triển.
* Ghi lại mã băm định danh cố định `agentHash` (được tính bằng SHA-256 từ mã nguồn/model/cấu hình).

### 7️⃣ Analytics (Thống Kê & Phân Tích)
* Biểu đồ khối lượng giao dịch USDC xác nhận trên chuỗi trong 7 ngày.
* Thống kê tỷ lệ chấp thuận/từ chối giao dịch và độ trễ xử lý (Latency ms).

### 8️⃣ Settings (Cài Đặt Hệ Thống)
* Cấu hình kết nối mạng Solana (Devnet), địa chỉ backend API, hiển thị thông tin ví đang kết nối.

---

## 🚦 4. CƠ CHẾ 7 CỔNG KIỂM TRA BẢO MẬT (THE SEVEN GATES)

Smart Contract thực hiện 7 bước kiểm tra theo đúng thứ tự sau trong cùng **1 giao dịch duy nhất** trước khi chuyển tiền:

| STT | Cổng kiểm tra (Gate) | Lý do bị từ chối (Rejection Reason) |
|:---:|---|---|
| 1️⃣ | `REVOKED` | Chính sách đã bị chủ sở hữu hủy bỏ |
| 2️⃣ | `EXPIRED` | Chính sách đã hết thời hạn cho phép |
| 3️⃣ | `NONCE_REPLAY` | Lệnh bị gửi trùng lặp (lỗi Replay Attack) |
| 4️⃣ | `MINT_NOT_ALLOWED` | Loại token không nằm trong danh sách cho phép |
| 5️⃣ | `DESTINATION_NOT_ALLOWED` | Địa chỉ nhận tiền không nằm trong danh sách trắng (`allowedDestinations`) |
| 6️⃣ | `SPEND_CAP_EXCEEDED` / `TX_CAP_EXCEEDED` | Vượt quá ngân sách USDC hoặc vượt số lượt giao dịch cho phép |
| 7️⃣ | `COOLDOWN_ACTIVE` | Thực hiện giao dịch quá nhanh khi chưa hết thời gian nghỉ (cooldown) |

> 🧯 **Quy tắc tuyệt đối:** Nếu thất bại ở bất kỳ 1 cổng nào, toàn bộ giao dịch sẽ thất bại, số dư tài sản trước và sau giao dịch giữ nguyên 100%.

---

## 🔄 5. LUỒNG THAO TÁC TRẢI NGHIỆM CHUẨN (END-TO-END FLOW)

```text
[ 1. Kết nối ví ] ──► [ 2. Nạp tiền Vault ] ──► [ 3. Tạo & Ký Grant ] ──► [ 4. Chạy Agent & Audit ]
  Góc trên bên phải      Vào Treasury bấm        Vào Guardrails điền      Vào Guardrails bấm
  bấm Connect Solana     Refill 1,000 dUSDC      wizard -> Sign Grant      Start Agent & Xem Audit
```

---

## 📝 6. TÓM TẮT DÀNH CHO ĐỘI NGŨ HỖ TRỢ / TRỢ LÝ
* Khi hỗ trợ người dùng tạo Grant nhưng không ký được ➔ Kiểm tra xem ví đã chọn đúng mạng **Devnet** và có SOL trả phí chưa.
* Khi Agent bị dừng hoặc không chuyển được tiền ➔ Kiểm tra tab **Guardrails** / **Audit** để xem Agent vướng vào cổng nào trong **7 Gates** (ví dụ: vướng `COOLDOWN_ACTIVE` hay `SPEND_CAP_EXCEEDED`).
* Nút **Revoke** ở Guardrails và nút **Withdraw** ở Treasury là 2 công cụ cấp cứu nhanh nhất cho chủ sở hữu nếu muốn khóa hoặc rút toàn bộ tiền về ví ngay lập tức.
