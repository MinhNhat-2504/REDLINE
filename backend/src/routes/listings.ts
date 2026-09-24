import type { FastifyInstance } from "fastify";
import type { Signature } from "@solana/kit";
import { z } from "zod";
import { getChain } from "../chain/index.js";
import { SolanaChain, withRetry } from "../chain/solana.js";
import { prisma } from "../db/client.js";
import { audit } from "../db/audit.js";
import { callerWallet, identityEnforced, requireSession, requireWallet } from "../auth.js";
import { json } from "./json.js";
import { hireStatsByListing, isLiveHire, listingStats, volumeByListing } from "./market-stats.js";
import { emptyRating, invalidateRatings, ratingsForListings } from "./ratings.js";
import { checkPaymentLegs, feeConfigFromEnv, splitRental, type RentalSplit } from "../protocol-fee.js";

// Real marketplace: a listing is the (already-existing) default AgentListing
// row created when an agent is published. Hiring is a plain wallet-signed SOL
// transfer to the developer's wallet — no escrow program, so nothing new had
// to be added to the deployed Anchor program. On CHAIN=solana the payment
// transaction is fetched from Devnet and checked before the hire is recorded;
// on CHAIN=mock (no real RPC) the signature is trusted, matching how the rest
// of the mock adapter treats owner-signed instructions.
//
// Returns the lamports the payee actually received, so the record says what
// was paid rather than what was owed.
/**
 * Check that one transaction paid both the publisher and the protocol.
 *
 * The two transfers ride in a single wallet-signed transaction, so there is
 * no state where the publisher was paid and the fee was not — the renter
 * signs both or neither. Verifying them together here is what makes that
 * atomicity worth anything: checking only the publisher leg would let a
 * hand-built transaction skip the fee and still register the rental.
 */
async function verifyPayment(signature: string, payer: string, split: RentalSplit, payee: string): Promise<{ publisher: bigint; protocol: bigint }> {
  const chain = getChain();
  // mock: nothing to verify against, so take the split at face value
  if (!(chain instanceof SolanaChain)) return { publisher: split.publisherLamports, protocol: split.protocolLamports };
  // The wallet's send resolves when *its* RPC sees the transaction; ours can
  // trail it by a slot or two, and the public endpoint by more. A payment
  // that is not visible yet is not a payment that failed — and the SOL has
  // already left the renter's wallet, so failing fast here left them paid up
  // with nothing to show for it and no way to retry except paying again.
  let tx: Awaited<ReturnType<ReturnType<typeof chain.rpc.getTransaction>["send"]>> = null;
  for (let attempt = 0; attempt < 12 && !tx; attempt += 1) {
    tx = await withRetry(() => chain.rpc.getTransaction(signature as Signature, { commitment: "confirmed", encoding: "json", maxSupportedTransactionVersion: 0 }).send(), "getTransaction");
    if (!tx && attempt < 11) await new Promise(r => setTimeout(r, 2_500));
  }
  if (!tx) throw new Error("payment transaction not found on Devnet after 30s — if your wallet shows it confirmed, wait a moment and rent again with the same signature");
  if (tx.meta?.err) throw new Error(`payment transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`);
  const keys = tx.transaction.message.accountKeys as unknown as string[];
  const pre = (tx.meta?.preBalances ?? []).map(v => BigInt(v));
  const post = (tx.meta?.postBalances ?? []).map(v => BigInt(v));
  return checkPaymentLegs(keys, pre, post, payer, payee, split);
}

