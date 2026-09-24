import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChevronRight,
  ExternalLink,
  Key,
  Lock,
  Network,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Timer,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RatingBadge, ReviewPanel } from "./components/AgentRating";
import { ProtocolRevenuePanel } from "./components/ProtocolRevenue";
import { TransferLane, VoxelCube } from "./components/depth";
import { GrantSignButton } from "./components/GrantSignButton";
import { GrantsPanel } from "./components/GrantsPanel";
import { SolanaWalletControl } from "./components/SolanaWalletControl";
import { VaultPanel } from "./components/VaultPanel";
import { applyPreference, readPreference } from "./frontend/preferences";
import { api, API_URL, checkHealth, loadSession, short, type AgentVersion, type AuditRow, type Health, type Hire, type Listing, type ProtocolFee } from "./lib/api";
import { useBackendStatus } from "./components/BackendStatus";
import { useSignedIn } from "./lib/useSignedIn";
import {
  assessPolicyLocally,
  requestRiskAssessment,
  type AgentPolicyInput,
  type RiskAssessment,
} from "./lib/risk-engine";
import type { AppClient } from "./solana/client";
import {
  explorerAddressUrl,
  explorerTransactionUrl,
  isAddressLike,
} from "./solana/client";
import { rentalPaymentInstructions } from "./solana/payments";
import { formatFeeRate, splitRental } from "./lib/fee";
import { PROGRAM_ID } from "./solana/redline";
import { color, mono, sans } from "./theme";
import { useT } from "./i18n/LanguageContext";

