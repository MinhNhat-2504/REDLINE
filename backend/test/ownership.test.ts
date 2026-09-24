import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regression tests for the reported holes:
//   "not signed in, but I can still publish and buy"
//   "cannot tell which agent belongs to which account"
//   "not signed in, but wallet paths show up in the audit log"
//
// Each one is written the way the bug was found: an anonymous request, or a
// request from the wrong wallet, against the real route handler.

const ALICE = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";
const BOB = "3vxQZz9vVMbibjDDJeFejLQVHhHd3AXgSYtTok8fHhRb";
const OPS = "tGUK8mNoELfqns5irtov8t29YLf5fUiJdszPwAEezeM";

// One mutable fixture the mocked client reads from, so each test can set the
// world up without re-mocking the module.
const db = vi.hoisted(() => ({
  sessions: new Map<string, { wallet: string; expiresAt: Date }>(),
  agentVersions: [] as Record<string, unknown>[],
  grants: [] as Record<string, unknown>[],
  auditEvents: [] as Record<string, unknown>[],
  listings: [] as Record<string, unknown>[],
  hires: [] as Record<string, unknown>[],
  reviews: [] as Record<string, unknown>[],
  created: [] as Record<string, unknown>[],
}));

const matches = (row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean => {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (k === "owner" && typeof v === "object" && v !== null) {
      const owner = row.owner as { wallet?: string } | undefined;
      if (owner?.wallet !== (v as { wallet?: string }).wallet) return false;
    } else if (v !== null && typeof v === "object" && "in" in (v as object)) {
      if (!(v as { in: unknown[] }).in.includes(row[k])) return false;
    } else if (row[k] !== v) return false;
  }
  return true;
};

