import { useRef } from "react";
import {
  BookOpen, Wallet, Vault, ShieldCheck, ScrollText, Store, Bot, BarChart3,
  ArrowRight, ArrowUpRight, CheckCircle2, XCircle, HelpCircle, Sparkles,
  PlugZap, KeyRound, Play, ShieldOff, Settings2,
} from "lucide-react";
import { color, mono, sans } from "../theme";
import { useT } from "../i18n/LanguageContext";

const M = color.primary, C = color.info, A = color.warn, R = color.danger;

// English is the source language here too, same as the rest of the app —
// every string below is written in English and wrapped as `t("...")`; this
// map supplies the Vietnamese side (mostly reused verbatim from this page's
// original, Vietnamese-only draft).
const VI: Record<string, string> = {
  "User Guide": "Hướng dẫn sử dụng",
  "How to use ": "Hướng dẫn sử dụng ",
  "Real, step-by-step actions on the dashboard: connect a wallet, create a vault, sign a policy, run an agent, then read the live feed and audit trail. Every step below matches the interface you're using — there is no hidden step beyond this.":
    "Từng bước thực tế trên dashboard: kết nối ví, tạo vault, ký policy, chạy agent, đọc live feed và audit trail. Mọi bước dưới đây khớp đúng với giao diện bạn đang dùng — không có bước ẩn nào ngoài đây.",

  "Quick start": "Luồng nhanh",
  "Connect wallet": "Kết nối ví",
  "Top-right corner · Connect Solana": "Góc trên bên phải · Connect Solana",
  "Fund the Vault": "Nạp Vault",
  "Treasury · Refill 1,000 dUSDC": "Treasury · Refill 1,000 dUSDC",
  "Sign a Grant": "Ký Grant",
  "Guardrails · 4-step wizard": "Guardrails · Wizard 4 bước",
  "Run & watch": "Chạy & theo dõi",
  "Guardrails · Start agent, then Audit": "Guardrails · Start agent, rồi Audit",

  "Guide contents": "Mục lục hướng dẫn",
  "Before you start": "Trước khi bắt đầu",
  "Vault": "Vault",
  "Create Policy": "Tạo Policy",
  "Sign & Create Grant": "Ký & tạo Grant",
  "Run Agent": "Chạy Agent",
  "Monitor & Audit": "Theo dõi & Audit",
  "The 7 Gates": "7 cổng kiểm tra",
  "Troubleshooting": "Xử lý sự cố",
  "Marketplace & Agents": "Marketplace & Agents",

  "Step 0": "Bước 0", "Step 1": "Bước 1", "Step 2": "Bước 2", "Step 3": "Bước 3",
  "Step 4": "Bước 4", "Step 5": "Bước 5", "Step 6": "Bước 6", "Reference": "Tham khảo",

  "You need three things:": "Bạn cần ba thứ:",
  "A Wallet Standard–compatible wallet installed in your browser (Phantom, Solflare...), switched to the Devnet network.":
    "Một ví hỗ trợ Wallet Standard đã cài trên trình duyệt (Phantom, Solflare...), chuyển sang mạng Devnet.",
  "A little Devnet SOL in your wallet to pay transaction fees — free from ":
    "Một ít SOL Devnet trong ví để trả phí giao dịch — xin miễn phí từ ",
  "The REDLINE backend running (hosted or local).": "Backend REDLINE đang chạy (bản hosted hoặc chạy local).",
  "Every number on the dashboard comes from the chain or the audit trail — nothing is simulated. A metric that can't be measured honestly (P&L, APY, uptime...) is left out entirely rather than faked.":
    "Mọi số liệu trên dashboard lấy từ chuỗi hoặc audit trail — không có dữ liệu mô phỏng. Chỉ số không thể đo trung thực (P&L, APY, uptime...) bị bỏ hẳn thay vì bịa số.",

  "In the top-right corner, click ": "Ở góc trên bên phải, bấm ",
  "No wallet installed: the dropdown reports no compatible Wallet Standard wallet found.":
    "Chưa cài ví nào: dropdown báo không tìm thấy ví Wallet Standard tương thích.",
  "Have a wallet: pick it from the list, then click ": "Có ví: chọn trong danh sách rồi bấm ",
  ". The button shows “Connecting” while it waits.": ". Nút hiển thị “Connecting” trong lúc chờ.",
  "Once connected: the button becomes your SOL balance plus a shortened address with a pulsing dot — click the address to copy it, click the exit icon to disconnect.":
    "Kết nối xong: nút đổi thành số dư SOL + địa chỉ ví rút gọn kèm chấm xanh nhấp nháy — bấm vào địa chỉ để copy, bấm icon thoát để ngắt kết nối.",
  "The network is always fixed to ": "Mạng luôn cố định là ",
  " — there's no other network to pick.": ", không chọn được mạng khác.",

  "Initialize the Vault (Treasury)": "Khởi tạo Vault (Treasury)",
  "It's fine if the vault doesn't exist yet — it's created automatically the first time you sign a grant; there's no separate ":
    "Vault chưa tồn tại thì cũng không sao — nó được tự động khởi tạo ở bước ký grant đầu tiên, không có nút ",
  " button.": " riêng.",
  "Refill 1,000 (devnet)": "Refill 1,000 (devnet)",
  "Calls the devnet faucet, minting 1,000 demo dUSDC into the vault": "Gọi faucet devnet, mint 1.000 dUSDC demo vào vault",
  "Withdraw": "Withdraw",
  "Enter an amount of dUSDC and withdraw it — signed directly by the owner wallet, bypassing any agent limits":
    "Nhập số lượng dUSDC rồi rút — ký trực tiếp bằng ví chủ, không qua giới hạn nào của agent",
  "Go to Treasury": "Vào Treasury",

  "Create a Policy (Grant) — in Guardrails": "Tạo Policy (Grant) — mục Guardrails",
  "A 4-step wizard — each step is a hard limit the program will enforce:": "Wizard 4 bước, mỗi bước là một ranh giới cứng chương trình sẽ bắt buộc thực thi:",
  "pick the agent version, which tokens it may reference (SOL, USDC, JUP, JTO, BONK, PYTH), and up to 4 destination addresses allowed to receive funds.":
    "chọn agent version, token được phép nhắc tới (SOL, USDC, JUP, JTO, BONK, PYTH) và tối đa 4 địa chỉ đích được phép nhận tiền.",
  "Total Spend Cap (10–10,000 USDC), Max Transactions/Session (1–500).": "Total Spend Cap (10–10.000 USDC), Max Transactions/Session (1–500).",
  "Session Duration (1–168 hours), Execution Cooldown (1–60 minutes).": "Session Duration (1–168 giờ), Execution Cooldown (1–60 phút).",
  "click ": "bấm ",
  ": the copilot returns a risk score and a verdict — ALLOW / REVIEW / BLOCK. ": ": copilot trả điểm rủi ro và verdict ALLOW / REVIEW / BLOCK. ",
  " locks the sign button outright — this is a rule floor the AI can't lower.": " khoá luôn nút ký — đây là rule floor, AI không hạ được mức rủi ro.",

  "Sign & create the on-chain grant": "Ký & tạo Grant on-chain",
  "Click sign and three phases run in sequence — all signed in your own wallet, the backend never touches your private key:":
    "Bấm nút ký, ba pha chạy nối tiếp — tất cả ký trong ví của bạn, backend không bao giờ chạm private key:",
  "Signs init_vault if the wallet has no vault yet; the backend mints demo USDC": "Ký init_vault nếu ví chưa có vault, backend mint demo USDC",
  "Hashes the policy, signs create_grant": "Tính hash policy, ký create_grant",
  "Registers the agent and grant with the backend": "Đăng ký agent + grant với backend",
  "On success: a green “Grant live on Devnet” line with an Explorer link. On failure: a red line stating why — both appear as a toast notification in the corner of the screen.":
    "Thành công: dòng xanh “Grant live on Devnet” kèm link Explorer. Thất bại: dòng đỏ báo lý do — cả hai đều xuất hiện dưới dạng thông báo nổi (toast) ở góc màn hình.",

  "Manage grants & run the agent": "Quản lý Grant & chạy Agent",
  "Still in ": "Vẫn ở ", "Guardrails": "Guardrails",
  ", the ": ", danh sách ", " list is the only place in the whole dashboard that starts an agent.": " là nơi duy nhất khởi động agent trong toàn dashboard.",
  "Start agent (scripted)": "Start agent (scripted)",
  "Signs a sign-in message (no fee) then runs a script: 3 transactions within the limit, plus 1 deliberately over the cap to demonstrate an on-chain rejection.":
    "Ký đăng nhập (message only, không mất phí) rồi chạy kịch bản: 3 giao dịch trong hạn mức, 1 giao dịch cố tình vượt cap để minh hoạ reject on-chain.",
  "Force (over cap)": "Force (over cap)",
  "Sends an over-the-cap intent immediately — watch the program reject it on-chain, without waiting for the script's cooldown.":
    "Gửi ngay một intent vượt hạn mức — xem chương trình từ chối on-chain, không phải chờ cooldown của kịch bản.",
  "Revoke": "Revoke",
  "Signs revoke_grant with the owner wallet — every execution after that is rejected with a Revoked error.":
    "Ký revoke_grant bằng ví chủ — mọi lệnh thực thi sau đó bị từ chối với lỗi Revoked.",
  "Go to Guardrails": "Vào Guardrails",

  "Monitor the results": "Theo dõi kết quả",
  "Dashboard": "Dashboard",
  " — the ": " — khối ", " block rolls up spend progress; the Live Feed block streams every event live over SSE.":
    " tổng hợp tiến độ chi tiêu; khối Live Feed stream trực tiếp mọi sự kiện qua SSE.",
  "Audit": "Audit",
  " — the full history, not just the last 12 rows. The ": " — lịch sử đầy đủ, không chỉ 12 dòng gần nhất. Cột ",
  "Source": "Source",
  " column distinguishes the runtime's own record from the indexer's record decoded straight from the program's logs; when the two match, that row carries a shield icon and counts as ":
    " phân biệt bản ghi của runtime với bản ghi indexer tự giải mã từ log của chương trình; khi cả hai khớp nhau, dòng đó mang biểu tượng khiên và được tính vào ",
  "Corroborated": "Corroborated",
  " — you don't have to trust the server, because a second record reads straight from the chain to cross-check it.":
    " — bạn không cần tin server, vì có bản ghi thứ hai đọc thẳng từ chuỗi để đối chiếu.",
  "Go to Audit": "Vào Audit",

  "The 7 gates, in exact on-chain order": "7 cổng kiểm tra, theo đúng thứ tự on-chain",
  "If even one condition fails, the program rejects the transaction and nothing moves — balances before and after stay identical.":
    "Chỉ cần một điều kiện không thoả, chương trình từ chối và không có gì được chuyển — số dư trước/sau giữ nguyên.",

  "Quick troubleshooting": "Xử lý sự cố nhanh",

  "Marketplace, Agents, and Analytics": "Marketplace, Agents và Analytics",
  "These three pages all run on real data, not simulation.": "Ba trang này dùng dữ liệu thật, không phải mô phỏng.",
  "Publish an agent version — agentHash is a real SHA-256 of the model/code/config.":
    "Publish agent version — agentHash là SHA-256 thật của model/code/config.",
  "Rent an agent with real SOL; the backend verifies the transaction on Devnet before recording it.":
    "Rent agent bằng SOL thật; backend đối chiếu giao dịch trên Devnet trước khi ghi nhận.",
  "Volume, approval rate, decision latency — computed from the connected wallet's audit trail.":
    "Volume, tỉ lệ duyệt, độ trễ quyết định — tính từ audit trail của ví đang kết nối.",

  // rent an agent (peer-to-peer)
  "Rent an agent": "Thuê agent",
  "Peer to peer": "Ngang hàng (P2P)",
  "Rent an agent from the Marketplace": "Thuê agent trên Marketplace",
  "Renting is a plain wallet-to-wallet SOL payment — it does not touch the REDLINE program. The backend re-reads your payment from Devnet and checks it before the rental is recorded.":
    "Thuê agent là một giao dịch chuyển SOL ví-sang-ví bình thường — không đụng tới chương trình REDLINE. Backend đọc lại giao dịch của bạn từ Devnet và kiểm tra trước khi ghi nhận lượt thuê.",
  "Open Marketplace and find a listing with a price. A grey “no price set” means the publisher has not offered it yet; toggle “Rentable only” to hide those.":
    "Mở Marketplace và tìm listing đã có giá. Chữ xám “no price set” nghĩa là người đăng chưa chào cho thuê; bật “Rentable only” để ẩn các listing đó.",
  "Pick a duration — 1d / 3d / 7d. The price is a 24h rate, so the total scales with the periods covered; the card shows the total you will pay.":
    "Chọn thời hạn — 1d / 3d / 7d. Giá là mức phí cho mỗi 24h, nên tổng tiền nhân theo số chu kỳ; thẻ hiển thị tổng số bạn sẽ trả.",
  "Click “Rent”. Your wallet pops up to approve a SystemProgram SOL transfer straight to the publisher's wallet — check the amount and the recipient before signing.":
    "Bấm “Thuê”. Ví bật lên để duyệt một giao dịch chuyển SOL (SystemProgram) thẳng đến ví người đăng — kiểm tra số tiền và địa chỉ nhận trước khi ký.",
  "The backend reads that transaction back from Devnet and checks that you signed it, that it reached the publisher, and that the amount covers the full term. A payment that is short, failed, or already used is rejected, with the reason shown on the card.":
    "Backend đọc lại giao dịch đó từ Devnet và kiểm: bạn đã ký, tiền đã tới ví người đăng, và số tiền đủ cho cả thời hạn. Thanh toán thiếu, lỗi, hoặc đã dùng rồi sẽ bị từ chối, lý do hiện ngay trên thẻ.",
  "On success a “Rented …” line appears with the payment signature. The rental runs until its end time — there is no auto-renew and no refund.":
    "Thành công thì hiện dòng “Rented …” kèm chữ ký thanh toán. Lượt thuê chạy tới thời điểm hết hạn — không tự gia hạn và không hoàn tiền.",
  "To let the rented agent move funds, create a Grant for it in Guardrails. The grant records which rental authorised it, and the agent still runs inside the 7 gates you signed.":
    "Để agent đã thuê chuyển được tiền, hãy tạo Grant cho nó ở Guardrails. Grant ghi lại lượt thuê nào đã ủy quyền, và agent vẫn chạy trong 7 gates mà bạn đã ký.",
  "Signs the SOL payment in your wallet, then records the hire after Devnet verification":
    "Ký giao dịch trả SOL trong ví, rồi ghi nhận lượt thuê sau khi Devnet xác minh",
  "Rental length; total = the 24h rate × the number of 24h periods":
    "Độ dài thuê; tổng = mức phí 24h × số chu kỳ 24h",
  "Publisher only — set the payout wallet and a price (a 24h rate) to offer the agent for rent":
    "Chỉ người đăng — đặt ví nhận tiền và một mức giá (phí 24h) để chào cho thuê",
  "Publisher only — change the price later, from the same wallet; the payout wallet is write-once":
    "Chỉ người đăng — đổi giá về sau, từ cùng ví đó; ví nhận tiền chỉ đặt được một lần",
  "You cannot rent your own agent — the button is disabled on a listing you published.":
    "Bạn không thể tự thuê agent của mình — nút bị khoá trên listing do bạn đăng.",
  "The stats strip at the top of the Marketplace (volume, all-time rentals, active now, floor rate) and the Sort control are read straight from the hire records.":
    "Dải thống kê ở đầu trang Marketplace (volume, tổng lượt thuê, đang thuê, giá sàn) và nút Sort đều đọc thẳng từ dữ liệu lượt thuê.",
  "Go to Marketplace": "Vào Marketplace",
  "Claim": "Nhận listing",
  "Edit price": "Sửa giá",

  "Related technical docs": "Tài liệu kỹ thuật liên quan",
  "More in the repo: ": "Xem thêm trong repo: ",
  " (detailed architecture), ": " (kiến trúc chi tiết), ",
  " (threat model), ": " (mô hình đe doạ), ",
  " (API & environment variables).": " (API & biến môi trường).",

  // 7-gates reasons
  "The policy has been revoked by its owner": "Chính sách đã bị chủ sở hữu huỷ bỏ",
  "The policy's validity window has expired": "Chính sách đã hết thời hạn cho phép",
  "The instruction was submitted twice (replay-attack protection)": "Lệnh bị gửi trùng lặp (chống replay attack)",
  "The token isn't on the allowed mint list": "Loại token không nằm trong danh sách cho phép",
  "The destination address isn't on the allowlist": "Địa chỉ nhận không nằm trong allowlist",
  "Exceeds the USDC spend cap or the allowed transaction count": "Vượt hạn mức USDC hoặc số giao dịch cho phép",
  "Not enough time has passed since the last execution": "Chưa hết thời gian nghỉ giữa hai lần thực thi",

  // troubleshooting
  "No wallet shows up in the “Connect Solana” dropdown": "Không thấy ví nào trong dropdown “Connect Solana”",
  "No Wallet Standard–compatible wallet installed (Phantom, Solflare...)": "Chưa cài ví hỗ trợ Wallet Standard (Phantom, Solflare...)",
  "The sign button says “Backend offline”": "Nút ký báo “Backend offline”",
  "The backend isn't running, or VITE_API_URL is wrong": "Backend chưa chạy, hoặc VITE_API_URL sai",
  "“vault not initialised” never clears": "“vault not initialised” mãi không hết",
  "The first create_grant signature hasn't completed yet — that's the step that creates the vault":
    "Chưa hoàn tất bước ký create_grant đầu tiên — vault được tạo trong chính bước đó",
  "Can't create a grant / missing allowlist": "Không tạo được grant / thiếu allowlist",
  "VITE_DEMO_USDC_MINT / VITE_DEMO_OPS_DESTINATION missing from .env": "Thiếu VITE_DEMO_USDC_MINT / VITE_DEMO_OPS_DESTINATION trong .env",
  "Live Feed / Audit shows disconnected": "Live Feed / Audit báo mất kết nối",
  "The backend is down or SSE is being blocked": "Backend đang tắt hoặc SSE bị chặn",
  "A transaction shows Revoked right after creating the grant": "Giao dịch bị Revoked dù mới tạo grant",
  "The grant was already revoked earlier — check its status in Guardrails": "Grant đã bị revoke trước đó — kiểm tra trạng thái ở Guardrails",
};

