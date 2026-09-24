import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { MESSAGES } from "../policy/engine.js";
import { askForJson, isConfigured, modelName } from "../llm-client.js";
import { POLICY_GATES } from "./protocol.js";
import { json } from "./json.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPT_PATH = path.join(__dirname, "../copilot-prompt.txt");

const DEFAULT_SYSTEM_PROMPT = [
  "You are the REDLINE operations assistant for an on-chain agent guardrail system on Solana.",
  "The user's brief below is the ONLY source of fact available to you. Every number you state must appear in it.",
  "The verified baseline is computed directly from the ledger. Do not contradict it, relabel its counts, or invent a limit from an unrelated number.",
  "If the brief does not contain what was asked, say so plainly and describe what would be needed — never estimate, and never recall figures from elsewhere.",
  "Gates are checked in order and the first failure stops the transfer; a refusal means nothing moved.",
  "A grant and its limits are immutable after signing. A revoked or expired grant cannot be restored or edited; the owner must review and sign a new grant.",
  "Answer in the same language as the user's question, including Vietnamese.",
  "Infer the user's intent from natural language, answer it directly, and give up to three concrete next actions.",
  "Prefer naming the gate, reason code, and policy field that would change the outcome over general advice.",
].join(" ");

function loadSystemPrompt(): string {
  try {
    if (fs.existsSync(PROMPT_PATH)) {
      const text = fs.readFileSync(PROMPT_PATH, "utf-8").trim();
      if (text) return text;
    }
    console.log(`[Assistant] Prompt file not found or empty at ${PROMPT_PATH}, using default prompt`);
  } catch (err) {
    console.warn(`[Assistant] Error reading system prompt from ${PROMPT_PATH}: ${err instanceof Error ? err.message : String(err)}`);
  }
  return DEFAULT_SYSTEM_PROMPT;
}


// An assistant that can only talk about what this system actually recorded.
//
// The grounding is assembled here, from the database, and handed to the model
// as the entire world it may reason about. It is never asked to recall facts
// about REDLINE, and it is told in the schema that every figure it cites has
// to come from the brief. A model inventing a spend figure on a product whose
// argument is that numbers are verifiable would be worse than no assistant.
//
// With no model configured it still answers, from the same brief, using the
// rules below — the copilot pattern used by /risk-assess. An operator should
// never be blocked because a provider is down.

const Body = z.object({
  question: z.string().trim().min(1).max(400),
  owner: z.preprocess(v => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().min(32).max(44).optional()),
});

export interface Grounding {
  scope: "wallet" | "protocol";
  grants: { active: number; total: number; revoked: number; expiringWithinHours: number | null };
  spend: { spentUsdc: number; capUsdc: number; transactions: number };
  decisions: { allowed: number; refused: number; byReason: Record<string, number> };
  gates: { id: number; label: string; detail: string; refusals: number }[];
  reasonCodes: Record<string, string>;
}

