import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Cpu,
  Globe,
  Layers,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CopilotPage,
  ModelsPage,
  ProfilePage,
} from "./components/ArtifactPages";
import { BackendStatusBanner } from "./components/BackendStatus";
import { DemoGuide } from "./components/DemoGuide";
import { CommandPalette } from "./components/CommandPalette";
import { VoxelCube } from "./components/depth";
import { GuidePage } from "./components/GuidePage";
import { SolanaWalletControl } from "./components/SolanaWalletControl";
import { SoundControl } from "./components/SoundControl";
import { LanguageToggle } from "./components/LanguageToggle";
import { useT } from "./i18n/LanguageContext";
import {
  ArtifactAgents,
  ArtifactAnalytics,
  ArtifactAudit,
  ArtifactProtocol,
} from "./frontend/Pages";
import { applyPreference, readPreference } from "./frontend/preferences";
import { playSound } from "./lib/soundscape";
import {
  MarketplacePage,
  SessionsPage,
  SettingsPage,
  VaultPage,
} from "./OperationalPages";

const VI: Record<string, string> = {
  "Protocol": "Protocol",
  "Marketplace": "Marketplace",
  "Agents": "Agents",
  "My Agents": "Agent của tôi",
  "Guardrails": "Guardrails",
  "Treasury": "Treasury",
  "Audit": "Audit",
  "Audit trail": "Nhật ký kiểm toán",
  "Analytics": "Phân tích",
  "Settings": "Cài đặt",
  "Copilot": "Copilot",
  "Models": "Mô hình",
  "Model profiling": "Đo hiệu năng mô hình",
  "Profile": "Hồ sơ",
  "Owner profile": "Hồ sơ chủ sở hữu",
  "Guide": "Hướng dẫn",
  "The agent proposes. The chain decides.": "Agent đề xuất. Chain quyết định.",
  "Discover immutable agent versions. Rent with your wallet; every agreement is verified on Solana.": "Khám phá các phiên bản agent bất biến. Thuê bằng ví của bạn; mọi thỏa thuận đều được xác minh trên Solana.",
  "Each version is pinned by an agentHash — SHA-256 of model, code and configuration — so a grant can only ever bind to one exact build.": "Mỗi phiên bản được ghim bằng agentHash — SHA-256 của model, code và cấu hình — nên một grant chỉ có thể gắn với đúng một bản build.",
  "Sign a boundary, then watch the agent operate inside it. Seven gates enforce every proposal in one transaction.": "Ký một ranh giới, rồi xem agent hoạt động bên trong. Bảy gate thực thi mọi đề xuất trong một giao dịch.",
  "Your program-owned vault. Refill on devnet, inspect reserves, withdraw as the owner.": "Vault do program sở hữu của bạn. Nạp trên devnet, xem dự trữ, rút với tư cách chủ sở hữu.",
  "Every intent, decision and signature — decoded from the program and connected to its evidence.": "Mọi ý định, quyết định và chữ ký — giải mã từ program và gắn với bằng chứng của nó.",
  "Confirmed volume, policy outcomes and agent activity. Every figure comes from the recorded ledger.": "Khối lượng đã xác nhận, kết quả chính sách và hoạt động của agent. Mọi con số đều lấy từ sổ cái đã ghi.",
  "Network, wallet and experience. The deployment stays anchored to its on-chain program.": "Mạng, ví và trải nghiệm. Bản triển khai luôn neo vào program on-chain của nó.",
  "Ask the ledger in English or Vietnamese. Your assistant explains; your wallet remains the signer.": "Hỏi sổ cái bằng tiếng Anh hoặc tiếng Việt. Trợ lý giải thích; ví của bạn vẫn là bên ký.",
  "Inspect the configured assistant, run a real request and measure its response.": "Xem trợ lý đã cấu hình, gửi một yêu cầu thật và đo phản hồi của nó.",
  "Your wallet identity, signed authority and confirmed on-chain activity.": "Định danh ví của bạn, quyền đã ký và hoạt động on-chain đã xác nhận.",
  "A practical guide to REDLINE.": "Hướng dẫn thực hành REDLINE.",
  "Open Protocol": "Mở Protocol",
  "Open navigation": "Mở menu",
  "Primary navigation": "Điều hướng chính",
  "Find a page": "Tìm trang",
  "Find": "Tìm",
  "Open owner profile": "Mở hồ sơ chủ sở hữu",
  "Mobile navigation": "Điều hướng di động",
  "Pages": "Trang",
  "page": "trang",
  "HELP": "TRỢ GIÚP",
  "PREV": "TRƯỚC",
  "NEXT": "TIẾP",
};