const VI: Record<string, string> = {
  "Newest": "Mới nhất",
  "Reputation": "Uy tín",
  "Most rented": "Thuê nhiều nhất",
  "Cheapest": "Rẻ nhất",
  "Search published agents": "Tìm agent đã xuất bản",
  "Search agents, strategies…": "Tìm agent, chiến lược…",
  "Rentable only": "Chỉ agent cho thuê",
  "Sort listings": "Sắp xếp danh sách",
  "VERSIONS": "PHIÊN BẢN",
  "Wallet connected, but not signed in. Renting, claiming and reviewing need a signature — the API cannot tell a connected wallet from a typed address. Use “Sign in” in the top bar.": "Ví đã kết nối nhưng chưa đăng nhập. Thuê, nhận listing và đánh giá đều cần chữ ký — API không phân biệt được ví đã kết nối với một địa chỉ gõ tay. Dùng “Sign in” ở thanh trên cùng.",
  "Retry": "Thử lại",
  "FEATURED · IMMUTABLE BUILD": "NỔI BẬT · BẢN BUILD BẤT BIẾN",
  "YOURS": "CỦA BẠN",
  "Built to act within boundaries.": "Được tạo ra để hành động trong giới hạn.",
  "ACTIVE HIRES": "ĐANG ĐƯỢC THUÊ",
  "AGENT HASH": "AGENT HASH",
  "PUBLISHER": "NGƯỜI XUẤT BẢN",
  "Unclaimed": "Chưa nhận",
  "RENTALS": "LƯỢT THUÊ",
  "in 24h": "trong 24h",
  "PAID OUT": "ĐÃ TRẢ",
  "all time": "tổng cộng",
  "LAST RENTED": "THUÊ GẦN NHẤT",
  "published": "xuất bản",
  "Unpriced": "Chưa định giá",
  "per 24-hour period": "mỗi 24 giờ",
  "You publish this agent": "Bạn là người xuất bản agent này",
  "Connect a wallet to rent": "Kết nối ví để thuê",
  "Sign in with your wallet to rent": "Đăng nhập bằng ví để thuê",
  "Waiting for wallet / verification…": "Đang chờ ví / xác minh…",
  "This is your listing": "Đây là listing của bạn",
  "Connect wallet to rent": "Kết nối ví để thuê",
  "Sign in to rent": "Đăng nhập để thuê",
  "Rent with wallet": "Thuê bằng ví",
  "Total": "Tổng",
  "hours": "giờ",
  "Publisher": "Người xuất bản",
  "protocol fee": "phí giao thức",
  "— one transaction, both verified on-chain": "— một giao dịch, cả hai phần đều được xác minh on-chain",
  "The publisher must configure a price before this version can be rented.": "Người xuất bản cần đặt giá trước khi phiên bản này có thể được thuê.",
  "Sign in with your wallet to claim this listing": "Đăng nhập bằng ví để nhận listing này",
  "Edit publisher price": "Sửa giá",
  "Claim listing · set price": "Nhận listing · đặt giá",
  "Price per day · SOL": "Giá mỗi ngày · SOL",
  "Save price": "Lưu giá",
  "Hide reputation": "Ẩn uy tín",
  "Reputation & reviews": "Uy tín & đánh giá",
  "EXPLORE THE REGISTRY": "KHÁM PHÁ SỔ ĐĂNG KÝ",
  "View": "Xem",
  "active hires": "đang thuê",
  "Previous agent": "Agent trước",
  "Next agent": "Agent sau",
  "All published versions": "Tất cả phiên bản đã xuất bản",
  "AGENT": "AGENT",
  "HASH": "HASH",
  "HIRES · LIVE / ALL": "LƯỢT THUÊ · ĐANG / TỔNG",
  "PRICE / DAY": "GIÁ / NGÀY",
  "The registry could not be loaded. Retry the connection above.": "Không tải được sổ đăng ký. Thử kết nối lại ở trên.",
  "No published versions match this search.": "Không có phiên bản nào khớp với tìm kiếm.",
  "Rented": "Đã thuê",
  "for": "trong",
  "publisher": "người xuất bản",
  "Rental payment was rejected or could not be verified.": "Thanh toán thuê bị từ chối hoặc không xác minh được.",
  "Owner wallet": "Ví chủ sở hữu",
  "Devnet SOL pays transaction fees.": "SOL Devnet dùng để trả phí giao dịch.",
  "Connect your wallet to load its vault, balances and signing controls.": "Kết nối ví để tải vault, số dư và các nút ký.",
  "Recent chain activity": "Hoạt động on-chain gần đây",
  "LATEST 8": "8 GẦN NHẤT",
  "No recorded transactions yet.": "Chưa có giao dịch nào được ghi nhận.",
  "Activity loads after connecting a wallet.": "Hoạt động sẽ hiện sau khi kết nối ví.",
  "Assets remain in a program-owned vault. The agent can only move them within an owner-signed policy.": "Tài sản nằm trong vault do program sở hữu. Agent chỉ có thể chuyển chúng trong phạm vi chính sách mà chủ sở hữu đã ký.",
  "Scope": "Phạm vi",
  "Spend Limits": "Hạn mức chi",
  "Time Bounds": "Giới hạn thời gian",
  "Review & Sign": "Xem lại & Ký",
  "Step": "Bước",
  "One of these is not a valid Solana address.": "Một trong các địa chỉ này không phải địa chỉ Solana hợp lệ.",
  "Add at least one address the agent may pay.": "Thêm ít nhất một địa chỉ mà agent được thanh toán.",
  "Duplicate destinations are ignored.": "Địa chỉ trùng sẽ bị bỏ qua.",
  "Unable to assess this policy.": "Không đánh giá được chính sách này.",
  "Agent Guardrails": "Guardrails cho Agent",
  "Design bounded Solana policies, run AI risk checks, and publish verifiable proofs": "Thiết kế chính sách Solana có giới hạn, chạy kiểm tra rủi ro bằng AI và xuất bản bằng chứng có thể xác minh",
  "Create Agent Policy": "Tạo chính sách cho Agent",
  "Which published agent version does this grant authorise? The grant records its": "Grant này uỷ quyền cho phiên bản agent đã xuất bản nào? Grant ghi lại",
  ", so this is the build the policy is bound to.": ", nên đây là bản build mà chính sách gắn vào.",
  "Agent version this grant authorises": "Phiên bản agent mà grant này uỷ quyền",
  "No agent published yet — signing this grant publishes “": "Chưa có agent nào được xuất bản — ký grant này sẽ xuất bản “",
  "” and binds the grant to it. Publish from the Agents page first to name your own.": "” và gắn grant vào đó. Hãy xuất bản từ trang Agents trước nếu muốn đặt tên riêng.",
  "Running under your rental of this agent — it covers grants until": "Chạy theo hợp đồng thuê agent này của bạn — có hiệu lực cho grant đến",
  ". The grant records which rental authorised it.": ". Grant ghi lại hợp đồng thuê nào đã uỷ quyền.",
  "Allowlist the SPL assets this agent may reference. Every other mint remains outside the signed policy.": "Cho phép các tài sản SPL mà agent được dùng. Mọi mint khác nằm ngoài chính sách đã ký.",
  "Allowlist the addresses this agent may pay. The program checks every transfer against this list — an address that is not here cannot receive funds, whatever the agent proposes. Up to": "Cho phép các địa chỉ agent được thanh toán. Program đối chiếu mọi lệnh chuyển với danh sách này — địa chỉ không có ở đây không thể nhận tiền, dù agent đề xuất gì. Tối đa",
  "Recipient address (base58)": "Địa chỉ người nhận (base58)",
  "Allowed destination": "Địa chỉ được phép",
  "Remove destination": "Xóa địa chỉ",
  "+ Add destination": "+ Thêm địa chỉ",
  "The policy digest binds token scope, the destination allowlist, spend cap, execution limit, cooldown, and validity window into one verifiable proof.": "Digest của chính sách gắn phạm vi token, allowlist địa chỉ, hạn mức chi, giới hạn số lần thực thi, cooldown và thời hạn hiệu lực thành một bằng chứng có thể xác minh.",
  "Configure total spend ceiling and per-session transaction limits.": "Cấu hình trần chi tiêu tổng và giới hạn số giao dịch mỗi phiên.",
  "Total Spend Cap": "Tổng hạn mức chi",
  "Max Transactions / Session": "Số giao dịch tối đa / phiên",
  "Avg/Tx": "TB/giao dịch",
  "Risk": "Rủi ro",
  "Tokens": "Token",
  "Set validity window and minimum cooldown between executions.": "Đặt thời hạn hiệu lực và cooldown tối thiểu giữa các lần thực thi.",
  "Session Duration": "Thời lượng phiên",
  "Execution Cooldown": "Cooldown giữa các lần thực thi",
  "Expires": "Hết hạn",
  "executions": "lần thực thi",
  "cooldown": "cooldown",
  "Review the bounded policy, run the risk copilot, then sign the on-chain grant. The program enforces these limits on every agent transfer.": "Xem lại chính sách, chạy copilot đánh giá rủi ro, rồi ký grant on-chain. Program thực thi các giới hạn này trên mọi lệnh chuyển của agent.",
  "Agent": "Agent",
  "(new)": "(mới)",
  "Rental": "Thuê",
  "until": "đến",
  "not rented — yours to run": "không thuê — bạn tự chạy",
  "Token Scope": "Phạm vi token",
  "Destinations": "Địa chỉ nhận",
  "none": "không có",
  "Spend Cap": "Hạn mức chi",
  "Max Txns": "Số giao dịch tối đa",
  "transactions": "giao dịch",
  "Duration": "Thời lượng",
  "Cooldown": "Cooldown",
  "minutes": "phút",
  "Network": "Mạng",
  "Risk copilot verdict": "Kết luận của copilot rủi ro",
  "OpenAI + deterministic safety floor": "OpenAI + sàn an toàn tất định",
  "Deterministic safety fallback": "Dự phòng an toàn tất định",
  "Back": "Quay lại",
  "Assessing policy…": "Đang đánh giá…",
  "Re-run risk assessment": "Chạy lại đánh giá rủi ro",
  "Run AI risk assessment": "Chạy đánh giá rủi ro bằng AI",
  "Continue": "Tiếp tục",
  "Cluster · program · executor": "Cluster · program · executor",
  "Wallet & demo assets": "Ví & tài sản demo",
  "Owner · mints · destinations": "Chủ sở hữu · mint · địa chỉ",
  "Policy invariants": "Bất biến của chính sách",
  "What the program enforces": "Những gì program thực thi",
  "Experience": "Trải nghiệm",
  "Sound · depth · motion": "Âm thanh · chiều sâu · chuyển động",
  "Settings": "Cài đặt",
  "Live configuration of this REDLINE deployment": "Cấu hình thực tế của bản triển khai REDLINE này",
  "Backend anchor · devnet ·": "Backend · devnet ·",
  "checking": "đang kiểm tra",
  "healthy": "hoạt động",
  "offline": "mất kết nối",
  "NETWORK": "MẠNG",
  "Cluster": "Cluster",
  "checking…": "đang kiểm tra…",
  "unreachable": "không kết nối được",
  "Chain adapter": "Bộ nối chuỗi",
  "unknown": "không rõ",
  "Commitment": "Commitment",
  "Program": "Program",
  "Executor": "Executor",
  "Chain indexer": "Bộ lập chỉ mục chuỗi",
  "API build": "Bản build API",
  "Rate limit": "Giới hạn tần suất",
  "req/min per IP": "yêu cầu/phút mỗi IP",
  "Testing…": "Đang kiểm tra…",
  "Test": "Kiểm tra",
  "OWNER SESSION": "PHIÊN CHỦ SỞ HỮU",
  "CONNECTED": "ĐÃ KẾT NỐI",
  "NOT CONNECTED": "CHƯA KẾT NỐI",
  "Connected wallet": "Ví đã kết nối",
  "Wallet required": "Cần ví",
  "Connect through Wallet Standard in the top bar": "Kết nối qua Wallet Standard ở thanh trên cùng",
  "Wallet session": "Phiên ví",
  "signed in · expires": "đã đăng nhập · hết hạn",
  "connected but not signed in": "đã kết nối nhưng chưa đăng nhập",
  "no wallet": "chưa có ví",
  "Writes require a signature": "Ghi dữ liệu cần chữ ký",
  "yes — this is a public deployment": "có — đây là bản triển khai công khai",
  "no — local/mock, writes are open": "không — local/mock, ghi tự do",
  "Demo USDC mint (browser)": "Mint USDC demo (trình duyệt)",
  "not configured": "chưa cấu hình",
  "Demo USDC mint (API)": "Mint USDC demo (API)",
  "configured": "đã cấu hình",
  "Demo destination": "Địa chỉ demo",
  "Bundled write key": "Khóa ghi đóng gói sẵn",
  "present in this bundle — public, not a credential": "có trong bundle — công khai, không phải thông tin xác thực",
  "none (local/mock)": "không có (local/mock)",
  "PROGRAM BOUNDARY": "RANH GIỚI PROGRAM",
  "ON-CHAIN": "ON-CHAIN",
  "Gates enforced in order": "Số gate thực thi theo thứ tự",
  "Policy digest": "Digest chính sách",
  "Allowlist ceiling": "Trần allowlist",
  "4 mints · 4 destinations": "4 mint · 4 địa chỉ",
  "Revocation authority": "Quyền thu hồi",
  "owner signature": "chữ ký chủ sở hữu",
  "Execution behavior": "Hành vi thực thi",
  "first failed gate stops atomically": "gate lỗi đầu tiên dừng toàn bộ giao dịch",
  "The program takes one owner-signed revocation per policy account — but a Solana transaction carries many instructions, so": "Program nhận một lệnh thu hồi có chữ ký chủ sở hữu cho mỗi tài khoản policy — nhưng một giao dịch Solana chứa được nhiều lệnh, nên",
  "Stop all agents": "Dừng tất cả agent",
  "on Guardrails revokes every active grant in a single signature. Funds stay in the vault; only the agents' authority ends.": "ở Guardrails thu hồi mọi grant đang hoạt động trong một chữ ký. Tiền vẫn nằm trong vault; chỉ quyền của agent chấm dứt.",
  "LOCAL PREFERENCES": "TÙY CHỌN CỤC BỘ",
  "THIS DEVICE": "THIẾT BỊ NÀY",
  "3D depth": "Chiều sâu 3D",
  "Perspective, stepped shadows and spatial panels": "Phối cảnh, bóng đổ nhiều lớp và panel không gian",
  "Motion": "Chuyển động",
  "Page transitions, hover lift and live signals": "Chuyển trang, hiệu ứng hover và tín hiệu trực tiếp",
  "Depth and motion are stored on this device and applied immediately. Sound stays in the global header so it follows you across every page.": "Chiều sâu và chuyển động được lưu trên thiết bị này và áp dụng ngay. Âm thanh nằm ở thanh tiêu đề chung nên đi theo bạn qua mọi trang.",
};

// The program's Grant account stores at most four of each.
const MAX_DESTS = 4;
// Used only when nothing has been published yet — the first grant publishes an
// agent version from this, and every later grant names one that already exists.
const FALLBACK_AGENT = {
  name: "YieldGuard Alpha",
  strategy:
    "Risk-bounded DeFi yield optimization with human review for high-impact actions",
};
const DEMO_OPS_DESTINATION = String(
  import.meta.env.VITE_DEMO_OPS_DESTINATION ?? "",
);

/* ── palette ── */
const M = color.primary;
const C = color.info;
const A = color.warn;
const BG = color.bg;

/* ── glass helper ── */
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: color.surface,
  border: `1px solid ${color.border}`,
  ...extra,
});

const LAMPORTS_PER_SOL = 1_000_000_000;
const fmtSol = (lamports: string) =>
  (Number(lamports) / LAMPORTS_PER_SOL).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });

type MarketSort = "newest" | "rating" | "demand" | "price";
const MARKET_SORTS: [MarketSort, string][] = [
  ["newest", "Newest"],
  ["rating", "Reputation"],
  ["demand", "Most rented"],
  ["price", "Cheapest"],
];

