import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHash, randomBytes, webcrypto } from "node:crypto";
import { getAddressEncoder } from "@solana/kit";
import type { Address } from "@solana/kit";
import { z } from "zod";
import { prisma } from "./db/client.js";
import { audit } from "./db/audit.js";

// Two ways to authorise a write.
//
// A wallet session is the real one: the owner signs a server-issued challenge,
// proving they hold the key the program already treats as the authority. That
// makes ownership checkable — see requireWallet, which is what stops one
// person claiming another's marketplace listing.
//
// The shared REDLINE_API_KEY stays as a fallback for the scripted demo and for
// headless callers. It is a drive-by guard, not authentication: it ships to a
// public frontend and anyone can read it out of the bundle. Every route that
// cares who is calling must ask for a session, not the key.

const NONCE_TTL_MS = 5 * 60_000;
const SESSION_TTL_MS = 12 * 60 * 60_000;
const PUBLIC_WRITES = new Set(["/risk-assess", "/auth/nonce", "/auth/verify", "/assistant", "/policy/simulate"]);
/** GET /grants/:id/feed — the SSE route, the only one that may carry a token in the query string. */
export const FEED_PATH = /^\/grants\/[^/]+\/feed$/;

const addressEncoder = getAddressEncoder();

export function challenge(wallet: string, nonce: string, issuedAt: Date): string {
  return [
    "REDLINE wants you to sign in with your Solana wallet.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued at: ${issuedAt.toISOString()}`,
    "",
    "Signing proves you control this wallet. It authorises no transfer and moves no funds.",
  ].join("\n");
}