const routes = [
  {
    slug: "protocol",
    label: "Protocol",
    title: "Protocol",
    icon: ShieldCheck,
    description: "The agent proposes. The chain decides.",
    page: ArtifactProtocol,
  },
  {
    slug: "marketplace",
    label: "Marketplace",
    title: "Marketplace",
    icon: Globe,
    description:
      "Discover immutable agent versions. Rent with your wallet; every agreement is verified on Solana.",
    page: MarketplacePage,
  },
  {
    slug: "agents",
    label: "Agents",
    title: "My Agents",
    icon: Bot,
    description:
      "Each version is pinned by an agentHash — SHA-256 of model, code and configuration — so a grant can only ever bind to one exact build.",
    page: ArtifactAgents,
  },
  {
    slug: "guardrails",
    label: "Guardrails",
    title: "Guardrails",
    icon: Layers,
    description:
      "Sign a boundary, then watch the agent operate inside it. Seven gates enforce every proposal in one transaction.",
    page: SessionsPage,
  },
  {
    slug: "treasury",
    label: "Treasury",
    title: "Treasury",
    icon: Wallet,
    description:
      "Your program-owned vault. Refill on devnet, inspect reserves, withdraw as the owner.",
    page: VaultPage,
  },
  {
    slug: "audit",
    label: "Audit",
    title: "Audit trail",
    icon: BookOpen,
    description:
      "Every intent, decision and signature — decoded from the program and connected to its evidence.",
    page: ArtifactAudit,
  },
  {
    slug: "analytics",
    label: "Analytics",
    title: "Analytics",
    icon: Activity,
    description:
      "Confirmed volume, policy outcomes and agent activity. Every figure comes from the recorded ledger.",
    page: ArtifactAnalytics,
  },
  {
    slug: "settings",
    label: "Settings",
    title: "Settings",
    icon: Settings,
    description:
      "Network, wallet and experience. The deployment stays anchored to its on-chain program.",
    page: SettingsPage,
  },
  {
    slug: "copilot",
    label: "Copilot",
    title: "Copilot",
    icon: Sparkles,
    description:
      "Ask the ledger in English or Vietnamese. Your assistant explains; your wallet remains the signer.",
    page: CopilotPage,
  },
  {
    slug: "models",
    label: "Models",
    title: "Model profiling",
    icon: Cpu,
    description:
      "Inspect the configured assistant, run a real request and measure its response.",
    page: ModelsPage,
  },
  {
    slug: "profile",
    label: "Profile",
    title: "Owner profile",
    icon: Wallet,
    description:
      "Your wallet identity, signed authority and confirmed on-chain activity.",
    page: ProfilePage,
  },
  {
    slug: "guide",
    label: "Guide",
    title: "Guide",
    icon: BookOpen,
    description: "A practical guide to REDLINE.",
    page: GuidePage,
  },
];
const headerOrder = [0, 1, 2, 3, 4, 5, 6, 8, 9, 7];
const oldRouteOrder = [
  "protocol",
  "agents",
  "analytics",
  "marketplace",
  "treasury",
  "audit",
  "guardrails",
  "settings",
  "guide",
  "copilot",
  "models",
  "profile",
];
const readRoute = () =>
  routes.find((r) => r.slug === location.hash.replace(/^#\/?/, "")) ??
  routes[0];

export default function App() {
  const tr = useT(VI);
  const [route, setRoute] = useState(readRoute);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const main = useRef<HTMLElement>(null);
  const navigate = (slug: string) => {
    location.hash = `/${slug}`;
    setMenu(false);
  };
  useEffect(() => {
    const change = () => {
      setRoute(readRoute());
      setMenu(false);
      playSound("navigate");
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    applyPreference("depth", readPreference("depth"));
    applyPreference("motion", readPreference("motion"));
  }, []);
  useEffect(() => {
    document.title = `${route.title} · REDLINE`;
    main.current?.scrollTo({ top: 0 });
  }, [route]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === "Escape") {
        setMenu(false);
        setSearch(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const index = routes.findIndex((r) => r.slug === route.slug),
    Page = route.page;
  const commandItems = routes.map((r) => ({
    label: tr(r.label),
    description: tr(r.description),
    icon: r.icon,
    shortcut: "",
    onSelect: () => navigate(r.slug),
  }));
  return (
    <div className="app redline-artifact" data-route={route.slug}>
      <header className="hdr">
        <button
          className="brand"
          onClick={() => navigate("protocol")}
          aria-label={tr("Open Protocol")}
        >
          <span className="emblem">
            <ShieldCheck size={16} />
          </span>
          <span>REDLINE</span>
        </button>
        <button
          className="tool mobile-menu"
          onClick={() => setMenu((v) => !v)}
          aria-label={tr("Open navigation")}
          aria-expanded={menu}
        >
          {menu ? <X size={16} /> : <Menu size={16} />}
        </button>
        <nav className="nav" aria-label={tr("Primary navigation")}>
          {headerOrder.map((i) => (
            <button
              key={i}
              aria-current={route.slug === routes[i].slug ? "page" : undefined}
              onClick={() => navigate(routes[i].slug)}
            >
              {tr(routes[i].label)}
            </button>
          ))}
        </nav>
        <div className="tools">
          <button
            className="tool"
            onClick={() => setSearch(true)}
            aria-label={tr("Find a page")}
          >
            <Search size={13} />
            <span>{tr("Find")}</span>
            <kbd>⌘K</kbd>
          </button>
          <SoundControl />
          <LanguageToggle />
          <span className="netpill">
            <i />
            DEVNET
          </span>
          <div className="wallet-slot">
            <SolanaWalletControl />
          </div>
          <button
            className="avatar-btn"
            onClick={() => navigate("profile")}
            aria-label={tr("Open owner profile")}
          >
            <VoxelCube size={16} />
          </button>
        </div>
        {menu && (
          <nav className="mobile-navigation" aria-label={tr("Mobile navigation")}>
            {routes.map((r) => (
              <button
                key={r.slug}
                aria-current={route.slug === r.slug ? "page" : undefined}
                onClick={() => navigate(r.slug)}
              >
                <r.icon size={16} />
                {tr(r.label)}
                <ArrowRight size={14} />
              </button>
            ))}
          </nav>
        )}
      </header>
      {/* One shared probe for the whole shell. A cold Render service takes most
          of a minute to wake, and the dashboard used to report that as OFFLINE
          on every page at once. */}
      <BackendStatusBanner />
      <main
        ref={main}
        className={`main-scroll ${index === 0 ? "" : "page"}`}
        aria-label={`${tr(route.title)} ${tr("page")}`}
      >
        {index !== 0 && (
          <div className="topline">
            <div className="tl-id">
              <span className="tl-vox">
                <VoxelCube size={18} />
              </span>
              <small>
                {index < 11
                  ? `${String(index + 1).padStart(2, "0")} / 11`
                  : tr("HELP")}
              </small>
              <h1>{tr(route.title)}</h1>
            </div>
            <p>{tr(route.description)}</p>
            <div className="tl-dots" aria-label={tr("Pages")}>
              {routes.slice(0, 11).map((r, i) => (
                <button
                  key={r.slug}
                  title={tr(r.title)}
                  aria-label={tr(r.title)}
                  onClick={() => navigate(r.slug)}
                  className={i <= index ? "on" : ""}
                />
              ))}
            </div>
            <div className="tl-nav">
              {index > 0 && (
                <button
                  className="jbtn"
                  onClick={() => navigate(routes[index - 1].slug)}
                >
                  <ArrowLeft size={12} />
                  <span>
                    <small>{tr("PREV")}</small>
                    {tr(routes[index - 1].label)}
                  </span>
                </button>
              )}
              {index < 10 && (
                <button
                  className="jbtn"
                  onClick={() => navigate(routes[index + 1].slug)}
                >
                  <span>
                    <small>{tr("NEXT")}</small>
                    {tr(routes[index + 1].label)}
                  </span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        )}
        {/* The guided path sits above the landing page only: it is for a
            first-time visitor working out where the story is, and it would be
            noise on every other route. */}
        {route.slug === "protocol" && <DemoGuide navigate={navigate} />}
        <div key={route.slug} className="route-enter">
          <Page
            setNav={(n: number) => navigate(oldRouteOrder[n] ?? "protocol")}
          />
        </div>
      </main>
      <CommandPalette
        open={search}
        onClose={() => setSearch(false)}
        items={commandItems}
      />
    </div>
  );
}