export function MarketplacePage() {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const wallet = connected ? String(connected.account.address) : "";
  // Renting moves SOL and creates a record in someone's name. The API refuses
  // it without a signature, so the button waits for one rather than offering
  // an action that is going to come back 401.
  const signedIn = useSignedIn(wallet);
  const [sortBy, setSortBy] = useState<MarketSort>("newest");
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [pricedOnly, setPricedOnly] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState("");
  // The marketplace take rate, read from the API so the card and the payment
  // always agree with what the server will verify.
  const [fee, setFee] = useState<ProtocolFee>({ treasury: null, feeBps: 0, enabled: false });
  useEffect(() => { api.protocolFee().then(setFee).catch(() => { /* fee stays off; the API is the authority anyway */ }); }, []);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [priceSol, setPriceSol] = useState("0.05");
  // Per-listing rental length. The price is a 24h rate, so the total scales
  // with the periods covered — the backend charges the same way.
  const [hours, setHours] = useState<Record<string, number>>({});
  const hoursFor = (id: string) => hours[id] ?? 24;
  const periodsFor = (id: string) => Math.ceil(hoursFor(id) / 24);

  // `error` also carries claim/rent failures, so the empty state needs its own
  // flag to tell "the API said no listings" apart from "the API never answered".
  const load = useCallback(async () => {
    try {
      setListings(await api.listings());
      setError("");
      setLoadFailed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoadFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20_000);
    return () => clearInterval(t);
  }, [load]);

  // The publisher claims a listing by naming the wallet that should be paid.
  async function savePrice(listing: Listing) {
    if (!signedIn) return;
    setBusy(listing.id);
    setError("");
    setNotice("");
    try {
      await api.setListingPrice(listing.id, {
        developerWallet: wallet,
        priceLamports: String(Math.round(Number(priceSol) * LAMPORTS_PER_SOL)),
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  // Renting is a real SOL payment, split in one transaction between the
  // publisher and the REDLINE treasury, then verified on Devnet — both legs —
  // before the rental is recorded.
  async function rent(listing: Listing) {
    if (!connected?.signer || !signedIn || !listing.developerWallet) return;
    const durationHours = hoursFor(listing.id);
    const total =
      BigInt(listing.priceLamports) * BigInt(Math.ceil(durationHours / 24));
    setBusy(listing.id);
    setError("");
    setNotice("");
    try {
      // Read the rate at pay time rather than trusting a value baked into this
      // bundle: a stale fee would make the wallet sign a payment the API then
      // refuses, after the SOL had already moved.
      const fee = await api.protocolFee();
      const split = splitRental(total, fee, listing.developerWallet);
      const result = await client.sendTransaction(
        rentalPaymentInstructions(wallet, listing.developerWallet, split),
      );
      const signature = String(result.context.signature);
      await api.hire({
        listingId: listing.id,
        ownerWallet: wallet,
        durationHours,
        paymentSignature: signature,
      });
      setNotice(
        split.protocolLamports > 0n
          ? `${tr("Rented")} ${listing.agentVersion.name} ${tr("for")} ${durationHours}h · ${tr("publisher")} ${fmtSol(split.publisherLamports.toString())} SOL + ${formatFeeRate(split.feeBps)} ${tr("protocol fee")} ${fmtSol(split.protocolLamports.toString())} SOL · ${short(signature, 6)}`
          : `${tr("Rented")} ${listing.agentVersion.name} ${tr("for")} ${durationHours}h · ${short(signature, 6)}`,
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : tr("Rental payment was rejected or could not be verified."),
      );
    } finally {
      setBusy("");
    }
  }

  const filtered = listings
    .filter((l) => {
      if (pricedOnly && Number(l.priceLamports) === 0) return false;
      if (
        search &&
        !`${l.agentVersion.name} ${l.agentVersion.strategy}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      // An unrated agent sorts last rather than first: `null` means "no
      // evidence yet", and treating that as zero would rank a brand-new
      // listing below a demonstrably bad one, which is not the same claim.
      if (sortBy === "rating")
        return (b.rating?.score ?? -1) - (a.rating?.score ?? -1);
      if (sortBy === "demand")
        return (b.totalHires ?? 0) - (a.totalHires ?? 0);
      if (sortBy === "price")
        return Number(a.priceLamports) - Number(b.priceLamports);
      return b.createdAt.localeCompare(a.createdAt);
    });
  // "Mine" means I published the build or I am already the payout wallet —
  // either way renting from myself is not a thing, and claiming is.
  const isMine = (l: Listing) =>
    Boolean(l.isMine) || (!!wallet && l.developerWallet === wallet);
  const publisherOf = (l: Listing) =>
    l.publisherWallet ?? l.developerWallet ?? null;

  const [focusedId, setFocusedId] = useState<string>("");
  const featured = filtered.find((l) => l.id === focusedId) ?? filtered[0];
  const focusAt = featured ? filtered.indexOf(featured) : 0;
  const move = (delta: number) =>
    setFocusedId(
      filtered[(focusAt + delta + filtered.length) % filtered.length]?.id ?? "",
    );
  return (
    <div className="marketplace-workspace">
      <div className="market-toolbar">
        <label className="search">
          <Search size={15} />
          <input
            aria-label={tr("Search published agents")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("Search agents, strategies…")}
          />
        </label>
        <button
          className="btn btn-ghost"
          aria-pressed={pricedOnly}
          onClick={() => setPricedOnly((v) => !v)}
        >
          <ShieldCheck size={13} />{tr("Rentable only")}</button>
        {/* Sorting by reputation or demand is the only reason to compute them.
            "Newest" stays the default so a fresh listing is not buried by an
            older one purely for having been around longer. */}
        <div className="market-sort" role="group" aria-label={tr("Sort listings")}>
          {MARKET_SORTS.map(([key, label]) => (
            <button
              key={key}
              className="btn btn-ghost btn-sm"
              aria-pressed={sortBy === key}
              onClick={() => setSortBy(key)}
            >
              {tr(label)}
            </button>
          ))}
        </div>
        <span className="chip chip-info">{filtered.length} {tr("VERSIONS")}</span>
      </div>
      {wallet && !signedIn && (
        <p className="help market-signin-note" role="status">{tr("Wallet connected, but not signed in. Renting, claiming and reviewing need a signature — the API cannot tell a connected wallet from a typed address. Use “Sign in” in the top bar.")}</p>
      )}
      {error && (
        <div className="error-note" role="alert">
          {error}
          <button className="btn btn-ghost btn-sm" onClick={() => void load()}>{tr("Retry")}</button>
        </div>
      )}
      {notice && (
        <p role="status" className="success-note">
          {notice}
        </p>
      )}
      <ProtocolRevenuePanel />
      {featured ? (
        <>
          <div className="spot">
            <div className="feature">
              <section
                className="fcard"
                style={{ "--acc": "214,64,142" } as React.CSSProperties}
                key={featured.id}
              >
                <div className="kick">
                  <small>{tr("FEATURED · IMMUTABLE BUILD")}</small>
                  <span className="chip chip-info">
                    {featured.agentVersion.version}
                  </span>
                  <RatingBadge rating={featured.rating} />
                  {isMine(featured) && (
                    <span className="chip chip-gold">{tr("YOURS")}</span>
                  )}
                </div>
                <div className="cluster" aria-hidden="true">
                  <VoxelCube size={44} />
                  <VoxelCube size={32} tone="info" />
                  <VoxelCube size={26} tone="ok" />
                </div>
                <h2>
                  {featured.agentVersion.name}
                  <span>{tr("Built to act within boundaries.")}</span>
                </h2>
                <p>{featured.agentVersion.strategy}</p>
                <div className="meta">
                  <div>
                    <small>{tr("ACTIVE HIRES")}</small>
                    <b>{featured.activeHires}</b>
                  </div>
                  <div>
                    <small>{tr("AGENT HASH")}</small>
                    <b>{short(featured.agentVersion.agentHash, 4)}</b>
                  </div>
                  <div>
                    <small>{tr("PUBLISHER")}</small>
                    <b>
                      {publisherOf(featured)
                        ? short(publisherOf(featured) as string, 4)
                        : tr("Unclaimed")}
                    </b>
                  </div>
                </div>
                {/* Demand, from records that already existed: hire rows and the
                    `listing.hired` audit events carrying what was paid. */}
                <div className="meta demand">
                  <div>
                    <small>{tr("RENTALS")}</small>
                    <b>{featured.totalHires ?? 0}</b>
                    <small>{featured.hires24h ?? 0} {tr("in 24h")}</small>
                  </div>
                  <div>
                    <small>{tr("PAID OUT")}</small>
                    <b>{fmtSol(featured.volumeLamports ?? "0")} SOL</b>
                    <small>{tr("all time")}</small>
                  </div>
                  <div>
                    <small>{tr("LAST RENTED")}</small>
                    <b>
                      {featured.lastHiredAt
                        ? new Date(featured.lastHiredAt).toLocaleDateString()
                        : "—"}
                    </b>
                    <small>
                      {tr("published")}{" "}
                      {new Date(featured.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
                <div className="cta">
                  <div className="price">
                    <b>
                      {Number(featured.priceLamports) > 0
                        ? `${fmtSol(featured.priceLamports)} SOL`
                        : tr("Unpriced")}
                    </b>
                    <small>{tr("per 24-hour period")}</small>
                  </div>
                  <div className="dur">
                    {[24, 48, 72].map((h) => (
                      <button
                        key={h}
                        aria-pressed={hoursFor(featured.id) === h}
                        onClick={() =>
                          setHours((v) => ({ ...v, [featured.id]: h }))
                        }
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
                {Number(featured.priceLamports) > 0 &&
                featured.developerWallet ? (
                  <>
                    <button
                      className="btn btn-gold full-button rentbtn"
                      onClick={() => void rent(featured)}
                      disabled={
                        !connected?.signer ||
                        !signedIn ||
                        busy !== "" ||
                        isMine(featured)
                      }
                      title={
                        isMine(featured)
                          ? tr("You publish this agent")
                          : !connected?.signer
                            ? tr("Connect a wallet to rent")
                            : !signedIn
                              ? tr("Sign in with your wallet to rent")
                              : ""
                      }
                    >
                      <Wallet size={14} />
                      {busy === featured.id
                        ? tr("Waiting for wallet / verification…")
                        : isMine(featured)
                          ? tr("This is your listing")
                          : !wallet
                            ? tr("Connect wallet to rent")
                            : !signedIn
                              ? tr("Sign in to rent")
                              : tr("Rent with wallet")}
                      <ArrowRight size={14} />
                    </button>
                    <p className="help">
                      {tr("Total")}{" "}
                      {fmtSol(
                        String(
                          BigInt(featured.priceLamports) *
                            BigInt(periodsFor(featured.id)),
                        ),
                      )}{" "}
                      SOL · {hoursFor(featured.id)} {tr("hours")}
                    </p>
                    {/* Where that total goes. Shown before the wallet prompt
                        because a fee a renter only learns about afterwards is
                        a surprise, not a business model. */}
                    {(() => {
                      const split = splitRental(
                        BigInt(featured.priceLamports) * BigInt(periodsFor(featured.id)),
                        fee,
                        featured.developerWallet ?? "",
                      );
                      if (split.protocolLamports <= 0n) return null;
                      return (
                        <p className="help">
                          {tr("Publisher")} {fmtSol(split.publisherLamports.toString())} SOL ·{" "}
                          {formatFeeRate(split.feeBps)} {tr("protocol fee")}{" "}
                          {fmtSol(split.protocolLamports.toString())} SOL {tr("— one transaction, both verified on-chain")}
                        </p>
                      );
                    })()}
                  </>
                ) : (
                  <p className="help">{tr("The publisher must configure a price before this version can be rented.")}</p>
                )}
                {/* Only the publisher (or the wallet already being paid) can
                    claim: the payout wallet is write-once on the API, so
                    offering "Claim" to anyone else would only lead to a 403. */}
                {wallet && isMine(featured) && (
                    <div className="publisher-pricing">
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={!signedIn}
                        title={
                          signedIn
                            ? ""
                            : tr("Sign in with your wallet to claim this listing")
                        }
                        onClick={() => {
                          setEditing(
                            editing === featured.id ? null : featured.id,
                          );
                          setPriceSol(fmtSol(featured.priceLamports));
                        }}
                      >
                        {featured.developerWallet
                          ? tr("Edit publisher price")
                          : tr("Claim listing · set price")}
                      </button>
                      {editing === featured.id && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void savePrice(featured);
                          }}
                        >
                          <label>{tr("Price per day · SOL")}<input
                              type="number"
                              step="0.000001"
                              min="0.000001"
                              required
                              value={priceSol}
                              onChange={(e) => setPriceSol(e.target.value)}
                            />
                          </label>
                          <button className="btn btn-gold" disabled={!!busy}>{tr("Save price")}</button>
                        </form>
                      )}
                    </div>
                  )}
                <div className="reputation">
                  <button
                    className="btn btn-ghost btn-sm"
                    aria-expanded={reviewsOpen}
                    onClick={() => setReviewsOpen((v) => !v)}
                  >
                    {reviewsOpen
                      ? tr("Hide reputation")
                      : `${tr("Reputation & reviews")}${
                          featured.rating?.reviews.count
                            ? ` (${featured.rating.reviews.count})`
                            : ""
                        }`}
                  </button>
                  {reviewsOpen && (
                    <ReviewPanel
                      key={featured.id}
                      listingId={featured.id}
                      wallet={wallet}
                    />
                  )}
                </div>
              </section>
            </div>
            <div className="flow-wrap">
              <div className="eyebrow">{tr("EXPLORE THE REGISTRY")}</div>
              <div className="cover-flow">
                {filtered.map((l, i) => {
                  const delta = i - focusAt;
                  if (Math.abs(delta) > 2) return null;
                  return (
                    <button
                      className="cf"
                      key={l.id}
                      data-pos={delta}
                      style={
                        {
                          "--acc": [
                            "14,145,205",
                            "133,219,192",
                            "223,195,140",
                            "214,64,142",
                          ][i % 4],
                        } as React.CSSProperties
                      }
                      onClick={() => setFocusedId(l.id)}
                      aria-label={`${tr("View")} ${l.agentVersion.name}`}
                    >
                      <span className="av">
                        <Bot size={21} />
                      </span>
                      <b>{l.agentVersion.name}</b>
                      <small>
                        {l.agentVersion.version} ·{" "}
                        {short(l.agentVersion.agentHash, 4)}
                      </small>
                      <p>{l.agentVersion.strategy}</p>
                      <div className="pr">
                        {Number(l.priceLamports) > 0
                          ? `${fmtSol(l.priceLamports)} SOL`
                          : tr("Unpriced")}
                        <span>{l.activeHires} {tr("active hires")}</span>
                      </div>
                    </button>
                  );
                })}
                <div className="cf-floor" />
              </div>
              <div className="cf-nav">
                <button
                  className="btn btn-ghost btn-sm"
                  aria-label={tr("Previous agent")}
                  onClick={() => move(-1)}
                >
                  <ArrowLeft size={14} />
                </button>
                <span className="mono">
                  {focusAt + 1} / {filtered.length}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  aria-label={tr("Next agent")}
                  onClick={() => move(1)}
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
          <section className="panel registry-table">
            <div className="ph">
              <h2>{tr("All published versions")}</h2>
              <span className="chip chip-info">{filtered.length} {tr("VERSIONS")}</span>
            </div>
            <div className="registry-scroll">
              <div className="listing registry-head">
                <span />
                <span>{tr("AGENT")}</span>
                <span>{tr("HASH")}</span>
                <span>{tr("PUBLISHER")}</span>
                <span>{tr("HIRES · LIVE / ALL")}</span>
                <span>{tr("PRICE / DAY")}</span>
                <span />
              </div>
              {filtered.map((l) => (
                <div className="listing" key={l.id}>
                  <span className="av">
                    <Bot size={14} />
                  </span>
                  <span>
                    <b>
                      {l.agentVersion.name}
                      {isMine(l) && <span className="chip chip-gold">{tr("YOURS")}</span>}
                    </b>
                    <small>
                      {l.agentVersion.version} <RatingBadge rating={l.rating} />
                    </small>
                  </span>
                  <span className="m">
                    {short(l.agentVersion.agentHash, 5)}
                  </span>
                  <span className="m">
                    {publisherOf(l)
                      ? short(publisherOf(l) as string, 5)
                      : tr("Unclaimed")}
                  </span>
                  <span>
                    {l.activeHires} / {l.totalHires ?? 0}
                  </span>
                  <span className="p">
                    {Number(l.priceLamports) > 0
                      ? `${fmtSol(l.priceLamports)} SOL`
                      : "—"}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setFocusedId(l.id);
                      document
                        .querySelector(".main-scroll")
                        ?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {tr("View")} <ArrowUpRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="panel">
          <div className="empty-state">
            {loadFailed
              ? tr("The registry could not be loaded. Retry the connection above.")
              : tr("No published versions match this search.")}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── 5. VAULT ── */
export function VaultPage() {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const owner = connected ? String(connected.account.address) : "";
  const [sol, setSol] = useState<number | null>(null);
  const [events, setEvents] = useState<AuditRow[]>([]);

  useEffect(() => {
    if (!owner) {
      setSol(null);
      setEvents([]);
      return;
    }
    let live = true;
    const load = async () => {
      try {
        const balance = await client.rpc.getBalance(address(owner)).send();
        if (live) setSol(Number(balance.value) / 1_000_000_000);
      } catch {
        if (live) setSol(null);
      }
      try {
        const rows = await api.audit();
        if (live)
          setEvents(
            rows
              .filter(
                (r) =>
                  r.actorType === "owner" ||
                  r.eventType.startsWith("chain.") ||
                  r.eventType === "vault.funded",
              )
              .slice(-8)
              .reverse(),
          );
      } catch {
        /* the panel above already surfaces API errors */
      }
    };
    void load();
    const t = setInterval(() => void load(), 15_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [client, owner]);

  return (
    <div className="route-page treasury-workspace">
      <VaultPanel />
      <aside className="treasury-side">
        <section className="panel">
          <div className="ph">
            <h2>{tr("Owner wallet")}</h2>
            <span className="chip chip-info">DEVNET</span>
          </div>
          <div className="pb">
            <div className="vault-wallet-number">
              {owner && sol !== null
                ? sol.toLocaleString(undefined, { maximumFractionDigits: 4 })
                : "—"}{" "}
              <small>SOL</small>
            </div>
            <p className="help">{tr("Devnet SOL pays transaction fees.")}</p>
            {owner ? (
              <a
                className="hash-preview"
                href={explorerAddressUrl(owner)}
                target="_blank"
                rel="noreferrer"
              >
                {owner} ↗
              </a>
            ) : (
              <>
                <p className="help">{tr("Connect your wallet to load its vault, balances and signing controls.")}</p>
                <SolanaWalletControl />
              </>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="ph">
            <h2>{tr("Recent chain activity")}</h2>
            <span className="chip chip-dim">{tr("LATEST 8")}</span>
          </div>
          <div className="pb">
            {events.length ? (
              events.map((e) => (
                <div className="treasury-event" key={e.id}>
                  <span className="chip chip-info">{e.eventType}</span>
                  <small>{new Date(e.createdAt).toLocaleString()}</small>
                  {e.chainSignature && (
                    <a
                      href={explorerTransactionUrl(e.chainSignature)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {short(e.chainSignature, 8)} ↗
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Activity size={28} />
                <p>
                  {owner
                    ? tr("No recorded transactions yet.")
                    : tr("Activity loads after connecting a wallet.")}
                </p>
              </div>
            )}
          </div>
        </section>
        <div className="treasury-boundary">
          <ShieldCheck size={20} />
          <p>{tr("Assets remain in a program-owned vault. The agent can only move them within an owner-signed policy.")}</p>
        </div>
      </aside>
    </div>
  );
}

/* ── range control ── */
// This lived inside SessionsPage, as `function SliderCtl` in the component
// body. A function declared during render is a NEW component type on every
// render, so each time a slider reported a value React unmounted the <input>
// under the pointer and mounted a fresh one. A click survived that — one change,
// one remount — but a drag did not: the element being dragged no longer existed
// after its first step. Declared here, its identity is stable and the native
// drag runs to completion.
const THUMB = 14;

function SliderCtl({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  accent,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
  accent: string;
  step?: number;
}) {
  const ratio = (value - min) / (max - min);
  // What is being typed, kept apart from the committed value so a half-typed
  // "5" is not clamped up to the minimum before the second digit arrives.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
    setDraft(null);
  };
  // A pixel of a 400px track is 25 USDC on the cap slider, so dragging alone
  // cannot land on an exact figure. Arrow keys step by one unit; with Shift, ten.
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!dir || !e.shiftKey) return;
    e.preventDefault();
    onChange(Math.min(max, Math.max(min, value + dir * step * 10)));
  };
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center gap-3">
        <span className="text-xs" style={{ ...sans, color: color.textSecondary }}>
          {label}
        </span>
        <label
          className="rl-range-value text-xs font-semibold px-2 py-0.5 rounded-md inline-flex items-baseline"
          style={{ ...mono, color: accent, background: `${accent}12`, border: `1px solid ${accent}20` }}
        >
          <input
            type="text"
            inputMode="numeric"
            aria-label={label}
            value={draft ?? value.toLocaleString()}
            onFocus={(e) => { setDraft(String(value)); requestAnimationFrame(() => e.target.select()); }}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); }
              if (e.key === "Escape") { setDraft(null); (e.target as HTMLInputElement).blur(); }
            }}
            style={{ width: `${Math.max(2, (draft ?? value.toLocaleString()).length) + 0.5}ch`, color: "inherit" }}
          />
          {unit}
        </label>
      </div>
      <div className="rl-range relative h-6 flex items-center" style={{ "--rl-accent": accent } as React.CSSProperties}>
        <div
          className="absolute left-0 right-0 h-1.5 rounded-full pointer-events-none"
          style={{ background: color.surfaceInset }}
        />
        {/* The fill and the thumb follow the same geometry the browser uses for
            the hidden native thumb: its centre travels from half a thumb in to
            half a thumb from the end, not from 0 to 100%. The old maths was off
            by up to 7px at either end, so a click did not land where it looked. */}
        <div
          className="absolute left-0 h-1.5 rounded-full pointer-events-none"
          style={{
            width: `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${ratio})`,
            background: `linear-gradient(90deg, ${accent}60, ${accent})`,
          }}
        />
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          onKeyDown={onKey}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {/* No transition on `left`: it made the thumb trail the pointer. */}
        <div
          className="rl-range-thumb absolute pointer-events-none"
          style={{
            left: `calc((100% - ${THUMB}px) * ${ratio})`,
            background: color.surface,
            borderColor: accent,
          }}
        />
      </div>
    </div>
  );
}

/* ── 7. SESSIONS ── */
export function SessionsPage() {
  const tr = useT(VI);
  const [step, setStep] = useState(0);
  const [tokens, setTokens] = useState(["SOL", "USDC"]);
  const [cap, setCap] = useState(500);
  const [txn, setTxn] = useState(50);
  const [dur, setDur] = useState(24);
  const [cool, setCool] = useState(6);
  // Seeded from the demo ops wallet so the default flow still works, but the
  // destination allowlist is the product's headline promise — it belongs to
  // the owner, not to a build-time constant.
  const [dests, setDests] = useState<string[]>(
    [DEMO_OPS_DESTINATION].filter(Boolean),
  );
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>([]);
  const [agentId, setAgentId] = useState("");
  // Rentals this wallet holds. An agent someone else publishes and prices is
  // only grantable while a rental covers it — the API checks, this just lets
  // the wizard say so before the wallet is asked to sign.
  const [hires, setHires] = useState<Hire[]>([]);
  const wizardClient = useClient<AppClient>();
  const wizardWallet = useConnectedWallet(wizardClient);
  const wallet = wizardWallet ? String(wizardWallet.account.address) : "";
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");
  const [grantsKey, setGrantsKey] = useState(0);

  useEffect(() => {
    let live = true;
    api
      .agents()
      .then((list) => {
        if (!live) return;
        setAgentVersions(list);
        setAgentId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => {
        /* none published yet: the sign step publishes one from this policy */
      });
    if (wallet)
      api
        .hires(wallet)
        .then((h) => {
          if (live) setHires(h);
        })
        .catch(() => {
          /* no rentals is not an error */
        });
    return () => {
      live = false;
    };
  }, [grantsKey, wallet]);
  const tList = ["SOL", "USDC", "JUP", "JTO", "BONK", "PYTH"];
  const STEPS = ["Scope", "Spend Limits", "Time Bounds", "Review & Sign"];

  const cleanDests = [...new Set(dests.map((d) => d.trim()).filter(Boolean))];
  const destError = dests.some((d) => d.trim() && !isAddressLike(d.trim()))
    ? tr("One of these is not a valid Solana address.")
    : cleanDests.length === 0
      ? tr("Add at least one address the agent may pay.")
      : cleanDests.length !== dests.filter((d) => d.trim()).length
        ? tr("Duplicate destinations are ignored.")
        : "";
  const destsInvalid =
    cleanDests.length === 0 ||
    dests.some((d) => d.trim() && !isAddressLike(d.trim()));

  // Which published agent version this grant authorises. The grant records it,
  // so picking the wrong one would put the wrong agentHash in the audit trail.
  const selectedAgent = agentVersions.find((a) => a.id === agentId) ?? null;
  const activeHire = selectedAgent
    ? (hires.find(
        (h) =>
          h.listing?.agentVersionId === selectedAgent.id &&
          new Date(h.endsAt) > new Date(),
      ) ?? null)
    : null;
  const policy: AgentPolicyInput = {
    agentName: selectedAgent?.name ?? FALLBACK_AGENT.name,
    strategy: selectedAgent?.strategy ?? FALLBACK_AGENT.strategy,
    tokens,
    spendCapUsdc: cap,
    maxTransactions: txn,
    durationHours: dur,
    cooldownMinutes: cool,
  };
  // The same rules the copilot and the server apply, run live as the sliders
  // move. The tile below used to have thresholds of its own and called a policy
  // HIGH that the verdict two steps later called LOW.
  const liveRisk = assessPolicyLocally(policy);

  // Destinations are part of the signed policy digest, so a change to them
  // invalidates the reviewed policy just as a cap change does.
  useEffect(() => {
    setAssessment(null);
    setAssessmentError("");
  }, [tokens, cap, txn, dur, cool, dests]);

  async function assessPolicy() {
    setAssessing(true);
    setAssessmentError("");
    try {
      setAssessment(await requestRiskAssessment(policy));
    } catch (error) {
      setAssessmentError(
        error instanceof Error
          ? error.message
          : tr("Unable to assess this policy."),
      );
    } finally {
      setAssessing(false);
    }
  }

  return (
    <div className="route-page page-guardrails space-y-8">
      <div className="route-local-heading">
        <h1
          className="text-2xl font-bold"
          style={{ ...sans, color: color.text }}
        >{tr("Agent Guardrails")}</h1>
        <p className="text-sm mt-0.5" style={{ ...sans, color: color.textDim }}>{tr("Design bounded Solana policies, run AI risk checks, and publish verifiable proofs")}</p>
      </div>

      {/* Real grants from the REDLINE API (on-chain state via /grants/:id) */}
      <GrantsPanel refreshKey={grantsKey} />

      {/* Live transfer lane — replays the program's verdict for every proposal (SSE) */}
      <TransferLane />

      {/* New session wizard */}
      <div
        className="rounded-2xl overflow-hidden px-block"
        style={{ ...glass() }}
      >
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: color.border, background: `${M}04` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: `${M}14`, border: `1px solid ${M}25` }}
            >
              <Key size={12} style={{ color: M }} />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ ...sans, color: color.text }}
            >{tr("Create Agent Policy")}</span>
            <span
              className="ml-auto text-[12px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                ...mono,
                background: `${C}14`,
                color: C,
                border: `1px solid ${C}25`,
              }}
            >
              SOLANA DEVNET
            </span>
          </div>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <button
                type="button"
                key={`wiz-step-${i}`}
                onClick={() => setStep(i)}
                aria-current={step === i ? "step" : undefined}
                aria-label={`${tr("Step")} ${i + 1}: ${tr(s)}`}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-full h-0.5 rounded-full transition-all"
                  style={{
                    background:
                      i <= step ? (i === step ? M : `${M}50`) : color.border,
                  }}
                />
                <span
                  className="text-[12px] font-semibold hidden sm:block"
                  style={{
                    ...mono,
                    color:
                      i === step
                        ? M
                        : i < step
                          ? `${M}60`
                          : "rgba(148,163,184,0.35)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")} {tr(s)}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 py-6" style={{ minHeight: 240 }}>
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p
                  className="text-xs"
                  style={{
                    ...sans,
                    color: color.textSecondary,
                    lineHeight: 1.7,
                  }}
                >{tr("Which published agent version does this grant authorise? The grant records its")}<code>agentHash</code>{tr(", so this is the build the policy is bound to.")}</p>
                {agentVersions.length > 0 ? (
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    aria-label={tr("Agent version this grant authorises")}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{
                      ...mono,
                      background: color.surfaceSubtle,
                      border: `1px solid ${color.border}`,
                      color: color.text,
                    }}
                  >
                    {agentVersions.map((a) => (
                      <option
                        key={a.id}
                        value={a.id}
                        style={{ background: color.surface }}
                      >
                        {a.name} {a.version} · {a.agentHash.slice(0, 8)}…
                      </option>
                    ))}
                  </select>
                ) : (
                  <p
                    className="text-[13px] px-3 py-2 rounded-xl"
                    style={{
                      ...sans,
                      background: `${A}0b`,
                      border: `1px solid ${A}25`,
                      color: color.warn,
                    }}
                  >
                    {tr("No agent published yet — signing this grant publishes “")}{FALLBACK_AGENT.name}{tr("” and binds the grant to it. Publish from the Agents page first to name your own.")}
                  </p>
                )}
                {selectedAgent && (
                  <p
                    className="text-[12px]"
                    style={{ ...sans, color: color.textMuted, lineHeight: 1.6 }}
                  >
                    {selectedAgent.strategy}
                  </p>
                )}
                {activeHire && (
                  <p
                    className="text-[12px] px-3 py-2 rounded-xl"
                    style={{
                      ...sans,
                      background: `${C}0b`,
                      border: `1px solid ${C}25`,
                      color: C,
                      lineHeight: 1.6,
                    }}
                  >
                    {tr("Running under your rental of this agent — it covers grants until")}{" "}
                    {new Date(activeHire.endsAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {tr(". The grant records which rental authorised it.")}
                  </p>
                )}
              </div>
              <p
                className="text-xs"
                style={{ ...sans, color: color.textSecondary, lineHeight: 1.7 }}
              >{tr("Allowlist the SPL assets this agent may reference. Every other mint remains outside the signed policy.")}</p>
              <div className="flex flex-wrap gap-2">
                {tList.map((t, ti) => {
                  const on = tokens.includes(t);
                  return (
                    <button
                      type="button"
                      key={`wiz-tok-${ti}`}
                      onClick={() =>
                        setTokens((p) =>
                          p.includes(t) ? p.filter((x) => x !== t) : [...p, t],
                        )
                      }
                      aria-pressed={on}
                      className="px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all"
                      style={{
                        ...mono,
                        background: on ? `${M}14` : color.surfaceSubtle,
                        border: `1px solid ${on ? M + "40" : color.border}`,
                        color: on ? M : color.textMuted,
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <div className="pt-1 space-y-2">
                <p
                  className="text-xs"
                  style={{
                    ...sans,
                    color: color.textSecondary,
                    lineHeight: 1.7,
                  }}
                >
                  {tr("Allowlist the addresses this agent may pay. The program checks every transfer against this list — an address that is not here cannot receive funds, whatever the agent proposes. Up to")}{" "}
                  {MAX_DESTS}.
                </p>
                {dests.map((d, di) => (
                  <div key={`dest-${di}`} className="flex gap-2">
                    <input
                      value={d}
                      onChange={(e) =>
                        setDests((p) =>
                          p.map((x, i) =>
                            i === di ? e.target.value.trim() : x,
                          ),
                        )
                      }
                      placeholder={tr("Recipient address (base58)")}
                      aria-label={`${tr("Allowed destination")} ${di + 1}`}
                      spellCheck={false}
                      className="flex-1 px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{
                        ...mono,
                        background: color.surfaceSubtle,
                        border: `1px solid ${d && !isAddressLike(d) ? "#ef444455" : color.border}`,
                        color: color.text,
                      }}
                    />
                    {dests.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDests((p) => p.filter((_, i) => i !== di))
                        }
                        aria-label={`${tr("Remove destination")} ${di + 1}`}
                        className="px-3 rounded-xl text-[13px]"
                        style={{
                          ...mono,
                          background: color.surfaceSubtle,
                          border: `1px solid ${color.border}`,
                          color: color.textMuted,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {dests.length < MAX_DESTS && (
                  <button
                    type="button"
                    onClick={() => setDests((p) => [...p, ""])}
                    className="text-[13px] px-3 py-1.5 rounded-xl"
                    style={{
                      ...mono,
                      background: `${C}10`,
                      border: `1px solid ${C}25`,
                      color: C,
                    }}
                  >{tr("+ Add destination")}</button>
                )}
                {destError && (
                  <p
                    role="alert"
                    className="text-[12px]"
                    style={{ ...sans, color: color.danger }}
                  >
                    {destError}
                  </p>
                )}
              </div>
              <div
                className="rounded-xl p-3 flex gap-2.5"
                style={{ background: `${C}0a`, border: `1px solid ${C}18` }}
              >
                <Lock
                  size={12}
                  style={{ color: C, marginTop: 1, flexShrink: 0 }}
                />
                <p
                  className="text-[13px]"
                  style={{
                    ...sans,
                    color: color.textSecondary,
                    lineHeight: 1.6,
                  }}
                >{tr("The policy digest binds token scope, the destination allowlist, spend cap, execution limit, cooldown, and validity window into one verifiable proof.")}</p>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <p
                className="text-xs"
                style={{ ...sans, color: color.textSecondary }}
              >{tr("Configure total spend ceiling and per-session transaction limits.")}</p>
              <SliderCtl
                label={tr("Total Spend Cap")}
                value={cap}
                onChange={setCap}
                min={10}
                max={10000}
                step={10}
                unit=" USDC"
                accent={A}
              />
              <SliderCtl
                label={tr("Max Transactions / Session")}
                value={txn}
                onChange={setTxn}
                min={1}
                max={500}
                unit=" txns"
                accent={C}
              />
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: tr("Avg/Tx"),
                    value: `$${(cap / txn).toFixed(2)}`,
                    color: A,
                  },
                  {
                    label: tr("Risk"),
                    value: `${liveRisk.level} · ${liveRisk.score}`,
                    color: liveRisk.score >= 60 ? color.danger : liveRisk.score >= 35 ? A : M,
                  },
                  { label: tr("Tokens"), value: String(tokens.length), color: C },
                ].map((row, ri) => (
                  <div
                    key={`wiz-row-${ri}`}
                    className="rounded-xl p-3 text-center"
                    style={{
                      background: color.surfaceSubtle,
                      border: `1px solid ${color.border}`,
                    }}
                  >
                    <div
                      className="text-[12px] mb-1"
                      style={{ ...sans, color: color.textMuted }}
                    >
                      {row.label}
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{ ...mono, color: row.color }}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <p
                className="text-xs"
                style={{ ...sans, color: color.textSecondary }}
              >{tr("Set validity window and minimum cooldown between executions.")}</p>
              <SliderCtl
                label={tr("Session Duration")}
                value={dur}
                onChange={setDur}
                min={1}
                max={168}
                unit="h"
                accent={M}
              />
              <SliderCtl
                label={tr("Execution Cooldown")}
                value={cool}
                onChange={setCool}
                min={1}
                max={60}
                unit="m"
                accent={C}
              />
              <div
                className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ background: `${M}09`, border: `1px solid ${M}18` }}
              >
                <Timer size={14} style={{ color: M, flexShrink: 0 }} />
                <div>
                  <div
                    className="text-[13px] font-semibold"
                    style={{ ...mono, color: M }}
                  >
                    {tr("Expires")}{" "}
                    {new Date(Date.now() + dur * 3600000).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                  <div
                    className="text-[12px] mt-0.5"
                    style={{ ...sans, color: color.textMuted }}
                  >
                    ≤ {Math.floor((dur * 60) / cool)} {tr("executions")} · {cool}m {tr("cooldown")}
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p
                className="text-xs"
                style={{ ...sans, color: color.textSecondary }}
              >{tr("Review the bounded policy, run the risk copilot, then sign the on-chain grant. The program enforces these limits on every agent transfer.")}</p>
              <div>
                {[
                  [
                    tr("Agent"),
                    selectedAgent
                      ? `${selectedAgent.name} ${selectedAgent.version}`
                      : `${FALLBACK_AGENT.name} ${tr("(new)")}`,
                    M,
                  ],
                  [
                    tr("Rental"),
                    activeHire
                      ? `${tr("until")} ${new Date(activeHire.endsAt).toLocaleDateString()}`
                      : tr("not rented — yours to run"),
                    C,
                  ],
                  [tr("Token Scope"), tokens.join(", "), C],
                  [
                    tr("Destinations"),
                    cleanDests.map((d) => short(d, 6)).join(", ") || tr("none"),
                    A,
                  ],
                  [tr("Spend Cap"), `${cap.toLocaleString()} USDC`, A],
                  [tr("Max Txns"), `${txn} ${tr("transactions")}`, C],
                  [tr("Duration"), `${dur} ${tr("hours")}`, M],
                  [tr("Cooldown"), `${cool} ${tr("minutes")}`, M],
                  [tr("Network"), "Solana Devnet", C],
                ].map(([k, v, col], ri) => (
                  <div
                    key={`rev-${ri}`}
                    className="flex justify-between py-2.5 border-b"
                    style={{ borderColor: color.border }}
                  >
                    <span
                      className="text-[13px]"
                      style={{ ...sans, color: color.textMuted }}
                    >
                      {k}
                    </span>
                    <span
                      className="text-[13px] font-semibold"
                      style={{ ...mono, color: col as string }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              {assessment && (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: `${assessment.decision === "ALLOW" ? M : assessment.decision === "REVIEW" ? A : color.danger}0b`,
                    border: `1px solid ${assessment.decision === "ALLOW" ? M : assessment.decision === "REVIEW" ? A : color.danger}25`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="text-xs font-semibold"
                        style={{ color: color.text }}
                      >{tr("Risk copilot verdict")}</div>
                      <div
                        className="text-[12px] mt-0.5"
                        style={{ color: color.textMuted }}
                      >
                        {assessment.source === "openai"
                          ? `OpenAI · ${assessment.model}`
                          : assessment.source === "openai+deterministic-floor"
                            ? `${tr("OpenAI + deterministic safety floor")} · ${assessment.model}`
                            : tr("Deterministic safety fallback")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-xl font-bold"
                        style={{
                          ...mono,
                          color:
                            assessment.decision === "ALLOW"
                              ? M
                              : assessment.decision === "REVIEW"
                                ? A
                                : color.danger,
                        }}
                      >
                        {assessment.score}/100
                      </div>
                      <div
                        className="text-[12px]"
                        style={{ ...mono, color: color.textSecondary }}
                      >
                        {assessment.decision}
                      </div>
                    </div>
                  </div>
                  <p
                    className="text-[13px]"
                    style={{ color: color.textSecondary }}
                  >
                    {assessment.summary}
                  </p>
                  <ul className="space-y-1">
                    {assessment.findings.slice(0, 3).map((finding, index) => (
                      <li
                        key={`finding-${index}`}
                        className="text-[12px] flex gap-2"
                        style={{ color: color.textMuted }}
                      >
                        <span style={{ color: C }}>•</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                  <GrantSignButton
                    policy={policy}
                    assessment={assessment}
                    destinations={cleanDests}
                    destinationsInvalid={destsInvalid}
                    agentVersionId={selectedAgent?.id ?? null}
                    hireId={activeHire?.id ?? null}
                    onCreated={() => setGrantsKey((k) => k + 1)}
                  />
                </div>
              )}
              {assessmentError && (
                <p
                  role="alert"
                  className="text-[12px]"
                  style={{ color: color.danger }}
                >
                  {assessmentError}
                </p>
              )}
            </div>
          )}
        </div>
        <div
          className="px-6 py-4 border-t flex gap-2"
          style={{ borderColor: color.border }}
        >
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-btn px-4 py-2 rounded-xl text-xs font-medium disabled:opacity-25"
            style={{
              ...sans,
              background: color.surfaceInset,
              border: `1px solid ${color.border}`,
              color: color.textSecondary,
            }}
          >{tr("Back")}</button>
          <button
            type="button"
            onClick={() =>
              step < STEPS.length - 1
                ? setStep((s) => s + 1)
                : void assessPolicy()
            }
            disabled={assessing}
            className="px-btn flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            style={{
              ...sans,
              background: step === STEPS.length - 1 ? color.primary : `${M}12`,
              border: `1px solid ${step === STEPS.length - 1 ? color.primary : M + "35"}`,
              color: step === STEPS.length - 1 ? color.onAccent : M,
              boxShadow:
                step === STEPS.length - 1
                  ? "0 6px 18px rgba(167,139,250,0.28)"
                  : "none",
            }}
          >
            {step === STEPS.length - 1 ? (
              <>
                <Shield size={12} />
                {assessing
                  ? tr("Assessing policy…")
                  : assessment
                    ? tr("Re-run risk assessment")
                    : tr("Run AI risk assessment")}
              </>
            ) : (
              <>
                {tr("Continue")} <ChevronRight size={12} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* A settings line. Module-level for the same reason as SliderCtl: declared inside
   SettingsPage it was a new component type on every render. */
function Row({
  label,
  value,
  accent = M,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b gap-4"
      style={{ borderColor: color.border }}
    >
      <span
        className="text-xs shrink-0"
        style={{ ...sans, color: color.textSecondary }}
      >
        {label}
      </span>
      <span
        className="text-xs font-semibold text-right break-all"
        style={{ ...mono, color: accent }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── 8. SETTINGS ── */
export function SettingsPage() {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const wallet = connected ? String(connected.account.address) : "";
  const backend = useBackendStatus();
  const health = backend.health;
  // "waking" is its own state on the wire; Settings only needs to know whether
  // it can show numbers yet, but it must not call a starting service offline.
  const healthState: "checking" | "healthy" | "offline" =
    backend.phase === "online" ? "healthy" : backend.phase === "offline" ? "offline" : "checking";
  const [activeTab, setActiveTab] = useState(0);
  const [depthEnabled, setDepthEnabled] = useState(() =>
    readPreference("depth"),
  );
  const [motionEnabled, setMotionEnabled] = useState(() =>
    readPreference("motion"),
  );
  useEffect(() => {
    applyPreference("depth", depthEnabled);
    applyPreference("motion", motionEnabled);
  }, [depthEnabled, motionEnabled]);
  const signedIn = useSignedIn(wallet);
  const session = signedIn ? loadSession() : null;
  const tabs = [
    { label: tr("Network"), detail: tr("Cluster · program · executor"), icon: Network },
    {
      label: tr("Wallet & demo assets"),
      detail: tr("Owner · mints · destinations"),
      icon: Wallet,
    },
    {
      label: tr("Policy invariants"),
      detail: tr("What the program enforces"),
      icon: Lock,
    },
    { label: tr("Experience"), detail: tr("Sound · depth · motion"), icon: Sparkles },
  ];

  // Re-probe on demand. The shared prober owns the pacing, so "Test" here
  // means the same thing as the banner in the shell rather than starting a
  // second, differently-timed check.
  const testHealth = backend.retry;


  const healthLabel = healthState === "checking" ? "checking" : healthState;

  return (
    <div className="route-page page-settings">
      <div className="route-local-heading">
        <h1
          className="text-2xl font-bold"
          style={{ ...sans, color: color.text }}
        >{tr("Settings")}</h1>
        <p className="text-sm mt-0.5" style={{ ...sans, color: color.textDim }}>{tr("Live configuration of this REDLINE deployment")}</p>
      </div>
      <div className="settings-artifact-shell">
        <aside className="settings-artifact-nav" style={{ ...glass() }}>
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                role="tab"
                key={tab.label}
                onClick={() => setActiveTab(index)}
                aria-selected={activeTab === index}
              >
                <span>
                  <Icon size={16} />
                </span>
                <span>
                  <strong>{tab.label}</strong>
                  <small>{tab.detail}</small>
                </span>
                <ChevronRight size={14} />
              </button>
            );
          })}
          <div className="settings-backend-anchor">
            <i className={health ? "is-live" : ""} />
            <span>{tr("Backend anchor · devnet ·")} {tr(healthLabel)}</span>
          </div>
        </aside>

        <section className="settings-artifact-panel" style={{ ...glass() }}>
          {activeTab === 0 && (
            <>
              <header>
                <div>
                  <span>{tr("NETWORK")}</span>
                  <h2>{tr("Network")}</h2>
                </div>
                <em className={health ? "is-live" : ""}>
                  <i />
                  {tr(healthLabel).toUpperCase()}
                </em>
              </header>
              {/* Cluster and commitment are properties of the deployed API, not
                  switches this page owns. They are reported, not offered — the
                  old three-button rows implied a choice that changed nothing. */}
              <Row
                label={tr("Cluster")}
                value={
                  health?.cluster ??
                  (health?.chain === "mock"
                    ? "mock"
                    : healthState === "checking"
                      ? tr("checking…")
                      : tr("unreachable"))
                }
                accent={health ? C : A}
              />
              <Row
                label={tr("Chain adapter")}
                value={health?.chain ?? tr("unknown")}
                accent={health?.chain === "solana" ? M : A}
              />
              <Row label={tr("Commitment")} value="confirmed" accent={color.textMuted} />
              <Row
                label={tr("Program")}
                value={health?.programId ?? PROGRAM_ID}
                accent={C}
              />
              <Row
                label={tr("Executor")}
                value={
                  health?.executor ??
                  (healthState === "checking" ? tr("checking…") : tr("unreachable"))
                }
                accent={
                  health
                    ? C
                    : healthState === "checking"
                      ? color.textMuted
                      : color.danger
                }
              />
              <Row
                label={tr("Chain indexer")}
                value={health?.indexer ?? tr("unknown")}
                accent={health?.indexer === "running" ? M : A}
              />
              <Row
                label={tr("API build")}
                value={health?.version ?? tr("unknown")}
                accent={color.textMuted}
              />
              <Row
                label={tr("Rate limit")}
                value={
                  health?.rateLimitPerMinute
                    ? `${health.rateLimitPerMinute} ${tr("req/min per IP")}`
                    : tr("unknown")
                }
                accent={color.textMuted}
              />
              <label className="settings-api-row">
                <span>API URL</span>
                <div>
                  <input readOnly value={API_URL} />
                  <button
                    type="button"
                    onClick={() => void testHealth()}
                    disabled={healthState === "checking"}
                  >
                    {healthState === "checking" ? tr("Testing…") : tr("Test")}
                  </button>
                </div>
              </label>
            </>
          )}

          {activeTab === 1 && (
            <>
              <header>
                <div>
                  <span>{tr("OWNER SESSION")}</span>
                  <h2>{tr("Wallet & demo assets")}</h2>
                </div>
                <em className={wallet ? "is-live" : ""}>
                  <i />
                  {wallet ? tr("CONNECTED") : tr("NOT CONNECTED")}
                </em>
              </header>
              <div className="settings-wallet-card">
                <span>
                  <Wallet size={22} />
                </span>
                <div>
                  <strong>
                    {wallet ? tr("Connected wallet") : tr("Wallet required")}
                  </strong>
                  <code>
                    {wallet || tr("Connect through Wallet Standard in the top bar")}
                  </code>
                </div>
                {wallet && (
                  <a
                    href={explorerAddressUrl(wallet)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <Row
                label={tr("Wallet session")}
                value={
                  signedIn && session
                    ? `${tr("signed in · expires")} ${new Date(session.expiresAt).toLocaleString()}`
                    : wallet
                      ? tr("connected but not signed in")
                      : tr("no wallet")
                }
                accent={signedIn ? M : A}
              />
              <Row
                label={tr("Writes require a signature")}
                value={
                  health?.identityEnforced === undefined
                    ? tr("unknown")
                    : health.identityEnforced
                      ? tr("yes — this is a public deployment")
                      : tr("no — local/mock, writes are open")
                }
                accent={health?.identityEnforced ? M : A}
              />
              <Row
                label={tr("Demo USDC mint (browser)")}
                value={
                  import.meta.env.VITE_DEMO_USDC_MINT
                    ? String(import.meta.env.VITE_DEMO_USDC_MINT)
                    : tr("not configured")
                }
                accent={import.meta.env.VITE_DEMO_USDC_MINT ? C : A}
              />
              <Row
                label={tr("Demo USDC mint (API)")}
                value={
                  health?.demoMintConfigured === undefined
                    ? tr("unknown")
                    : health.demoMintConfigured
                      ? "configured"
                      : tr("not configured")
                }
                accent={health?.demoMintConfigured ? C : A}
              />
              <Row
                label={tr("Demo destination")}
                value={DEMO_OPS_DESTINATION || tr("not configured")}
                accent={DEMO_OPS_DESTINATION ? C : A}
              />
              {/* This row used to read "configured", which sounded like a
                  security control. It is not one: the key ships inside this
                  page's JavaScript, so anyone can read it. It exists to keep
                  drive-by traffic off the write routes; ownership is proved by
                  the wallet signature above, not by this. */}
              <Row
                label={tr("Bundled write key")}
                value={
                  import.meta.env.VITE_API_KEY
                    ? tr("present in this bundle — public, not a credential")
                    : tr("none (local/mock)")
                }
                accent={A}
              />
            </>
          )}

          {activeTab === 2 && (
            <>
              <header>
                <div>
                  <span>{tr("PROGRAM BOUNDARY")}</span>
                  <h2>{tr("Policy invariants")}</h2>
                </div>
                <em className="is-live">
                  <i />{tr("ON-CHAIN")}</em>
              </header>
              <Row label={tr("Gates enforced in order")} value="7" />
              <Row label={tr("Policy digest")} value="SHA-256" />
              <Row
                label={tr("Allowlist ceiling")}
                value={tr("4 mints · 4 destinations")}
                accent={C}
              />
              <Row
                label={tr("Revocation authority")}
                value={tr("owner signature")}
                accent={C}
              />
              <Row
                label={tr("Execution behavior")}
                value={tr("first failed gate stops atomically")}
                accent={A}
              />
              <div className="settings-policy-note">
                <ShieldCheck size={16} />
                <p>{tr("The program takes one owner-signed revocation per policy account — but a Solana transaction carries many instructions, so")}<strong>{tr("Stop all agents")}</strong>{tr("on Guardrails revokes every active grant in a single signature. Funds stay in the vault; only the agents' authority ends.")}</p>
              </div>
            </>
          )}

          {activeTab === 3 && (
            <>
              <header>
                <div>
                  <span>{tr("LOCAL PREFERENCES")}</span>
                  <h2>{tr("Experience")}</h2>
                </div>
                <em>
                  <i />{tr("THIS DEVICE")}</em>
              </header>
              <button
                type="button"
                className="settings-toggle-row"
                onClick={() => setDepthEnabled((v) => !v)}
                aria-pressed={depthEnabled}
              >
                <span>
                  <strong>{tr("3D depth")}</strong>
                  <small>{tr("Perspective, stepped shadows and spatial panels")}</small>
                </span>
                <i />
              </button>
              <button
                type="button"
                className="settings-toggle-row"
                onClick={() => setMotionEnabled((v) => !v)}
                aria-pressed={motionEnabled}
              >
                <span>
                  <strong>{tr("Motion")}</strong>
                  <small>{tr("Page transitions, hover lift and live signals")}</small>
                </span>
                <i />
              </button>
              <div className="settings-experience-note">
                <Sparkles size={16} />
                <p>{tr("Depth and motion are stored on this device and applied immediately. Sound stays in the global header so it follows you across every page.")}</p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
