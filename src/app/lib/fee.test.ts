import { describe, expect, it } from "vitest";
import { formatFeeRate, splitRental } from "./fee";

// These cases mirror backend/test/protocol-fee.test.ts deliberately. The two
// implementations have to agree to the lamport: the wallet signs what this
// file computes, and the API rejects the rental if the amounts that landed do
// not cover what its own copy computed. A rounding difference here would take
// the renter's SOL and then refuse the rental.

const TREASURY = "RED1inETreasury11111111111111111111111111111";
const PUBLISHER = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";
const SOL = 1_000_000_000n;
const on = { treasury: TREASURY, feeBps: 1000, enabled: true };
const off = { treasury: null, feeBps: 0, enabled: false };

describe("splitRental (renter side)", () => {
  it("takes 10% out of the publisher's share, not on top of the price", () => {
    const split = splitRental(SOL, on, PUBLISHER);
    expect(split.publisherLamports).toBe(900_000_000n);
    expect(split.protocolLamports).toBe(100_000_000n);
    expect(split.publisherLamports + split.protocolLamports).toBe(SOL);
  });

  it("pays the publisher everything when the API reports no fee", () => {
    const split = splitRental(SOL, off, PUBLISHER);
    expect(split.publisherLamports).toBe(SOL);
    expect(split.protocolLamports).toBe(0n);
    expect(split.treasury).toBeNull();
  });

  it("skips the fee when the publisher is the treasury", () => {
    expect(splitRental(SOL, { ...on, treasury: PUBLISHER }, PUBLISHER).protocolLamports).toBe(0n);
  });

  it("rounds down, exactly as the API does", () => {
    // A mismatch in this direction is the dangerous one: rounding up here
    // would overpay harmlessly, rounding down there would under-pay and the
    // rental would be refused after the money moved.
    expect(splitRental(9n, on, PUBLISHER).protocolLamports).toBe(0n);
    expect(splitRental(10n, on, PUBLISHER).protocolLamports).toBe(1n);
    expect(splitRental(19n, on, PUBLISHER).protocolLamports).toBe(1n);
  });

  it("conserves every lamport at any size", () => {
    for (const total of [1n, 7n, 999n, 50_000_000n, SOL, 1234567891n, 30n * SOL]) {
      const s = splitRental(total, on, PUBLISHER);
      expect(s.publisherLamports + s.protocolLamports).toBe(total);
    }
  });

  it("treats a disabled flag as no fee even if a treasury is present", () => {
    expect(splitRental(SOL, { treasury: TREASURY, feeBps: 1000, enabled: false }, PUBLISHER).protocolLamports).toBe(0n);
  });
});

describe("formatFeeRate", () => {
  it("matches what the API formats", () => {
    expect(formatFeeRate(1000)).toBe("10%");
    expect(formatFeeRate(250)).toBe("2.50%");
  });
});
