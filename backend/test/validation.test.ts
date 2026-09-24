import { describe, expect, it } from "vitest";
import { PositiveU64StringSchema, SolanaAddressSchema } from "../src/validation.js";

describe("transaction input validation", () => {
  it("accepts real Solana public keys and rejects plausible-looking truncations", () => {
    expect(SolanaAddressSchema.safeParse("Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4").success).toBe(true);
    expect(SolanaAddressSchema.safeParse("Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4Wb").success).toBe(false);
    expect(SolanaAddressSchema.safeParse("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA").success).toBe(false);
  });

  it("accepts positive u64 values only", () => {
    for (const value of ["1", "9007199254740993", "18446744073709551615"]) {
      expect(PositiveU64StringSchema.safeParse(value).success, value).toBe(true);
    }
    for (const value of ["0", "-1", "01", "1.5", "18446744073709551616"]) {
      expect(PositiveU64StringSchema.safeParse(value).success, value).toBe(false);
    }
  });
});
