import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// POST /grants on Solana used to take the caller's `grantPda` on faith: a
// signed-in wallet could register any grant account — including one another
// owner had just created — under its own name, and because every grant names
// the same server executor, then start runs that moved that owner's funds.
// The route now reads the account and checks who the program says owns it.

const ALICE = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";
const MALLORY = "3vxQZz9vVMbibjDDJeFejLQVHhHd3AXgSYtTok8fHhRb";
const EXECUTOR = "tGUK8mNoELfqns5irtov8t29YLf5fUiJdszPwAEezeM";
const ALICE_GRANT = "GrantPdaAlice1111111111111111111111111111";

const world = vi.hoisted(() => ({
  sessions: new Map<string, { wallet: string; expiresAt: Date }>(),
  onchain: new Map<string, Record<string, unknown>>(),
  created: [] as Record<string, unknown>[],
  policyHashHex: "",
  listing: null as Record<string, unknown> | null,
  hire: null as Record<string, unknown> | null,
}));

vi.mock("../src/chain/index.js", () => ({
  getChain: () => ({
    kind: "solana",
    programId: "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4",
    executorPubkey: EXECUTOR,
    readGrant: vi.fn(async (pda: string) => world.onchain.get(pda) ?? null),
    createGrant: vi.fn(async () => { throw new Error("the server must not create grants on Solana"); }),
  }),
}));

vi.mock("../src/db/client.js", () => ({
  prisma: {
    session: { findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) => world.sessions.get(where.tokenHash) ?? null) },
    authNonce: { create: vi.fn(), findUnique: vi.fn(async () => null), update: vi.fn() },
    agentVersion: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === "a1" ? { id: "a1", agentHash: "hash-a1", publisherWallet: ALICE } : null)) },
    agentListing: { findFirst: vi.fn(async () => world.listing) },
    hireAgreement: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (world.hire && world.hire.id === where.id ? world.hire : null)) },
    owner: { upsert: vi.fn(async ({ create }: { create: { wallet: string } }) => ({ id: `owner-${create.wallet.slice(0, 4)}`, wallet: create.wallet })) },
    vault: { upsert: vi.fn(async ({ create }: { create: { vaultPda: string } }) => ({ id: "vault-1", vaultPda: create.vaultPda })) },
    policyVersion: { upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({ id: "policy-1", ...create })) },
    agentGrant: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const row = { id: `grant-${world.created.length + 1}`, createdAt: new Date(), ...data }; world.created.push(row); return row; }),
    },
    auditEvent: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "evt", createdAt: new Date(), ...data })) },
  },
}));

async function build() {
  process.env.REDLINE_API_KEY = "deployed-secret";
  const { registerAuth } = await import("../src/auth.js");
  const { ZodError } = await import("zod");
  const app = Fastify({ logger: false });
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: "Invalid input", details: err.issues });
    return reply.code(err.statusCode ?? 500).send({ error: err.message });
  });
  registerAuth(app);
  await app.register((await import("../src/routes/grants.js")).grantRoutes);
  await app.ready();
  return app;
}

async function signedIn(wallet: string) {
  const { createHash } = await import("node:crypto");
  const token = `token-${wallet}`;
  world.sessions.set(createHash("sha256").update(token).digest("hex"), { wallet, expiresAt: new Date(Date.now() + 3600_000) });
  return { Authorization: `Bearer ${token}` };
}

const policy = {
  agentName: "TreasuryOps", strategy: "staged rebalance", tokens: ["USDC"],
  spendCapUsdc: 100, maxTransactions: 5, durationHours: 24, cooldownMinutes: 1,
  allowedMints: ["7g5KxUnDjxDXqAV9yxuD6mVN8CLVu4s73jLU6UpTccoY"],
  allowedDestinations: ["7XB2hFTccpjS6sgZZjr8wWnCuk6jYuXk6aYkXRHPu62q"],
};

