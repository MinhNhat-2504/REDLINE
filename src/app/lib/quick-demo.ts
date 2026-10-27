import type { SimulationResult } from "./api";
/** A demo result must describe the exact example; never invent a successful result. */
export function isQuickDemoResult(value: SimulationResult, example: "allowed" | "blocked"): boolean {
  const allow = example === "allowed";
  return value?.mode === "simulation" && value.input?.policy?.spendCapUnits === "100000000" && value.input?.proposal?.amountUnits === (allow ? "20000000" : "120000000") &&
    value.steps?.length === 1 && value.steps[0]?.verdict?.allow === allow && value.steps[0]?.verdict?.reasonCode === (allow ? "OK" : "SPEND_CAP_EXCEEDED") &&
    value.summary?.remainingUnits === (allow ? "80000000" : "100000000") && value.summary.spentUnits === (allow ? "20000000" : "0");
}
