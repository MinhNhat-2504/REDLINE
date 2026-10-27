import { describe, expect, it } from "vitest";
import { MAX_TOKEN_UNITS, tokenUnits, withdrawalProblem } from "./token-amount";

describe("exact token amounts", () => {
  it("retains six decimals and large values without floating point rounding", () => {
    expect(tokenUnits("0.000001")).toBe(1n);
    expect(tokenUnits("9007199254.740993")).toBe(9007199254740993n);
    expect(tokenUnits("18446744073709.551615")).toBe(MAX_TOKEN_UNITS);
  });
  it.each(["", "0", "-1", "1e3", "NaN", "1.2.3", "1,5", "0.0000001", "18446744073709.551616"])("rejects invalid or out-of-range %s", text => {
    expect(() => tokenUnits(text)).toThrow();
  });
  it("requires a known balance and accepts exactly the available units", () => {
    expect(withdrawalProblem("1.000001", "1000001")).toBe("");
    expect(withdrawalProblem("1.000002", "1000001")).toContain("exceeds");
    expect(withdrawalProblem("1", null)).toContain("Refresh");
  });
});