async function gather(owner?: string): Promise<Grounding> {
  const grants = await prisma.agentGrant.findMany({
    where: owner ? { owner: { wallet: owner } } : undefined,
    include: { policyVersion: true },
  });
  const grantIds = grants.map(g => g.id);
  const decisions = grantIds.length
    ? await prisma.policyDecision.findMany({
        where: { intent: { grantId: { in: grantIds } } },
        select: { allow: true, reasonCode: true },
        take: 1000,
        orderBy: { createdAt: "desc" },
      })
    : [];

  const byReason: Record<string, number> = {};
  for (const d of decisions) {
    if (d.allow) continue;
    byReason[d.reasonCode] = (byReason[d.reasonCode] ?? 0) + 1;
  }

  const now = Date.now();
  // "Active" means the executor could still act on it: not revoked and not
  // past its window. An expired grant counted here told owners an agent was
  // live when gate 2 would refuse everything it proposed.
  const expiryOf = (g: { expiresAt: Date | null; policyVersion: { expiresAt: Date } }) => (g.expiresAt ?? g.policyVersion.expiresAt).getTime();
  const live = grants.filter(g => !g.revoked && expiryOf(g) > now);
  const soonest = live
    .map(g => expiryOf(g) - now)
    .filter(ms => ms > 0)
    .sort((a, b) => a - b)[0];

  return {
    scope: owner ? "wallet" : "protocol",
    grants: {
      active: live.length,
      total: grants.length,
      revoked: grants.filter(g => g.revoked).length,
      expiringWithinHours: soonest === undefined ? null : Math.round(soonest / 3_600_000),
    },
    spend: {
      spentUsdc: Number(grants.reduce((s, g) => s + g.spentUnits, 0n)) / 1e6,
      capUsdc: Number(grants.reduce((s, g) => s + g.policyVersion.spendCapUnits, 0n)) / 1e6,
      transactions: grants.reduce((s, g) => s + g.transactionCount, 0),
    },
    decisions: {
      allowed: decisions.filter(d => d.allow).length,
      refused: decisions.filter(d => !d.allow).length,
      byReason,
    },
    gates: POLICY_GATES.map(g => ({
      id: g.id,
      label: g.label,
      detail: g.detail,
      refusals: g.reasonCodes.reduce((s, r) => s + (byReason[r] ?? 0), 0),
    })),
    reasonCodes: MESSAGES,
  };
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    suggestions: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
  },
  required: ["answer", "suggestions"],
};

type Suggestion = { title: string; detail: string };

const hasAny = (value: string, terms: string[]) => terms.some(term => value.includes(term));
const isVietnamese = (question: string) =>
  /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i.test(question)
  || hasAny(question.toLowerCase(), [" vì ", " sao ", " của tôi", " bị ", " không ", " nên ", " thế nào"]);

export function isOperationalQuestion(question: string, g: Grounding): boolean {
  const q = ` ${question.toLowerCase().normalize("NFC")} `;
  const mentionsReasonCode = Object.keys(g.reasonCodes).some(reason => question.toUpperCase().includes(reason));
  if (mentionsReasonCode) return true;

  const opsTerms = [
    "agent", "grant", "policy", "gate", "block", "stuck", "refus", "reject", "failed", "failure",
    "budget", "spend", "cap", "usdc", "expire", "expiry", "lapse",
    "chính sách", "bị chặn", "từ chối", "không chạy", "thất bại",
    "ngân sách", "chi tiêu", "hạn mức", "hết hạn", "thời hạn",
  ];
  return opsTerms.some(term => q.includes(term));
}

