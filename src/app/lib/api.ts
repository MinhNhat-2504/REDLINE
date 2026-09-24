// Single place the UI talks to the REDLINE backend. Every page reads through
// these helpers so switching hosts (localhost → Render) is one env change.

// render.yaml injects VITE_API_URL from the API service's RENDER_EXTERNAL_URL,
// which already carries a scheme; tolerate a bare hostname too.
const configuredApi = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
export const API_URL = !configuredApi
  ? "http://localhost:8787"
  : /^https?:\/\//.test(configuredApi) ? configuredApi : `https://${configuredApi}`;
// Shared write key (see backend/src/auth.ts for what it does and does not protect).
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

export interface Health {
  ok: boolean; chain: "mock" | "solana"; programId: string; executor: string; clockSpeed: number;
  // Present on a current API build; optional so an older one still types.
  version?: string;
  identityEnforced?: boolean;      // do writes need a wallet signature?
  indexer?: "running" | "off";     // is the chain log subscription live?
  rateLimitPerMinute?: number;
  demoMintConfigured?: boolean;
  cluster?: string;
}
export interface SimulationPolicy { spendCapUnits: string; maxTransactions: number; cooldownSeconds: number; durationSeconds: number }
export interface SimulationInput { policy: SimulationPolicy; proposal: { amountUnits: string; attempts: number; intervalSeconds: number; destinationAllowed: boolean; mintAllowed: boolean; active: boolean; replayNonce: boolean } }
export interface PolicyPreset { id: string; name: string; description: string; policy: SimulationPolicy; proposal: { amountUnits: string; attempts: number; intervalSeconds: number } }
export interface SimulationResult {
  mode: "simulation"; notice: string; input: SimulationInput;
  summary: { allowed: number; blocked: number; spentUnits: string; remainingUnits: string; nextNonce: number };
  steps: { attempt: number; elapsedSeconds: number; nonce: number; verdict: { allow: boolean; reasonCode: string; gate: number; message: string }; gates: { id: number; status: "passed" | "blocked" | "skipped" }[]; spentUnits: string; remainingUnits: string }[];
}
// Reputation has two halves that are reported apart on purpose: reliability is
// derived from policy decisions and on-chain results and cannot be voted on;
// reviews come only from wallets that paid to rent the agent.
export interface ReviewSummary { count: number; average: number | null; distribution: Record<string, number>; latestAt: string | null }
export interface ReliabilitySummary {
  decisions: number; allowed: number; denied: number; complianceRate: number | null;
  onChainAttempts: number; onChainSuccesses: number; onChainSuccessRate: number | null;
  grants: number; completedRuns: number; failedRuns: number;
}
export interface AgentRating {
  reviews: ReviewSummary; reliability: ReliabilitySummary;
  score: number | null; basis: "reliability" | "reviews" | "both" | "insufficient";
}
export interface AgentReview { id: string; rating: number; comment: string | null; createdAt: string; updatedAt: string; reviewerWallet: string; isMine: boolean }
export interface Reviewable { canReview: boolean; reason: string | null; hires: { id: string; startsAt: string; endsAt: string; status: string; reviewed: boolean; rating: number | null }[] }

