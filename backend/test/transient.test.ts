import { describe, expect, it } from "vitest";
import { isTransientChainError } from "../src/chain/solana.js";

class FakeSolanaError extends Error { context: Record<string, unknown>; constructor(m: string, c: Record<string, unknown>) { super(m); this.context = c; } }

describe("isTransientChainError", () => {
  it("treats HTTP 429 as transient even when context holds BigInts", () => {
    const e = new FakeSolanaError("HTTP error (429): Too Many Requests", { statusCode: 429, slot: 488_000_000n });
    expect(isTransientChainError(e)).toBe(true);
  });
  it("does not treat a program rejection as transient", () => {
    const e = new FakeSolanaError("Transaction failed: custom program error 0x177b", { slot: 1n, err: { InstructionError: [0, { Custom: 6011 }] } });
    expect(isTransientChainError(e)).toBe(false);
  });
  it("never throws on odd inputs", () => {
    expect(isTransientChainError(null)).toBe(false);
    expect(isTransientChainError({ toString: () => { throw new Error("x"); } })).toBe(false);
  });
});