function gateAdvice(gateId: number, vi: boolean): Suggestion {
  // Keyed by POLICY_GATES id: 1 active, 2 expiry, 3 nonce, 4 mint,
  // 5 destination, 6 budget, 7 cooldown. Gates 3–5 were once listed in a
  // different order here, so a NONCE_REPLAY spike told the owner to pick
  // another token.
  const advice: Record<number, [string, string, string, string]> = {
    1: ["Restore an active grant", "The grant is revoked or inactive. Review the owner intent and sign a new grant if the agent should run again.", "Khôi phục grant đang hoạt động", "Grant đã bị thu hồi hoặc không còn hoạt động. Hãy kiểm tra ý định của chủ ví và ký grant mới nếu agent cần chạy lại."],
    2: ["Renew the time window", "The grant has expired. Create a new grant with an expiry that covers the intended task window.", "Gia hạn thời gian", "Grant đã hết hạn. Hãy tạo grant mới với thời hạn đủ cho tác vụ dự kiến."],
    4: ["Use an allowed token", "The requested mint is outside the grant allowlist. Choose an allowed mint or review and sign a new policy.", "Dùng token được cho phép", "Mint được yêu cầu không nằm trong allowlist. Hãy chọn mint hợp lệ hoặc rà soát và ký policy mới."],
    5: ["Use an allowed destination", "The recipient is outside the destination allowlist. Correct the address or review a new policy before signing it.", "Dùng địa chỉ được cho phép", "Địa chỉ nhận không nằm trong allowlist. Hãy sửa địa chỉ hoặc rà soát policy mới trước khi ký."],
    3: ["Refresh the transaction state", "The nonce is stale or out of order. Reload the latest grant state before submitting the next transfer.", "Làm mới trạng thái giao dịch", "Nonce đã cũ hoặc sai thứ tự. Hãy tải lại trạng thái grant mới nhất trước khi gửi giao dịch tiếp theo."],
    6: ["The budget envelope is where work is stopping", "Reduce the requested amount, split the task into valid transfers, or sign a reviewed grant with a suitable cap.", "Hạn mức ngân sách đang chặn tác vụ", "Hãy giảm số tiền, chia tác vụ thành các giao dịch hợp lệ, hoặc ký grant mới với hạn mức đã được rà soát."],
    7: ["Respect the cooldown", "Wait for the cooldown to finish or reduce transfer frequency. The agent should not retry continuously.", "Tuân thủ thời gian chờ", "Hãy chờ cooldown kết thúc hoặc giảm tần suất chuyển. Agent không nên thử lại liên tục."],
  };
  const item = advice[gateId] ?? ["Review the failed policy gate", "Inspect the refusal reason and update only the policy field responsible for it.", "Kiểm tra policy gate bị lỗi", "Hãy xem lý do từ chối và chỉ cập nhật trường policy gây ra lỗi."];
  return vi ? { title: item[2], detail: item[3] } : { title: item[0], detail: item[1] };
}