// Solana addresses are raw ed25519 public keys, so the address decodes
// straight into the key material the signature has to verify against.
export async function verifySignature(wallet: string, message: string, signatureBase64: string): Promise<boolean> {
  let publicKey: Uint8Array;
  let signature: Uint8Array;
  try {
    publicKey = new Uint8Array(addressEncoder.encode(wallet as Address));
    signature = new Uint8Array(Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
  if (publicKey.length !== 32 || signature.length !== 64) return false;
  try {
    const key = await webcrypto.subtle.importKey("raw", publicKey, { name: "Ed25519" }, false, ["verify"]);
    return await webcrypto.subtle.verify({ name: "Ed25519" }, key, signature, new TextEncoder().encode(message));
  } catch {
    return false;
  }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** The wallet behind this request's session, or null when there is none. */
export function sessionWallet(req: FastifyRequest): string | null {
  return (req as FastifyRequest & { walletSession?: string }).walletSession ?? null;
}

/**
 * Assert the caller proved control of `wallet`. Routes that act on someone's
 * property call this; without it the API key alone would let any caller act as
 * anyone, which is exactly the hole that let listings be claimed by strangers.
 */
export function requireWallet(req: FastifyRequest, wallet: string): void {
  if (!identityEnforced()) return;
  const signedIn = sessionWallet(req);
  if (!signedIn) {
    throw Object.assign(new Error("Sign in with your wallet to do this"), { statusCode: 401 });
  }
  if (signedIn !== wallet) {
    throw Object.assign(new Error("That wallet is not the one you signed in with"), { statusCode: 403 });
  }
}

/**
 * True when this deployment enforces wallet identity at all.
 *
 * A deployment without REDLINE_API_KEY has declared itself local or mock:
 * writes are open by design there, `scripts/demo.sh` drives the whole six-beat
 * demo with no headers, and demanding a signature would break it for no gain.
 * Once the key is set the deployment is public, and identity is enforced.
 */
export function identityEnforced(): boolean {
  return Boolean(process.env.REDLINE_API_KEY);
}

/**
 * The wallet this request has proved control of, or null.
 *
 * Returns null — rather than throwing — in open mode, so callers can record
 * "no attributable publisher" instead of inventing one. Routes that must have
 * an identity call requireSession() instead.
 */
export function callerWallet(req: FastifyRequest): string | null {
  return sessionWallet(req);
}

/**
 * Demand a proven wallet. Use on routes where acting anonymously is
 * meaningless — publishing something others will rent, paying for a rental,
 * leaving a review. The shared key is not enough: it ships in the public
 * bundle, so "has the key" says nothing about who is calling.
 */
export function requireSession(req: FastifyRequest): string | null {
  if (!identityEnforced()) return sessionWallet(req);
  const wallet = sessionWallet(req);
  if (!wallet) {
    throw Object.assign(new Error("Sign in with your wallet to do this"), { statusCode: 401 });
  }
  return wallet;
}

/**
 * Assert the caller owns the grant they are acting on. Used by the two routes
 * that make the executor spend — starting a run and submitting an intent —
 * because the shared key is readable in the frontend bundle, and without an
 * owner check it would let anyone drive someone else's agent up to its cap.
 */
export async function requireGrantOwner(req: FastifyRequest, grantId: string): Promise<void> {
  if (!identityEnforced()) return;
  const grant = await prisma.agentGrant.findUnique({ where: { id: grantId }, include: { owner: true } });
  if (!grant) throw Object.assign(new Error("grant not found"), { statusCode: 404 });
  requireWallet(req, grant.owner.wallet);
}

export function registerAuth(app: FastifyInstance) {
  const key = process.env.REDLINE_API_KEY;

  app.post("/auth/nonce", async (req) => {
    const { wallet } = z.object({ wallet: z.string().min(32).max(44) }).parse(req.body);
    const nonce = randomBytes(24).toString("base64url");
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);
    const message = challenge(wallet, nonce, issuedAt);
    await prisma.authNonce.create({ data: { nonce, wallet, message, expiresAt } });
    return { nonce, message, expiresAt: expiresAt.toISOString() };
  });

  app.post("/auth/verify", async (req, reply) => {
    const body = z.object({
      wallet: z.string().min(32).max(44),
      nonce: z.string().min(8).max(64),
      signature: z.string().min(16).max(200),
    }).parse(req.body);

    const row = await prisma.authNonce.findUnique({ where: { nonce: body.nonce } });
    // One nonce, one wallet, one use. Keeping used rows is what turns a
    // replay into a recognisable failure instead of a silent success.
    if (!row || row.wallet !== body.wallet) return reply.code(400).send({ error: "unknown challenge" });
    if (row.usedAt) return reply.code(400).send({ error: "that challenge was already used" });
    if (row.expiresAt < new Date()) return reply.code(400).send({ error: "that challenge has expired" });

    // Predates the stored-message column: there is nothing to check the
    // signature against, and an empty string is not a substitute — signing one
    // is trivial. Refuse and let the caller ask for a fresh challenge.
    if (!row.message) return reply.code(400).send({ error: "that challenge is no longer valid — request a new one" });

    // The stored text, byte for byte — not a rebuild that could differ.
    if (!(await verifySignature(body.wallet, row.message, body.signature))) {
      return reply.code(401).send({ error: "signature does not match that wallet" });
    }

    await prisma.authNonce.update({ where: { nonce: row.nonce }, data: { usedAt: new Date() } });
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.create({ data: { tokenHash: hashToken(token), wallet: body.wallet, expiresAt } });
    await audit({
      actorType: "owner", actorId: body.wallet, eventType: "auth.signed_in", subjectType: "wallet", subjectId: body.wallet,
      payload: { expiresAt: expiresAt.toISOString() },
    });
    return { token, wallet: body.wallet, expiresAt: expiresAt.toISOString() };
  });

  app.get("/auth/me", async (req, reply) => {
    const wallet = sessionWallet(req);
    if (!wallet) return reply.code(401).send({ error: "not signed in" });
    return { wallet };
  });

  // Resolve a session on every request so routes can check ownership even on
  // reads, then apply the write guard.
  app.addHook("onRequest", async (req, reply) => {
    const path = req.url.split("?")[0];
    // These routes inspect only caller-supplied hypothetical inputs. They do
    // not need session resolution (or a database read) even for signed-in users.
    if ((req.method === "POST" && path === "/policy/simulate") ||
        ((req.method === "GET" || req.method === "HEAD") && path === "/policy/presets")) return;
    const header = req.headers.authorization;
    let token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    // The live feed is an EventSource, and the browser's EventSource cannot
    // send an Authorization header. For that one route — a GET that only ever
    // streams the caller's own audit rows — the token may travel as a query
    // parameter instead. Nowhere else: a token in a URL ends up in logs and
    // referrers, and the feed is the only route that has no other way.
    if (!token && req.method === "GET" && FEED_PATH.test(path)) {
      const q = (req.query ?? {}) as { access_token?: unknown };
      if (typeof q.access_token === "string" && q.access_token.length >= 16 && q.access_token.length <= 128) token = q.access_token;
    }
    if (token) {
      const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
      if (session && session.expiresAt > new Date()) {
        (req as FastifyRequest & { walletSession?: string }).walletSession = session.wallet;
      }
    }

    if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") return;
    if (PUBLIC_WRITES.has(path)) return;
    if (sessionWallet(req)) return;
    if (!key) return; // local/mock: writes are open, as before
    if (req.headers["x-redline-key"] !== key) {
      return reply.code(401).send({ error: "Sign in with your wallet, or send a valid x-redline-key" });
    }
  });

  if (!key) app.log.warn("REDLINE_API_KEY not set — writes without a wallet session are open (fine for local/mock)");
}
