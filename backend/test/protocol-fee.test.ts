import { describe, expect, it } from "vitest";
import { DEFAULT_FEE_BPS, MAX_FEE_BPS, checkPaymentLegs, feeConfigFromEnv, formatFeeRate, splitRental } from "../src/protocol-fee.js";

const TREASURY = "RED1inETreasury11111111111111111111111111111";
const PUBLISHER = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";
const SOL = 1_000_000_000n;

describe("feeConfigFromEnv", () => {
  it("charges nothing when no treasury is configured — a fork owes REDLINE nothing", () => {
    expect(feeConfigFromEnv({})).toEqual({ treasury: null, feeBps: 0 });
    expect(feeConfigFromEnv({ PROTOCOL_FEE_BPS: "1000" })).toEqual({ treasury: null, feeBps: 0 });
  });

  it("defaults to the 10% the business model has always claimed", () => {
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: TREASURY })).toEqual({ treasury: TREASURY, feeBps: DEFAULT_FEE_BPS });
  });

  it("honours an explicit rate", () => {
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: TREASURY, PROTOCOL_FEE_BPS: "250" }).feeBps).toBe(250);
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: TREASURY, PROTOCOL_FEE_BPS: "0" }).feeBps).toBe(0);
  });

  it("refuses a rake — a typo must not turn into a 90% fee", () => {
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: TREASURY, PROTOCOL_FEE_BPS: "9000" }).feeBps).toBe(DEFAULT_FEE_BPS);
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: TREASURY, PROTOCOL_FEE_BPS: String(MAX_FEE_BPS + 1) }).feeBps).toBe(DEFAULT_FEE_BPS);
  });

  it("falls back rather than throwing on nonsense", () => {
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: TREASURY, PROTOCOL_FEE_BPS: "ten percent" }).feeBps).toBe(DEFAULT_FEE_BPS);
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: TREASURY, PROTOCOL_FEE_BPS: "-5" }).feeBps).toBe(DEFAULT_FEE_BPS);
  });

  it("ignores whitespace around the treasury address", () => {
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: `  ${TREASURY}  ` }).treasury).toBe(TREASURY);
    expect(feeConfigFromEnv({ PROTOCOL_TREASURY: "   " }).treasury).toBeNull();
  });
});

describe("splitRental", () => {
  const on = { treasury: TREASURY, feeBps: DEFAULT_FEE_BPS };

  it("takes the fee out of the publisher's revenue, not on top of the price", () => {
    // The renter signs away exactly the advertised price; a surcharge would
    // make the number on the card a lie.
    const split = splitRental(SOL, on, PUBLISHER);
    expect(split.totalLamports).toBe(SOL);
    expect(split.publisherLamports + split.protocolLamports).toBe(SOL);
    expect(split.protocolLamports).toBe(100_000_000n); // 10%
    expect(split.publisherLamports).toBe(900_000_000n);
  });

  it("charges nothing when no treasury is set — today's single-transfer payment", () => {
    const split = splitRental(SOL, { treasury: null, feeBps: 0 }, PUBLISHER);
    expect(split.publisherLamports).toBe(SOL);
    expect(split.protocolLamports).toBe(0n);
    expect(split.treasury).toBeNull();
  });

  it("charges nothing when the publisher is the treasury — that revenue is fictitious", () => {
    const split = splitRental(SOL, { treasury: PUBLISHER, feeBps: DEFAULT_FEE_BPS }, PUBLISHER);
    expect(split.protocolLamports).toBe(0n);
    expect(split.publisherLamports).toBe(SOL);
  });

  it("rounds the fee down, so a rental too small to carry one costs nothing extra", () => {
    // 9 lamports at 10% is 0.9 — truncating to 0 beats explaining a 1-lamport
    // charge on a 9-lamport rental.
    expect(splitRental(9n, on, PUBLISHER).protocolLamports).toBe(0n);
    expect(splitRental(9n, on, PUBLISHER).publisherLamports).toBe(9n);
    expect(splitRental(10n, on, PUBLISHER).protocolLamports).toBe(1n);
  });

  it("never loses or invents a lamport at any size", () => {
    for (const total of [1n, 7n, 999n, 50_000_000n, SOL, 1234567891n, 30n * SOL]) {
      const s = splitRental(total, on, PUBLISHER);
      expect(s.publisherLamports + s.protocolLamports).toBe(total);
      expect(s.publisherLamports).toBeGreaterThanOrEqual(0n);
      expect(s.protocolLamports).toBeGreaterThanOrEqual(0n);
    }
  });

  it("handles a zero rental without dividing by anything", () => {
    const split = splitRental(0n, on, PUBLISHER);
    expect(split.protocolLamports).toBe(0n);
    expect(split.publisherLamports).toBe(0n);
  });
});