/** Intent-aware fallback used when no model is configured or the provider is unavailable. */
export function withoutModel(g: Grounding, question: string): { answer: string; suggestions: Suggestion[] } {
  const q = ` ${question.toLowerCase().normalize("NFC")} `;
  const vi = isVietnamese(q);
  const busiest = [...g.gates].sort((a, b) => b.refusals - a.refusals)[0];

  const code = Object.keys(g.reasonCodes).find(reason => question.toUpperCase().includes(reason));
  const codeGate = code ? POLICY_GATES.find(gate => (gate.reasonCodes as readonly string[]).includes(code)) : undefined;

  const isGreeting = hasAny(q, ["hello", "hi", "xin chào", "chào", "bạn là ai", "who are you", "tro ly", "trợ lý"]);
  const asksBlocked = hasAny(q, ["block", "stuck", "refus", "reject", "failed", "failure", "bị chặn", "từ chối", "không chạy", "thất bại", "lỗi"]);
  const asksBudget = hasAny(q, ["budget", "spend", "cap", "usdc", "ngân sách", "chi tiêu", "hạn mức", "số dư"]);
  const asksExpiry = hasAny(q, ["expire", "expiry", "lapse", "hết hạn", "thời hạn", "bao lâu"]);
  const asksGrant = hasAny(q, ["grant", "policy", "active", "status", "quyền", "chính sách", "hoạt động", "trạng thái", "doing", "how are"]);

  const asksWallet = hasAny(q, ["kết nối ví", "connect wallet", "phantom", "solflare", "backpack"]);
  const asksTreasury = hasAny(q, ["treasury", "nạp tiền", "rút tiền", "withdraw", "deposit", "kho tiền"]);
  const asksAudit = hasAny(q, ["audit", "nhật ký", "audit trail", "kiểm toán"]);
  const asksAnalytics = hasAny(q, ["analytics", "biểu đồ analytics"]);
  const asksProfile = hasAny(q, ["profile", "hồ sơ", "chủ sở hữu", "owner profile"]);
  const asksSettings = hasAny(q, ["settings", "cài đặt", "phím tắt", "devnet"]);
  const asksModels = hasAny(q, ["models", "mô hình", "gemini", "groq", "profiling"]);
  const asksAgentsPage = hasAny(q, ["trang agent", "agents page", "agenthash"]);
  const asksShortcut = hasAny(q, ["⌘k", "ctrl+k", "command palette"]);
  const asksMarket = hasAny(q, ["marketplace", "chợ", "thuê agent", "đăng agent"]);
  const asksLab = hasAny(q, ["lab", "giả lập", "policy lab"]);
  const asksGuide = hasAny(q, ["hướng dẫn", "cách dùng", "sử dụng", "làm sao", "thế nào", "làm cách nào"]);

  let answer: string | undefined;

  if (isGreeting) {
    answer = vi
      ? "Xin chào! Tôi là REDLINE Copilot — Trợ lý vận hành và giám sát On-Chain. Bạn có thể hỏi tôi về 12 trang chức năng trên web (kết nối ví, Treasury Vault, Marketplace, Audit Trail, Guardrails...), hoặc giải thích các giao dịch bị 7 Gates chặn."
      : "Hello! I am REDLINE Copilot — your On-Chain Operations & Monitoring Assistant. You can ask me about all 12 web pages (connecting wallet, Treasury Vault, Marketplace, Audit Trail, Guardrails...), or explaining transfers blocked by the 7 Safety Gates.";
  } else if (code) {
    answer = vi
      ? `${code} thuộc gate ${codeGate?.id ?? "?"}${codeGate ? ` (${codeGate.label})` : ""}: ${g.reasonCodes[code]}`
      : `${code} belongs to gate ${codeGate?.id ?? "?"}${codeGate ? ` (${codeGate.label})` : ""}: ${g.reasonCodes[code]}`;
  } else if (asksBlocked) {
    answer = busiest?.refusals
      ? (vi
          ? `Agent bị chặn nhiều nhất tại gate ${busiest.id} (${busiest.label}): ${busiest.refusals} lần từ chối. Tổng cộng có ${g.decisions.allowed} giao dịch được phép và ${g.decisions.refused} giao dịch bị từ chối.`
          : `The agent is blocked most often at gate ${busiest.id}, ${busiest.label.toLowerCase()}: ${busiest.refusals} refusals. In total, ${g.decisions.allowed} transfers were allowed and ${g.decisions.refused} refused.`)
      : (vi ? "Chưa có giao dịch bị từ chối trong dữ liệu hiện tại." : "No refused transfer is recorded in the current data.");
  } else if (asksBudget) {
    answer = vi
      ? `Đã chi ${g.spend.spentUsdc.toLocaleString("vi-VN")} trên tổng hạn mức ${g.spend.capUsdc.toLocaleString("vi-VN")} USDC qua ${g.spend.transactions} giao dịch. Gate 6 sẽ chặn giao dịch làm tổng chi vượt hạn mức.`
      : `${g.spend.spentUsdc.toLocaleString("en-US")} of ${g.spend.capUsdc.toLocaleString("en-US")} USDC has been spent across ${g.spend.transactions} transfers. Gate 6 blocks a transfer that would exceed the total cap.`;
  } else if (asksExpiry) {
    answer = g.grants.expiringWithinHours === null
      ? (vi ? "Không có grant đang hoạt động với thời hạn sắp tới trong dữ liệu hiện tại." : "No active grant with a future expiry is present in the current data.")
      : (vi ? `Grant gần nhất sẽ hết hạn sau khoảng ${g.grants.expiringWithinHours} giờ. Sau thời điểm đó, gate 2 sẽ từ chối mọi giao dịch.` : `The nearest grant expires in about ${g.grants.expiringWithinHours}h. After that, gate 2 refuses every transfer.`);
  } else if (asksGrant) {
    answer = vi
      ? `${g.scope === "wallet" ? "Ví này" : "Giao thức"} có ${g.grants.active} grant đang hoạt động trong tổng số ${g.grants.total}; ${g.grants.revoked} grant đã bị thu hồi. Có ${g.decisions.allowed} giao dịch được phép và ${g.decisions.refused} giao dịch bị từ chối.`
      : `${g.scope === "wallet" ? "This wallet" : "The protocol"} holds ${g.grants.active} active ${g.grants.active === 1 ? "grant" : "grants"} of ${g.grants.total}; ${g.grants.revoked} are revoked. ${g.decisions.allowed} transfers were allowed and ${g.decisions.refused} refused.`;
  } else if (asksWallet) {
    answer = vi
      ? "Để kết nối ví Solana trên REDLINE, bạn nhấn nút 'Select Wallet' ở góc trên bên phải màn hình, chọn ví của bạn (Phantom, Solflare, Backpack...) và chấp nhận yêu cầu kết nối."
      : "To connect your Solana wallet on REDLINE, click the 'Select Wallet' button at the top right of the screen, pick your provider (Phantom, Solflare, Backpack...), and approve the connection.";
  } else if (asksTreasury) {
    answer = vi
      ? "Trang Treasury (/#/treasury) cho phép quản lý Kho tiền Vault PDA do Solana Program kiểm soát (Non-Custodial). Bạn có thể nạp tiền thử nghiệm trên Devnet, xem tổng số dư dự trữ và thực hiện rút tiền (Withdraw) an toàn về ví cá nhân."
      : "The Treasury page (/#/treasury) manages your program-owned non-custodial Vault PDA. You can refill on Devnet, inspect reserves, and withdraw funds back to your wallet.";
  } else if (asksAudit) {
    answer = vi
      ? "Trang Audit Trail (/#/audit) lưu trữ nhật ký kiểm toán công khai on-chain. Mọi đề xuất giao dịch, kết quả kiểm duyệt từ 7 Gates (ALLOW/REFUSE) và chữ ký giao dịch Solana đều được ghi nhận minh bạch và không thể chỉnh sửa."
      : "The Audit Trail page (/#/audit) provides a transparent on-chain audit log. Every transaction intent, 7-gate decision, and Solana transaction signature is recorded immutably.";
  } else if (asksAnalytics) {
    answer = vi
      ? "Trang Analytics (/#/analytics) cung cấp báo cáo phân tích chuyên sâu: thống kê tổng khối lượng giao dịch đã duyệt, biểu đồ phân bổ các nguyên nhân từ chối (Reason Codes) và độ trễ ra quyết định của policy."
      : "The Analytics page (/#/analytics) delivers deep insights: confirmed volume, policy decision latency, and refusal distribution across the 7 Safety Gates.";
  } else if (asksProfile) {
    answer = vi
      ? "Trang Owner Profile (/#/profile) thể hiện định danh ví của bạn, danh sách các Vault PDA đã tạo, các Grant chính sách đang sở hữu và lịch sử hoạt động cá nhân trên giao thức."
      : "The Owner Profile page (/#/profile) displays your wallet identity, created Vault PDAs, signed grant authorities, and confirmed on-chain activity.";
  } else if (asksSettings) {
    answer = vi
      ? "Trang Settings (/#/settings) cho phép tùy chỉnh cấu hình mạng (Solana Devnet/Localnet), URL Backend API, bật/tắt âm thanh tương tác và chuyển đổi ngôn ngữ Tiếng Việt/Tiếng Anh."
      : "The Settings page (/#/settings) lets you configure network endpoints (Devnet/Localnet), backend API URL, sound effects, and language preferences.";
  } else if (asksModels) {
    answer = vi
      ? "Trang Model Profiling (/#/models) giúp kiểm tra hiệu năng các mô hình LLM (Gemini 3.8 Flash, OpenAI, Groq), đo tốc độ phản hồi (latency) và kiểm tra tính hợp lệ của API Key."
      : "The Model Profiling page (/#/models) lets you test LLM provider performance (Gemini 3.8 Flash, OpenAI, Groq), measure latency, and validate API keys.";
  } else if (asksAgentsPage) {
    answer = vi
      ? "Trang My Agents (/#/agents) quản lý tất cả AI Agent mà bạn sở hữu hoặc đã thuê. Mỗi agent được xác minh bằng mã hash duy nhất (agentHash) và có lịch sử lượt chạy (Agent Runs) riêng."
      : "The My Agents page (/#/agents) manages all agents you own or rented. Each build is pinned by an immutable agentHash with detailed Agent Run history.";
  } else if (asksShortcut) {
    answer = vi
      ? "Bạn có thể nhấn phím tắt `⌘K` (hoặc `Ctrl+K`) hoặc bấm nút 'Find' trên góc thanh công cụ để mở Command Palette, tìm kiếm và nhảy nhanh đến bất kỳ trang nào trong 12 trang."
      : "Press `⌘K` (or `Ctrl+K`) or click 'Find' in the header to open the Command Palette and navigate to any of the 12 pages instantly.";
  } else if (asksMarket) {
    answer = vi
      ? "Tại Agent Marketplace (/#/marketplace), bạn có thể chọn và thuê các AI Agent đã được niêm yết với mã build cố định (hash). Thuê agent bằng SOL thật trên Solana Devnet để chạy chiến lược tự động."
      : "In the Agent Marketplace (/#/marketplace), you can browse and hire verified AI Agents using SOL on Solana Devnet to run automated strategies.";
  } else if (asksLab) {
    answer = vi
      ? "Policy Lab / Guardrails (/#/guardrails hoặc /#/simulation) cho phép bạn giả lập cấu hình 7 Cổng An Toàn (Seven Gates) hoàn toàn miễn phí gas trước khi tiến hành ký duyệt chính thức."
      : "Policy Lab & Guardrails (/#/guardrails) lets you simulate testing the 7 Safety Gates completely free of gas fees before signing live grants.";
  } else if (asksGuide) {
    answer = vi
      ? "Các bước sử dụng REDLINE: 1) Kết nối ví Solana ở góc phải -> 2) Nạp USDC/SOL vào Vault PDA ở trang Treasury -> 3) Thiết lập & ký duyệt Grant ở Guardrails -> 4) Theo dõi agent giao dịch an toàn với 7 Cổng An Toàn."
      : "REDLINE quick guide: 1) Connect Solana wallet -> 2) Deposit into Vault PDA in Treasury -> 3) Sign Grant in Guardrails -> 4) Monitor agent protected by the 7 Safety Gates.";
  }

  const isUnknownNonOps = hasAny(q, ["nấu ăn", "thời tiết", "ăn gì", "bạn tên gì", "mấy giờ", "yêu", "hát"]);

  if (!answer) {
    if (isUnknownNonOps) {
      return {
        answer: vi
          ? "Tôi vẫn đang trong quá trình cải thiện web , tôi sẽ trả lời câu hỏi của bạn sau"
          : "I am still in the process of improving the website, I will answer your question later",
        suggestions: [],
      };
    }

    answer = vi
      ? `${g.scope === "wallet" ? "Ví này" : "Giao thức"} có ${g.grants.active}/${g.grants.total} grant đang hoạt động. ${g.decisions.allowed} giao dịch được phép, ${g.decisions.refused} giao dịch bị từ chối${busiest?.refusals ? `; phần lớn dừng ở gate ${busiest.id} (${busiest.label})` : ""}.`
      : `${g.scope === "wallet" ? "This wallet" : "The protocol"} holds ${g.grants.active} active ${g.grants.active === 1 ? "grant" : "grants"} of ${g.grants.total}. ${g.decisions.allowed} transfers were allowed and ${g.decisions.refused} refused${busiest?.refusals ? `; most stopped at gate ${busiest.id}, ${busiest.label.toLowerCase()}` : ""}.`;
  }

  const suggestions: Suggestion[] = [];
  if (!g.grants.active && g.grants.total) {
    suggestions.push(vi
      ? { title: "Không có grant đang hoạt động", detail: "Mọi grant đều đã bị thu hồi hoặc hết hạn. Cần ký grant mới trước khi agent có thể chuyển tiền." }
      : { title: "No grant is live", detail: "Every grant here is revoked or expired, so nothing can move until a new one is signed." });
  }
  if (g.grants.expiringWithinHours !== null && g.grants.expiringWithinHours < 24) {
    suggestions.push(vi
      ? { title: "Một grant sắp hết hạn", detail: `Grant gần nhất hết hạn sau khoảng ${g.grants.expiringWithinHours} giờ. Hãy rà soát và tạo grant thay thế nếu tác vụ cần tiếp tục.` }
      : { title: "A grant expires soon", detail: `The next one lapses in about ${g.grants.expiringWithinHours}h. Review and replace it if the task must continue.` });
  }
  if (busiest?.refusals) {
    const action = gateAdvice(busiest.id, vi);
    suggestions.push({ ...action, detail: `${vi ? `Gate ${busiest.id} đã từ chối ${busiest.refusals} lần. ` : `Gate ${busiest.id} refused ${busiest.refusals} ${busiest.refusals === 1 ? "transfer" : "transfers"}. `}${action.detail}` });
  }
  return { answer, suggestions: suggestions.slice(0, 3) };
}

