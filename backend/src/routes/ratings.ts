import { prisma } from "../db/client.js";

// An agent's reputation has two halves, and they are kept apart on purpose.
//
//   RELIABILITY is derived from execution evidence that already exists —
//   policy decisions and the on-chain result of every transfer the agent
//   attempted. Nobody can vote it up. An agent that repeatedly proposed
//   transfers the program rejected has a low compliance rate whatever its
//   renters say, and that is the number a treasury actually cares about.
//
//   REVIEWS are what renters thought. They are gated on a paid rental (one
//   review per hire row, enforced by a unique index), so a wallet that never
//   rented the agent cannot leave one, and renting twice is the only way to
//   review twice — which costs real SOL.
//
// They are reported separately rather than blended into one number, because a
// single star count would let opinion quietly overwrite evidence.
//
// ── Why evidence is joined through the rental, not the build ──
//
// The obvious join is AgentGrant.agentVersionId: the grant already names the
// build. It is also free to farm. A publisher signs a wide-open grant over
// their own agent, runs a scripted loop moving one lamport to an allowlisted
// destination five hundred times, and lands 100% compliance having rented
// nothing and risked nothing — outranking an agent with forty arm's-length
// rentals.
//
// So published reliability counts only grants that ran under a HireAgreement:
// AgentGrant.hireId → HireAgreement.listingId → AgentListing.agentVersionId.
// Someone paid for that evidence to exist. The publisher's own runs are still
// counted, but separately and labelled, so the exclusion is visible instead of
// silent.

export interface ReviewSummary {
  count: number;
  average: number | null;      // 1..5, null when nobody has reviewed
  distribution: Record<string, number>; // "1".."5" -> count
  latestAt: string | null;
}

export interface ReliabilitySummary {
  decisions: number;           // policy decisions from rented runs only
  allowed: number;
  denied: number;
  complianceRate: number | null;   // allowed / decisions, null when no decisions
  onChainAttempts: number;
  onChainSuccesses: number;
  onChainSuccessRate: number | null;
  grants: number;              // rented grants that produced this evidence
  completedRuns: number;
  failedRuns: number;
}

export interface AgentRating {
  reviews: ReviewSummary;
  reliability: ReliabilitySummary;
  /**
   * The publisher's own runs of their own agent. Real activity, but nobody
   * paid for it, so it is reported next to the score rather than inside it.
   */
  selfTest: { grants: number; decisions: number };
  /**
   * A 0..100 headline, or null when there is not enough evidence to publish
   * one. Deliberately refuses to invent a score from nothing: an agent with no
   * rented decisions and no reviews is "unrated", not "zero" and not "five
   * stars".
   */
  score: number | null;
  /** What the score was computed from, so the UI can say so instead of implying more. */
  basis: "reliability" | "reviews" | "both" | "insufficient";
}

export const MIN_DECISIONS_FOR_SCORE = 3;

/** Empty rating — an agent nobody has rented or reviewed. */
export function emptyRating(): AgentRating {
  return {
    reviews: { count: 0, average: null, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, latestAt: null },
    reliability: { decisions: 0, allowed: 0, denied: 0, complianceRate: null, onChainAttempts: 0, onChainSuccesses: 0, onChainSuccessRate: null, grants: 0, completedRuns: 0, failedRuns: 0 },
    selfTest: { grants: 0, decisions: 0 },
    score: null,
    basis: "insufficient",
  };
}

export interface ReviewRow { rating: number; createdAt: Date }

export function summariseReviews(rows: ReviewRow[]): ReviewSummary {
  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let total = 0;
  let latest: Date | null = null;
  for (const r of rows) {
    const bucket = String(Math.min(5, Math.max(1, Math.round(r.rating))));
    distribution[bucket] += 1;
    total += r.rating;
    if (!latest || r.createdAt > latest) latest = r.createdAt;
  }
  return {
    count: rows.length,
    average: rows.length ? Number((total / rows.length).toFixed(2)) : null,
    distribution,
    latestAt: latest ? latest.toISOString() : null,
  };
}

export interface DecisionRow { allow: boolean; chainResult: string | null }
export interface RunRow { status: string }