// Section ids double as scroll targets and as the in-page nav's keys — keep
// them in the order the guide should be read, since that's also the order
// a first-time owner actually moves through the product (see docs/USER_GUIDE.md).
const SECTIONS = [
  { id: "start", label: "Before you start" },
  { id: "wallet", label: "Connect wallet" },
  { id: "vault", label: "Vault" },
  { id: "grant", label: "Create Policy" },
  { id: "sign", label: "Sign & Create Grant" },
  { id: "manage", label: "Run Agent" },
  { id: "monitor", label: "Monitor & Audit" },
  { id: "gates", label: "The 7 Gates" },
  { id: "rent", label: "Rent an agent" },
  { id: "trouble", label: "Troubleshooting" },
  { id: "more", label: "Marketplace & Agents" },
] as const;

const GATES: [string, string, string][] = [
  ["1", "REVOKED", "The policy has been revoked by its owner"],
  ["2", "EXPIRED", "The policy's validity window has expired"],
  ["3", "NONCE_REPLAY", "The instruction was submitted twice (replay-attack protection)"],
  ["4", "MINT_NOT_ALLOWED", "The token isn't on the allowed mint list"],
  ["5", "DESTINATION_NOT_ALLOWED", "The destination address isn't on the allowlist"],
  ["6", "SPEND_CAP_EXCEEDED / TX_CAP_EXCEEDED", "Exceeds the USDC spend cap or the allowed transaction count"],
  ["7", "COOLDOWN_ACTIVE", "Not enough time has passed since the last execution"],
];

