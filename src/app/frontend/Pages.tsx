import { agentTaskSummary } from "../lib/task-summary";
import { AgentTaskCard } from "../components/AgentTaskCard";
import { ActivityPage } from "../components/ActivityPage";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Fingerprint,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import hero from "../../assets/redline-celestial-vault-hero.webp";
import observatory from "../../assets/redline-evidence-observatory.webp";
import citadel from "../../assets/redline-guardrails-citadel.webp";
import vault from "../../assets/redline-treasury-core.webp";
import { RatingBadge, RatingDetail } from "../components/AgentRating";
import { PolicyLab } from "../components/PolicyLab";
import { ProtocolSpine } from "../components/ProtocolSpine";
import { OpenBook, VoxelCube, WaterDivider } from "../components/depth";
import { agentAccess, relatedAgent } from "../lib/agent-access";
import { useWalletResource } from "../lib/useWalletResource";
import { useRealAgents } from "../lib/agents";
import { api, fmtUsdc, grantExpiresAt, short, type Analytics, type AuditRow } from "../lib/api";
import { useSignedIn } from "../lib/useSignedIn";
import { explorerTransactionUrl, type AppClient } from "../solana/client";
import { useLang, useT } from "../i18n/LanguageContext";

const fetchAgentAccess = (owner: string) => api.hires(owner);
const fetchCatalog = () => api.listings();

