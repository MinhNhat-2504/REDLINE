import { describe, expect, it } from "vitest";
import { MAX_REVOKES_PER_TRANSACTION, describeStopPlan, describeStopResult, planEmergencyStop, type StoppableGrant } from "./emergency-stop";

// The point of planning before executing: the button has to be able to say what
// it is about to do. "Stop everything" is the one control nobody should press
// to find out what it means.

const grant = (id: string, revoked = false): StoppableGrant => ({ id, grantPda: `pda-${id}`, revoked });

describe("planEmergencyStop", () => {
  it("stops every active grant in a single signature when they fit", () => {
    const plan = planEmergencyStop([grant("a"), grant("b"), grant("c")]);
    expect(plan.total).toBe(3);
    expect(plan.signatures).toBe(1);
    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].map(g => g.id)).toEqual(["a", "b", "c"]);
  });

  it("leaves already-revoked grants alone", () => {
    // Revoking twice just fails on-chain, and counting them would overstate
    // what the button is doing.
    const plan = planEmergencyStop([grant("a"), grant("b", true), grant("c", true)]);
    expect(plan.total).toBe(1);
    expect(plan.skipped).toBe(2);
    expect(plan.batches[0].map(g => g.id)).toEqual(["a"]);
  });

  it("does nothing, and says so, when there is nothing active", () => {
    const plan = planEmergencyStop([grant("a", true)]);
    expect(plan.total).toBe(0);
    expect(plan.batches).toHaveLength(0);
    expect(plan.signatures).toBe(0);
    expect(describeStopPlan(plan)).toContain("nothing to stop");
  });

  it("handles an empty account", () => {
    expect(planEmergencyStop([]).total).toBe(0);
  });

  it("splits past the transaction size limit rather than building one too big", () => {
    // Guessing high costs a wallet rejection at the exact moment someone has
    // decided to stop everything.
    const many = Array.from({ length: 30 }, (_, i) => grant(`g${i}`));
    const plan = planEmergencyStop(many);
    expect(plan.total).toBe(30);
    expect(plan.signatures).toBe(3);
    expect(plan.batches.every(b => b.length <= MAX_REVOKES_PER_TRANSACTION)).toBe(true);
    expect(plan.batches.flat()).toHaveLength(30);
  });

  it("covers every active grant exactly once across the batches", () => {
    const many = Array.from({ length: 25 }, (_, i) => grant(`g${i}`, i % 5 === 0));
    const plan = planEmergencyStop(many);
    const ids = plan.batches.flat().map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(plan.total);
    expect(ids.some(id => id === "g0")).toBe(false); // g0 was already revoked
  });

  it("never builds a zero-size batch, whatever it is handed", () => {
    expect(planEmergencyStop([grant("a"), grant("b")], 0).batches.every(b => b.length > 0)).toBe(true);
  });

  it("stays well under the 1232-byte transaction cap", () => {
    // ~45 bytes per revocation leaves room for about twenty; twelve is the
    // deliberate margin.
    expect(MAX_REVOKES_PER_TRANSACTION * 45).toBeLessThan(1_000);
  });
});

describe("describeStopPlan", () => {
  it("says how many and how many prompts, in one sentence", () => {
    const one = describeStopPlan(planEmergencyStop([grant("a")]));
    expect(one).toContain("1 active grant");
    expect(one).toContain("one wallet signature");

    const many = describeStopPlan(planEmergencyStop(Array.from({ length: 20 }, (_, i) => grant(`g${i}`))));
    expect(many).toContain("20 active grants");
    expect(many).toContain("2 wallet signatures");
  });

  it("is explicit that stopping does not move money", () => {
    // The fear this control triggers is "will this do something to my funds".
    expect(describeStopPlan(planEmergencyStop([grant("a")]))).toContain("funds stay in the vault");
  });
});

describe("describeStopResult", () => {
  it("confirms plainly when everything stopped", () => {
    expect(describeStopResult({ revoked: 3, failed: 0, error: null })).toContain("Stopped 3 grants");
  });

  it("leads with what is still running when a batch failed", () => {
    // The dangerous outcome: half the grants revoked and a summary that reads
    // like success. Whoever pressed this has to know the job is not done.
    const m = describeStopResult({ revoked: 2, failed: 1, error: "User rejected the request." });
    expect(m).toContain("STILL ACTIVE");
    expect(m).toContain("User rejected the request.");
  });

  it("does not report a chain revocation the API missed as a failure", () => {
    // The program already accepted it; only the dashboard row is behind. Calling
    // that a failure would send someone back to re-sign something that is done.
    const m = describeStopResult({ revoked: 2, failed: 0, error: null, unrecorded: 1 });
    expect(m).toContain("Stopped 2 grants");
    expect(m).not.toContain("STILL ACTIVE");
    expect(m).toContain("the chain has them");
  });

  it("does not claim any success when none happened", () => {
    const m = describeStopResult({ revoked: 0, failed: 2, error: null });
    expect(m).toContain("Nothing was stopped");
    expect(m).not.toContain("Stopped 0");
  });
});

describe("Vietnamese copy", () => {
  // The toggle in the header makes these the sentences a Vietnamese owner
  // actually reads before pressing the red button, so they get the same pins.
  it("says how many, how many prompts, and that funds stay put", () => {
    const vi = describeStopPlan(planEmergencyStop([grant("a"), grant("b")]), "vi");
    expect(vi).toContain("2 grant");
    expect(vi).toContain("một chữ ký ví");
    expect(vi).toContain("vẫn nằm trong vault");
    expect(describeStopPlan(planEmergencyStop([]), "vi")).toContain("không có gì để dừng");
  });

  it("keeps the partial-failure warning loud", () => {
    const m = describeStopResult({ revoked: 1, failed: 2, error: null }, "vi");
    expect(m).toContain("VẪN ĐANG HOẠT ĐỘNG");
    expect(m).toContain("2 grant");
  });

  it("defaults to English when no language is given", () => {
    expect(describeStopPlan(planEmergencyStop([grant("a")]))).toContain("active grant");
  });
});
