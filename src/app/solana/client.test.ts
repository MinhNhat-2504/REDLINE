import { describe, expect, it } from "vitest";
import { isAddressLike } from "./client";

// Guards the destination allowlist input. The point is to catch a bad paste
// before the wallet is asked to sign a policy naming an address that can never
// receive anything — not to prove the account exists.
describe("isAddressLike", () => {
  it("accepts real Devnet addresses", () => {
    for (const a of [
      "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4",
      "7XB2hFTccpjS6sgZZjr8wWnCuk6jYuXk6aYkXRHPu62q",
      "2828FT2CggMGyHUPucL8Bv16FXXGhitnMgSM3Cc6ZEye",
    ]) {
      expect(isAddressLike(a)).toBe(true);
    }
  });

  it("rejects the ways an address usually arrives broken", () => {
    const cases: [string, string][] = [
      ["", "empty"],
      ["Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3", "badly truncated"],
      ["Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4X", "too long"],
      ["  Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4  ", "untrimmed"],
      ["https://explorer.solana.com/address/Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxh", "copied explorer URL"],
      ["0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "an Ethereum address"],
    ];
    for (const [value, why] of cases) {
      expect(isAddressLike(value), why).toBe(false);
    }
  });

  it("rejects a small truncation that still looks like base58", () => {
    expect(isAddressLike("Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4Wb")).toBe(false);
  });

  it("rejects the base58 characters that do not exist", () => {
    // 0, O, I and l are excluded from the alphabet precisely because they are
    // easy to misread, so a string carrying one was mistyped or mis-OCR'd.
    for (const c of ["0", "O", "I", "l"]) {
      expect(isAddressLike(`${c}j7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4`)).toBe(false);
    }
  });
});