export function summariseReliability(input: {
  decisions: DecisionRow[];
  runs: RunRow[];
  grants: number;
}): ReliabilitySummary {
  let allowed = 0;
  let denied = 0;
  let onChainAttempts = 0;
  let onChainSuccesses = 0;
  for (const d of input.decisions) {
    if (d.allow) allowed += 1; else denied += 1;
    if (d.chainResult !== null) {
      onChainAttempts += 1;
      if (d.chainResult === "success") onChainSuccesses += 1;
    }
  }
  const decisions = input.decisions.length;
  return {
    decisions,
    allowed,
    denied,
    complianceRate: decisions ? Number((allowed / decisions).toFixed(4)) : null,
    onChainAttempts,
    onChainSuccesses,
    onChainSuccessRate: onChainAttempts ? Number((onChainSuccesses / onChainAttempts).toFixed(4)) : null,
    grants: input.grants,
    completedRuns: input.runs.filter(r => r.status === "stopped").length,
    failedRuns: input.runs.filter(r => r.status === "failed").length,
  };
}

/**
 * Blend the two halves into one headline, weighted towards evidence.
 *
 * Reliability carries 70% because it cannot be gamed; reviews carry 30%.
 * A handful of decisions is not a track record, so the reliability half only
 * counts once there are MIN_DECISIONS_FOR_SCORE of them — below that the score
 * falls back to reviews alone, and with neither it stays null.
 */
export function computeScore(reviews: ReviewSummary, reliability: ReliabilitySummary): { score: number | null; basis: AgentRating["basis"] } {
  const hasReliability = reliability.decisions >= MIN_DECISIONS_FOR_SCORE && reliability.complianceRate !== null;
  const hasReviews = reviews.count > 0 && reviews.average !== null;
  if (!hasReliability && !hasReviews) return { score: null, basis: "insufficient" };

  // Compliance dominates; on-chain success is a secondary signal and is only
  // used when the agent actually reached the chain.
  const reliabilityPart = hasReliability
    ? (reliability.onChainSuccessRate === null
        ? reliability.complianceRate!
        : reliability.complianceRate! * 0.7 + reliability.onChainSuccessRate * 0.3)
    : null;
  const reviewPart = hasReviews ? (reviews.average! - 1) / 4 : null;

  if (reliabilityPart !== null && reviewPart !== null) {
    return { score: Math.round((reliabilityPart * 0.7 + reviewPart * 0.3) * 100), basis: "both" };
  }
  if (reliabilityPart !== null) return { score: Math.round(reliabilityPart * 100), basis: "reliability" };
  return { score: Math.round(reviewPart! * 100), basis: "reviews" };
}

export function buildRating(
  reviews: ReviewRow[],
  reliability: Parameters<typeof summariseReliability>[0],
  selfTest: AgentRating["selfTest"] = { grants: 0, decisions: 0 },
): AgentRating {
  const r = summariseReviews(reviews);
  const rel = summariseReliability(reliability);
  const { score, basis } = computeScore(r, rel);
  return { reviews: r, reliability: rel, selfTest, score, basis };
}

// ── database wrappers ──
//
// Both entry points funnel into the same per-agent-version aggregation, so a
// listing and the build behind it can never report different reputations.
//
// The evidence join walks every PolicyDecision for the matching grants, which
// the marketplace polls every 20 s from every open tab. A short module-level
// memo keeps that off the database without letting the number go stale enough
// to matter — and POST /hires and POST /listings/:id/reviews clear it eagerly
// so a fresh rental or review shows up at once.

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: AgentRating }>();
let clock: () => number = () => Date.now();

/** Test seam: pin the clock so TTL behaviour is assertable. */
export function setRatingClock(fn: () => number): void { clock = fn; }

/** Drop memoised ratings — call after anything that changes the evidence. */
export function invalidateRatings(versionIds?: string[]): void {
  if (!versionIds) { cache.clear(); return; }
  for (const id of versionIds) cache.delete(id);
}

const MAX_EVIDENCE_ROWS = 5_000;

