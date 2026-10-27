import { ArrowRight, BookOpen, Check, Play, ShieldCheck, Wallet } from "lucide-react";
import { useLang } from "../i18n/LanguageContext";

export function GuidePage({ setNav }: { setNav?: (index: number) => void }) {
  const { lang } = useLang();
  const vi = lang === "vi";
  const steps = vi ? [
    { title: "Kết nối ví và đăng nhập", detail: "Bấm Kết nối ví ở góc trên. Sau khi kết nối, bấm Đăng nhập và xác nhận chữ ký trong ví. Bước đăng nhập chỉ ký tin nhắn để xác minh bạn sở hữu ví.", action: "Về tổng quan", route: 0, icon: Wallet },
    { title: "Tạo chính sách chi tiêu", detail: "Mở quyền của agent hoặc Tạo chính sách trong Hạn mức chi. Kết nối ví, nhập người nhận và tổng ngân sách dUSDC. Số lệnh và thời hạn có thể chỉnh khi cần. Bấm Kiểm tra và xem lại, đọc quyền và kết quả rủi ro, rồi tiếp tục đến bước ký.", action: "Mở Hạn mức chi", route: 6, icon: ShieldCheck },
    { title: "Kiểm tra và nạp quỹ", detail: "Mở Quỹ để xem số dư. Token thử nghiệm được nạp khi tạo chính sách nếu quỹ trống. Chỉ nạp thêm khi cần bằng nút Nạp 1.000 dUSDC thử nghiệm. Bạn cần SOL Devnet trong ví để trả phí mạng.", action: "Mở Quỹ", route: 4, icon: Wallet },
    { title: "Chạy agent và xem kết quả", detail: "Mở chính sách của agent và bấm Chạy agent. Lượt thử yêu cầu tối đa ba thanh toán, vẫn chịu hạn mức đã ký. Tình huống vượt quyền có thể thử trong mô phỏng không cần ví. Mở Hoạt động để xem kết quả xác nhận.", action: "Quản lý chính sách", route: 6, icon: Play },
  ] : [
    { title: "Connect your wallet and sign in", detail: "Choose Connect Solana in the top bar. Once connected, choose Sign in and approve the message in your wallet. Signing in verifies ownership with a message signature.", action: "Open overview", route: 0, icon: Wallet },
    { title: "Create a spending policy", detail: "Open an agent's policy controls or choose Create policy in Spending limits. Connect your wallet and enter recipients and a total dUSDC budget. Customize limits when needed. Choose Check and review, read the permissions and risk findings, then continue to signing.", action: "Open Spending limits", route: 6, icon: ShieldCheck },
    { title: "Check and fund your vault", detail: "Open Vault to check your balance. Setup adds test tokens if the vault is empty. Top up only when needed using Add 1,000 test dUSDC. Your vault is created when you sign your first policy. Keep Devnet SOL in your wallet to pay network fees.", action: "Open Vault", route: 4, icon: Wallet },
    { title: "Start the agent and see results", detail: "Return to Spending limits. Under Your policies, choose Start agent. The current version attempts up to three payments, subject to the signed limits. Test rejection scenarios in the wallet-free simulation. Open Activity to see which payments transferred or were refused.", action: "Manage policies", route: 6, icon: Play },
  ];
  const questions = vi ? [
    ["Chưa có ví thì dùng thử được không?", "Được. Về Tổng quan và bấm Thử không cần ví. Chọn yêu cầu trong hoặc vượt ngân sách để xem kết quả giả định. Mô phỏng vẫn cần kết nối máy chủ."],
    ["Làm sao dừng agent?", "Trong chính sách đang chạy, Dừng lượt chạy này chỉ dừng lịch thực thi và vẫn giữ quyền chi. Thu hồi quyền kết thúc quyền chi sau khi giao dịch được xác nhận; thao tác này cần chữ ký ví chủ sở hữu."],
    ["Chính sách hết hạn thì sao?", "Agent không thể tiếp tục chuyển tiền theo chính sách đã hết hạn. Tạo chính sách mới nếu bạn muốn cấp quyền tiếp. Bạn vẫn có thể xem lịch sử trong Hoạt động."],
    ["Tại sao nút kiểm tra bị vô hiệu hóa?", "Kết nối ví, chọn agent đủ điều kiện, nhập địa chỉ Solana hợp lệ và ngân sách nguyên từ 10 đến 10.000 dUSDC. Chọn Kiểm tra và xem lại, rồi xem quyền trước khi tiếp tục đến bước ký."],
    ["Tại sao không thấy số dư hoặc dữ liệu?", "Kiểm tra kết nối ví, bấm Đăng nhập và đảm bảo ví đang ở mạng Devnet. Nếu máy chủ chưa sẵn sàng, chờ thông báo kết nối hoàn tất hoặc bấm Thử lại. Giao diện không hiển thị số liệu mẫu thay cho dữ liệu chưa tải được."],
    ["Các công cụ khác nằm ở đâu?", "Mở Thêm trên thanh điều hướng để tìm Marketplace, Phân tích, Copilot, Mô hình, Hồ sơ và Cài đặt. Trên điện thoại, mở nút menu ở góc trên."],
    ["Làm sao xem bằng chứng giao dịch?", "Mở Hoạt động, chọn sự kiện rồi mở liên kết Solana Explorer nếu sự kiện có chữ ký giao dịch. Địa chỉ, mã chính sách và nonce cũng có trong mục Chi tiết kỹ thuật của từng chính sách."],
  ] : [
    ["Can I try it without a wallet?", "Yes. Open Overview, then Try without a wallet. You can test a sample policy without connecting a wallet or submitting a transaction. The simulation still needs a connection to the server."],
    ["How do I stop an agent?", "Open its policy. Stop this run stops the execution schedule while keeping spending permission. Revoke access ends that permission after transaction confirmation and requires the owner's wallet signature."],
    ["What happens when a policy expires?", "The agent cannot transfer funds under an expired policy. Create a new policy to grant access again. Its history remains available in Activity."],
    ["Why is Continue disabled?", "Enter a valid Solana recipient address. The dUSDC token is fixed to match the current build. Then choose Check and review, inspect permissions, and continue to Sign & track."],
    ["Why are my balances or records missing?", "Check that your wallet is connected, choose Sign in and make sure you are using Devnet. If the server is waking up, wait for the connection message or choose Retry. Unavailable records are not replaced with sample figures."],
    ["Where are the other tools?", "Open More in the navigation to find Marketplace, Analytics, Copilot, Models, Profile and Settings. On mobile, use the menu button at the top."],
    ["How do I check transaction evidence?", "Open Activity, select an event, then follow its Solana Explorer link if it has a transaction signature. Addresses, policy hashes and nonces are also available under each policy's Technical details."],
  ];

  return <div className="simple-guide">
    <section className="guide-intro"><BookOpen size={22} /><div><h2>{vi ? "Bắt đầu qua 4 bước" : "Get started in 4 steps"}</h2><p>{vi ? "Chuẩn bị ví Solana trên mạng Devnet. Đây là môi trường thử nghiệm dùng token thử nghiệm." : "Use a Solana wallet on Devnet. This is a test environment using test tokens."}</p></div></section>
    <ol className="guide-step-list">{steps.map((step, i) => <li key={step.title}><span className="setup-number">{i + 1}</span><div><h2>{step.title}</h2><p>{step.detail}</p><button type="button" className="simple-secondary" onClick={() => setNav?.(step.route)}><step.icon size={16} />{step.action}<ArrowRight size={15} /></button></div></li>)}</ol>
    <section className="guide-faq"><h2>{vi ? "Câu hỏi thường gặp" : "Common questions"}</h2>{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <aside className="guide-reminder"><Check size={18} /><p>{vi ? "Bạn quyết định ngân sách, người nhận và thời hạn. Agent chỉ được chuyển tiền trong phạm vi chính sách đã ký." : "You choose the budget, recipients and expiry. The agent can only transfer funds within the policy you sign."}</p></aside>
  </div>;
}
