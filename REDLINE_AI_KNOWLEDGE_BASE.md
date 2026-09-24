# 🛡️ REDLINE - Document Cơ Sở Kiến Thức Cho AI Training (Knowledge Base)

> **Tài liệu này mô tả chi tiết về hệ thống website REDLINE, kiến trúc, tính năng, và các quy tắc hoạt động để nạp vào AI Copilot / LLM.**

---

## 📌 1. Tổng Quan Về REDLINE (Overview)

- **REDLINE** là Lớp Bảo Vệ Lập Trình Được (**Programmable Safety Layer**) dành cho các **DeFi AI Agent tự động trên mạng Solana**.
- **Slogan cốt lõi**: *"The agent proposes · The chain decides · Nobody can talk it out of the answer."* (Agent đề xuất · Blockchain quyết định · Không ai có thể thuyết phục Blockchain thay đổi kết quả).
- **Vấn đề REDLINE giải quyết**:
  - *Duyệt thủ công (Multisig)*: An toàn nhưng chậm, tốn thời gian phối hợp.
  - *Giao toàn quyền ví cho Bot*: Nhanh nhưng cực kỳ rủi ro (lỗi code, prompt injection, hoặc hack server có thể làm dọn sạch toàn bộ kho tiền).
  - *Giải pháp REDLINE*: Chủ ví chỉ cần ký cấp phép một lần với các giới hạn cứng (Cap limit, Allowlist, Cooldown, Expiry). Agent chỉ được quyền **đề xuất giao dịch**, còn **Solana Smart Contract sẽ thực thi kiểm tra và quyết định cho phép hay chặn**.

---

## 2. Kiến Trúc & Nguyên Lý Hoạt Động (Architecture & How It Works)

```text
[Chủ ví (Owner)] ──Ký create_grant──► [Vault PDA + Grant PDA (Solana Program)]
                                                ▲
[Agent Runtime] ──Gửi execute_transfer(...)────┤  🚦 7 Gates Kiểm Tra
                                                │  ├── 🟢 Hợp lệ ──► Chuyển tiền qua CPI
                                                │  └── 🔴 Vi phạm ──► Trả mã lỗi & Không có tiền nào di chuyển
                                                │
[Indexer & SSE] ◄── Lắng nghe sự kiện ─────────┘ ──► Audit Trail & Dashboard
```

1. **Non-Custodial Vault (Vault PDA)**: Tài sản gửi vào kho lưu trữ PDA do Program kiểm soát. Backend REDLINE không bao giờ nắm giữ private key của người dùng.
2. **Ký duyệt chính sách (Create Grant)**: Chủ ví ký cấp phép 1 lần duy nhất quy định: loại token nào, chuyển cho ai, hạn mức chi tiêu bao nhiêu, bao nhiêu giao dịch, thời gian chờ giữa các lệnh và thời hạn hiệu lực.
3. **Thực thi có giới hạn (Bounded Execution)**: Agent gọi `execute_transfer`. Smart Contract trên Solana sẽ chạy đồng thời 7 Cổng An Toàn (**The Seven Gates**) ngay trong transaction đó.
4. **Tính nguyên tử (Atomicity)**: Nếu vi phạm dù chỉ 1 cổng, cả transaction bị hoàn trả (Revert) với mã lỗi rõ ràng, số dư trước và sau giao dịch giữ nguyên 100%.

---

## 🚦 3. Bảy Cổng An Toàn On-Chain (The Seven Gates)

Kiểm tra theo đúng thứ tự bắt buộc trên Blockchain trước khi một đồng token nào được phép di chuyển:

| # | Cổng An Toàn | Mã Lỗi (Reason Code) | Lý Do Từ Chối (Rejection Reason) |
|---|---|---|---|
| 1️⃣ | **Gate 1** | `REVOKED` | Chủ ví đã chủ động thu hồi (Revoke) quyền của Grant này. |
| 2️⃣ | **Gate 2** | `EXPIRED` | Grant đã vượt quá thời gian hiệu lực (Expiry time). |
| 3️⃣ | **Gate 3** | `NONCE_REPLAY` | Nonce của ý định bị phát lại hoặc sai thứ tự giao dịch. |
| 4️⃣ | **Gate 4** | `MINT_NOT_ALLOWED` | Token được đề xuất không nằm trong danh sách allowlist đã ký. |
| 5️⃣ | **Gate 5** | `DESTINATION_NOT_ALLOWED` | Địa chỉ ví nhận tiền không nằm trong danh sách allowlist đã ký. |
| 6️⃣ | **Gate 6** | `TX_CAP_EXCEEDED` / `SPEND_CAP_EXCEEDED` | Giao dịch vượt quá tổng số lượng lệnh hoặc vượt hạn mức ngân sách (USDC cap). |
| 7️⃣ | **Gate 7** | `COOLDOWN_ACTIVE` | Agent thực hiện giao dịch quá nhanh, chưa hết thời gian chờ giữa 2 lần chuyển. |