export interface AgentVersion {
  id: string; name: string; version: string; strategy: string; agentHash: string;
  // Who published this build, and whether that is the wallet looking at it.
  // Absent on an older API build; `unclaimed` covers rows published before
  // publishing required a signature.
  publisherWallet?: string | null; isMine?: boolean; unclaimed?: boolean;
  rating?: AgentRating | null;
}
// On a grant that is not yours the API returns the allowlists as counts, not
// addresses — the addresses are the linkage it redacts everywhere else.
export interface OnchainGrant { active: boolean; spentUnits: string; transactionCount: number; nextNonce: number; spendCapUnits: string; maxTransactions: number; cooldownSeconds: number; expiresAt: number; lastExecutionAt?: number; allowedMints: string[] | number; allowedDestinations: string[] | number }
export interface Grant {
  id: string; grantPda: string; agentId: string; executorPubkey: string; createSignature: string | null;
  spentUnits: string; transactionCount: number; nextNonce: number; revoked: boolean; createdAt: string; lastExecutionAt: string | null;
  // This grant's own expiry. Optional because rows written by an older API
  // build carry only the policy's (shared) expiry — see grantExpiresAt().
  expiresAt?: string | null;
  agentVersion: AgentVersion;
  // Present when this grant runs under a marketplace rental.
  hire?: { id: string; endsAt: string; status: string } | null;
  policyVersion: { policyHash: string; spendCapUnits: string; maxTransactions: number; cooldownSeconds: number; expiresAt: string; allowedMints: string; allowedDests: string };
  owner: { wallet: string };
  onchain?: OnchainGrant | null;
  runs?: { id: string; mode: string; status: string; startedAt: string }[];
}
export interface IntentRow {
  id: string; nonce: number; amountUnits: string; destination: string; reason: string; intentHash: string; createdAt: string;
  decision: null | { allow: boolean; reasonCode: string; stage: string; chainTx: null | { signature: string; result: string; error: string | null; slot: string | null } };
}
export interface IntentPreview {
  verdict: { allow: boolean; reasonCode: string; gate: number; message: string };
  intentHash: string;
  ruleSnapshotHash: string;
  nonce: number;
}
// `redacted` is set by the API when the caller is not the owner: identity and
// linkage are masked server-side, the on-chain evidence is not. The UI says so
// rather than presenting a masked row as if it were the whole record.
export interface AuditRow { id: string; createdAt: string; actorType: string; eventType: string; subjectType: string; subjectId: string; chainSignature: string | null; payload: Record<string, unknown>; redacted?: boolean }
export interface VaultView { owner: string; vaultPda: string; vaultAta: string; mint: string; balanceUnits: string | null; exists: boolean }
export interface FeedEvent { id: string; at: string; eventType: string; actorType: string; payload: Record<string, unknown>; chainSignature?: string | null }
export interface Listing {
  id: string; agentVersionId: string; priceLamports: string; developerWallet: string | null; status: string; createdAt: string;
  agentVersion: AgentVersion; activeHires: number;
  publisherWallet?: string | null; isMine?: boolean; hiredByMe?: boolean;
  rating?: AgentRating | null;
  // Market stats from the backend, all derived from real records (hire rows +
  // `listing.hired` audit events). Optional so an older API build still types.
  totalHires?: number; hires24h?: number; volumeLamports?: string; lastHiredAt?: string | null;
}
// The marketplace take rate, served by the API rather than bundled, so the
// payment the wallet signs always matches the one the server will verify.
export interface ProtocolFee { treasury: string | null; feeBps: number; enabled: boolean }
export interface ProtocolRevenue {
  feeBps: number; treasury: string | null; enabled: boolean;
  rentalsCharged: number; grossVolumeLamports: string; protocolRevenueLamports: string; revenue24hLamports: string;
  recent: { hireId: string; agent: string; at: string; paidLamports: string; publisherLamports: string; protocolFeeLamports: string; feeBps: number; signature: string | null }[];
}

export interface Hire {
  id: string; listingId: string; ownerWallet: string; paymentSignature: string | null; startsAt: string; endsAt: string; status: string;
  listing: Listing;
}
export interface AssistantReply {
  answer: string;
  suggestions: { title: string; detail: string }[];
  source: "model" | "rules";
  groundedBy?: "rules";
  model: string;
}
export interface Analytics {
  activeGrants: number; totalGrants: number; totalVolumeUsdc: number; totalTransactions: number; totalRejections: number;
  successRatePct: number | null; avgDecisionLatencyMs: number | null;
  weeklyVolume: { t: string; date: string; volumeUsdc: number }[];
  topAgentsByVolume: { name: string; volumeUsdc: number; grants: number }[];
}
export interface ProtocolOverview {
  network: { chain: "mock" | "solana"; cluster: string; programId: string; executor: string; observedAt: string };
  scope: "wallet" | "protocol";
  gates: { id: number; key: string; label: string; detail: string; reasonCodes: string[]; rejected: number }[];
  activity: {
    activeGrants: number; totalGrants: number; transactions: number; spentUnits: string;
    allowed: number; rejected: number; lastDecisionAt: string | null;
  };
}