async function ratingsByVersionId(versionIds: string[]): Promise<Map<string, AgentRating>> {
  const out = new Map<string, AgentRating>();
  if (!versionIds.length) return out;

  const now = clock();
  const stale: string[] = [];
  for (const id of versionIds) {
    const hit = cache.get(id);
    if (hit && now - hit.at < CACHE_TTL_MS) out.set(id, hit.value);
    else stale.push(id);
  }
  if (!stale.length) return out;

  // Rented grants only — see the note at the top of this file.
  const [rentedGrants, selfGrants, reviews] = await Promise.all([
    prisma.agentGrant.findMany({
      where: { agentVersionId: { in: stale }, hireId: { not: null } },
      select: { id: true, agentVersionId: true },
    }),
    prisma.agentGrant.findMany({
      where: { agentVersionId: { in: stale }, hireId: null },
      select: { id: true, agentVersionId: true },
    }),
    prisma.agentReview.findMany({
      where: { agentVersionId: { in: stale } },
      select: { agentVersionId: true, rating: true, createdAt: true },
    }),
  ]);

  const rentedIds = rentedGrants.map(g => g.id);
  const selfIds = selfGrants.map(g => g.id);
  const versionOfGrant = new Map([...rentedGrants, ...selfGrants].map(g => [g.id, g.agentVersionId]));
  const allIds = [...rentedIds, ...selfIds];

  const [decisions, runs] = await Promise.all([
    allIds.length
      ? prisma.policyDecision.findMany({
          where: { intent: { grantId: { in: allIds } } },
          select: { allow: true, intent: { select: { grantId: true } }, chainTx: { select: { result: true } } },
          // Deterministic window. `take` without `orderBy` lets the database
          // return whichever rows it likes, so a busy agent's score would move
          // between two identical requests. Oldest-first also means the cap
          // truncates recent history rather than sampling at random.
          orderBy: { createdAt: "asc" },
          take: MAX_EVIDENCE_ROWS,
        })
      : Promise.resolve([] as { allow: boolean; intent: { grantId: string }; chainTx: { result: string } | null }[]),
    rentedIds.length
      ? prisma.agentRun.findMany({ where: { grantId: { in: rentedIds } }, select: { grantId: true, status: true }, orderBy: { startedAt: "asc" }, take: MAX_EVIDENCE_ROWS })
      : Promise.resolve([] as { grantId: string; status: string }[]),
  ]);

  const rentedSet = new Set(rentedIds);
  for (const id of stale) {
    const mine = decisions.filter(d => versionOfGrant.get(d.intent.grantId) === id);
    const rating = buildRating(
      reviews.filter(r => r.agentVersionId === id),
      {
        decisions: mine.filter(d => rentedSet.has(d.intent.grantId)).map(d => ({ allow: d.allow, chainResult: d.chainTx?.result ?? null })),
        runs: runs.filter(r => versionOfGrant.get(r.grantId) === id).map(r => ({ status: r.status })),
        grants: rentedGrants.filter(g => g.agentVersionId === id).length,
      },
      {
        grants: selfGrants.filter(g => g.agentVersionId === id).length,
        decisions: mine.filter(d => !rentedSet.has(d.intent.grantId)).length,
      },
    );
    cache.set(id, { at: now, value: rating });
    out.set(id, rating);
  }
  return out;
}

/** Ratings keyed by AgentVersion id. */
export async function ratingsForVersions(versionIds: string[]): Promise<Map<string, AgentRating>> {
  return ratingsByVersionId([...new Set(versionIds)]);
}

/** Ratings keyed by AgentListing id, resolved through each listing's build. */
export async function ratingsForListings(listingIds: string[]): Promise<Map<string, AgentRating>> {
  const out = new Map<string, AgentRating>();
  const ids = [...new Set(listingIds)];
  if (!ids.length) return out;
  const listings = await prisma.agentListing.findMany({ where: { id: { in: ids } }, select: { id: true, agentVersionId: true } });
  const byVersion = await ratingsByVersionId([...new Set(listings.map(l => l.agentVersionId))]);
  for (const l of listings) out.set(l.id, byVersion.get(l.agentVersionId) ?? emptyRating());
  return out;
}
