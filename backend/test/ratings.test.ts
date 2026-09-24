import { describe, expect, it } from "vitest";
import { buildRating, computeScore, emptyRating, summariseReliability, summariseReviews, MIN_DECISIONS_FOR_SCORE } from "../src/routes/ratings.js";

const at = (iso: string) => new Date(iso);

describe("summariseReviews", () => {
  it("reports nothing rather than zero when nobody has reviewed", () => {
    const s = summariseReviews([]);
    expect(s.count).toBe(0);
    expect(s.average).toBeNull();      // not 0 — an unrated agent is not a bad one
    expect(s.latestAt).toBeNull();
  });

  it("averages, buckets and dates the reviews", () => {
    const s = summariseReviews([
      { rating: 5, createdAt: at("2026-08-01T00:00:00Z") },
      { rating: 4, createdAt: at("2026-08-03T00:00:00Z") },
      { rating: 2, createdAt: at("2026-08-02T00:00:00Z") },
    ]);
    expect(s.count).toBe(3);
    expect(s.average).toBeCloseTo(3.67, 2);
    expect(s.distribution).toMatchObject({ "5": 1, "4": 1, "2": 1, "3": 0, "1": 0 });
    expect(s.latestAt).toBe("2026-08-03T00:00:00.000Z");
  });
});

describe("summariseReliability", () => {
  it("separates the policy verdict from what the chain did with it", () => {
    const r = summariseReliability({
      decisions: [
        { allow: true, chainResult: "success" },
        { allow: true, chainResult: "success" },
        { allow: true, chainResult: "failed" },   // allowed off-chain, failed on-chain
        { allow: false, chainResult: null },      // blocked before it cost anything
      ],
      runs: [{ status: "stopped" }, { status: "failed" }, { status: "running" }],
      grants: 2,
    });
    expect(r.decisions).toBe(4);
    expect(r.allowed).toBe(3);
    expect(r.denied).toBe(1);
    expect(r.complianceRate).toBeCloseTo(0.75, 4);
    expect(r.onChainAttempts).toBe(3);
    expect(r.onChainSuccesses).toBe(2);
    expect(r.onChainSuccessRate).toBeCloseTo(0.6667, 3);
    expect(r.completedRuns).toBe(1);
    expect(r.failedRuns).toBe(1);
  });

  it("reports null rates rather than dividing by zero", () => {
    const r = summariseReliability({ decisions: [], runs: [], grants: 0 });
    expect(r.complianceRate).toBeNull();
    expect(r.onChainSuccessRate).toBeNull();
  });
});

describe("computeScore", () => {
  const noReviews = summariseReviews([]);
  const fiveStars = summariseReviews([{ rating: 5, createdAt: at("2026-08-01T00:00:00Z") }]);

  it("refuses to invent a score with no evidence at all", () => {
    expect(computeScore(noReviews, summariseReliability({ decisions: [], runs: [], grants: 0 })))
      .toEqual({ score: null, basis: "insufficient" });
  });

  it("ignores a thin decision history — two runs is not a track record", () => {
    const thin = summariseReliability({ decisions: [{ allow: true, chainResult: "success" }, { allow: true, chainResult: "success" }], runs: [], grants: 1 });
    expect(thin.decisions).toBeLessThan(MIN_DECISIONS_FOR_SCORE);
    expect(computeScore(noReviews, thin)).toEqual({ score: null, basis: "insufficient" });
    // …but five stars from a real renter still says something.
    expect(computeScore(fiveStars, thin)).toMatchObject({ basis: "reviews", score: 100 });
  });

  it("scores on evidence alone when nobody has reviewed", () => {
    const clean = summariseReliability({ decisions: Array.from({ length: 5 }, () => ({ allow: true, chainResult: "success" })), runs: [], grants: 1 });
    expect(computeScore(noReviews, clean)).toEqual({ score: 100, basis: "reliability" });
  });

  it("lets evidence outweigh opinion — five stars cannot rescue a rule-breaking agent", () => {
    // Half its proposals were blocked by the policy engine.
    const sloppy = summariseReliability({
      decisions: [
        { allow: true, chainResult: "success" }, { allow: true, chainResult: "success" },
        { allow: false, chainResult: null }, { allow: false, chainResult: null },
      ],
      runs: [], grants: 1,
    });
    const { score, basis } = computeScore(fiveStars, sloppy);
    expect(basis).toBe("both");
    // 0.5 compliance * 0.7 + 1.0 on-chain * 0.3 = 0.65 reliability; then
    // 0.65 * 0.7 + 1.0 * 0.3 = 0.755 → 75 (binary floating point lands a hair
    // under the .5 boundary). Well short of what the stars alone would claim.
    expect(score).toBe(75);
    expect(score).toBeLessThan(100);
  });

  it("does not let a perfect record be dragged to zero by one angry review", () => {
    const clean = summariseReliability({ decisions: Array.from({ length: 10 }, () => ({ allow: true, chainResult: "success" })), runs: [], grants: 1 });
    const oneStar = summariseReviews([{ rating: 1, createdAt: at("2026-08-01T00:00:00Z") }]);
    const { score } = computeScore(oneStar, clean);
    expect(score).toBe(70); // 1.0 * 0.7 + 0 * 0.3
    expect(score).toBeGreaterThan(0);
  });
});

describe("buildRating", () => {
  it("assembles both halves and keeps them separately readable", () => {
    const rating = buildRating(
      [{ rating: 4, createdAt: at("2026-08-01T00:00:00Z") }],
      { decisions: Array.from({ length: 4 }, () => ({ allow: true, chainResult: "success" })), runs: [{ status: "stopped" }], grants: 1 },
    );
    expect(rating.reviews.count).toBe(1);
    expect(rating.reliability.decisions).toBe(4);
    expect(rating.basis).toBe("both");
    expect(rating.score).toBeGreaterThan(0);
  });

  it("emptyRating is unrated, not badly rated", () => {
    const e = emptyRating();
    expect(e.score).toBeNull();
    expect(e.basis).toBe("insufficient");
    expect(e.reviews.average).toBeNull();
  });
});

describe("self-test evidence is reported, not counted", () => {
  // The farm this blocks: a publisher signs a wide-open grant over their own
  // agent, loops a scripted run 500 times moving one lamport, and lands 100%
  // compliance having rented nothing. Only grants that ran under a paid rental
  // feed the published score.
  it("keeps the publisher's own runs out of the score", () => {
    const rating = buildRating(
      [],
      { decisions: [], runs: [], grants: 0 },                 // nobody rented it
      { grants: 1, decisions: 500 },                          // the publisher ran it a lot
    );
    expect(rating.score).toBeNull();
    expect(rating.basis).toBe("insufficient");
    expect(rating.reliability.decisions).toBe(0);
    // …but the activity is visible rather than silently dropped.
    expect(rating.selfTest).toEqual({ grants: 1, decisions: 500 });
  });

  it("scores an agent once someone has actually paid to run it", () => {
    const rating = buildRating(
      [],
      { decisions: Array.from({ length: 4 }, () => ({ allow: true, chainResult: "success" })), runs: [], grants: 1 },
      { grants: 2, decisions: 90 },
    );
    expect(rating.score).toBe(100);
    expect(rating.basis).toBe("reliability");
    expect(rating.reliability.decisions).toBe(4); // rented evidence only
  });
});