export async function assistantRoutes(app: FastifyInstance) {
  app.post("/assistant", async (req) => {
    const body = Body.parse(req.body);
    const grounding = await gather(body.owner);
    const floor = withoutModel(grounding, body.question);

    const q = ` ${body.question.toLowerCase().normalize("NFC")} `;
    const isGreeting = hasAny(q, ["hello", "hi", "xin chào", "chào", "bạn là ai", "who are you", "tro ly", "trợ lý"]);

    // If no LLM key is configured, or it's a greeting/fallback message, return rules output directly.
    if (!isConfigured() || isGreeting || floor.answer.includes("Tôi vẫn đang trong quá trình cải thiện web")) {
      return json({ ...floor, source: "rules", model: "redline-rules-v2", grounding });
    }

    try {
      const answered = await askForJson<{ answer: string; suggestions: { title: string; detail: string }[] }>({
        system: `${loadSystemPrompt()}

CHỈ THỊ CỐT LÕI VỀ DIỄN ĐẠT:
1. Trả lời tự nhiên, mạch lạc, dễ hiểu theo đúng câu hỏi của người dùng.
2. Nếu câu hỏi liên quan đến hướng dẫn thao tác trên website (kết nối ví, tạo grant, dùng marketplace, treasury...), hãy trả lời trực tiếp các bước hướng dẫn một cách thân thiện. KHÔNG tự động chèn các số liệu thống kê giao thức trừ khi người dùng chủ động hỏi báo cáo số liệu.
3. Với những câu hỏi ngoài phạm vi dự án REDLINE, không có thông tin hoặc câu hỏi không biết trả lời, bắt buộc phải trả lời: "Tôi vẫn đang trong quá trình cải thiện web , tôi sẽ trả lời câu hỏi của bạn sau".
4. Trả lời bằng cùng ngôn ngữ với câu hỏi người dùng (ưu tiên Tiếng Việt).
5. Dùng văn bản thuần túy (Plain Text hoặc Markdown ngắn gọn), KHÔNG chèn thẻ HTML (như <ul>, <li>, <b>).`,
        input: { question: body.question, brief: grounding, verifiedBaseline: floor },
        schemaName: "redline_assistant_reply",
        schema,
        maxTokens: 4000,
      });
      if (!answered) return json({ ...floor, source: "rules", model: "redline-rules-v2", grounding });
      return json({
        ...answered,
        source: "model",
        groundedBy: "rules",
        model: modelName(),
        grounding,
      });
    } catch (err) {
      console.error("[Assistant Route Error]:", err);
      req.log.warn({ err: err instanceof Error ? err.message : String(err), model: modelName() }, "assistant call failed; answering from recorded figures");
      return json({ ...floor, source: "rules", model: "redline-rules-v2", grounding });
    }
  });
}