beforeEach(async () => {
  world.sessions.clear(); world.onchain.clear(); world.created.length = 0; world.listing = null; world.hire = null;
  const { policyHash } = await import("../src/policy/canonical.js");
  world.policyHashHex = policyHash(policy);
  const nowSec = Math.floor(Date.now() / 1000);
  world.onchain.set(ALICE_GRANT, {
    grantPda: ALICE_GRANT, owner: ALICE, vault: "VaultAlice", executor: EXECUTOR,
    policyHash: new Uint8Array(Buffer.from(world.policyHashHex, "hex")),
    active: true, spentUnits: 0n, transactionCount: 0, nextNonce: 0, lastExecutionAt: 0,
    spendCapUnits: 100_000_000n, maxTransactions: 5, cooldownSeconds: 60, expiresAt: nowSec + 86_400,
    allowedMints: policy.allowedMints, allowedDestinations: policy.allowedDestinations,
  });
});
afterEach(() => { delete process.env.REDLINE_API_KEY; vi.clearAllMocks(); });

const body = (ownerWallet: string) => ({ ownerWallet, agentVersionId: "a1", grantPda: ALICE_GRANT, createSignature: "sig", agentId: "0".repeat(32), policy });

describe("registering a browser-signed grant on Solana", () => {
  it("refuses to register a grant the program says belongs to another wallet", async () => {
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants", headers: await signedIn(MALLORY), payload: body(MALLORY) });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/different wallet/);
    expect(world.created).toHaveLength(0);
    await app.close();
  });

  it("accepts the owner's own grant and records the program's expiry on the row", async () => {
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants", headers: await signedIn(ALICE), payload: body(ALICE) });
    expect(res.statusCode).toBe(201);
    expect(world.created).toHaveLength(1);
    const row = world.created[0] as { expiresAt: Date; grantPda: string };
    expect(row.grantPda).toBe(ALICE_GRANT);
    expect(row.expiresAt.getTime()).toBe((world.onchain.get(ALICE_GRANT)!.expiresAt as number) * 1000);
    await app.close();
  });

  it("refuses a grant whose executor is not this API's key", async () => {
    world.onchain.get(ALICE_GRANT)!.executor = "SomeOtherExecutor111111111111111111111111111";
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants", headers: await signedIn(ALICE), payload: body(ALICE) });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/executor/);
    await app.close();
  });

  it("refuses when the posted policy does not hash to what the grant was created with", async () => {
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants", headers: await signedIn(ALICE), payload: { ...body(ALICE), policy: { ...policy, spendCapUsdc: 999 } } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/policy hash/);
    await app.close();
  });

  it("answers 404, not 500, for an unknown agent version", async () => {
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants", headers: await signedIn(ALICE), payload: { ...body(ALICE), agentVersionId: "nope" } });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe("preflight: what POST /grants would refuse, before the wallet signs", () => {
  const PUBLISHER = "tGUK8mNoELfqns5irtov8t29YLf5fUiJdszPwAEezeM";
  const preflightBody = (ownerWallet: string, extra: Record<string, unknown> = {}) => ({ ownerWallet, agentVersionId: "a1", policy, ...extra });

  it("says 402 while create_grant is still unsigned when the agent must be rented first", async () => {
    world.listing = { id: "l1", agentVersionId: "a1", developerWallet: PUBLISHER, priceLamports: 50_000_000n };
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants/preflight", headers: await signedIn(MALLORY), payload: preflightBody(MALLORY) });
    expect(res.statusCode).toBe(402);
    expect(res.json().error).toMatch(/rent it/i);
    await app.close();
  });

  it("clamps the lifetime to what is left of the rental", async () => {
    world.listing = { id: "l1", agentVersionId: "a1", developerWallet: PUBLISHER, priceLamports: 50_000_000n };
    world.hire = { id: "h1", listingId: "l1", ownerWallet: ALICE, endsAt: new Date(Date.now() + 5 * 3_600_000 + 60_000) };
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants/preflight", headers: await signedIn(ALICE), payload: preflightBody(ALICE, { hireId: "h1" }) });
    expect(res.statusCode).toBe(200);
    const out = res.json();
    expect(out.hireId).toBe("h1");
    expect(out.maxDurationHours).toBe(5);
    expect(out.durationHours).toBe(5); // requested 24h, rental has 5h left
    await app.close();
  });

  it("leaves the requested lifetime alone when no rental applies", async () => {
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants/preflight", headers: await signedIn(ALICE), payload: preflightBody(ALICE) });
    expect(res.statusCode).toBe(200);
    expect(res.json().durationHours).toBe(24);
    expect(res.json().maxDurationHours).toBeNull();
    await app.close();
  });

  it("refuses to preflight for a wallet the caller has not signed in with", async () => {
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/grants/preflight", headers: await signedIn(MALLORY), payload: preflightBody(ALICE) });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