export async function listingRoutes(app: FastifyInstance) {
  // The rate and the destination the renter is about to pay. Served rather
  // than bundled: a fee baked into the dashboard build would drift from the
  // one the API enforces, and the wallet would sign a payment the server
  // then rejects.
  app.get("/protocol/fee", async () => {
    const config = feeConfigFromEnv();
    return { treasury: config.treasury, feeBps: config.feeBps, enabled: Boolean(config.treasury && config.feeBps > 0) };
  });

  // Real listings — the ones auto-created by POST /agents, enriched with hire
  // stats so the marketplace can show real demand: active hires, all-time
  // count, 24h count, and total lamports paid. The volume figure is summed
  // from the `listing.hired` audit events, the one place the exact amount paid
  // at hire time is written down.
  app.get("/listings", async (req) => {
    const [listings, hiredEvents] = await Promise.all([
      prisma.agentListing.findMany({
        where: { status: "active" },
        include: { agentVersion: true, hires: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditEvent.findMany({ where: { eventType: "listing.hired" }, select: { payload: true } }),
    ]);
    const volumes = volumeByListing(hiredEvents);
    const counts = hireStatsByListing(listings.flatMap(l => l.hires));
    const ratings = await ratingsForListings(listings.map(l => l.id));
    const caller = callerWallet(req);
    return json(listings.map(l => ({
      ...l,
      hires: undefined,
      // Live means "the term has not ended", not "the status column still
      // says active" — nothing ever updates that column.
      activeHires: l.hires.filter(h => isLiveHire(h)).length,
      // Who published the build, and whether that is the person looking. The
      // marketplace used to render every listing identically, so an operator
      // could not tell their own agent from a stranger's.
      publisherWallet: l.agentVersion.publisherWallet,
      isMine: Boolean(caller && l.agentVersion.publisherWallet === caller),
      // True once this wallet has rented it, which is what unlocks reviewing.
      hiredByMe: Boolean(caller && l.hires.some(h => h.ownerWallet === caller)),
      rentedByMeNow: Boolean(caller && l.hires.some(h => h.ownerWallet === caller && isLiveHire(h))),
      rating: ratings.get(l.id) ?? emptyRating(),
      ...listingStats(l.id, volumes, counts),
    })));
  });

  // A publisher claims their listing by setting a price and the wallet that
  // should receive rental payments.
  //
  // The payout wallet must be one the caller has signed in with, so a listing
  // can only be claimed by someone holding that key. The write-once rule stays
  // underneath it: once claimed, later calls may only change the price, and
  // only from the same wallet.
  app.patch("/listings/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      developerWallet: z.string().min(32).max(44),
      priceLamports: z.coerce.bigint().min(0n),
    }).parse(req.body);
    const listing = await prisma.agentListing.findUnique({ where: { id }, include: { agentVersion: true } });
    if (!listing) return reply.code(404).send({ error: "listing not found" });
    requireWallet(req, body.developerWallet);
    // The build's publisher is the only wallet that may put it up for rent.
    // Without this a stranger could price someone else's agent and point the
    // payouts at their own wallet — the listing row was the only thing being
    // checked, and on an unclaimed listing that check passed for anyone.
    const publisher = listing.agentVersion.publisherWallet;
    // A build with no recorded publisher cannot be priced by anyone: the
    // inputs to its hash are visible in the listing, so "first signed-in
    // caller wins" would let a stranger reconstruct and take it. Republish
    // the build from the owning wallet to get a claimable listing.
    if (!publisher) {
      return reply.code(403).send({ error: "this build was published before ownership was recorded; republish it from your wallet to offer it for rent" });
    }
    if (publisher !== body.developerWallet) {
      return reply.code(403).send({ error: "only the wallet that published this agent can offer it for rent" });
    }
    if (listing.developerWallet && listing.developerWallet !== body.developerWallet) {
      return reply.code(403).send({ error: "this listing is already claimed by another wallet" });
    }
    const updated = await prisma.agentListing.update({ where: { id }, data: body });
    return json(updated);
  });

  // Rentals are scoped to the caller. Reading them used to need only a wallet
  // address in the query string, which is public information — anyone could
  // enumerate what any treasury had rented and when.
  // What the take rate has actually collected, from the rental rows that
  // recorded it. Public on purpose: a marketplace that charges a fee should be
  // willing to show what it charged, and every figure here is one an auditor
  // can re-derive from the payment signatures beside it.
  app.get("/protocol/revenue", async () => {
    const config = feeConfigFromEnv();
    const hires = await prisma.hireAgreement.findMany({
      where: { protocolFeeLamports: { gt: 0n } },
      include: { listing: { include: { agentVersion: { select: { name: true, version: true } } } } },
      orderBy: { startsAt: "desc" },
      take: 200,
    });
    const totalFee = hires.reduce((sum, h) => sum + h.protocolFeeLamports, 0n);
    const totalVolume = hires.reduce((sum, h) => sum + h.paidLamports, 0n);
    const dayAgo = new Date(Date.now() - 86_400_000);
    return json({
      feeBps: config.feeBps,
      treasury: config.treasury,
      enabled: Boolean(config.treasury && config.feeBps > 0),
      // Rentals that predate the fee are counted in neither figure; they paid
      // none, and folding them in would understate the rate going forward.
      rentalsCharged: hires.length,
      grossVolumeLamports: totalVolume.toString(),
      protocolRevenueLamports: totalFee.toString(),
      revenue24hLamports: hires.filter(h => h.startsAt >= dayAgo).reduce((sum, h) => sum + h.protocolFeeLamports, 0n).toString(),
      recent: hires.slice(0, 20).map(h => ({
        hireId: h.id,
        agent: `${h.listing.agentVersion.name} ${h.listing.agentVersion.version}`,
        at: h.startsAt,
        paidLamports: h.paidLamports.toString(),
        publisherLamports: h.publisherLamports.toString(),
        protocolFeeLamports: h.protocolFeeLamports.toString(),
        feeBps: h.protocolFeeBps,
        signature: h.paymentSignature,
      })),
    });
  });

  app.get("/hires", async (req, reply) => {
    const { wallet } = req.query as { wallet?: string };
    const caller = callerWallet(req);
    if (identityEnforced()) {
      if (!caller) return reply.code(401).send({ error: "Sign in with your wallet to see rentals" });
      if (wallet && wallet !== caller) return reply.code(403).send({ error: "you can only list your own rentals" });
    }
    const scope = identityEnforced() ? caller! : wallet;
    const hires = await prisma.hireAgreement.findMany({
      where: scope ? { ownerWallet: scope } : undefined,
      include: { listing: { include: { agentVersion: true } }, review: true },
      orderBy: { startsAt: "desc" },
    });
    return json(hires);
  });

  app.post("/hires", async (req, reply) => {
    const body = z.object({
      listingId: z.string().min(1),
      ownerWallet: z.string().min(32).max(44),
      durationHours: z.number().int().min(1).max(24 * 30),
      paymentSignature: z.string().min(1),
    }).parse(req.body);

    // Paying for a rental in someone else's name is not a thing. The payment
    // signature is checked against `ownerWallet` further down, but on a mock
    // adapter that check is a no-op, and even on Solana this stops a caller
    // recording a hire for a wallet that never asked for one.
    requireWallet(req, body.ownerWallet);

    const listing = await prisma.agentListing.findUnique({ where: { id: body.listingId } });
    if (!listing) return reply.code(404).send({ error: "listing not found" });
    // Listings are auto-created at price 0 when an agent is published; that
    // means "not offered yet", not "free". The publisher opts in by setting a
    // payout wallet and a price.
    if (!listing.developerWallet || listing.priceLamports <= 0n) {
      return reply.code(400).send({ error: "this listing is not offered for rent — the publisher has not set a price" });
    }

    // One payment funds one hire. The unique index on paymentSignature is the
    // real guard (two racing requests both pass this check); it just lets the
    // common case answer with something clearer than a constraint violation.
    if (await prisma.hireAgreement.findUnique({ where: { paymentSignature: body.paymentSignature } })) {
      return reply.code(409).send({ error: "that payment signature has already been used for a hire" });
    }

    // The listing price is a 24h rate, so a longer hire has to pay for every
    // period it covers — otherwise one day's payment would buy thirty.
    const periods = BigInt(Math.ceil(body.durationHours / 24));
    const required = listing.priceLamports * periods;
    // The advertised price is what the renter pays; the fee comes out of it.
    const split = splitRental(required, feeConfigFromEnv(), listing.developerWallet);
    let credited = { publisher: split.publisherLamports, protocol: split.protocolLamports };
    try {
      credited = await verifyPayment(body.paymentSignature, body.ownerWallet, split, listing.developerWallet);
    } catch (err) {
      // A payment that does not check out is the caller's problem, not a
      // server fault — 400 so the UI can show the reason as-is.
      return reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
    }

    const hire = await prisma.hireAgreement.create({
      data: {
        listingId: listing.id,
        ownerWallet: body.ownerWallet,
        paymentSignature: body.paymentSignature,
        paidLamports: credited.publisher + credited.protocol,
        publisherLamports: credited.publisher,
        protocolFeeLamports: credited.protocol,
        protocolFeeBps: split.feeBps,
        endsAt: new Date(Date.now() + body.durationHours * 3600_000),
      },
    });
    // A rental is new evidence: it is what makes this agent's runs count
    // towards its published reliability, so the memo has to go.
    invalidateRatings([listing.agentVersionId]);
    await audit({
      actorType: "owner", actorId: body.ownerWallet, eventType: "listing.hired", subjectType: "hire", subjectId: hire.id,
      chainSignature: body.paymentSignature,
      payload: {
        listingId: listing.id, agentVersionId: listing.agentVersionId,
        rateLamportsPer24h: listing.priceLamports.toString(),
        paidLamports: (credited.publisher + credited.protocol).toString(),
        requiredLamports: required.toString(),
        publisherLamports: credited.publisher.toString(),
        protocolFeeLamports: credited.protocol.toString(),
        protocolFeeBps: split.feeBps,
        durationHours: body.durationHours,
      },
    });
    return reply.code(201).send(json(hire));
  });
}
