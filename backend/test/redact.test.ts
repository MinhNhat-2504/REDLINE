import { describe, expect, it } from "vitest";
import { maskText, maskValue, redactAuditRow, redactPayload } from "../src/redact.js";

const WALLET = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";
const VAULT = "2QCYaJp4THkfFCFwM7pDHjvWM2cPTTD2wCiCoozRFvsc";
const SIGNATURE = "2FMhtv3C9HjXbgmRaWzU3tMABjo8TvmDPnSiUGMXiDsD4xetWaL2ahRhMAA14WY5zdH2JX7JPtQJfxoG75LWoVYw";

describe("maskValue", () => {
  it("keeps enough to recognise, not enough to harvest", () => {
    expect(maskValue(WALLET)).toBe("CjTt…tgFr");
    expect(maskValue(WALLET)).not.toContain(WALLET.slice(4, -4));
  });
  it("leaves short values alone — masking 'USDC' would only obscure evidence", () => {
    expect(maskValue("USDC")).toBe("USDC");
    expect(maskValue("SPEND_CAP")).toBe("SPEND_CAP");
  });
});

describe("maskText", () => {
  it("masks an address embedded in prose", () => {
    expect(maskText(`transfer to ${WALLET} rejected`)).toBe("transfer to CjTt…tgFr rejected");
  });
  it("masks a hex hash", () => {
    const hash = "6f69cf7ef65938a09152edd6c9c64e7b10447fa73c00817a9218a4789eef7965";
    expect(maskText(`policy ${hash}`)).toBe("policy 6f69…7965");
  });
  it("does not mangle ordinary words or numbers", () => {
    expect(maskText("SPEND_CAP_EXCEEDED at gate 6, amount 300000000")).toBe("SPEND_CAP_EXCEEDED at gate 6, amount 300000000");
  });
});

describe("redactPayload", () => {
  it("masks identity but keeps the evidence a stranger needs to verify the claim", () => {
    const out = redactPayload({
      grantId: "cmta5akez0008pl16qzvlgey3",
      ownerWallet: WALLET,
      destination: VAULT,
      amountUnits: "300000000",
      reasonCode: "SPEND_CAP_EXCEEDED",
      gate: 6,
      allow: false,
      message: "Cumulative spend would exceed the grant cap.",
    });
    // gone
    expect(out.ownerWallet).toBe("CjTt…tgFr");
    expect(out.destination).toBe("2QCY…Fvsc");
    expect(out.grantId).toBe("cmta…gey3");
    // kept — this is the product's whole claim
    expect(out.reasonCode).toBe("SPEND_CAP_EXCEEDED");
    expect(out.amountUnits).toBe("300000000");
    expect(out.gate).toBe(6);
    expect(out.allow).toBe(false);
    expect(out.message).toBe("Cumulative spend would exceed the grant cap.");
  });

  it("recurses into nested objects and arrays", () => {
    const out = redactPayload({
      limits: { spendCapUnits: "500000000", allowedDestinations: [WALLET, VAULT] },
      counters: { spentUnits: "300000000", transactionCount: 3 },
    }) as { limits: { spendCapUnits: string; allowedDestinations: string[] }; counters: { transactionCount: number } };
    expect(out.limits.allowedDestinations).toEqual(["CjTt…tgFr", "2QCY…Fvsc"]);
    expect(out.limits.spendCapUnits).toBe("500000000");
    expect(out.counters.transactionCount).toBe(3);
  });

  it("masks an unknown key that happens to hold an address", () => {
    // A payload shape nobody listed still must not leak: the fallback is to
    // scan the string, not to trust the key name.
    const out = redactPayload({ somethingNew: `paid ${WALLET}` });
    expect(out.somethingNew).toBe("paid CjTt…tgFr");
  });
});

describe("redactAuditRow", () => {
  const row = {
    id: "evt1", createdAt: new Date("2026-08-27T00:00:00Z"), actorType: "owner", actorId: WALLET,
    eventType: "tx.rejected", subjectType: "intent", subjectId: "cmtaintent0001",
    chainSignature: SIGNATURE,
    payload: { grantId: "cmtagrant0001", ownerWallet: WALLET, reasonCode: "SPEND_CAP_EXCEEDED", success: false },
  };

  it("masks the actor and the subject", () => {
    const out = redactAuditRow(row);
    expect(out.actorId).toBe("CjTt…tgFr");
    expect(out.subjectId).toBe("cmta…0001");
  });

  it("leaves the on-chain signature whole — it is the evidence, and already public", () => {
    // Truncating this would leave the assertion without the proof, which is
    // the opposite of what an audit trail is for.
    expect(redactAuditRow(row).chainSignature).toBe(SIGNATURE);
  });

  it("marks the row as redacted so a client can say so honestly", () => {
    expect(redactAuditRow(row)).toMatchObject({ redacted: true });
  });

  it("never emits the full wallet anywhere in the serialised row", () => {
    expect(JSON.stringify(redactAuditRow(row))).not.toContain(WALLET);
  });
});

describe("evidence keys are scanned too", () => {
  it("masks an address that leaks through an error string", () => {
    const out = redactPayload({ error: `transfer to ${WALLET} refused`, reasonCode: "SPEND_CAP_EXCEEDED" });
    expect(out.error).toBe("transfer to CjTt…tgFr refused");
    expect(out.reasonCode).toBe("SPEND_CAP_EXCEEDED");
  });
});