---

## 🌐 4. Các Chức Năng Chính Trên Website (Website Pages & Features)

### 1. **Dashboard Overview (`/#/` hoặc `/#/dashboard`)**
- Hiển thị bức tranh toàn cảnh về hệ thống: số lượng Grant đang hoạt động, khối lượng giao dịch đã duyệt, tỷ lệ tuân thủ và tổng quan số tiền được bảo vệ.

### 2. **Policy Builder & Policy Lab (`/#/simulation` / `/#/lab`)**
- Quy trình 4 bước thiết lập chính sách (Asset scope, Spend/Tx limits, Cooldown, Expiry).
- Giả lập kiểm tra 7 Gates mà không cần kết nối ví thật hay tốn phí gas.

### 3. **REDLINE Copilot (`/#/copilot`)**
- Trợ lý AI tư vấn và giải đáp dựa trên dữ liệu thực tế (Grounded Assistant).
- Phân tích nguyên nhân vì sao giao dịch bị từ chối, giải thích chi tiết về 7 Gates và đưa ra 3 bước xử lý tiếp theo phù hợp.

### 4. **Agent Marketplace (`/#/marketplace`)**
- Nơi các nhà phát triển đăng tải bản dựng Agent với `agentHash` cố định (immutable).
- Người dùng có thể thuê Agent bằng SOL thật (xác thực giao dịch thanh toán trực tiếp từ Solana Devnet).

### 5. **Audit Trail & Indexer (`/#/audit`)**
- Nhật ký ghi lại toàn bộ đề xuất, quyết định `ALLOW`/`REJECT` và chữ ký giao dịch on-chain công khai. Không ai có thể chỉnh sửa nhật ký này.

### 6. **Analytics (`/#/analytics`)**
- Báo cáo phân tích chuyên sâu về khối lượng giao dịch, phân bổ lỗi từ chối, độ trễ đưa ra quyết định của chính sách.

### 7. **Treasury & Vault Management (`/#/treasury`)**
- Nạp tiền vào Vault PDA, theo dõi số dư, rút tiền (Withdraw) hoặc thu hồi quyền Agent (Revoke) ngay lập tức từ ví cá nhân.

---

## 💡 5. Quy Tắc & Mẫu Trả Lời Chuẩn Cho AI Copilot (AI Behavior Rules)

### Quy tắc phản hồi của Copilot:
1. **Dựa trên dữ liệu thực tế (Grounded)**: Mọi con số về Grant, số dư, số lệnh bị từ chối phải trích xuất từ dữ liệu ledger thực tế, không tự bịa đặt.
2. **Deterministic Rules**: Các câu hỏi về số liệu vận hành và 7 Gates sẽ ưu tiên câu trả lời chính xác từ bộ quy tắc mã nguồn.
3. **Đưa ra giải pháp cụ thể**: Luôn đề xuất tối đa 3 hành động khắc phục tiếp theo (Ví dụ: tạo Grant mới khi hết hạn, chọn địa chỉ allowlist hợp lệ, giảm hạn mức chuyển).
4. **Hỗ trợ đa ngôn ngữ**: Trả lời cùng ngôn ngữ với người dùng (tiếng Việt hoặc tiếng Anh).

---

## ❓ 6. Các Câu Hỏi Thường Gặp (FAQ Cho AI Training)

**Q: Agent hoặc Copilot có thể tự chuyển tiền ra khỏi ví tôi không?**
> **Trả lời:** Không. Agent chỉ có quyền tạo đề xuất giao dịch (`execute_transfer`). Việc chuyển tiền được quyết định hoàn toàn bởi Smart Contract trên Solana dựa trên Grant mà bạn đã ký. Copilot và Backend không nắm giữ private key của bạn.

**Q: Nếu Bot nhiễm Prompt Injection hoặc lỗi code thì sao?**
> **Trả lời:** Dù Bot bị thao túng hoặc tính toán sai, nó vẫn bị chặn tuyệt đối ở Smart Contract nếu giao dịch vượt quá ngân sách (`SPEND_CAP_EXCEEDED`) hoặc gửi tới ví lạ (`DESTINATION_NOT_ALLOWED`).

**Q: Khi Grant bị hết hạn (`EXPIRED`) hoặc thu hồi (`REVOKED`), làm sao để chạy lại?**
> **Trả lời:** Grant đã hết hạn hoặc bị thu hồi là bất biến trên blockchain và không thể sửa đổi hay kích hoạt lại. Bạn cần rà soát và ký một Grant mới từ giao diện website.
