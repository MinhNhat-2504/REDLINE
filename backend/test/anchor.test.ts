import { getAddressEncoder } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { decodeEvent, decodeGrant, discriminator, encodeCreateGrant, encodeExecuteTransfer, encodeGrantForTest, errorCodeToReason, eventsFromLogs, extractCustomError, findGrantPda, findVaultPda, type GrantAccount } from "../src/chain/anchor.js";

const OWNER = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEST = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const PROGRAM = "GSWCWBuCj1ihniuZukJt85oCYo5jnaUUv558Eaa8dzbF";

describe("discriminators", () => {
  it("match Anchor's sha256 prefix convention", () => {
    // sha256("global:execute_transfer")[0..8] — stable, independently checkable
    expect(Buffer.from(discriminator("global", "execute_transfer")).toString("hex")).toHaveLength(16);
    expect(discriminator("global", "init_vault")).not.toEqual(discriminator("global", "revoke_grant"));
    expect(discriminator("event", "PolicyDecision")).not.toEqual(discriminator("account", "PolicyDecision"));
  });
});

describe("instruction encoding", () => {
  it("execute_transfer = 8 disc + u64 nonce + u64 amount, little-endian", () => {
    const d = encodeExecuteTransfer(3n, 600_000_000n);
    expect(d).toHaveLength(24);
    expect(new DataView(d.buffer, d.byteOffset).getBigUint64(8, true)).toBe(3n);
    expect(new DataView(d.buffer, d.byteOffset).getBigUint64(16, true)).toBe(600_000_000n);
  });
  it("create_grant serialises vectors with u32 length prefix", () => {
    const d = encodeCreateGrant({
      agentId: new Uint8Array(16).fill(7), policyHash: new Uint8Array(32).fill(9),
      spendCapUnits: 500_000_000n, maxTransactions: 5, expiresAt: 1_800_000_000n, cooldownSeconds: 60n,
      allowedMints: [USDC], allowedDestinations: [DEST, OWNER],
    });
    // 8 + 16 + 32 + 8 + 4 + 8 + 8 + (4+32) + (4+64)
    expect(d).toHaveLength(8 + 16 + 32 + 8 + 4 + 8 + 8 + 36 + 68);
    expect(() => encodeCreateGrant({ agentId: new Uint8Array(15), policyHash: new Uint8Array(32), spendCapUnits: 1n, maxTransactions: 1, expiresAt: 1n, cooldownSeconds: 0n, allowedMints: [], allowedDestinations: [] })).toThrow();
  });
});

describe("Grant account codec", () => {
  it("round-trips the exact struct layout", () => {
    const g: GrantAccount = {
      grantPda: "GrantPda", owner: OWNER, vault: DEST, executor: USDC,
      agentId: new Uint8Array(16).fill(1), policyHash: new Uint8Array(32).fill(2),
      spendCapUnits: 500_000_000n, spentUnits: 300_000_000n, maxTransactions: 5, transactionCount: 3, nextNonce: 3,
      createdAt: 1_700_000_000, expiresAt: 1_800_000_000, cooldownSeconds: 60, lastExecutionAt: 1_700_000_100,
      active: true, bump: 254, allowedMints: [USDC], allowedDestinations: [DEST, OWNER],
    };
    const decoded = decodeGrant(encodeGrantForTest(g), "GrantPda");
    expect(decoded).toEqual(g);
  });
  it("rejects a foreign account", () => {
    expect(() => decodeGrant(new Uint8Array(200), "x")).toThrow(/not a Grant/);
  });
});

describe("PDAs", () => {
  it("derive deterministically from seeds", async () => {
    const v1 = await findVaultPda(PROGRAM, OWNER);
    const v2 = await findVaultPda(PROGRAM, OWNER);
    expect(v1.address).toBe(v2.address);
    const a = await findGrantPda(PROGRAM, OWNER, new Uint8Array(16).fill(1));
    const b = await findGrantPda(PROGRAM, OWNER, new Uint8Array(16).fill(2));
    expect(a.address).not.toBe(b.address);
  });
});

describe("errors", () => {
  it("map custom codes to the same reason codes as the policy engine", () => {
    expect(errorCodeToReason(6011)).toEqual({ variant: "SpendCapExceeded", reasonCode: "SPEND_CAP_EXCEEDED" });
    expect(errorCodeToReason(6005)).toEqual({ variant: "Revoked", reasonCode: "REVOKED" });
    expect(errorCodeToReason(6012).reasonCode).toBe("COOLDOWN_ACTIVE");
    expect(errorCodeToReason(6000).reasonCode).toBeNull();
  });
  // Anchor's own framework errors share the error space with the program's.
  // A caller that treated an unmapped code as a gate reported a missing token
  // account (3012) as REVOKED, which stopped agent runs on grants nobody had
  // revoked. Anything outside 6005–6012 must decline to name a gate.
  it("refuse to map framework errors onto a policy gate", () => {
    expect(errorCodeToReason(3012)).toEqual({ variant: "Unknown(3012)", reasonCode: null });
    expect(errorCodeToReason(2001).reasonCode).toBeNull();
    expect(errorCodeToReason(0).reasonCode).toBeNull();
    expect(errorCodeToReason(6013).reasonCode).toBeNull();
  });
  it("extract the code from meta.err and from log text", () => {
    expect(extractCustomError({ InstructionError: [0, { Custom: 6011 }] })).toBe(6011);
    expect(extractCustomError("Program failed: custom program error: 0x177b")).toBe(6011);
    expect(extractCustomError(null)).toBeNull();
  });
});

describe("events", () => {
  it("decode PolicyDecision from a Program data log line", () => {
    const body = Buffer.concat([
      Buffer.from(discriminator("event", "PolicyDecision")),
      Buffer.from(getAddressEncoder().encode(OWNER)),
      Buffer.from(getAddressEncoder().encode(USDC)),
      u64(3n),
      Buffer.from(getAddressEncoder().encode(USDC)),
      Buffer.from(getAddressEncoder().encode(DEST)),
      u64(100_000_000n), u64(300_000_000n), u32(3), u64(12345n),
    ]);
    const [ev] = eventsFromLogs(["Program log: Instruction: ExecuteTransfer", `Program data: ${body.toString("base64")}`]);
    expect(ev).toMatchObject({ name: "PolicyDecision", grant: OWNER, nonce: 3n, amountUnits: 100_000_000n, spentUnits: 300_000_000n, transactionCount: 3, slot: 12345n });
    expect(decodeEvent(new Uint8Array(8))).toBeNull();
  });
});

function u64(v: bigint) { const b = Buffer.alloc(8); b.writeBigUInt64LE(v); return b; }
function u32(v: number) { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; }
