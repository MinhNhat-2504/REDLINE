import { describe, expect, it } from "vitest";
import { hireStatsByListing, isLiveHire, listingStats, volumeByListing } from "../src/routes/market-stats.js";

const ev = (payload: Record<string, unknown>) => ({ payload: JSON.stringify(payload) });

describe("volumeByListing", () => {
  it("sums paidLamports per listing", () => {
    const v = volumeByListing([
      ev({ listingId: "a", paidLamports: "1000" }),
      ev({ listingId: "a", paidLamports: "500" }),
      ev({ listingId: "b", paidLamports: "250" }),
    ]);
    expect(v.get("a")).toBe(1500n);
    expect(v.get("b")).toBe(250n);
  });

  it("skips payloads that do not parse, name no listing, or carry no amount", () => {
    const v = volumeByListing([
      { payload: "not json" },
      ev({ paidLamports: "999" }),
      ev({ listingId: "a" }),
      ev({ listingId: "a", paidLamports: "not a number" }),
      ev({ listingId: "a", paidLamports: "100" }),
    ]);
    expect(v.get("a")).toBe(100n);
  });

  it("returns an empty map for no events", () => {
    expect(volumeByListing([]).size).toBe(0);
  });
});

describe("hireStatsByListing", () => {
  const now = new Date("2026-01-10T00:00:00Z");
  const at = (iso: string) => ({ listingId: "a", startsAt: new Date(iso) });

  it("counts all hires and only those inside the 24h window", () => {
    const s = hireStatsByListing(
      [at("2026-01-09T23:00:00Z"), at("2026-01-08T01:00:00Z"), at("2026-01-01T00:00:00Z")],
      now,
    );
    expect(s.get("a")).toEqual({
      totalHires: 3,
      hires24h: 1,
      lastHiredAt: "2026-01-09T23:00:00.000Z",
    });
  });

  it("treats a hire exactly 24h old as inside the window", () => {
    const s = hireStatsByListing([at("2026-01-09T00:00:00Z")], now);
    expect(s.get("a")?.hires24h).toBe(1);
  });

  it("keeps the latest startsAt as lastHiredAt regardless of input order", () => {
    const s = hireStatsByListing(
      [at("2026-01-05T00:00:00Z"), at("2026-01-08T00:00:00Z"), at("2026-01-02T00:00:00Z")],
      now,
    );
    expect(s.get("a")?.lastHiredAt).toBe("2026-01-08T00:00:00.000Z");
  });

  it("separates listings", () => {
    const s = hireStatsByListing(
      [{ listingId: "a", startsAt: new Date("2026-01-09T00:00:00Z") }, { listingId: "b", startsAt: new Date("2026-01-01T00:00:00Z") }],
      now,
    );
    expect(s.get("a")?.totalHires).toBe(1);
    expect(s.get("b")?.totalHires).toBe(1);
  });
});

describe("listingStats", () => {
  it("assembles a listing with no hires into zeroes", () => {
    expect(listingStats("ghost", new Map(), new Map())).toEqual({
      totalHires: 0,
      hires24h: 0,
      volumeLamports: "0",
      lastHiredAt: null,
    });
  });

  it("joins the volume and count aggregates for one listing", () => {
    const volumes = new Map([["a", 4200n]]);
    const counts = hireStatsByListing(
      [{ listingId: "a", startsAt: new Date() }],
      new Date(),
    );
    const s = listingStats("a", volumes, counts);
    expect(s.volumeLamports).toBe("4200");
    expect(s.totalHires).toBe(1);
    expect(s.hires24h).toBe(1);
    expect(s.lastHiredAt).not.toBeNull();
  });
});

describe("isLiveHire", () => {
  const now = new Date("2026-08-27T12:00:00Z");
  const at = (iso: string) => new Date(iso);

  it("treats a rental whose term has passed as over, whatever the status column says", () => {
    // HireAgreement.status defaults to "active" and nothing ever writes it
    // again, so a listing rented once last month advertised "1 active hire"
    // forever.
    expect(isLiveHire({ endsAt: at("2026-08-01T00:00:00Z"), status: "active" }, now)).toBe(false);
  });

  it("treats a rental still inside its term as live", () => {
    expect(isLiveHire({ endsAt: at("2026-08-28T00:00:00Z"), status: "active" }, now)).toBe(true);
  });

  it("honours an explicit cancellation even before the end date", () => {
    expect(isLiveHire({ endsAt: at("2026-08-28T00:00:00Z"), status: "cancelled" }, now)).toBe(false);
  });

  it("is exclusive at the boundary — a term that ends now has ended", () => {
    expect(isLiveHire({ endsAt: now, status: "active" }, now)).toBe(false);
  });
});
