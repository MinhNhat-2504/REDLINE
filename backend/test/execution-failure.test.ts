import { describe, expect, it } from "vitest";
import { executionFailure } from "../src/chain/solana.js";

// A failed execute_transfer has to say *why* without overstating what it knows.
// Only the program's own codes (6005–6012) correspond to a policy gate; the
// same error space also carries Anchor's framework errors, and treating one of
// those as a gate reported an owner decision that never happened.

const SPEND_CAP_ERR = { InstructionError: [0, { Custom: 6011 }] };
const ACCOUNT_NOT_INITIALIZED = { InstructionError: [0, { Custom: 3012 }] };

describe("executionFailure", () => {
  it("names the gate for the program's own error codes", () => {
    const r = executionFailure(SPEND_CAP_ERR, [], "sig1", 42n);
    expect(r.reasonCode).toBe("SPEND_CAP_EXCEEDED");
    expect(r.error).toBe("SpendCapExceeded (6011)");
    expect(r.success).toBe(false);
    expect(r.signature).toBe("sig1");
    expect(r.slot).toBe(42n);
  });

  it("reports a revoked grant as REVOKED only when the program said so", () => {
    expect(executionFailure({ InstructionError: [0, { Custom: 6005 }] }, [], "sig2").reasonCode).toBe("REVOKED");
  });

  // The regression: a missing vault_token_account surfaced as
  // "on-chain REJECT · REVOKED" on a grant nobody had revoked, and the agent
  // run stopped as though the owner had pulled it.
  it("does not call an Anchor framework error REVOKED", () => {
    const r = executionFailure(ACCOUNT_NOT_INITIALIZED, [], "sig3");
    expect(r.reasonCode).toBe("CHAIN_ERROR");
    expect(r.reasonCode).not.toBe("REVOKED");
  });

  it("falls back to CHAIN_ERROR when no code can be read at all", () => {
    for (const err of [{ some: "shape we do not parse" }, "plain string failure", { InstructionError: [0, "NotCustom"] }]) {
      expect(executionFailure(err, [], "sig4").reasonCode).toBe("CHAIN_ERROR");
    }
  });

  it("keeps the raw error when it cannot be mapped, so the cause is not lost", () => {
    const r = executionFailure(ACCOUNT_NOT_INITIALIZED, [], "sig5");
    expect(r.error).toContain("3012");
  });

  it("recovers the code from logs when the error object does not carry one", () => {
    const logs = ["Program log: Instruction: ExecuteTransfer", "Program Fj7 failed: custom program error: 0x177b"];
    expect(executionFailure({ unparseable: true }, logs, "sig6").reasonCode).toBe("SPEND_CAP_EXCEEDED");
  });

  it("never reports success", () => {
    for (const err of [SPEND_CAP_ERR, ACCOUNT_NOT_INITIALIZED, null, undefined]) {
      expect(executionFailure(err, [], "sig7").success).toBe(false);
    }
  });
});