// Wallet session. Kept in localStorage so a reload does not force another
// signature, and sent ahead of the shared key: the key says "some caller",
// a session says which wallet.
const SESSION_KEY = "redline.session";
export interface WalletSession { token: string; wallet: string; expiresAt: string }

export function loadSession(): WalletSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as WalletSession;
    if (!s?.token || !s.wallet || new Date(s.expiresAt) <= new Date()) return null;
    return s;
  } catch {
    return null; // private mode, blocked storage, or a value we did not write
  }
}

/**
 * True when this browser holds a live session for `wallet`.
 *
 * Connecting a wallet only names an address; the API cannot tell a connected
 * wallet from a typed one. Publishing, renting and reviewing all check this
 * instead, because they are the actions the server will refuse without a
 * signature — and offering a button that is going to 401 is worse than
 * offering a prompt to sign in.
 */
export function isSignedIn(wallet: string | null | undefined): boolean {
  const s = loadSession();
  return Boolean(s && wallet && s.wallet === wallet);
}

// Fired on this window whenever the session changes. `storage` events only
// reach *other* tabs, so without this a page could not react to the header's
// Sign in button until something else re-rendered it.
export const SESSION_EVENT = "redline:session";

export function storeSession(session: WalletSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* a session we cannot persist still works for this page */ }
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EVENT));
  } catch { /* non-browser test environment */ }
}

async function req<T>(path: string, init?: RequestInit, authenticated = true): Promise<T> {
  const session = authenticated ? loadSession() : null;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(authenticated && API_KEY ? { "x-redline-key": API_KEY } : {}), ...(session ? { Authorization: `Bearer ${session.token}` } : {}), ...(init?.headers ?? {}) } });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const body = await res.json() as { error?: string; details?: unknown }; if (body.error) msg = body.error; } catch { /* keep status text */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// A bounded probe of the API.
//
// The free Render service sleeps after about fifteen minutes and takes most of
// a minute to come back, which is longer than any reasonable single request.
// Callers that need to sit through that use `probeBackend` in
// ./backend-status, which owns the pacing and can report "waking" rather than
// "offline"; this stays the primitive both of them are built on.
export async function checkHealth(attempts = 3, delayMs = 700, timeoutMs = 12_000): Promise<Health> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await req<Health>("/health", { signal: AbortSignal.timeout(timeoutMs) }, false);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("API unreachable");
}

