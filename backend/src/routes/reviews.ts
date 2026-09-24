import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { audit } from "../db/audit.js";
import { callerWallet, identityEnforced, requireWallet } from "../auth.js";
import { json } from "./json.js";
import { emptyRating, invalidateRatings, ratingsForListings } from "./ratings.js";

// Reviews of a rented agent.
//
// The gate is the rental, not a captcha: `hireId` must name a HireAgreement
// this wallet paid for, on this listing, that has actually started. The unique
// index on hireId does the rest — one rental, one review — so inflating a
// rating means renting again and paying again, which is exactly the cost that
// makes the number mean something.
//
// Nothing here touches the objective half of the rating; that comes from
// policy decisions and on-chain results, which a reviewer cannot reach.
const ReviewBody = z.object({
  hireId: z.string().min(1),
  reviewerWallet: z.string().min(32).max(44),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional(),
});

export async function reviewRoutes(app: FastifyInstance) {
  // Public: a stranger deciding whether to rent needs to read these.
  app.get("/listings/:id/reviews", async (req, reply) => {
    const { id } = req.params as { id: string };
    const listing = await prisma.agentListing.findUnique({ where: { id } });
    if (!listing) return reply.code(404).send({ error: "listing not found" });
    const caller = callerWallet(req);
    const reviews = await prisma.agentReview.findMany({ where: { listingId: id }, orderBy: { createdAt: "desc" }, take: 100 });
    const ratings = await ratingsForListings([id]);
    return json({
      rating: ratings.get(id) ?? emptyRating(),
      reviews: reviews.map(r => ({
        id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, updatedAt: r.updatedAt,
        reviewerWallet: r.reviewerWallet,
        isMine: Boolean(caller && r.reviewerWallet === caller),
      })),
    });
  });

  // Leaving or revising a review. Revising is deliberate: an agent can improve
  // (or degrade) over a rental, and forcing a first impression to stand
  // forever would make the score less honest, not more.
  app.post("/listings/:id/reviews", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = ReviewBody.parse(req.body);
    requireWallet(req, body.reviewerWallet);

    const listing = await prisma.agentListing.findUnique({ where: { id } });
    if (!listing) return reply.code(404).send({ error: "listing not found" });

    const hire = await prisma.hireAgreement.findUnique({ where: { id: body.hireId } });
    if (!hire || hire.listingId !== id) {
      return reply.code(400).send({ error: "that rental is not for this agent" });
    }
    if (hire.ownerWallet !== body.reviewerWallet) {
      return reply.code(403).send({ error: "that rental belongs to another wallet" });
    }
    if (hire.startsAt > new Date()) {
      return reply.code(400).send({ error: "you can review once the rental has started" });
    }

    const existing = await prisma.agentReview.findUnique({ where: { hireId: hire.id } });
    if (existing && existing.reviewerWallet !== body.reviewerWallet) {
      // Cannot happen while hires are wallet-scoped, but a stale row must not
      // become a way to overwrite someone else's words.
      return reply.code(403).send({ error: "that review belongs to another wallet" });
    }

    const review = await prisma.agentReview.upsert({
      where: { hireId: hire.id },
      update: { rating: body.rating, comment: body.comment ?? null },
      create: {
        listingId: id,
        agentVersionId: listing.agentVersionId,
        hireId: hire.id,
        reviewerWallet: body.reviewerWallet,
        rating: body.rating,
        comment: body.comment ?? null,
      },
    });

    invalidateRatings([listing.agentVersionId]);
    await audit({
      actorType: "owner", actorId: body.reviewerWallet,
      eventType: existing ? "review.updated" : "review.created",
      subjectType: "listing", subjectId: id,
      payload: { listingId: id, agentVersionId: listing.agentVersionId, hireId: hire.id, rating: body.rating, hasComment: Boolean(body.comment) },
    });

    const ratings = await ratingsForListings([id]);
    return reply.code(existing ? 200 : 201).send(json({ review, rating: ratings.get(id) ?? emptyRating() }));
  });

  // "Can I review this, and have I already?" — so the UI can show the right
  // control instead of offering a form that will be refused.
  app.get("/listings/:id/reviewable", async (req, reply) => {
    const { id } = req.params as { id: string };
    const caller = callerWallet(req);
    if (!caller) {
      return json({ canReview: false, reason: identityEnforced() ? "sign-in-required" : "no-wallet", hires: [] });
    }
    const hires = await prisma.hireAgreement.findMany({
      where: { listingId: id, ownerWallet: caller, startsAt: { lte: new Date() } },
      include: { review: true },
      orderBy: { startsAt: "desc" },
    });
    return json({
      canReview: hires.length > 0,
      reason: hires.length ? null : "no-rental",
      hires: hires.map(h => ({ id: h.id, startsAt: h.startsAt, endsAt: h.endsAt, status: h.status, reviewed: Boolean(h.review), rating: h.review?.rating ?? null })),
    });
  });
}
