import { describe, expect, it } from "vitest";
import { isOperationalQuestion, withoutModel, type Grounding } from "../src/routes/assistant.js";

// The assistant answers from a brief assembled out of the database. This is the
// half that runs when no model is configured, or when the provider is down —
// and on a free tier that is a routine Tuesday, not an edge case. It has to
// stay useful, and it has to stay inside the brief.

const base: Grounding = {
  scope: "wallet",
  grants: { active: 1, total: 3, revoked: 2, expiringWithinHours: 40 },
  spend: { spentUsdc: 200, capUsdc: 1500, transactions: 9 },
  decisions: { allowed: 9, refused: 10, byReason: { SPEND_CAP_EXCEEDED: 6, REVOKED: 4 } },
  gates: [
    { id: 1, label: "Active grant", detail: "", refusals: 4 },
    { id: 2, label: "Time window", detail: "", refusals: 0 },
    { id: 6, label: "Budget envelope", detail: "", refusals: 6 },
  ],
  reasonCodes: {},
};

describe("assistant without a model", () => {
  it("reports the figures it was given", () => {
    const { answer } = withoutModel(base, "how are my agents doing?");
    expect(answer).toContain("1 active grant");
    expect(answer).toContain("9 transfers were allowed");
    expect(answer).toContain("10 refused");
  });

  it("names the gate that stopped the most work", () => {
    expect(withoutModel(base, "why is my agent stuck?").answer).toContain("budget envelope");
  });

  it("understands a Vietnamese blocking question and answers in Vietnamese", () => {
    const reply = withoutModel(base, "Vì sao agent của tôi bị chặn và nên làm gì?");
    expect(reply.answer).toContain("bị chặn nhiều nhất tại gate 6");
    expect(reply.suggestions.some(s => s.title === "Hạn mức ngân sách đang chặn tác vụ")).toBe(true);
  });

  it("answers a budget question with the relevant recorded figures", () => {
    const { answer } = withoutModel(base, "How much of the budget did we spend?");
    expect(answer).toContain("200 of 1,500 USDC");
    expect(answer).toContain("9 transfers");
    expect(answer).toContain("Gate 6");
  });

  it("explains a named reason code directly", () => {
    const grounded = { ...base, reasonCodes: { SPEND_CAP_EXCEEDED: "The spend cap would be exceeded" } };
    const { answer } = withoutModel(grounded, "What does SPEND_CAP_EXCEEDED mean?");
    expect(answer).toContain("belongs to gate 6");
    expect(answer).toContain("The spend cap would be exceeded");
  });

  it("warns before a grant lapses, not after", () => {
    const soon = { ...base, grants: { ...base.grants, expiringWithinHours: 3 } };
    const titles = withoutModel(soon, "anything I should know?").suggestions.map(s => s.title);
    expect(titles).toContain("A grant expires soon");
    // 40h away is not news yet
    expect(withoutModel(base, "x").suggestions.map(s => s.title)).not.toContain("A grant expires soon");
  });

  it("says when nothing can move at all", () => {
    const dead = { ...base, grants: { ...base.grants, active: 0 } };
    expect(withoutModel(dead, "can my agent run?").suggestions.map(s => s.title)).toContain("No grant is live");
  });

  // The brief is the whole world. A summary that invented a figure would be
  // the exact failure this product refuses everywhere else.
  it("states no number that is not in the brief", () => {
    const { answer, suggestions } = withoutModel(base, "summarise");
    const allowed = new Set(["1", "3", "9", "10", "2", "6", "40", "24", "200", "1500"]);
    const text = `${answer} ${suggestions.map(s => `${s.title} ${s.detail}`).join(" ")}`;
    const quoted = text.slice(0, text.indexOf("(Answered from") === -1 ? undefined : text.indexOf("(Answered from"));
    for (const n of quoted.match(/\d+/g) ?? []) {
      expect(allowed, `figure ${n} is not in the brief`).toContain(n);
    }
  });
});

describe("assistant routing", () => {
  it("keeps ledger questions on the deterministic path", () => {
    expect(isOperationalQuestion("Vì sao agent của tôi bị chặn và nên làm gì?", base)).toBe(true);
    expect(isOperationalQuestion("How much budget has this grant spent?", base)).toBe(true);
    expect(isOperationalQuestion("Explain SPEND_CAP_EXCEEDED", { ...base, reasonCodes: { SPEND_CAP_EXCEEDED: "cap" } })).toBe(true);
  });

  it("allows open-ended questions to use the configured model", () => {
    expect(isOperationalQuestion("Give me a short tour of REDLINE", base)).toBe(false);
  });
});