export const api = {
  health: () => req<Health>("/health"),
  policyPresets: () => req<{ version: number; presets: PolicyPreset[] }>("/policy/presets", { signal: AbortSignal.timeout(15_000) }, false),
  simulatePolicy: (input: SimulationInput) => req<SimulationResult>("/policy/simulate", { method: "POST", body: JSON.stringify(input), signal: AbortSignal.timeout(15_000) }, false),
  authNonce: (wallet: string) => req<{ nonce: string; message: string; expiresAt: string }>("/auth/nonce", { method: "POST", body: JSON.stringify({ wallet }) }),
  authVerify: (b: { wallet: string; nonce: string; signature: string }) => req<WalletSession>("/auth/verify", { method: "POST", body: JSON.stringify(b) }),
  agents: (opts?: { mine?: boolean }) => req<AgentVersion[]>(`/agents${opts?.mine ? "?mine=true" : ""}`),
  agent: (id: string) => req<AgentVersion & { listings: Listing[]; identityEnforced: boolean }>(`/agents/${id}`),
  publishAgent: (a: { name: string; version: string; strategy: string; modelRef: string; codeRef: string; config?: Record<string, unknown> }) =>
    req<{ agent: AgentVersion }>("/agents", { method: "POST", body: JSON.stringify(a) }),
  grants: () => req<Grant[]>("/grants"),
  grant: (id: string) => req<Grant>(`/grants/${id}`),
  createGrant: (b: {
    ownerWallet: string; vaultPda: string; agentVersionId: string; grantPda: string; createSignature: string; agentId: string;
    policy: { agentName: string; strategy: string; tokens: string[]; spendCapUsdc: number; maxTransactions: number; durationHours: number; cooldownMinutes: number; allowedMints: string[]; allowedDestinations: string[] };
    // True when the owner was shown a REVIEW verdict and accepted it. The API
    // recomputes the verdict itself; this only records that the human saw it.
    riskAcknowledged?: boolean;
    // The rental covering this grant, when the agent belongs to someone else.
    // The API re-checks it against the listing, the wallet and the end date.
    hireId?: string;
  }) => req<{ grant: Grant; policyHash: string; chain: string }>("/grants", { method: "POST", body: JSON.stringify(b) }),
  // Same refusals as createGrant, answered before the wallet signs anything —
  // a 402 "rent it first" is only useful while create_grant is still unsigned.
  preflightGrant: (b: {
    ownerWallet: string; agentVersionId: string; hireId?: string;
    policy: { agentName: string; strategy: string; tokens: string[]; spendCapUsdc: number; maxTransactions: number; durationHours: number; cooldownMinutes: number; allowedMints: string[]; allowedDestinations: string[] };
  }) => req<{ ok: boolean; hireId: string | null; hireEndsAt: string | null; maxDurationHours: number | null; durationHours: number; risk: { decision: string; score: number; acknowledgementRequired: boolean }; executor: string }>("/grants/preflight", { method: "POST", body: JSON.stringify(b) }),
  revoke: (id: string, signature?: string) => req<{ ok: boolean; signature: string }>(`/grants/${id}/revoke`, { method: "POST", body: JSON.stringify({ signature }) }),
  intents: (grantId: string) => req<IntentRow[]>(`/grants/${grantId}/intents`),
  previewIntent: (b: { grantId: string; mint: string; amountUnits: string; destination: string; reason?: string; nonce?: number }) =>
    req<IntentPreview>("/intents/preview", { method: "POST", body: JSON.stringify(b) }),
  // (`submitEvenIfDenied` used to be offered here; the API never read it — a
  // denied precheck is never submitted — so the type no longer promises it.)
  submitIntent: (b: { grantId: string; mint: string; amountUnits: string; destination: string; reason?: string; nonce?: number; proveOnChain?: boolean }) =>
    req<{ intentId: string; precheck: { reasonCode: string; message: string }; submitted: boolean; signature?: string; onchainSuccess?: boolean; onchainReason?: string }>("/intents", { method: "POST", body: JSON.stringify(b) }),
  startRun: (grantId: string, mode: "scripted" | "llm" = "scripted") => req<{ id: string }>("/runs", { method: "POST", body: JSON.stringify({ grantId, mode }) }),
  // Fastify rejects a JSON content-type with an empty body (400), and req()
  // always sends that header — so a bodyless POST needs an explicit `{}`.
  stopRun: (runId: string) => req<{ ok: boolean }>(`/runs/${runId}/stop`, { method: "POST", body: "{}" }),
  audit: (grantId?: string) => req<AuditRow[]>(`/audit${grantId ? `?grant=${grantId}` : ""}`),
  vault: (owner: string) => req<VaultView>(`/vaults/${owner}`),
  fundVault: (ownerWallet: string) => req<{ vaultPda: string; vaultAta: string; signature: string; balance: string }>("/devnet/fund", { method: "POST", body: JSON.stringify({ ownerWallet }) }),
  listings: () => req<Listing[]>("/listings"),
  setListingPrice: (id: string, b: { developerWallet: string; priceLamports: string }) =>
    req<Listing>(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  hires: (wallet?: string) => req<Hire[]>(`/hires${wallet ? `?wallet=${wallet}` : ""}`),
  hire: (b: { listingId: string; ownerWallet: string; durationHours: number; paymentSignature: string }) =>
    req<Hire>("/hires", { method: "POST", body: JSON.stringify(b) }),
  protocolFee: () => req<ProtocolFee>("/protocol/fee", undefined, false),
  protocolRevenue: () => req<ProtocolRevenue>("/protocol/revenue", undefined, false),
  reviews: (listingId: string) => req<{ rating: AgentRating; reviews: AgentReview[] }>(`/listings/${listingId}/reviews`),
  reviewable: (listingId: string) => req<Reviewable>(`/listings/${listingId}/reviewable`),
  submitReview: (listingId: string, b: { hireId: string; reviewerWallet: string; rating: number; comment?: string }) =>
    req<{ review: AgentReview; rating: AgentRating }>(`/listings/${listingId}/reviews`, { method: "POST", body: JSON.stringify(b) }),
  analytics: (owner?: string) => req<Analytics>(`/analytics${owner ? `?owner=${owner}` : ""}`),
  ask: (question: string, owner?: string) =>
    req<AssistantReply>("/assistant", { method: "POST", body: JSON.stringify({ question, owner }) }),
  protocolOverview: (owner?: string) => req<ProtocolOverview>(`/protocol/overview${owner ? `?owner=${encodeURIComponent(owner)}` : ""}`),
};

// Server-sent events. grantId "*" streams every grant.
//
// EventSource cannot send an Authorization header, so the session token rides
// in the query string — the API accepts it there for this one route only.
// Without it a signed-in owner's initial audit load arrived in full while every
// live event appended to it came back masked.
export function subscribeFeed(grantId: string, onEvent: (e: FeedEvent) => void): () => void {
  const session = loadSession();
  const auth = session ? `?access_token=${encodeURIComponent(session.token)}` : "";
  const es = new EventSource(`${API_URL}/grants/${encodeURIComponent(grantId)}/feed${auth}`);
  const handler = (ev: MessageEvent) => { try { onEvent(JSON.parse(ev.data) as FeedEvent); } catch { /* ignore malformed */ } };
  for (const t of ["grant.created", "grant.revoked", "run.started", "run.ended", "intent.created", "decision.precheck", "tx.confirmed", "tx.rejected", "chain.policy_decision", "chain.grant_revoked", "chain.grant_created", "chain.tx_failed", "agent.published"]) {
    es.addEventListener(t, handler as EventListener);
  }
  return () => es.close();
}

/**
 * When a grant's window closes, as an epoch-ms number.
 *
 * Prefers the grant's own `expiresAt` (mirrored from the program), then the
 * on-chain state if the caller has it, then the policy's date — that last one
 * is shared by every grant with the same policy shape, so it is only right for
 * the first grant that created the row.
 */
export const grantExpiresAt = (g: Pick<Grant, "expiresAt" | "policyVersion"> & { onchain?: OnchainGrant | null }): number =>
  g.expiresAt ? new Date(g.expiresAt).getTime()
    : g.onchain?.expiresAt ? g.onchain.expiresAt * 1000
      : new Date(g.policyVersion.expiresAt).getTime();

// Two decimals for ordinary amounts. An amount too small to survive that — the
// dashboard's own over-cap probe is a single base unit, 0.000001 — keeps enough
// digits to be seen: "0 USDC" read as though nothing had been attempted.
export const fmtUsdc = (units: string | number | bigint, decimals = 6) => {
  const value = Number(units) / 10 ** decimals;
  const tiny = value !== 0 && Math.abs(value) < 0.01;
  return value.toLocaleString("en-US", { maximumFractionDigits: tiny ? decimals : 2 });
};
export const short = (s: string, n = 4) => (s.length > n * 2 + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

// Compact relative time: "<1m", "5m", "3h", "2d". Language-neutral units so it
// reads the same under either locale; the caller translates the surrounding
// label. Returns "—" when there is no timestamp.
export function agoShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  if (ms < 60_000) return "<1m";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