const VI: Record<string, string> = {
  "New policy": "Tạo quyền mới",
  "Agent details": "Thông tin agent",
  "Set spending limits": "Đặt hạn mức chi",
  "Technical identity": "Định danh kỹ thuật",
  "Close publisher": "Đóng biểu mẫu xuất bản",
  "Spending policies": "Chính sách chi tiêu",
  "The Citadel": "Thành Trì",
  "The Vault": "Kho Bạc",
  "The Observatory": "Đài Quan Sát",
  "GUARDRAILS": "GUARDRAILS",
  "TREASURY": "TREASURY",
  "AUDIT TRAIL": "NHẬT KÝ KIỂM TOÁN",
  "Define the boundary. Give every agent a budget, a destination and a deadline. Seven checks turn an intention into bounded authority.": "Vạch ra ranh giới. Cho mỗi agent một ngân sách, một địa chỉ nhận và một thời hạn. Bảy lớp kiểm tra biến một ý định thành quyền hạn có giới hạn.",
  "A program-owned account only the policy can move. Refill on devnet, withdraw as the owner — never through the agent.": "Một tài khoản do program sở hữu mà chỉ chính sách mới chuyển được. Nạp trên devnet, rút với tư cách chủ sở hữu — không bao giờ qua agent.",
  "Every allow and every rejection, decoded from Solana. Follow the signature and inspect the evidence independently.": "Mọi lần cho phép và mọi lần từ chối, giải mã từ Solana. Lần theo chữ ký và tự kiểm tra bằng chứng.",
  "Enforcement": "Thực thi",
  "Seven gates, one transaction. The first failed gate closes the path before value can move.": "Bảy gate, một giao dịch. Gate lỗi đầu tiên đóng đường đi trước khi tiền kịp chuyển.",
  "Evidence": "Bằng chứng",
  "A live feed of allows and rejections, each with a signature you can open on Solana Explorer.": "Luồng trực tiếp các lần cho phép và từ chối, mỗi dòng kèm chữ ký mở được trên Solana Explorer.",
  "Ownership": "Quyền sở hữu",
  "Live grants with spend meters and authority controlled by the owner.": "Các grant đang hoạt động với thước đo chi tiêu và quyền hạn do chủ sở hữu kiểm soát.",
  "Interrogate": "Chất vấn",
  "Ask the console in English or Vietnamese — grants, gates and reasons for a refusal.": "Hỏi console bằng tiếng Anh hoặc tiếng Việt — về grant, gate và lý do từ chối.",
  "A NEW ORBIT FOR AUTONOMOUS FINANCE": "MỘT QUỸ ĐẠO MỚI CHO TÀI CHÍNH TỰ CHỦ",
  "Intelligence,": "Trí tuệ,",
  "without limits.": "không giới hạn.",
  "Authority, with them.": "Quyền hạn, có giới hạn.",
  "Let your agents explore. Keep your assets within reach. Seven on-chain gates protect the boundary between ambition and permission.": "Để agent của bạn khám phá. Giữ tài sản trong tầm kiểm soát. Bảy gate on-chain bảo vệ ranh giới giữa tham vọng và quyền được phép.",
  "Launch the protocol": "Khởi chạy protocol",
  "Explore the flow": "Khám phá luồng",
  "FOLLOW THE CURRENT": "THEO DÒNG CHẢY",
  "THE SENTINEL CORE": "LÕI CANH GÁC",
  "SOLANA · DEVNET · BOUNDARY SYSTEM": "SOLANA · DEVNET · HỆ THỐNG RANH GIỚI",
  "REDLINE UNIVERSE": "VŨ TRỤ REDLINE",
  "01 — GENESIS": "01 — KHỞI NGUYÊN",
  "7 GATES · 1 TX": "7 GATE · 1 GIAO DỊCH",
  "LIVE POLICY BACKBONE": "XƯƠNG SỐNG CHÍNH SÁCH TRỰC TIẾP",
  "Every proposal rides the current": "Mọi đề xuất đều trôi theo dòng",
  "through seven hard limits.": "qua bảy giới hạn cứng.",
  "The agent proposes. The program evaluates the signed envelope in order, link by link. One failed gate stops the transfer atomically — nothing moves.": "Agent đề xuất. Program đánh giá phong bì đã ký theo thứ tự, từng mắt xích một. Một gate lỗi dừng toàn bộ lệnh chuyển — không gì dịch chuyển.",
  "CHAPTER 01 → THE THREE WORLDS": "CHƯƠNG 01 → BA THẾ GIỚI",
  "THE REDLINE UNIVERSE / EXPLORE": "VŨ TRỤ REDLINE / KHÁM PHÁ",
  "One mission.": "Một sứ mệnh.",
  "Three worlds.": "Ba thế giới.",
  "Enter this world": "Bước vào thế giới này",
  "THE PROTOCOL IN FOUR CHAPTERS": "PROTOCOL TRONG BỐN CHƯƠNG",
  "Read it": "Đọc",
  "cover to cover.": "từ đầu đến cuối.",
  "CHAPTER": "CHƯƠNG",
  "INTERACTIVE FIELD TEST": "THỬ NGHIỆM THỰC ĐỊA TƯƠNG TÁC",
  "THE CHAIN DECIDES": "CHAIN QUYẾT ĐỊNH",
  "Every decision,": "Mỗi quyết định,",
  "a block you can open.": "một khối bạn có thể mở.",
  "Each block opens a recorded Solana signature. Green blocks confirm transfers; red blocks record a refusal. Grant and revocation events retain their own identities.": "Mỗi khối mở ra một chữ ký Solana đã ghi nhận. Khối xanh xác nhận lệnh chuyển; khối đỏ ghi lại một lần từ chối. Sự kiện tạo grant và thu hồi giữ định danh riêng.",
  "Propose": "Đề xuất",
  "An autonomous agent can request an action, but it never receives unrestricted authority.": "Agent tự chủ có thể yêu cầu một hành động, nhưng không bao giờ nhận quyền hạn không giới hạn.",
  "Constrain": "Ràng buộc",
  "The owner’s signed policy defines asset, recipient, budget, pace and time.": "Chính sách chủ sở hữu đã ký xác định tài sản, người nhận, ngân sách, nhịp độ và thời gian.",
  "Prove": "Chứng minh",
  "Every allow or rejection leaves evidence that can be inspected independently on Solana.": "Mỗi lần cho phép hay từ chối đều để lại bằng chứng có thể kiểm tra độc lập trên Solana.",
  "REDLINE · AUTONOMOUS FINANCE. HARD LIMITS.": "REDLINE · TÀI CHÍNH TỰ CHỦ. GIỚI HẠN CỨNG.",
  "THE AGENT PROPOSES ·": "AGENT ĐỀ XUẤT ·",
  "Sign in with your wallet first — the publisher is taken from the signature, not from this form.": "Đăng nhập bằng ví trước — người xuất bản được lấy từ chữ ký, không phải từ biểu mẫu này.",
  "Connect and sign in with a wallet to publish.": "Kết nối và đăng nhập bằng ví để xuất bản.",
  "Version published to the registry.": "Đã xuất bản phiên bản lên sổ đăng ký.",
  "Publication failed": "Xuất bản thất bại",
  "VERSIONS": "PHIÊN BẢN",
  "OF": "TRÊN",
  "Showing only mine": "Đang chỉ hiện của tôi",
  "Show only mine": "Chỉ hiện của tôi",
  "MINE": "CỦA TÔI",
  "You have not published a version with this wallet.": "Bạn chưa xuất bản phiên bản nào bằng ví này.",
  "Publish agent version": "Xuất bản phiên bản agent",
  "Loading versions…": "Đang tải phiên bản…",
  "Flip identity card for": "Lật thẻ định danh của",
  "AGENT IDENTITY": "ĐỊNH DANH AGENT",
  "ACTIVE GRANTS": "GRANT HOẠT ĐỘNG",
  "Published by you": "Bạn đã xuất bản",
  "Published by": "Xuất bản bởi",
  "Unclaimed — published before publishing required a signature": "Chưa nhận — xuất bản trước khi việc xuất bản yêu cầu chữ ký",
  "ACTIVE": "HOẠT ĐỘNG",
  "TOTAL GRANTS": "TỔNG GRANT",
  "SPENT": "ĐÃ CHI",
  "TRANSFERS": "LỆNH CHUYỂN",
  "CLICK THE CARD · SEE HOW THE HASH IS BUILT": "BẤM VÀO THẺ · XEM HASH ĐƯỢC TẠO THẾ NÀO",
  "AGENT HASH · SHA-256 · IMMUTABLE": "AGENT HASH · SHA-256 · BẤT BIẾN",
  "Every grant binds to this exact build. A change in model, code reference or configuration produces a different identity.": "Mọi grant gắn với đúng bản build này. Thay đổi model, tham chiếu code hay cấu hình sẽ tạo ra định danh khác.",
  "CLICK TO FLIP BACK": "BẤM ĐỂ LẬT LẠI",
  "Reputation": "Uy tín",
  "No policy decisions and no renter reviews recorded yet.": "Chưa có quyết định chính sách hay đánh giá nào từ người thuê.",
  "Grants bound to this build": "Grant gắn với bản build này",
  "REVOKED": "ĐÃ THU HỒI",
  "EXPIRED": "HẾT HẠN",
  "GRANTED": "ĐÃ CẤP",
  "No grants bound to this version.": "Chưa có grant nào gắn với phiên bản này.",
  "Agent identity": "Định danh agent",
  "Loading agent identity…": "Đang tải định danh agent…",
  "Publish your first version to create an identity.": "Xuất bản phiên bản đầu tiên để tạo định danh.",
  "Publish a new version": "Xuất bản phiên bản mới",
  "DRAFT": "NHÁP",
  "Name": "Tên",
  "Version": "Phiên bản",
  "Strategy": "Chiến lược",
  "Weekly contributor payouts against the signed allowlist…": "Trả lương hàng tuần cho cộng tác viên theo allowlist đã ký…",
  "IDENTITY INPUT": "ĐẦU VÀO ĐỊNH DANH",
  "Connect a wallet to publish": "Kết nối ví để xuất bản",
  "Sign in with your wallet to publish": "Đăng nhập bằng ví để xuất bản",
  "Publishing…": "Đang xuất bản…",
  "Publish to registry": "Xuất bản lên sổ đăng ký",
  "Connect a wallet to publish.": "Kết nối ví để xuất bản.",
  "Sign in with your wallet (top bar) — the publisher is taken from the signature, not from this form.": "Đăng nhập bằng ví (thanh trên cùng) — người xuất bản được lấy từ chữ ký, không phải từ biểu mẫu này.",
  "Confirmed volume": "Khối lượng đã xác nhận",
  "Active grants": "Grant hoạt động",
  "Success rate": "Tỷ lệ thành công",
  "Decision latency": "Độ trễ quyết định",
  "CONNECTED OWNER": "CHỦ SỞ HỮU ĐÃ KẾT NỐI",
  "PROTOCOL OVERVIEW": "TỔNG QUAN PROTOCOL",
  "Recorded state": "Trạng thái đã ghi",
  "LAST 7 DAYS": "7 NGÀY QUA",
  "Policy outcomes": "Kết quả chính sách",
  "CONFIRMED TRANSFERS": "LỆNH CHUYỂN ĐÃ XÁC NHẬN",
  "Rejected by policy": "Bị chính sách từ chối",
  "Signed grants": "Grant đã ký",
  "Agents by confirmed volume": "Agent theo khối lượng đã xác nhận",
  "REAL TRANSFERS": "LỆNH CHUYỂN THẬT",
  "grants": "grant",
  "No confirmed volume recorded yet.": "Chưa ghi nhận khối lượng nào.",
  "Daily settlement": "Thanh toán theo ngày",
  "Unable to load events": "Không tải được sự kiện",
  "Total events": "Tổng sự kiện",
  "On-chain signatures": "Chữ ký on-chain",
  "Owner actions": "Hành động của chủ sở hữu",
  "Rejected / failed": "Từ chối / thất bại",
  "Search audit events": "Tìm sự kiện kiểm toán",
  "Search signatures, events, reason codes…": "Tìm chữ ký, sự kiện, mã lý do…",
  "all": "tất cả",
  "chain": "chain",
  "owner": "chủ sở hữu",
  "rejected": "bị từ chối",
  "Refresh": "Làm mới",
  "Chain event stream": "Luồng sự kiện chain",
  "EVENTS": "SỰ KIỆN",
  "Loading the ledger…": "Đang tải sổ cái…",
  "No events match these filters.": "Không có sự kiện nào khớp bộ lọc.",
  "Load more events": "Tải thêm sự kiện",
  "Inspect the evidence": "Kiểm tra bằng chứng",
  "Recorded": "Ghi nhận lúc",
  "Actor": "Tác nhân",
  "Open on Solana Explorer": "Mở trên Solana Explorer",
  "Select an event to inspect its recorded payload and transaction signature.": "Chọn một sự kiện để xem payload đã ghi và chữ ký giao dịch.",
  "The chain record is unavailable. Open Audit to retry.": "Không lấy được bản ghi chain. Mở Audit để thử lại.",
  "Open": "Mở",
  "on Solana Explorer": "trên Solana Explorer",
  "No signed chain events are available yet.": "Chưa có sự kiện chain nào có chữ ký.",
};