describe("formatFeeRate", () => {
  it("reads as a percentage a human can check against the transaction", () => {
    expect(formatFeeRate(1000)).toBe("10%");
    expect(formatFeeRate(250)).toBe("2.50%");
    expect(formatFeeRate(0)).toBe("0%");
  });
});

describe("checkPaymentLegs — the fee cannot be skipped", () => {
  const RENTER = "3vxQZz9vVMbibjDDJeFejLQVHhHd3AXgSYtTok8fHhRb";
  const on = { treasury: TREASURY, feeBps: DEFAULT_FEE_BPS };
  const split = splitRental(SOL, on, PUBLISHER); // 0.9 SOL publisher, 0.1 SOL protocol

  // One transaction, three accounts: the renter pays, the other two are credited.
  const tx = (publisherDelta: bigint, protocolDelta: bigint | null) => {
    const keys = protocolDelta === null ? [RENTER, PUBLISHER] : [RENTER, PUBLISHER, TREASURY];
    const pre = keys.map(() => 10n * SOL);
    const post = [10n * SOL - publisherDelta - (protocolDelta ?? 0n), 10n * SOL + publisherDelta];
    if (protocolDelta !== null) post.push(10n * SOL + protocolDelta);
    return { keys, pre, post };
  };

  it("accepts a payment that pays both legs", () => {
    const { keys, pre, post } = tx(900_000_000n, 100_000_000n);
    expect(checkPaymentLegs(keys, pre, post, RENTER, PUBLISHER, split)).toEqual({ publisher: 900_000_000n, protocol: 100_000_000n });
  });

  it("rejects a payment that pays the publisher in full and skips the treasury", () => {
    // The obvious dodge: hand-build a single transfer of the whole price to the
    // publisher. The publisher leg passes on its own, which is exactly why the
    // treasury leg has to be checked too.
    const { keys, pre, post } = tx(SOL, null);
    expect(() => checkPaymentLegs(keys, pre, post, RENTER, PUBLISHER, split))
      .toThrow(/does not pay it/);
  });

  it("rejects a short fee", () => {
    const { keys, pre, post } = tx(900_000_000n, 99_999_999n);
    expect(() => checkPaymentLegs(keys, pre, post, RENTER, PUBLISHER, split)).toThrow(/protocol fee received/);
  });

  it("rejects a short publisher share even when the fee is correct", () => {
    const { keys, pre, post } = tx(800_000_000n, 100_000_000n);
    expect(() => checkPaymentLegs(keys, pre, post, RENTER, PUBLISHER, split)).toThrow(/publisher received/);
  });

  it("accepts an overpayment on either leg — generosity is not fraud", () => {
    const { keys, pre, post } = tx(950_000_000n, 150_000_000n);
    expect(checkPaymentLegs(keys, pre, post, RENTER, PUBLISHER, split)).toEqual({ publisher: 950_000_000n, protocol: 150_000_000n });
  });

  it("rejects a payment signed by someone other than the renter", () => {
    const { keys, pre, post } = tx(900_000_000n, 100_000_000n);
    expect(() => checkPaymentLegs(keys, pre, post, TREASURY, PUBLISHER, split)).toThrow(/not signed by the renting wallet/);
  });

  it("needs only the publisher leg when the fee is switched off", () => {
    const free = splitRental(SOL, { treasury: null, feeBps: 0 }, PUBLISHER);
    const { keys, pre, post } = tx(SOL, null);
    expect(checkPaymentLegs(keys, pre, post, RENTER, PUBLISHER, free)).toEqual({ publisher: SOL, protocol: 0n });
  });
});