const TROUBLESHOOT: [string, string][] = [
  ["No wallet shows up in the “Connect Solana” dropdown", "No Wallet Standard–compatible wallet installed (Phantom, Solflare...)"],
  ["The sign button says “Backend offline”", "The backend isn't running, or VITE_API_URL is wrong"],
  ["“vault not initialised” never clears", "The first create_grant signature hasn't completed yet — that's the step that creates the vault"],
  ["Can't create a grant / missing allowlist", "VITE_DEMO_USDC_MINT / VITE_DEMO_OPS_DESTINATION missing from .env"],
  ["Live Feed / Audit shows disconnected", "The backend is down or SSE is being blocked"],
  ["A transaction shows Revoked right after creating the grant", "The grant was already revoked earlier — check its status in Guardrails"],
];

function SectionCard({
  id, icon: Icon, eyebrow, title, accent = M, register, children,
}: {
  id: string;
  icon: React.ElementType;
  eyebrow: string;
  title: React.ReactNode;
  accent?: string;
  register: (id: string, el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      ref={el => register(id, el)}
      className="rounded-2xl p-6 sm:p-7 card-glow-hover scroll-mt-24 px-block"
      style={{ background: color.surface, border: `1px solid ${color.border}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg" style={{ background: `${accent}14`, border: `1px solid ${accent}25` }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
        <span className="text-[12px] font-bold tracking-[0.18em] uppercase" style={{ ...mono, color: accent }}>{eyebrow}</span>
      </div>
      <h2 className="text-lg font-bold mb-3" style={{ ...sans, color: color.text }}>{title}</h2>
      <div className="space-y-3 text-[13.5px] leading-relaxed" style={{ ...sans, color: color.textSecondary }}>
        {children}
      </div>
    </section>
  );
}

function NavLink({ label, onClick, accent = M }: { label: string; onClick: () => void; accent?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors"
      style={{ ...sans, color: accent }}
    >
      {label} <ArrowRight size={12} />
    </button>
  );
}

export function GuidePage({ setNav }: { setNav?: (index: number) => void }) {
  const tr = useT(VI);
  // A ref-map, not ten separate useRefs — scrollToSection looks the node
  // up by the same id the in-page nav and the anchor list share.
  const nodes = useRef<Record<string, HTMLElement | null>>({});
  const register = (id: string, el: HTMLElement | null) => { nodes.current[id] = el; };
  const scrollTo = (id: string) => nodes.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="route-page page-guide space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg" style={{ background: `${M}14`, border: `1px solid ${M}20` }}>
            <BookOpen size={12} style={{ color: M }} />
          </div>
          <span className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ ...mono, color: M }}>{tr("User Guide")}</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ ...sans, color: color.text }}>{tr("How to use ")}<span style={{ color: M }}>REDLINE</span></h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ ...sans, color: color.textDim }}>
          {tr("Real, step-by-step actions on the dashboard: connect a wallet, create a vault, sign a policy, run an agent, then read the live feed and audit trail. Every step below matches the interface you're using — there is no hidden step beyond this.")}
        </p>
      </div>

      {/* Quick-start flow — the same 4-step path docs/WEBSITE_DESIGN_OVERVIEW.md
          describes, made clickable since this copy lives inside the app that
          already knows how to get there. */}
      <div className="rounded-2xl p-5 sm:p-6 px-block" style={{ background: color.surface, border: `1px solid ${color.border}` }}>
        <div className="text-[12px] font-bold tracking-[0.18em] uppercase mb-4" style={{ ...mono, color: color.textDim }}>{tr("Quick start")}</div>
        <div className="grid sm:grid-cols-4 gap-3">
          {[
            { n: "01", label: tr("Connect wallet"), hint: tr("Top-right corner · Connect Solana"), icon: PlugZap, nav: null },
            { n: "02", label: tr("Fund the Vault"), hint: tr("Treasury · Refill 1,000 dUSDC"), icon: Vault, nav: 4 },
            { n: "03", label: tr("Sign a Grant"), hint: tr("Guardrails · 4-step wizard"), icon: ShieldCheck, nav: 6 },
            { n: "04", label: tr("Run & watch"), hint: tr("Guardrails · Start agent, then Audit"), icon: ScrollText, nav: 5 },
          ].map(step => (
            <button
              key={step.n}
              type="button"
              onClick={() => step.nav !== null && setNav?.(step.nav)}
              disabled={step.nav === null}
              className="text-left p-3.5 rounded-xl transition-all card-glow-hover disabled:cursor-default"
              style={{ background: color.surfaceSubtle, border: `1px solid ${color.border}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold" style={{ ...mono, color: color.textDim }}>{step.n}</span>
                <step.icon size={14} style={{ color: M }} />
              </div>
              <div className="text-[13px] font-semibold" style={{ ...sans, color: color.text }}>{step.label}</div>
              <div className="text-[12px] mt-1" style={{ ...sans, color: color.textDim }}>{step.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* In-page section nav — sticky so a 10-section guide stays navigable
          without a second scrollbar or leaving the page. */}
      <nav
        className="relative z-10 flex flex-wrap gap-2 p-2.5 rounded-2xl backdrop-blur"
        style={{ background: "rgba(255,255,255,.86)", border: `1px solid ${color.border}` }}
        aria-label={tr("Guide contents")}
      >
        {SECTIONS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollTo(s.id)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
            style={{ ...sans, color: color.textSecondary, background: color.surfaceInset }}
          >
            {tr(s.label)}
          </button>
        ))}
      </nav>

      {/* 0. Before you start */}
      <SectionCard id="start" icon={Sparkles} eyebrow={tr("Step 0")} title={tr("Before you start")} register={register}>
        <p>{tr("You need three things:")}</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>{tr("A Wallet Standard–compatible wallet installed in your browser (Phantom, Solflare...), switched to the Devnet network.")}</li>
          <li>{tr("A little Devnet SOL in your wallet to pay transaction fees — free from ")}<span style={{ ...mono, color: C }}>faucet.solana.com</span>.</li>
          <li>{tr("The REDLINE backend running (hosted or local).")}</li>
        </ul>
        <div className="p-3 rounded-xl text-[12.5px]" style={{ background: `${M}0a`, border: `1px solid ${M}20`, color: color.textSecondary }}>
          {tr("Every number on the dashboard comes from the chain or the audit trail — nothing is simulated. A metric that can't be measured honestly (P&L, APY, uptime...) is left out entirely rather than faked.")}
        </div>
      </SectionCard>

      {/* 1. Wallet */}
      <SectionCard id="wallet" icon={Wallet} eyebrow={tr("Step 1")} title={tr("Connect wallet")} register={register}>
        <p>{tr("In the top-right corner, click ")}<strong>“Connect Solana”</strong>.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>{tr("No wallet installed: the dropdown reports no compatible Wallet Standard wallet found.")}</li>
          <li>{tr("Have a wallet: pick it from the list, then click ")}<strong>Connect</strong>{tr(". The button shows “Connecting” while it waits.")}</li>
          <li>{tr("Once connected: the button becomes your SOL balance plus a shortened address with a pulsing dot — click the address to copy it, click the exit icon to disconnect.")}</li>
        </ul>
        <p style={{ color: color.textDim }}>{tr("The network is always fixed to ")}<strong>Devnet</strong>{tr(" — there's no other network to pick.")}</p>
      </SectionCard>

      {/* 2. Vault */}
      <SectionCard id="vault" icon={Vault} eyebrow={tr("Step 2")} title={tr("Initialize the Vault (Treasury)")} accent={C} register={register}>
        <p>{tr("It's fine if the vault doesn't exist yet — it's created automatically the first time you sign a grant; there's no separate ")}<strong>“Init Vault”</strong>{tr(" button.")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold" style={{ color: color.text }}>{tr("Refill 1,000 (devnet)")}</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Calls the devnet faucet, minting 1,000 demo dUSDC into the vault")}</td>
              </tr>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold" style={{ color: color.text }}>{tr("Withdraw")}</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Enter an amount of dUSDC and withdraw it — signed directly by the owner wallet, bypassing any agent limits")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <NavLink label={tr("Go to Treasury")} accent={C} onClick={() => setNav?.(4)} />
      </SectionCard>

      {/* 3. Grant wizard */}
      <SectionCard id="grant" icon={ShieldCheck} eyebrow={tr("Step 3")} title={tr("Create a Policy (Grant) — in Guardrails")} accent={A} register={register}>
        <p>{tr("A 4-step wizard — each step is a hard limit the program will enforce:")}</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li><strong>Scope</strong> — {tr("pick the agent version, which tokens it may reference (SOL, USDC, JUP, JTO, BONK, PYTH), and up to 4 destination addresses allowed to receive funds.")}</li>
          <li><strong>Spend Limits</strong> — {tr("Total Spend Cap (10–10,000 USDC), Max Transactions/Session (1–500).")}</li>
          <li><strong>Time Bounds</strong> — {tr("Session Duration (1–168 hours), Execution Cooldown (1–60 minutes).")}</li>
          <li><strong>Review &amp; Sign</strong> — {tr("click ")}“Run AI risk assessment”{tr(": the copilot returns a risk score and a verdict — ALLOW / REVIEW / BLOCK. ")}<strong>BLOCK</strong>{tr(" locks the sign button outright — this is a rule floor the AI can't lower.")}</li>
        </ol>
      </SectionCard>

      {/* 4. Sign & create */}
      <SectionCard id="sign" icon={KeyRound} eyebrow={tr("Step 4")} title={tr("Sign & create the on-chain grant")} register={register}>
        <p>{tr("Click sign and three phases run in sequence — all signed in your own wallet, the backend never touches your private key:")}</p>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {[
            ["1. vault", tr("Signs init_vault if the wallet has no vault yet; the backend mints demo USDC")],
            ["2. grant", tr("Hashes the policy, signs create_grant")],
            ["3. register", tr("Registers the agent and grant with the backend")],
          ].map(([t, d]) => (
            <div key={t} className="p-3 rounded-xl" style={{ background: color.surfaceInset, border: `1px solid ${color.border}` }}>
              <div className="text-[12.5px] font-bold mb-1" style={{ ...mono, color: M }}>{t}</div>
              <div className="text-[12px]" style={{ color: color.textSecondary }}>{d}</div>
            </div>
          ))}
        </div>
        <p>{tr("On success: a green “Grant live on Devnet” line with an Explorer link. On failure: a red line stating why — both appear as a toast notification in the corner of the screen.")}</p>
      </SectionCard>

      {/* 5. Run agent */}
      <SectionCard id="manage" icon={Play} eyebrow={tr("Step 5")} title={tr("Manage grants & run the agent")} accent={A} register={register}>
        <p>{tr("Still in ")}<strong>Guardrails</strong>{tr(", the ")}“Active Policy Accounts”{tr(" list is the only place in the whole dashboard that starts an agent.")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap" style={{ color: color.text }}>{tr("Start agent (scripted)")}</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Signs a sign-in message (no fee) then runs a script: 3 transactions within the limit, plus 1 deliberately over the cap to demonstrate an on-chain rejection.")}</td>
              </tr>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap" style={{ color: color.text }}>{tr("Force (over cap)")}</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Sends an over-the-cap intent immediately — watch the program reject it on-chain, without waiting for the script's cooldown.")}</td>
              </tr>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap flex items-center gap-1.5" style={{ color: color.text }}><ShieldOff size={12} style={{ color: R }} /> {tr("Revoke")}</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Signs revoke_grant with the owner wallet — every execution after that is rejected with a Revoked error.")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <NavLink label={tr("Go to Guardrails")} accent={A} onClick={() => setNav?.(6)} />
      </SectionCard>

      {/* 6. Monitor */}
      <SectionCard id="monitor" icon={ScrollText} eyebrow={tr("Step 6")} title={tr("Monitor the results")} accent={C} register={register}>
        <p><strong>{tr("Dashboard")}</strong>{tr(" — the ")}“Live Grants”{tr(" block rolls up spend progress; the Live Feed block streams every event live over SSE.")}</p>
        <p><strong>{tr("Audit")}</strong>{tr(" — the full history, not just the last 12 rows. The ")}<em>{tr("Source")}</em>{tr(" column distinguishes the runtime's own record from the indexer's record decoded straight from the program's logs; when the two match, that row carries a shield icon and counts as ")}<strong>{tr("Corroborated")}</strong>{tr(" — you don't have to trust the server, because a second record reads straight from the chain to cross-check it.")}</p>
        <NavLink label={tr("Go to Audit")} accent={C} onClick={() => setNav?.(5)} />
      </SectionCard>

      {/* 7. Gates table */}
      <SectionCard id="gates" icon={XCircle} eyebrow={tr("Reference")} title={tr("The 7 gates, in exact on-chain order")} accent={R} register={register}>
        <p>{tr("If even one condition fails, the program rejects the transaction and nothing moves — balances before and after stay identical.")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              {GATES.map(([n, code, reason]) => (
                <tr key={code} className="ledger-row">
                  <td className="py-2.5 pr-3 align-top">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11.5px] font-bold" style={{ ...mono, background: `${R}12`, color: R }}>{n}</span>
                  </td>
                  <td className="py-2.5 pr-4 align-top font-semibold whitespace-nowrap" style={{ ...mono, color: color.text, fontSize: "12px" }}>{code}</td>
                  <td className="py-2.5 align-top" style={{ color: color.textSecondary }}>{tr(reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* 8. Troubleshooting */}
      <SectionCard id="trouble" icon={HelpCircle} eyebrow={tr("Reference")} title={tr("Quick troubleshooting")} accent={A} register={register}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              {TROUBLESHOOT.map(([symptom, cause]) => (
                <tr key={symptom} className="ledger-row">
                  <td className="py-2.5 pr-4 align-top font-semibold" style={{ color: color.text, width: "42%" }}>{tr(symptom)}</td>
                  <td className="py-2.5 align-top" style={{ color: color.textSecondary }}>{tr(cause)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* 8b. Rent an agent — the one wallet-signed flow that is a payment
          between two people, not an owner acting on their own vault. */}
      <SectionCard id="rent" icon={Store} eyebrow={tr("Peer to peer")} title={tr("Rent an agent from the Marketplace")} accent={C} register={register}>
        <p>{tr("Renting is a plain wallet-to-wallet SOL payment — it does not touch the REDLINE program. The backend re-reads your payment from Devnet and checks it before the rental is recorded.")}</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>{tr("Open Marketplace and find a listing with a price. A grey “no price set” means the publisher has not offered it yet; toggle “Rentable only” to hide those.")}</li>
          <li>{tr("Pick a duration — 1d / 3d / 7d. The price is a 24h rate, so the total scales with the periods covered; the card shows the total you will pay.")}</li>
          <li>{tr("Click “Rent”. Your wallet pops up to approve a SystemProgram SOL transfer straight to the publisher's wallet — check the amount and the recipient before signing.")}</li>
          <li>{tr("The backend reads that transaction back from Devnet and checks that you signed it, that it reached the publisher, and that the amount covers the full term. A payment that is short, failed, or already used is rejected, with the reason shown on the card.")}</li>
          <li>{tr("On success a “Rented …” line appears with the payment signature. The rental runs until its end time — there is no auto-renew and no refund.")}</li>
          <li>{tr("To let the rented agent move funds, create a Grant for it in Guardrails. The grant records which rental authorised it, and the agent still runs inside the 7 gates you signed.")}</li>
        </ol>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap" style={{ color: color.text }}>{tr("Rent")}</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Signs the SOL payment in your wallet, then records the hire after Devnet verification")}</td>
              </tr>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap" style={{ ...mono, color: color.text }}>1d / 3d / 7d</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Rental length; total = the 24h rate × the number of 24h periods")}</td>
              </tr>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap" style={{ color: color.text }}>{tr("Claim")}</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Publisher only — set the payout wallet and a price (a 24h rate) to offer the agent for rent")}</td>
              </tr>
              <tr className="ledger-row">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap" style={{ color: color.text }}>{tr("Edit price")}</td>
                <td className="py-2" style={{ color: color.textSecondary }}>{tr("Publisher only — change the price later, from the same wallet; the payout wallet is write-once")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ color: color.textDim }}>{tr("You cannot rent your own agent — the button is disabled on a listing you published.")}</p>
        <p style={{ color: color.textDim }}>{tr("The stats strip at the top of the Marketplace (volume, all-time rentals, active now, floor rate) and the Sort control are read straight from the hire records.")}</p>
        <NavLink label={tr("Go to Marketplace")} accent={C} onClick={() => setNav?.(3)} />
      </SectionCard>

      {/* 9. Marketplace / Agents / Analytics */}
      <SectionCard id="more" icon={Store} eyebrow={tr("Reference")} title={tr("Marketplace, Agents, and Analytics")} accent={M} register={register}>
        <p>{tr("These three pages all run on real data, not simulation.")}</p>
        <div className="grid sm:grid-cols-3 gap-2.5 pt-1">
          {[
            { icon: Bot, label: "Agents", desc: tr("Publish an agent version — agentHash is a real SHA-256 of the model/code/config."), nav: 1 },
            { icon: Store, label: "Marketplace", desc: tr("Rent an agent with real SOL; the backend verifies the transaction on Devnet before recording it."), nav: 3 },
            { icon: BarChart3, label: "Analytics", desc: tr("Volume, approval rate, decision latency — computed from the connected wallet's audit trail."), nav: 2 },
          ].map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => setNav?.(item.nav)}
              className="text-left p-3.5 rounded-xl transition-all card-glow-hover"
              style={{ background: color.surfaceInset, border: `1px solid ${color.border}` }}
            >
              <item.icon size={14} style={{ color: M }} className="mb-2" />
              <div className="text-[13px] font-semibold flex items-center gap-1" style={{ color: color.text }}>{item.label} <ArrowUpRight size={11} /></div>
              <div className="text-[12px] mt-1" style={{ color: color.textDim }}>{item.desc}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Related docs — named, not linked: these live in the repo (docs/),
          not at a URL this page can promise still resolves. */}
      <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: color.surfaceInset, border: `1px solid ${color.border}` }}>
        <Settings2 size={15} style={{ color: color.textDim, marginTop: 2 }} />
        <div>
          <div className="text-[12.5px] font-semibold" style={{ color: color.text }}>{tr("Related technical docs")}</div>
          <p className="text-[12px] mt-1" style={{ color: color.textDim }}>
            {tr("More in the repo: ")}<span style={{ ...mono }}>docs/TECHNICAL_ARCHITECTURE.md</span>{tr(" (detailed architecture), ")}
            <span style={{ ...mono }}>docs/SECURITY.md</span>{tr(" (threat model), ")}<span style={{ ...mono }}>backend/README.md</span>{tr(" (API & environment variables).")}
          </p>
        </div>
      </div>
    </div>
  );
}