vi.mock("../src/db/client.js", () => ({
  prisma: {
    session: { findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) => db.sessions.get(where.tokenHash) ?? null) },
    authNonce: { create: vi.fn(), findUnique: vi.fn(async () => null), update: vi.fn() },
    agentVersion: {
      findUnique: vi.fn(async ({ where }: { where: { agentHash_publisherWallet?: { agentHash: string; publisherWallet: string }; id?: string } }) =>
        db.agentVersions.find(a =>
          where.id ? a.id === where.id
            : a.agentHash === where.agentHash_publisherWallet?.agentHash && a.publisherWallet === where.agentHash_publisherWallet?.publisherWallet) ?? null),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => db.agentVersions.find(a => matches(a, where)) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => db.agentVersions.filter(a => matches(a, where)).map(a => ({ ...a, listings: [] }))),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const row = { id: `agent-${db.agentVersions.length + 1}`, createdAt: new Date(), ...data }; db.agentVersions.push(row); db.created.push(row); return row; }),
    },
    agentListing: {
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: { agentVersion?: boolean } }) => {
        const row = db.listings.find(l => l.id === where.id);
        if (!row) return null;
        return include?.agentVersion ? { ...row, agentVersion: db.agentVersions.find(a => a.id === row.agentVersionId) } : row;
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => db.listings.find(l => matches(l, where)) ?? null),
      findMany: vi.fn(async () => db.listings.map(l => ({ ...l, hires: [], agentVersion: db.agentVersions.find(a => a.id === l.agentVersionId) }))),
      upsert: vi.fn(async ({ where, create }: { where: { id: string }; create: Record<string, unknown> }) => {
        const found = db.listings.find(l => l.id === where.id);
        if (found) return found;
        const row = { createdAt: new Date(), priceLamports: 0n, developerWallet: null, status: "active", ...create };
        db.listings.push(row); return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = db.listings.find(l => l.id === where.id)!; Object.assign(row, data); return row;
      }),
    },
    hireAgreement: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; paymentSignature?: string } }) =>
        db.hires.find(h => (where.id ? h.id === where.id : h.paymentSignature === where.paymentSignature)) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => db.hires.filter(h => matches(h, where))),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const row = { id: `hire-${db.hires.length + 1}`, startsAt: new Date(), status: "active", ...data }; db.hires.push(row); return row; }),
    },
    agentReview: {
      findUnique: vi.fn(async ({ where }: { where: { hireId: string } }) => db.reviews.find(r => r.hireId === where.hireId) ?? null),
      findMany: vi.fn(async () => db.reviews),
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => { const row = { id: `rev-${db.reviews.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...create }; db.reviews.push(row); return row; }),
    },
    agentGrant: {
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => db.grants.filter(g => matches(g, where))),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => db.grants.find(g => g.id === where.id) ?? null),
    },
    agentRun: { findMany: vi.fn(async () => []), findUnique: vi.fn(async () => null) },
    policyDecision: { findMany: vi.fn(async () => []) },
    auditEvent: {
      findMany: vi.fn(async ({ take, orderBy }: { take?: number; orderBy?: { createdAt: string } } = {}) => {
        const rows = [...db.auditEvents];
        if (orderBy?.createdAt === "desc") rows.reverse();
        return take ? rows.slice(0, take) : rows;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "evt", createdAt: new Date(), ...data })),
    },
  },
}));

async function build(routes: "agents" | "grants" | "audit" | "listings" | "reviews", apiKey = "deployed-secret") {
  process.env.REDLINE_API_KEY = apiKey;
  const { registerAuth } = await import("../src/auth.js");
  const app = Fastify({ logger: false });
  // Same projection server.ts installs, so status codes here mean what they
  // mean in production rather than collapsing to 500.
  const { ZodError } = await import("zod");
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: "Invalid input", details: err.issues });
    return reply.code(err.statusCode ?? 500).send({ error: err.message });
  });
  registerAuth(app);
  if (routes === "agents") await app.register((await import("../src/routes/agents.js")).agentRoutes);
  if (routes === "grants") await app.register((await import("../src/routes/grants.js")).grantRoutes);
  if (routes === "audit") await app.register((await import("../src/routes/audit.js")).auditRoutes);
  if (routes === "listings") await app.register((await import("../src/routes/listings.js")).listingRoutes);
  if (routes === "reviews") await app.register((await import("../src/routes/reviews.js")).reviewRoutes);
  await app.ready();
  return app;
}

// A signed-in caller. The hook hashes the bearer token, so the fixture is
// keyed by that hash rather than by the token itself.
async function signedIn(wallet: string) {
  const { createHash } = await import("node:crypto");
  const token = `token-${wallet}`;
  db.sessions.set(createHash("sha256").update(token).digest("hex"), { wallet, expiresAt: new Date(Date.now() + 3600_000) });
  return { Authorization: `Bearer ${token}` };
}

beforeEach(() => {
  db.sessions.clear();
  db.agentVersions.length = 0; db.grants.length = 0; db.auditEvents.length = 0;
  db.listings.length = 0; db.hires.length = 0; db.reviews.length = 0; db.created.length = 0;
});
afterEach(() => { delete process.env.REDLINE_API_KEY; vi.clearAllMocks(); });

const publishBody = { name: "TreasuryOps", version: "v1.0.0", strategy: "staged rebalance", modelRef: "manual:dashboard", codeRef: "manual:TreasuryOps" };

describe("publishing an agent without signing in", () => {
  it("is refused — the shared key is not an identity", async () => {
    const app = await build("agents");
    // Exactly what the frontend bundle can do: it ships the write key.
    const res = await app.inject({ method: "POST", url: "/agents", headers: { "x-redline-key": "deployed-secret" }, payload: publishBody });
    expect(res.statusCode).toBe(401);
    expect(db.created).toHaveLength(0);
    await app.close();
  });

  it("succeeds once a wallet has signed, and records that wallet as the publisher", async () => {
    const app = await build("agents");
    const res = await app.inject({ method: "POST", url: "/agents", headers: await signedIn(ALICE), payload: publishBody });
    expect(res.statusCode).toBe(201);
    expect(res.json().agent.publisherWallet).toBe(ALICE);
    await app.close();
  });

  it("takes the publisher from the session, never from the body", async () => {
    const app = await build("agents");
    // Bob claims to be Alice in the payload. The body is not identity.
    const res = await app.inject({ method: "POST", url: "/agents", headers: await signedIn(BOB), payload: { ...publishBody, publisherWallet: ALICE } });
    expect(res.json().agent.publisherWallet).toBe(BOB);
    await app.close();
  });

  it("gives a second publisher of identical bytes their own row instead of Alice's", async () => {
    const app = await build("agents");
    const first = await app.inject({ method: "POST", url: "/agents", headers: await signedIn(ALICE), payload: publishBody });
    const second = await app.inject({ method: "POST", url: "/agents", headers: await signedIn(BOB), payload: publishBody });
    expect(first.json().agent.id).not.toBe(second.json().agent.id);
    expect(second.json().agent.publisherWallet).toBe(BOB);
    // Same build fingerprint, two owners — which is the honest answer.
    expect(first.json().agent.agentHash).toBe(second.json().agent.agentHash);
    await app.close();
  });

  it("is idempotent when the same wallet republishes the same build", async () => {
    const app = await build("agents");
    const headers = await signedIn(ALICE);
    const a = await app.inject({ method: "POST", url: "/agents", headers, payload: publishBody });
    const b = await app.inject({ method: "POST", url: "/agents", headers, payload: publishBody });
    expect(a.json().agent.id).toBe(b.json().agent.id);
    expect(b.statusCode).toBe(200); // existing, not created again
    await app.close();
  });

  it("still publishes with no key at all, so scripts/demo.sh keeps working", async () => {
    const app = await build("agents", "");
    const res = await app.inject({ method: "POST", url: "/agents", payload: publishBody });
    expect(res.statusCode).toBe(201);
    expect(res.json().agent.publisherWallet).toBeNull(); // unclaimed, not attributed to a guess
    await app.close();
  });
});

describe("telling one account's agents from another's", () => {
  beforeEach(() => {
    db.agentVersions.push(
      { id: "a1", name: "Alice bot", version: "v1", strategy: "s", agentHash: "h1", publisherWallet: ALICE, createdAt: new Date() },
      { id: "a2", name: "Bob bot", version: "v1", strategy: "s", agentHash: "h2", publisherWallet: BOB, createdAt: new Date() },
      { id: "a3", name: "Legacy bot", version: "v1", strategy: "s", agentHash: "h3", publisherWallet: null, createdAt: new Date() },
    );
  });

  it("labels each agent with its publisher and whether it is the caller's", async () => {
    const app = await build("agents");
    const rows = (await app.inject({ method: "GET", url: "/agents", headers: await signedIn(ALICE) })).json();
    expect(rows.find((r: { id: string }) => r.id === "a1")).toMatchObject({ isMine: true, publisherWallet: ALICE });
    expect(rows.find((r: { id: string }) => r.id === "a2")).toMatchObject({ isMine: false, publisherWallet: BOB });
    expect(rows.find((r: { id: string }) => r.id === "a3")).toMatchObject({ isMine: false, unclaimed: true });
    await app.close();
  });

  it("?mine=true returns only the caller's builds", async () => {
    const app = await build("agents");
    const rows = (await app.inject({ method: "GET", url: "/agents?mine=true", headers: await signedIn(BOB) })).json();
    expect(rows.map((r: { id: string }) => r.id)).toEqual(["a2"]);
    await app.close();
  });

  it("?mine=true without a session is an empty set, not everyone's", async () => {
    const app = await build("agents");
    expect((await app.inject({ method: "GET", url: "/agents?mine=true" })).json()).toEqual([]);
    await app.close();
  });
});

describe("grants belong to the wallet that made them", () => {
  beforeEach(() => {
    db.grants.push(
      { id: "g1", grantPda: "GrantPdaAlice1111111111111111111111111111", revoked: false, owner: { wallet: ALICE }, agentVersion: { id: "a1", name: "Alice bot" }, policyVersion: {}, hire: null, createdAt: new Date() },
      { id: "g2", grantPda: "GrantPdaBob11111111111111111111111111111", revoked: false, owner: { wallet: BOB }, agentVersion: { id: "a2", name: "Bob bot" }, policyVersion: {}, hire: null, createdAt: new Date() },
    );
  });

  it("does not hand an anonymous caller every owner's wallet", async () => {
    const app = await build("grants");
    const res = await app.inject({ method: "GET", url: "/grants" });
    expect(res.json()).toEqual([]);
    expect(res.body).not.toContain(ALICE);
    await app.close();
  });

  it("returns only the caller's grants", async () => {
    const app = await build("grants");
    const rows = (await app.inject({ method: "GET", url: "/grants", headers: await signedIn(ALICE) })).json();
    expect(rows.map((g: { id: string }) => g.id)).toEqual(["g1"]);
    await app.close();
  });
});

describe("the audit trail", () => {
  beforeEach(() => {
    db.auditEvents.push({
      id: "e1", createdAt: new Date(), actorType: "owner", actorId: ALICE, eventType: "tx.rejected",
      subjectType: "intent", subjectId: "intent-1", chainSignature: "2FMhtv3C9HjXbgmRaWzU3tMABjo8TvmDPnSiUGMXiDsD4xetWaL2ahRhMAA14WY5zdH2JX7JPtQJfxoG75LWoVYw",
      payload: JSON.stringify({ grantId: "g1", ownerWallet: ALICE, destination: OPS, reasonCode: "SPEND_CAP_EXCEEDED", amountUnits: "300000000" }),
    });
  });

  it("does not show a stranger the wallets behind the events", async () => {
    const app = await build("audit");
    const res = await app.inject({ method: "GET", url: "/audit" });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain(ALICE);
    expect(res.body).not.toContain(OPS);
    await app.close();
  });

  it("still shows a stranger the evidence — that is the product's claim", async () => {
    const app = await build("audit");
    const [row] = (await app.inject({ method: "GET", url: "/audit" })).json();
    expect(row.payload.reasonCode).toBe("SPEND_CAP_EXCEEDED");
    expect(row.payload.amountUnits).toBe("300000000");
    expect(row.chainSignature).toContain("2FMhtv3C9HjXbgmRaWzU3tMAB"); // verifiable on Explorer
    expect(row.redacted).toBe(true);
    await app.close();
  });

  it("refuses to be filtered by grant for an anonymous caller", async () => {
    // "Show me everything about this grant" is the enumeration being stopped.
    const app = await build("audit");
    const rows = (await app.inject({ method: "GET", url: "/audit?grant=g1" })).json();
    expect(rows.every((r: { redacted?: boolean }) => r.redacted)).toBe(true);
    await app.close();
  });

  it("shows the owner their own trail unredacted", async () => {
    db.grants.push({ id: "g1", owner: { wallet: ALICE } });
    const app = await build("audit");
    const rows = (await app.inject({ method: "GET", url: "/audit", headers: await signedIn(ALICE) })).json();
    expect(rows[0].payload.ownerWallet).toBe(ALICE);
    expect(rows[0].redacted).toBeUndefined();
    await app.close();
  });
});

describe("renting without signing in", () => {
  beforeEach(() => {
    db.agentVersions.push({ id: "a1", name: "Alice bot", agentHash: "h1", publisherWallet: ALICE });
    db.listings.push({ id: "a1-default", agentVersionId: "a1", developerWallet: ALICE, priceLamports: 50_000_000n, status: "active", termsHash: "t", createdAt: new Date() });
  });

  it("is refused with only the public write key", async () => {
    const app = await build("listings");
    const res = await app.inject({
      method: "POST", url: "/hires", headers: { "x-redline-key": "deployed-secret" },
      payload: { listingId: "a1-default", ownerWallet: BOB, durationHours: 24, paymentSignature: "sig-1" },
    });
    expect(res.statusCode).toBe(401);
    expect(db.hires).toHaveLength(0);
    await app.close();
  });

  it("is refused when the caller names someone else as the renter", async () => {
    const app = await build("listings");
    const res = await app.inject({
      method: "POST", url: "/hires", headers: await signedIn(BOB),
      payload: { listingId: "a1-default", ownerWallet: ALICE, durationHours: 24, paymentSignature: "sig-2" },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("stops a stranger pricing someone else's agent and pointing payouts at themselves", async () => {
    db.listings[0].developerWallet = null; // unclaimed listing on Alice's build
    const app = await build("listings");
    const res = await app.inject({
      method: "PATCH", url: "/listings/a1-default", headers: await signedIn(BOB),
      payload: { developerWallet: BOB, priceLamports: "1" },
    });
    expect(res.statusCode).toBe(403);
    expect(db.listings[0].developerWallet).toBeNull();
    await app.close();
  });

  it("refuses to let anyone price a build with no recorded publisher", async () => {
    // Legacy rows have publisherWallet = null. First-come-first-served here
    // would let a stranger reconstruct the hash inputs from the listing and
    // take the payouts; the only way forward is republishing from the owner.
    db.agentVersions[0].publisherWallet = null;
    db.listings[0].developerWallet = null;
    const app = await build("listings");
    const res = await app.inject({ method: "PATCH", url: "/listings/a1-default", headers: await signedIn(BOB), payload: { developerWallet: BOB, priceLamports: "1" } });
    expect(res.statusCode).toBe(403);
    expect(db.listings[0].developerWallet).toBeNull();
    await app.close();
  });

  it("lets the publisher price their own agent", async () => {
    db.listings[0].developerWallet = null;
    const app = await build("listings");
    const res = await app.inject({
      method: "PATCH", url: "/listings/a1-default", headers: await signedIn(ALICE),
      payload: { developerWallet: ALICE, priceLamports: "50000000" },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});

describe("reviews are gated on a paid rental", () => {
  beforeEach(() => {
    db.agentVersions.push({ id: "a1", name: "Alice bot", agentHash: "h1", publisherWallet: ALICE });
    db.listings.push({ id: "a1-default", agentVersionId: "a1", developerWallet: ALICE, priceLamports: 50_000_000n, status: "active", termsHash: "t", createdAt: new Date() });
    db.hires.push({ id: "hire-1", listingId: "a1-default", ownerWallet: BOB, startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 86_400_000), status: "active" });
  });

  it("refuses a review from a wallet that never rented", async () => {
    const app = await build("reviews");
    const res = await app.inject({
      method: "POST", url: "/listings/a1-default/reviews", headers: await signedIn(ALICE),
      payload: { hireId: "hire-1", reviewerWallet: ALICE, rating: 5 },
    });
    expect(res.statusCode).toBe(403);
    expect(db.reviews).toHaveLength(0);
    await app.close();
  });

  it("refuses an anonymous review outright", async () => {
    const app = await build("reviews");
    const res = await app.inject({
      method: "POST", url: "/listings/a1-default/reviews", headers: { "x-redline-key": "deployed-secret" },
      payload: { hireId: "hire-1", reviewerWallet: BOB, rating: 5 },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("accepts one from the wallet that paid for the rental", async () => {
    const app = await build("reviews");
    const res = await app.inject({
      method: "POST", url: "/listings/a1-default/reviews", headers: await signedIn(BOB),
      payload: { hireId: "hire-1", reviewerWallet: BOB, rating: 4, comment: "stayed inside the cap" },
    });
    expect(res.statusCode).toBe(201);
    expect(db.reviews[0]).toMatchObject({ rating: 4, reviewerWallet: BOB, agentVersionId: "a1" });
    await app.close();
  });

  it("rejects a rating outside 1..5", async () => {
    const app = await build("reviews");
    const res = await app.inject({
      method: "POST", url: "/listings/a1-default/reviews", headers: await signedIn(BOB),
      payload: { hireId: "hire-1", reviewerWallet: BOB, rating: 9 },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("tells the UI when a wallet has no rental to review with", async () => {
    const app = await build("reviews");
    const res = await app.inject({ method: "GET", url: "/listings/a1-default/reviewable", headers: await signedIn(ALICE) });
    expect(res.json()).toMatchObject({ canReview: false, reason: "no-rental" });
    await app.close();
  });
});

describe("local/mock mode keeps the headless demo working", () => {
  // scripts/demo.sh sends no Authorization header and no x-redline-key. Every
  // guard added here has to be a no-op when REDLINE_API_KEY is unset, or the
  // six-beat demo stops running at step one.
  beforeEach(() => {
    db.agentVersions.push({ id: "a1", name: "TreasuryOps", version: "v1", strategy: "s", agentHash: "h1", publisherWallet: null, createdAt: new Date() });
    db.grants.push({ id: "g1", grantPda: "GrantPda1", revoked: false, owner: { wallet: ALICE }, agentVersion: { id: "a1", name: "TreasuryOps" }, policyVersion: {}, hire: null, createdAt: new Date() });
    db.auditEvents.push({
      id: "e1", createdAt: new Date(), actorType: "owner", actorId: ALICE, eventType: "tx.rejected",
      subjectType: "intent", subjectId: "i1", chainSignature: "sig",
      payload: JSON.stringify({ grantId: "g1", ownerWallet: ALICE, reasonCode: "SPEND_CAP_EXCEEDED" }),
    });
  });

  it("lists every grant unscoped, the way the demo script reads its own", async () => {
    const app = await build("grants", "");
    const rows = (await app.inject({ method: "GET", url: "/grants" })).json();
    expect(rows.map((g: { id: string }) => g.id)).toEqual(["g1"]);
    await app.close();
  });

  it("prints a full, unredacted audit trail", async () => {
    const app = await build("audit", "");
    const rows = (await app.inject({ method: "GET", url: "/audit?grant=g1" })).json();
    expect(rows[0].payload.ownerWallet).toBe(ALICE);
    expect(rows[0].redacted).toBeUndefined();
    await app.close();
  });

  it("still lists agents, with every row honestly marked unclaimed", async () => {
    const app = await build("agents", "");
    const rows = (await app.inject({ method: "GET", url: "/agents" })).json();
    expect(rows[0]).toMatchObject({ unclaimed: true, isMine: false });
    await app.close();
  });
});
