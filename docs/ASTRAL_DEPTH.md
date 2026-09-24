# REDLINE Astral Depth — giao diện artifact

Bản FE hiện hành thay khung bố cục và hệ CSS cũ bằng thiết kế từ `design/astral-depth/artboards/`. Các file `.dc.html` là tài liệu thiết kế; mã `DCLogic`, địa chỉ ví, giao dịch và số liệu mẫu trong đó không được thực thi trong ứng dụng.

## Cấu trúc hiện hành

- `src/app/App.tsx`: header chung, điều hướng hash, topline, menu mobile, tìm trang và vùng cuộn riêng.
- `src/app/frontend/Pages.tsx`: Protocol, Agents, Analytics, Audit; dữ liệu từ API hiện có.
- `src/app/OperationalPages.tsx`: Marketplace, Guardrails, Treasury, Settings và luồng ký ví hiện có.
- `src/app/components/ArtifactPages.tsx`: Copilot, Models, Profile.
- `src/styles/frontend.css`: điểm nhập CSS duy nhất. Gồm fonts, Tailwind, semantic tokens, CSS gốc artifact, các widget nghiệp vụ và responsive.
- `scripts/sync-artifact-styles.mjs`: lấy CSS từ artboard và giới hạn selector theo route. Chạy `node scripts/sync-artifact-styles.mjs` khi cập nhật bản thiết kế. Không chạy logic mẫu trong artboard.
- Các file giao diện cũ `index.css`, `astral.css`, `layout.css`, `hoyoverse.css`, `pixel-onchain.css`, `astral-depth.css` không còn được import vào ứng dụng.

## Ánh xạ thiết kế và dữ liệu

| Trang | Bố cục | Dữ liệu / tương tác |
|---|---|---|
| Protocol | Hero Georgia italic, sentinel, dòng nước, bảy gate, sách Three Worlds, bốn thẻ chapter, policy lab, chuỗi block | Explore tới Three Worlds; sách đổi trang; lab mô phỏng; block mở chữ ký Solana thật; Ownership mở Guardrails và Interrogate mở Copilot |
| Marketplace | Spotlight + coverflow + bảng registry | Tìm theo tên/strategy, chọn phiên bản, thời hạn thuê, tổng SOL, xác minh giao dịch thuê ở backend |
| Agents | Rail phiên bản + thẻ định danh lật + form xuất bản | Registry, hash, grants, số chi tiêu; xuất bản phiên bản mới qua API |
| Guardrails | Policy deck + wizard + transfer lane | Giữ các bước scope, hạn mức, thời gian, review/risk assessment và ký ví |
| Treasury | Vault 3D + ví + hoạt động chain | Số dư vault thật; mỗi voxel tương ứng 1.000 dUSDC, tối đa 12; nạp/rút giữ luồng cũ |
| Audit | KPI + bộ lọc + timeline + chi tiết | Tìm payload/signature, lọc loại sự kiện, mở Explorer, tải thêm từng 100 dòng |
| Analytics | Bento KPI, diện tích volume, outcomes, ranking, cột ngày | API analytics, phạm vi owner nếu kết nối ví; chưa tải được hiện dấu — |
| Settings | Sidebar + panel cấu hình | API health; thông số mạng chỉ đọc; tùy chọn depth/motion lưu trên thiết bị |
| Copilot | Stack thông tin + console + trạng thái | Assistant API với model hoặc deterministic fallback; không có quyền ký |
| Models | Model identity + KPI + latency + trust boundary | Chạy request thật; biểu đồ 12 phép đo gần nhất trong phiên; không bịa tok/s, TTFT, phần cứng hay kết quả đánh giá |
| Profile | Owner identity + KPI + volume 7 ngày | Analytics theo ví; không lặp một tuần thành nhiều tuần hoạt động |

## Chuyển động và co giãn

Desktop dùng toàn chiều ngang với khoảng đệm của bản 1440px; có breakpoint 1400/1180/760px. Rail, bảng registry, bảy gate và chuỗi block cuộn trong vùng riêng khi thiếu chiều ngang. Trên điện thoại, form và các panel chuyển sang một cột.

`prefers-reduced-motion` hoặc tắt Motion loại bỏ animation và cuộn mượt. Depth giảm phối cảnh của các panel/cảnh chính. Tùy chọn được lưu độc lập với route; thao tác reload không làm bật lại lựa chọn đã tắt. Âm thanh do nút Sound trên header điều khiển, mặc định theo thiết lập đã lưu.

## Kiểm tra và giới hạn

Chạy `npm run check` trước khi phát hành. Kiểm tra trình duyệt ở 1440px, 1920px và 390px, gồm menu, điều hướng Three Worlds, chọn phiên bản, lật thẻ, lab, tìm kiếm và cài đặt. Không tự thực hiện giao dịch ví trong quá trình QA giao diện.

Các màn dùng dữ liệu thật có trạng thái trống khác artboard mẫu khi chưa có ví hoặc chưa có bản ghi. Tính năng benchmark chỉ đo tổng thời gian phản hồi của request; backend có thể trả `source: rules` nếu model không khả dụng. Trạng thái DESIGN mô tả ranh giới thiết kế, không phải kết quả chạy bộ đánh giá tự động.