const vars = (value: Record<string, string | number>) => value as CSSProperties;
const scroll = (id: string) =>
  document
    .getElementById(id)
    ?.scrollIntoView({
      behavior: document.documentElement.dataset.motion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
export function Panel({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="ph">
        <h2>{title}</h2>
        {meta}
      </div>
      <div className="pb">{children}</div>
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
function useOwner() {
  const client = useClient<AppClient>();
  const wallet = useConnectedWallet(client);
  return wallet ? String(wallet.account.address) : undefined;
}
function useAnalytics() {
  const owner = useOwner();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    const load = () =>
      api
        .analytics(owner)
        .then((r) => {
          if (live) {
            setData(r);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(String(e.message));
        });
    void load();
    const timer = setInterval(load, 20000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [owner]);
  return { data, error, owner };
}
function SectionHead({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: ReactNode;
  copy?: string;
}) {
  return (
    <div className="sechead">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="h2">{title}</h2>
      </div>
      {copy && <p className="lede">{copy}</p>}
    </div>
  );
}
function Divider({ children }: { children: string }) {
  return (
    <div className="divider">
      <WaterDivider height={120} className="water" />
      <div className="caption-mid">
        <Sparkles size={12} />
        {children}
      </div>
    </div>
  );
}

export function ArtifactProtocol({ setNav }: { setNav?: (n: number) => void }) {
  const tr = useT(VI);
  const owner = useOwner();
  const [world, setWorld] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const worlds = [
    {
      name: tr("The Citadel"),
      label: tr("GUARDRAILS"),
      image: citadel,
      route: 6,
      copy: tr("Define the boundary. Give every agent a budget, a destination and a deadline. Seven checks turn an intention into bounded authority."),
    },
    {
      name: tr("The Vault"),
      label: tr("TREASURY"),
      image: vault,
      route: 4,
      copy: tr("A program-owned account only the policy can move. Refill on devnet, withdraw as the owner — never through the agent."),
    },
    {
      name: tr("The Observatory"),
      label: tr("AUDIT TRAIL"),
      image: observatory,
      route: 5,
      copy: tr("Every allow and every rejection, decoded from Solana. Follow the signature and inspect the evidence independently."),
    },
  ];
  const chapters = [
    {
      title: tr("Enforcement"),
      copy: tr("Seven gates, one transaction. The first failed gate closes the path before value can move."),
      id: "enforcement",
    },
    {
      title: tr("Evidence"),
      copy: tr("A live feed of allows and rejections, each with a signature you can open on Solana Explorer."),
      id: "evidence",
    },
    {
      title: tr("Ownership"),
      copy: tr("Live grants with spend meters and authority controlled by the owner."),
      id: "ownership",
    },
    {
      title: tr("Interrogate"),
      copy: tr("Ask the console in English or Vietnamese — grants, gates and reasons for a refusal."),
      id: "interrogate",
    },
  ];
  const selected = worlds[world];
  return (
    <article className="artifact-protocol">
      <section
        className="hero"
        onPointerMove={(e) => {
          if (
            e.pointerType === "touch" ||
            document.documentElement.dataset.motion === "off" ||
            document.documentElement.dataset.depth === "off" ||
            matchMedia("(prefers-reduced-motion: reduce)").matches
          )
            return;
          const r = e.currentTarget.getBoundingClientRect();
          setTilt({
            x: (-(e.clientY - r.top - r.height / 2) / r.height) * 16,
            y: ((e.clientX - r.left - r.width / 2) / r.width) * 22,
          });
        }}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div className="art">
          <img src={hero} alt="" fetchPriority="high" />
        </div>
        <div className="wash" />
        <div className="grid" />
        <div className="copy">
          <span className="kicker">
            <Sparkles size={11} />{tr("A NEW ORBIT FOR AUTONOMOUS FINANCE")}</span>
          <h1>{tr("Intelligence,")}<br />{tr("without limits.")}<span className="acc">{tr("Authority, with them.")}</span>
          </h1>
          <p className="lede">{tr("Let your agents explore. Keep your assets within reach. Seven on-chain gates protect the boundary between ambition and permission.")}</p>
          <div className="actions">
            <button className="btn btn-gold" onClick={() => setNav?.(6)}>
              {tr("Launch the protocol")} <ArrowUpRight size={14} />
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => scroll("protocol-worlds")}
            >
              <Play size={12} />{tr("Explore the flow")}</button>
          </div>
          {/* In the copy's flow, not pinned to the hero's bottom edge: the
              hero is a fixed 880px and the copy is centred in it, so an
              absolutely positioned cue landed on top of the buttons whenever
              the copy ran tall (every desktop width). */}
          <button className="scrollcue" onClick={() => scroll("protocol-worlds")}>
            {tr("FOLLOW THE CURRENT")} <ArrowDown size={13} />
          </button>
        </div>
        <div className="scene" aria-hidden="true">
          <div className="halo" />
          <div className="floor" />
          <div
            className="system"
            style={{
              transform: `translate(-50%, -50%) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className={`orbit o${i}`}>
                <i />
                <b />
              </div>
            ))}
            <div className="crystal">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="face" style={vars({ "--f": i })} />
              ))}
              <div className="heart">
                <ShieldCheck size={34} />
              </div>
            </div>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="sat" style={vars({ "--s": i })} />
            ))}
          </div>
          <div className="caption">
            0 / 07 <i />
            <span>{tr("THE SENTINEL CORE")}</span>
          </div>
          <div className="coord">{tr("SOLANA · DEVNET · BOUNDARY SYSTEM")}</div>
        </div>
        <WaterDivider height={150} className="water" />
        {[0, 4, 8, 12].map((delay, i) => (
          <div
            key={delay}
            className="proposal"
            aria-hidden="true"
            style={vars({ "--dl": `${delay}s` })}
          >
            <VoxelCube size={22} tone={i % 2 ? "info" : "gold"} />
          </div>
        ))}
        <div className="edition">
          <span>{tr("REDLINE UNIVERSE")}</span>
          <i />
          <b>{tr("01 — GENESIS")}</b>
          <span>SOLANA DEVNET</span>
          <i />
          <b>{tr("7 GATES · 1 TX")}</b>
        </div>
      </section>
      <div className="story">
        <section className="sec" id="enforcement">
          <SectionHead
            eyebrow={tr("LIVE POLICY BACKBONE")}
            title={
              <>{tr("Every proposal rides the current")}<br />
                <em>{tr("through seven hard limits.")}</em>
              </>
            }
            copy={tr("The agent proposes. The program evaluates the signed envelope in order, link by link. One failed gate stops the transfer atomically — nothing moves.")}
          />
          <ProtocolSpine owner={owner} />
        </section>
        <Divider>{tr("CHAPTER 01 → THE THREE WORLDS")}</Divider>
        <section className="sec" id="protocol-worlds">
          <SectionHead
            eyebrow={tr("THE REDLINE UNIVERSE / EXPLORE")}
            title={
              <>{tr("One mission.")}<em>{tr("Three worlds.")}</em>
              </>
            }
          />
          <div className="wtabs">
            {worlds.map((w, i) => (
              <button
                key={w.name}
                aria-pressed={world === i}
                onClick={() => setWorld(i)}
              >
                <span>0{i + 1}</span>
                {w.name}
                <small>{w.label}</small>
              </button>
            ))}
          </div>
          <OpenBook
            pageKey={world}
            image={selected.image}
            imageCaption={`0${world + 1} / ${selected.label}`}
            imageTitle={selected.name}
            eyebrow={`0${world + 1} / ${selected.label}`}
            title={selected.name}
            folio={`p.0${world + 1}`}
            action={
              <button
                className="wlink"
                onClick={() => setNav?.(selected.route)}
              >
                {tr("Enter this world")} <ArrowUpRight size={13} />
              </button>
            }
          >
            <p>{selected.copy}</p>
          </OpenBook>
        </section>
        <section className="sec">
          <SectionHead
            eyebrow={tr("THE PROTOCOL IN FOUR CHAPTERS")}
            title={
              <>{tr("Read it")}<em>{tr("cover to cover.")}</em>
              </>
            }
          />
          <div className="fan">
            {chapters.map((c, i) => (
              <button
                key={c.id}
                className="ch"
                style={vars({ "--k": i })}
                onClick={() =>
                  c.id === "ownership"
                    ? setNav?.(6)
                    : c.id === "interrogate"
                      ? setNav?.(9)
                      : scroll(c.id)
                }
              >
                <span className="num">0{i + 1}</span>
                <small>{tr("CHAPTER")} 0{i + 1}</small>
                <h4>{c.title}</h4>
                <p>{c.copy}</p>
                <VoxelCube
                  size={26}
                  tone={(["gold", "info", "ok", "bad"] as const)[i]}
                />
              </button>
            ))}
          </div>
        </section>
        <Divider>{tr("INTERACTIVE FIELD TEST")}</Divider>
        <div className="sec">
          <PolicyLab />
        </div>
        <section className="sec" id="evidence">
          <SectionHead
            eyebrow={tr("THE CHAIN DECIDES")}
            title={
              <>{tr("Every decision,")}<em>{tr("a block you can open.")}</em>
              </>
            }
            copy={tr("Each block opens a recorded Solana signature. Green blocks confirm transfers; red blocks record a refusal. Grant and revocation events retain their own identities.")}
          />
          <LedgerBlocks />
        </section>
        <section className="sec">
          <div className="pillars">
            {[
              {
                title: tr("Propose"),
                icon: Bot,
                copy: tr("An autonomous agent can request an action, but it never receives unrestricted authority."),
              },
              {
                title: tr("Constrain"),
                icon: Layers,
                copy: tr("The owner’s signed policy defines asset, recipient, budget, pace and time."),
              },
              {
                title: tr("Prove"),
                icon: Fingerprint,
                copy: tr("Every allow or rejection leaves evidence that can be inspected independently on Solana."),
              },
            ].map((p, i) => (
              <div className="pillar" key={p.title}>
                <span className="ico">
                  <p.icon size={18} />
                </span>
                <small>0{i + 1}</small>
                <h3>{p.title}</h3>
                <p>{p.copy}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <footer className="foot">
        <span>{tr("REDLINE · AUTONOMOUS FINANCE. HARD LIMITS.")}</span>
        <span>{tr("THE AGENT PROPOSES ·")}<b>{tr("THE CHAIN DECIDES")}</b>
        </span>
        <span>FCCS LAB · VLU · 2026</span>
      </footer>
    </article>
  );
}

export function ArtifactAgents() {
  const tr = useT(VI);
  const wallet = useOwner() ?? "";
  // Connecting a wallet only names an address — the API cannot tell that apart
  // from a typed one, and publishing is what puts a build on a marketplace
  // under a name that gets paid. So the button waits for a signature.
  const signedIn = useSignedIn(wallet);
  const { agents, grants, loading, error, reload } = useRealAgents(wallet);
  const accessData = useWalletResource(wallet, signedIn, fetchAgentAccess, 0);
  const catalog = useWalletResource("catalog", true, fetchCatalog, 0);
  const { lang } = useLang();
  const accessText = (status: ReturnType<typeof agentAccess>) => ({ owned: lang === "vi" ? "Của bạn" : "Owned by you", rented: lang === "vi" ? "Đang thuê" : "Rental active", expired: lang === "vi" ? "Hết hạn thuê" : "Rental expired", "rent-required": lang === "vi" ? "Cần thuê trước" : "Rental required", available: lang === "vi" ? "Có thể tạo chính sách" : "Available for policy" })[status];
  const [onlyMine, setOnlyMine] = useState(() => new URLSearchParams(location.hash.split("?")[1]).get("view") !== "catalog");
  const [selected, setSelected] = useState(() => new URLSearchParams(location.hash.split("?")[1]).get("agent") ?? "");
  const [showPublisher, setShowPublisher] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("v1.0.0");
  const [strategy, setStrategy] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  // The detail card follows the visible rail. Without this, filtering to
  // "mine" while a stranger's agent was selected left the card showing an
  // agent that is no longer in the list beside it.
  const visibleAgents = onlyMine ? agents.filter(a => relatedAgent(a.id, signedIn ? wallet : "", a.publisherWallet, grants, accessData.data ?? [])) : agents;
  const picked = agents.find((a) => a.id === selected);
  const agent =
    picked && visibleAgents.includes(picked) ? picked : visibleAgents[0];
  const access = agent ? agentAccess(agent, wallet, accessData.data ?? [], catalog.data ?? []) : "available";
  const accessUnknown = !catalog.data || !accessData.data && signedIn || catalog.error || accessData.error;
  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      setNotice(
        wallet
          ? tr("Sign in with your wallet first — the publisher is taken from the signature, not from this form.")
          : tr("Connect and sign in with a wallet to publish."),
      );
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await api.publishAgent({
        name: name.trim(),
        version: version.trim(),
        strategy: strategy.trim(),
        modelRef: "manual:dashboard",
        codeRef: `manual:${name.trim()}`,
        config: { strategy: strategy.trim() },
      });
      await reload();
      setSelected(result.agent.id); setOnlyMine(true);
      setName("");
      setStrategy("");
      setNotice(tr("Version published to the registry."));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : tr("Publication failed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`agents-grid simple-agents${showPublisher ? " is-publishing" : ""}`}>
      <aside>
        <div className="eyebrow">
          {onlyMine ? (lang === "vi" ? "LIÊN QUAN ĐẾN VÍ" : "RELATED TO YOUR WALLET") : (lang === "vi" ? "DANH MỤC AGENT" : "AGENT CATALOG")} · {visibleAgents.length}
          {onlyMine && agents.length !== visibleAgents.length
            ? ` ${tr("OF")} ${agents.length}`
            : ""}
        </div>
        {(
          <button
            className="btn btn-ghost btn-sm full-button"
            aria-pressed={onlyMine}
            onClick={() => setOnlyMine((v) => !v)}
          >
            <Fingerprint size={12} />
            {onlyMine ? (lang === "vi" ? "Khám phá danh mục agent" : "Explore agent catalog") : (lang === "vi" ? "Xem agent liên quan đến ví" : "Show my related agents")}
          </button>
        )}
        <div className="rail-list">
          {visibleAgents.map((a, i) => (
            <button
              className="arow2"
              style={vars({
                "--acc": [
                  "14,145,205",
                  "223,195,140",
                  "133,219,192",
                  "214,64,142",
                ][i % 4],
              })}
              key={a.id}
              aria-pressed={a.id === agent?.id}
              onClick={() => {
                setSelected(a.id);
              }}
            >
              <span className="av">
                <Bot size={16} />
              </span>
              <span>
                <b>
                  {a.name}
                  {a.isMine && <span className="chip chip-gold">{tr("MINE")}</span>}
                </b>
                <small>
                  {a.version}{" "}
                  <RatingBadge rating={a.rating} />
                </small>
              </span>
              <span className="n">{a.totalGrants} gr</span>
            </button>
          ))}
          {onlyMine && !visibleAgents.length && !loading && <div className="ux-agent-empty"><h2>{lang === "vi" ? "Ch\u01b0a c\u00f3 agent trong v\u00ed n\u00e0y" : "No agents for this wallet yet"}</h2><p>{lang === "vi" ? "Th\u1eed demo tr\u01b0\u1edbc ho\u1eb7c ch\u1ecdn m\u1ed9t agent c\u00f3 s\u1eb5n \u0111\u1ec3 thi\u1ebft l\u1eadp." : "Try the demo first, or choose an available agent to set up."}</p><a className="simple-primary" href="#/protocol?demo=1">{lang === "vi" ? "Th\u1eed kh\u00f4ng c\u1ea7n v\u00ed" : "Try without a wallet"}</a><button type="button" className="simple-secondary" onClick={() => setOnlyMine(false)}>{lang === "vi" ? "Kh\u00e1m ph\u00e1 agent c\u00f3 s\u1eb5n" : "Explore available agents"}</button></div>}
        </div>
        <details className="ux-creator-tools"><summary>{lang === "vi" ? "D\u00e0nh cho ng\u01b0\u1eddi t\u1ea1o agent" : "For agent creators"}</summary>
        <button
          className="btn btn-ghost full-button"
          onClick={() => setShowPublisher(value => !value)}
          aria-expanded={showPublisher}
          aria-controls="agent-publisher"
        >
          <Plus size={12} />{tr(showPublisher ? "Close publisher" : "Publish agent version")}</button>
        </details>
        {loading && <Empty>{tr("Loading versions…")}</Empty>}
        {error && (
          <p role="alert" className="error-note">
            {error}
          </p>
        )}
      </aside>
      <div>
        {agent ? (
          <>
            <section className="agent-summary" aria-label={tr("Agent details")}>
              <span className="simple-eyebrow">{tr("Agent details")}</span>
              <h2>{agent.name}<small>{agent.version}</small></h2>
              <details className="compact-agent-about"><summary>{lang === "vi" ? "Gi\u1edbi thi\u1ec7u agent" : "About this agent"}</summary><p>{agent.strategy}</p></details>
              <AgentTaskCard grants={agent.grants} owner={wallet} verified={signedIn} />
              <p className="p1-access" role="status">{accessUnknown ? (lang === "vi" ? "Chưa xác minh được điều kiện sử dụng." : "Access eligibility has not been verified.") : accessText(access)}</p>
              {accessUnknown ? <button className="simple-secondary" disabled>{lang === "vi" ? "Chờ xác minh" : "Awaiting verification"}</button> : <a className={signedIn && agentTaskSummary(agent.grants, wallet).policyCount > 0 && access !== "expired" && access !== "rent-required" ? "simple-secondary compact-new-policy" : "simple-primary"} href={access === "expired" || access === "rent-required" ? `#/marketplace?agent=${encodeURIComponent(agent.id)}` : `#/guardrails?agent=${encodeURIComponent(agent.id)}`}>{access === "expired" || access === "rent-required" ? (lang === "vi" ? "Thuê agent trước" : "Rent agent first") : tr(signedIn && agentTaskSummary(agent.grants, wallet).policyCount > 0 ? "New policy" : "Set spending limits")}<ArrowRight size={16} /></a>}
              <details className="agent-identity"><summary>{tr("Technical identity")}</summary><code>{agent.agentHash}</code><p>{agent.isMine ? tr("Published by you") : agent.publisherWallet ? `${tr("Published by")} ${short(agent.publisherWallet, 4)}` : tr("Unclaimed — published before publishing required a signature")}</p><p>{tr("Every grant binds to this exact build. A change in model, code reference or configuration produces a different identity.")}</p></details>
            </section>
            <details className="agent-extra"><summary>{tr("Reputation")}<RatingBadge rating={agent.rating} /></summary>
            <Panel
              title={tr("Reputation")}
              meta={<RatingBadge rating={agent.rating} />}
            >
              {agent.rating ? (
                <RatingDetail rating={agent.rating} />
              ) : (
                <Empty>{tr("No policy decisions and no renter reviews recorded yet.")}</Empty>
              )}
            </Panel>
            </details>
            <Panel
              title={tr("Spending policies")}
              meta={<span className="chip chip-gold">{agent.totalGrants}</span>}
            >
              {agent.grants.length ? (
                agent.grants.map((g) => (
                  <div className="grant-mini" key={g.id}>
                    <b>{short(g.grantPda)}</b>
                    <span
                      className={`chip ${g.revoked ? "chip-bad" : "chip-ok"}`}
                    >
                      {g.revoked
                        ? tr("REVOKED")
                        : grantExpiresAt(g) <= Date.now()
                          ? tr("EXPIRED")
                          : tr("GRANTED")}{" "}
                      · {fmtUsdc(g.spentUnits)} /{" "}
                      {fmtUsdc(g.policyVersion.spendCapUnits)}
                    </span>
                    <div className={`bar ${g.revoked ? "bad" : ""}`}>
                      <i
                        style={{
                          width: `${Math.min(100, (Number(g.spentUnits) / Math.max(1, Number(g.policyVersion.spendCapUnits))) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <Empty>{tr("No grants bound to this version.")}</Empty>
              )}
            </Panel>
          </>
        ) : (
          <Panel title={tr("Agent identity")}>
            <Empty>
              {loading
                ? tr("Loading agent identity…")
                : tr("Publish your first version to create an identity.")}
            </Empty>
          </Panel>
        )}
      </div>
      {showPublisher && <aside id="agent-publisher">
        <Panel
          className="pubform"
          title={tr("Publish a new version")}
          meta={<span className="chip chip-dim">{tr("DRAFT")}</span>}
        >
          <form onSubmit={publish}>
            <label className="field">{tr("Name")}<input
                id="publish-name"
                autoFocus
                className="in"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Payroll Runner"
              />
            </label>
            <label className="field">{tr("Version")}<input
                className="in"
                required
                maxLength={32}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </label>
            <label className="field">{tr("Strategy")}<textarea
                className="in"
                required
                rows={4}
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder={tr("Weekly contributor payouts against the signed allowlist…")}
              />
            </label>
            <div className="inset hash-preview">
              <small>{tr("IDENTITY INPUT")}</small>
              <code>sha256(modelRef | codeRef | config)</code>
            </div>
            <button
              className="btn btn-gold full-button"
              disabled={busy || !signedIn}
              title={
                !wallet
                  ? tr("Connect a wallet to publish")
                  : !signedIn
                    ? tr("Sign in with your wallet to publish")
                    : ""
              }
            >
              <Upload size={13} />
              {busy ? tr("Publishing…") : tr("Publish to registry")}
              <ArrowRight size={13} />
            </button>
            {!wallet && (
              <p className="help">{tr("Connect a wallet to publish.")}</p>
            )}
            {wallet && !signedIn && (
              <p className="help">{tr("Sign in with your wallet (top bar) — the publisher is taken from the signature, not from this form.")}</p>
            )}
            {notice && (
              <p className="help" role="status">
                {notice}
              </p>
            )}
          </form>
        </Panel>
      </aside>}
    </div>
  );
}

export function ArtifactAnalytics() {
  const tr = useT(VI);
  const { data, error, owner } = useAnalytics();
  const kpis = [
    [
      tr("Confirmed volume"),
      data ? `${data.totalVolumeUsdc.toLocaleString()} USDC` : "—",
    ],
    [tr("Active grants"), data?.activeGrants ?? "—"],
    [
      tr("Success rate"),
      data?.successRatePct == null ? "—" : `${data.successRatePct}%`,
    ],
    [
      tr("Decision latency"),
      data?.avgDecisionLatencyMs == null
        ? "—"
        : `${data.avgDecisionLatencyMs} ms`,
    ],
  ];
  return (
    <div className="analytics-bento">
      <div className="analytics-scope chip chip-info">
        {owner ? tr("CONNECTED OWNER") : tr("PROTOCOL OVERVIEW")}
      </div>
      {error && (
        <p role="alert" className="error-note">
          {error}
        </p>
      )}
      <div className="kpi-row">
        {kpis.map(([label, value]) => (
          <div className="kpi" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{tr("Recorded state")}</span>
          </div>
        ))}
      </div>
      <Panel
        className="volume-panel"
        title={tr("Confirmed volume")}
        meta={<span className="chip chip-gold">{tr("LAST 7 DAYS")}</span>}
      >
        <div className="chart-stage">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.weeklyVolume ?? []}>
              <defs>
                <linearGradient
                  id="artifact-volume"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#dfc38c" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#dfc38c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" stroke="#9fadc3" fontSize={11} />
              <YAxis stroke="#9fadc3" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#121c30",
                  borderColor: "#43516a",
                  color: "#f2eee5",
                }}
              />
              <Area
                dataKey="volumeUsdc"
                name="USDC"
                type="monotone"
                fill="url(#artifact-volume)"
                stroke="#dfc38c"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel className="outcome-panel" title={tr("Policy outcomes")}>
        <div className="outcome-orbit">
          <VoxelCube size={66} tone="ok" />
          <strong>{data?.totalTransactions ?? "—"}</strong>
          <small>{tr("CONFIRMED TRANSFERS")}</small>
        </div>
        <div className="metric-line">
          <span>{tr("Rejected by policy")}</span>
          <b>{data?.totalRejections ?? "—"}</b>
        </div>
        <div className="metric-line">
          <span>{tr("Signed grants")}</span>
          <b>{data?.totalGrants ?? "—"}</b>
        </div>
      </Panel>
      <Panel
        className="ranking-panel"
        title={tr("Agents by confirmed volume")}
        meta={<span className="chip chip-info">{tr("REAL TRANSFERS")}</span>}
      >
        {data?.topAgentsByVolume.length ? (
          data.topAgentsByVolume.map((a, i) => (
            <div className="ranking-row" key={`${a.name}-${i}`}>
              <span className="av">
                <Bot size={16} />
              </span>
              <span>
                <b>{a.name}</b>
                <small>{a.grants} {tr("grants")}</small>
              </span>
              <strong>{a.volumeUsdc.toLocaleString()} USDC</strong>
              <div className="bar">
                <i
                  style={{
                    width: `${(a.volumeUsdc / Math.max(1, data.totalVolumeUsdc)) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <Empty>{tr("No confirmed volume recorded yet.")}</Empty>
        )}
      </Panel>
      <Panel className="daily-panel" title={tr("Daily settlement")}>
        <div className="chart-stage small-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.weeklyVolume ?? []}>
              <XAxis dataKey="t" stroke="#9fadc3" fontSize={10} />
              <Tooltip
                contentStyle={{ background: "#121c30", borderColor: "#43516a" }}
              />
              <Bar dataKey="volumeUsdc" fill="#8dcced" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

const isRejected = (row: AuditRow) => /reject|fail|deny/.test(row.eventType) || row.payload.allow === false;

export function ArtifactAudit() { return <ActivityPage />; }

function LedgerBlocks() {
  const tr = useT(VI);
  const [events, setEvents] = useState<AuditRow[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const load = () =>
      api
        .audit()
        .then((rows) => {
          if (live) {
            const seen = new Set<string>();
            setEvents(
              rows
                .filter((r) => { if (!r.chainSignature || seen.has(r.chainSignature)) return false; seen.add(r.chainSignature); return true; })
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 12),
            );
            setError("");
          }
        })
        .catch(() => {
          if (live)
            setError(tr("The chain record is unavailable. Open Audit to retry."));
        });
    void load();
    const timer = setInterval(load, 20000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="ledger3d">
      <div className="ledger-floor" />
      {events.length ? (
        <div className="track">
          {events.map((event, i) => {
            const bad = isRejected(event),
              grant = /grant/i.test(event.eventType),
              revoke = /revok/i.test(event.eventType);
            return (
              <a
                className="blk"
                key={event.id}
                href={explorerTransactionUrl(event.chainSignature!)}
                target="_blank"
                rel="noreferrer"
                aria-label={`${tr("Open")} ${event.eventType} ${tr("on Solana Explorer")}`}
              >
                <VoxelCube
                  size={74}
                  tone={bad ? "bad" : revoke ? "info" : grant ? "gold" : "ok"}
                  label={revoke ? "R" : grant ? "G" : bad ? "!" : "✓"}
                />
                <div className="meta">
                  <b>{short(event.chainSignature!, 5)}</b>
                  {event.eventType}
                </div>
                {i < events.length - 1 && (
                  <div className="chain">
                    {[0, 1, 2, 3, 4].map((k) => (
                      <i key={k} style={vars({ "--k": k })} />
                    ))}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      ) : (
        <Empty>{error || tr("No signed chain events are available yet.")}</Empty>
      )}
    </div>
  );
}
