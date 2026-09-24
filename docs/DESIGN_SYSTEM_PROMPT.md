# REDLINE — Design System Prompt (dùng cho AI coding tool)

> Dán nguyên văn phần này vào đầu phiên làm việc với Cursor / v0 / Lovable... trước khi yêu cầu dựng hoặc chỉnh sửa bất kỳ màn hình nào của REDLINE. Đây là quy tắc thiết kế dùng chung cho toàn bộ 8 trang, không phải riêng 1 component.

## Bối cảnh sản phẩm
REDLINE là lớp bảo vệ lập trình được cho AI DeFi Agent trên Solana. Triết lý cốt lõi: "The agent proposes. The chain decides." — agent chỉ ĐỀ XUẤT hành động, smart contract mới QUYẾT ĐỊNH, qua 7 cổng kiểm tra bắt buộc theo đúng thứ tự trong cùng một giao dịch.

Sản phẩm đã chạy thật trên Devnet — **giữ nguyên type scale, spacing và các component nền tảng đã có trong codebase hiện tại.** Các quy tắc dưới đây là lớp bổ sung (màu sắc, cách dùng kính, quy ước font, component 7-cổng, tách biệt nút nguy hiểm, tiết chế chuyển động) — không phải viết lại từ đầu.

**Nguyên tắc cảm xúc bao trùm:** đây là sản phẩm về sự ràng buộc và bằng chứng, không phải sự phấn khích. Giao diện nên gợi cảm giác két sắt/buồng lái — chính xác, điềm tĩnh — không dùng năng lượng kiểu sàn giao dịch/casino (số nhấp nháy, gradient rực rỡ, hiệu ứng ăn mừng) ở bất kỳ đâu ngoài trang Protocol.

## Hai giọng thiết kế
- **Protocol** (trang giới thiệu): được phép "diễn" — hiệu ứng kính, chuyển động, kể chuyện.
- **Guardrails / Treasury / Audit / Analytics / Marketplace / Agents / Settings**: mật độ cao, phẳng, quét nhanh, nhất quán. KHÔNG hiệu ứng kính, KHÔNG hover-lift trang trí, KHÔNG chuyển động không cần thiết.

## Design tokens
```css
@theme {
  --color-canvas: #eef1f5;
  --color-canvas-deep: #e4e9f0;
  --color-ink: #0f172a;         /* tiêu đề + dữ liệu quan trọng nhất: hạn mức, địa chỉ, số tiền, trạng thái cổng */
  --color-ink-muted: #475569;   /* mô tả phụ — vẫn phải đạt tối thiểu 4.5:1 (WCAG AA) trên nền nó đứng */

  /* Trạng thái — bão hòa, KHÔNG pastel, chỉ dùng ở đúng khoảnh khắc có nghĩa */
  --color-info: #3b82f6;
  --color-verified: #0f766e;    /* qua cổng / ALLOW / khớp on-chain */
  --color-blocked: #b45309;     /* bị chặn / BLOCK / evidence lệch */

  /* Bề mặt kính — CHỈ dùng ở trang Protocol */
  --glass-surface: rgba(239, 246, 255, 0.65);
  --glass-border: rgba(51, 65, 85, 0.25);
  --glass-shadow: 0 12px 32px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.5);

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

## Quy tắc bắt buộc

**1. Font mono = sự thật on-chain, font sans = diễn giải.**
Mọi dữ liệu thô xác minh được — địa chỉ ví, `agentHash`, số USDC, mã lỗi cổng (`SPEND_CAP_EXCEEDED`, `COOLDOWN_ACTIVE`...), timestamp, chữ ký giao dịch — luôn dùng `--font-mono`. Tiêu đề, mô tả, nhãn dùng `--font-sans`. Không trộn lẫn hai vai trò này.

**2. Kính chỉ để làm rõ cấu trúc, không phải làm mờ thêm.**
Nếu dùng `--glass-surface`: độ đục phải đủ cao (~65%, không phải công thức kính-nền-tối phổ biến 10–20%) để chữ luôn đọc được. `--glass-border` phải nhìn rõ — không dùng viền trắng trên nền sáng vì gần như vô hình. Nền phía sau bề mặt kính bắt buộc có biến thiên màu thật (không phẳng đều) thì kính mới "đọc" được là kính.

**3. Không rải đều tương phản.**
Dữ liệu quan trọng nhất dùng `--color-ink`, đậm nhất có thể. Mô tả phụ mới dùng `--color-ink-muted`. `--color-verified` / `--color-blocked` chỉ xuất hiện ở đúng khoảnh khắc mang nghĩa (đã qua cổng, bị chặn, evidence khớp/lệch) — không dùng trang trí.

**4. "7 Cổng" là một component tái sử dụng, không phải hình vẽ một lần.**
Xây một component chuỗi-cổng dùng chung ở 3 ngữ cảnh, cùng một ngôn ngữ hình ảnh:
- Đầy đủ — sơ đồ hero ở Protocol
- Rút gọn, đánh dấu đúng cổng chặn — khi một giao dịch bị từ chối ở Guardrails
- Dạng icon/badge theo dòng — mỗi dòng log ở Audit

**5. Nút hành động không thể hoàn tác phải tách biệt vị trí.**
`Revoke`, `Force <cap> (over cap)`, `Withdraw` không xếp chung hàng đều với nút thao tác thường. Cách ly bằng khoảng trắng/khu vực riêng, dùng `--color-blocked` cho viền hoặc icon, cân nhắc thêm bước xác nhận.

**6. Màn Review & Sign (bước 4 của wizard) là màn rủi ro cao nhất.**
Trước nút ký ví: bắt buộc có bản tóm tắt bằng ngôn ngữ thường (không chỉ liệt kê tham số thô) về đúng những gì đang được cấp quyền. Risk Copilot hiện lý do đánh giá, không chỉ nhãn ALLOW/REVIEW/BLOCK.

**7. Chuyển động: chỉ đầu tư nghiêm túc vào live feed (SSE).**
Hiển thị một giao dịch thật sự "đi qua" từng cổng theo thời gian thực ở Guardrails/Audit. Không thêm hover-lift, fade-in-on-scroll hay hiệu ứng entrance ở nơi khác, nhất là các trang vận hành.

## Không được làm
- Không tách nội dung tuần tự thành nhiều card bo góc giống hệt nhau dùng chung một bóng đổ xám nhạt mặc định — mô-típ "thẻ SaaS" rất dễ nhận ra và nhàm.
- Không dùng gradient nhiều màu ngẫu nhiên làm nền trang trí không lý do.
- Không đưa hiệu ứng kính vào bất kỳ trang vận hành nào.
- Không để màu trạng thái ở dạng pastel — chúng mang nghĩa, phải đủ bão hòa để nhìn là hiểu ngay.
