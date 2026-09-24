import { getAddressEncoder } from "@solana/kit";
import { describe, expect, it } from "vitest";
import {
  decodeEvent, decodeSwapPolicy, discriminator, encodeCreateSwapPolicy, encodeExecuteSwap,
  encodeSwapPolicyForTest, errorCodeToReason, eventsFromLogs, findGrantPda, findSwapPolicyPda,
  type SwapPolicyAccount,
} from "../src/chain/anchor.js";

// The swap instructions are hand-encoded like the rest of the adapter, so the
// wire format needs pinning: a byte wrong here is a transaction the program
// rejects for reasons that look nothing like the cause.

const PROGRAM = "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4";
const GRANT = "So11111111111111111111111111111111111111112";
const JUPITER = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const ORCA = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

describe("encodeCreateSwapPolicy", () => {
  it("lays out disc + vec<pubkey> + u16", () => {
    const d = encodeCreateSwapPolicy([JUPITER, ORCA], 100);
    // 8 disc + (4 len + 2*32) + 2
    expect(d).toHaveLength(8 + 4 + 64 + 2);
    expect(new DataView(d.buffer, d.byteOffset).getUint16(d.length - 2, true)).toBe(100);
  });

  it("refuses an empty allowlist — that would read as 'any program'", () => {
    expect(() => encodeCreateSwapPolicy([], 100)).toThrow(/1 to 4 programs/);
  });

  it("refuses more programs than the account can hold", () => {
    expect(() => encodeCreateSwapPolicy([JUPITER, ORCA, GRANT, PROGRAM, JUPITER], 100)).toThrow();
  });

  it("refuses a tolerance of 100% or more — a zero floor is not a floor", () => {
    expect(() => encodeCreateSwapPolicy([JUPITER], 10_000)).toThrow(/below 100%/);
    expect(() => encodeCreateSwapPolicy([JUPITER], -1)).toThrow();
  });
});

describe("encodeExecuteSwap", () => {
  it("lays out disc + four u64 + a length-prefixed route payload", () => {
    const route = new Uint8Array([1, 2, 3, 4, 5]);
    const d = encodeExecuteSwap(7n, 100_000_000n, 1_000_000_000n, 990_000_000n, route);
    expect(d).toHaveLength(8 + 8 * 4 + 4 + route.length);
    const view = new DataView(d.buffer, d.byteOffset);
    expect(view.getBigUint64(8, true)).toBe(7n);            // nonce
    expect(view.getBigUint64(16, true)).toBe(100_000_000n); // amountIn
    expect(view.getBigUint64(24, true)).toBe(1_000_000_000n); // quotedOut
    expect(view.getBigUint64(32, true)).toBe(990_000_000n); // minOut
    expect(view.getUint32(40, true)).toBe(route.length);
  });

  it("passes the route payload through untouched — the program does not parse it", () => {
    const route = new Uint8Array(64).fill(0xab);
    const d = encodeExecuteSwap(0n, 1n, 2n, 1n, route);
    expect(Array.from(d.slice(44))).toEqual(Array.from(route));
  });

  it("carries an empty route without a length surprise", () => {
    expect(encodeExecuteSwap(0n, 1n, 2n, 1n, new Uint8Array())).toHaveLength(8 + 32 + 4);
  });
});

describe("SwapPolicy account codec", () => {
  it("round-trips the struct layout", () => {
    const policy: SwapPolicyAccount = {
      swapPolicyPda: "SwapPda", grant: GRANT, maxSlippageBps: 250, bump: 253,
      allowedPrograms: [JUPITER, ORCA],
    };
    expect(decodeSwapPolicy(encodeSwapPolicyForTest(policy), "SwapPda")).toEqual(policy);
  });

  it("rejects a foreign account rather than reading garbage as a policy", () => {
    expect(() => decodeSwapPolicy(new Uint8Array(120), "x")).toThrow(/not a SwapPolicy/);
  });
});

describe("PDAs", () => {
  it("derives one swap policy per grant, deterministically", async () => {
    const a = await findSwapPolicyPda(PROGRAM, GRANT);
    const b = await findSwapPolicyPda(PROGRAM, GRANT);
    expect(a.address).toBe(b.address);
    const other = await findSwapPolicyPda(PROGRAM, JUPITER);
    expect(other.address).not.toBe(a.address);
  });

  it("does not collide with the grant PDA it hangs off", async () => {
    const grant = await findGrantPda(PROGRAM, GRANT, new Uint8Array(16).fill(3));
    const swap = await findSwapPolicyPda(PROGRAM, grant.address);
    expect(swap.address).not.toBe(grant.address);
  });
});

describe("swap error codes", () => {
  it("map to the reason codes the policy engine already speaks", () => {
    expect(errorCodeToReason(6014)).toEqual({ variant: "SwapsNotEnabled", reasonCode: "SWAPS_NOT_ENABLED" });
    expect(errorCodeToReason(6015)).toEqual({ variant: "ProgramNotAllowed", reasonCode: "PROGRAM_NOT_ALLOWED" });
    expect(errorCodeToReason(6016).reasonCode).toBe("OUTPUT_MINT_NOT_ALLOWED");
    expect(errorCodeToReason(6017).reasonCode).toBe("SLIPPAGE_EXCEEDED");
  });

  it("reports a route that overspent as the spend cap being broken", () => {
    // It is the cap that was violated; that the venue did it rather than the
    // agent does not change what the owner needs to be told.
    expect(errorCodeToReason(6018)).toEqual({ variant: "InputOverspent", reasonCode: "SPEND_CAP_EXCEEDED" });
  });

  it("leaves every pre-existing code exactly where it was", () => {
    // Appending is the whole point: these numbers are in audit rows already.
    expect(errorCodeToReason(6005).variant).toBe("Revoked");
    expect(errorCodeToReason(6011).variant).toBe("SpendCapExceeded");
    expect(errorCodeToReason(6013).variant).toBe("ArithmeticOverflow");
  });
});

describe("SwapDecision event", () => {
  it("decodes measured amounts, not quoted ones", () => {
    const enc = getAddressEncoder();
    const u64 = (v: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(v); return b; };
    const u32 = (v: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; };
    const body = Buffer.concat([
      Buffer.from(discriminator("event", "SwapDecision")),
      Buffer.from(enc.encode(GRANT)), Buffer.from(enc.encode(ORCA)), u64(3n),
      Buffer.from(enc.encode(JUPITER)), Buffer.from(enc.encode(GRANT)), Buffer.from(enc.encode(ORCA)),
      u64(100_000_000n), u64(1_000_000_000n), u64(990_000_000n), u64(995_000_000n),
      u64(300_000_000n), u32(3), u64(12345n),
    ]);
    const [ev] = eventsFromLogs([`Program data: ${body.toString("base64")}`]);
    expect(ev).toMatchObject({
      name: "SwapDecision", nonce: 3n,
      amountIn: 100_000_000n, quotedOut: 1_000_000_000n, minOut: 990_000_000n, amountOut: 995_000_000n,
      transactionCount: 3, slot: 12345n,
    });
  });

  it("still returns null for something that is not one of our events", () => {
    expect(decodeEvent(new Uint8Array(8))).toBeNull();
  });
});
