import { describe, expect, it } from "vitest";
import { deriveProgress } from "./DemoGuide";
import type { AuditRow, Grant } from "../lib/api";

// The guide is only worth having if its ticks mean something. A checklist that
// advanced on a timer, or on "you visited the page", would be exactly the kind
// of decorative progress this product argues against — so each step is derived
// from records, and these tests pin what counts.

const row = (eventType: string, payload: Record<string, unknown> = {}): AuditRow => ({
  id: eventType, createdAt: "2026-09-12T00:00:00Z", actorType: "chain", eventType,
  subjectType: "grant", subjectId: "g1", chainSignature: null, payload,
});
const grant = (revoked = false) => ({ id: "g1", revoked } as unknown as Grant);

describe("deriveProgress", () => {
  it("starts with nothing done and points at signing in first", () => {
    const p = deriveProgress([], [], false);
    expect(p.completed).toBe(0);
    expect(p.steps[0].detail).toContain("Connect a Devnet wallet");
  });

  it("changes the first instruction once the visitor has signed in", () => {
    expect(deriveProgress([], [], true).steps[0].detail).toContain("Guardrails");
  });

  it("ticks 'sign a boundary' only when a grant actually exists", () => {
    expect(deriveProgress([], [], true).steps[0].done).toBe(false);
    expect(deriveProgress([grant()], [], true).steps[0].done).toBe(true);
  });

  it("ticks 'let it operate' on a real run or a real proposal", () => {
    expect(deriveProgress([grant()], [row("grant.created")], true).steps[1].done).toBe(false);
    expect(deriveProgress([grant()], [row("run.started")], true).steps[1].done).toBe(true);
    expect(deriveProgress([grant()], [row("intent.created")], true).steps[1].done).toBe(true);
  });

  it("counts only an on-chain refusal as 'the chain refused one'", () => {
    // A local precheck is the server's opinion. The claim being demonstrated is
    // that the chain decides, so only the chain's refusal may tick this box.
    const precheckOnly = deriveProgress([grant()], [row("decision.precheck", { allow: false, reasonCode: "SPEND_CAP_EXCEEDED" })], true);
    expect(precheckOnly.steps[2].done).toBe(false);

    expect(deriveProgress([grant()], [row("tx.rejected")], true).steps[2].done).toBe(true);
    expect(deriveProgress([grant()], [row("chain.tx_failed")], true).steps[2].done).toBe(true);
    expect(deriveProgress([grant()], [row("swap.reverted")], true).steps[2].done).toBe(true);
  });

  it("does not treat a confirmed transfer as a refusal", () => {
    expect(deriveProgress([grant()], [row("tx.confirmed")], true).steps[2].done).toBe(false);
  });

  it("ticks revocation from either the grant row or the event", () => {
    expect(deriveProgress([grant(true)], [], true).steps[3].done).toBe(true);
    expect(deriveProgress([grant(false)], [row("grant.revoked")], true).steps[3].done).toBe(true);
    expect(deriveProgress([grant(false)], [], true).steps[3].done).toBe(false);
  });

  it("navigates by slug, because the shell maps legacy indices through a table", () => {
    // A number here would silently mean a different page than it reads.
    const slugs = deriveProgress([], [], true).steps.map(s => s.slug);
    expect(slugs).toEqual(["guardrails", "guardrails", "guardrails", "guardrails"]);
  });

  it("counts a full run as complete", () => {
    const p = deriveProgress([grant(true)], [row("run.started"), row("tx.rejected")], true);
    expect(p.completed).toBe(4);
  });
});
