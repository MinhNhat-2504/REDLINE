import { describe, expect, it } from "vitest";
import { toBase64 } from "./signin";

// The server decodes this with Buffer.from(value, "base64") and expects
// exactly 64 bytes, so the encoding has to survive every byte value —
// including the high ones a signature is full of.
describe("toBase64", () => {
  it("round-trips an ed25519-sized signature", () => {
    const sig = new Uint8Array(64);
    for (let i = 0; i < 64; i += 1) sig[i] = (i * 7 + 13) % 256;
    const decoded = Uint8Array.from(atob(toBase64(sig)), c => c.charCodeAt(0));
    expect(decoded).toEqual(sig);
  });

  it("survives bytes above 0x7f, where a UTF-8 round trip would not", () => {
    const sig = new Uint8Array(64).fill(0xff);
    sig[0] = 0x80;
    const decoded = Uint8Array.from(atob(toBase64(sig)), c => c.charCodeAt(0));
    expect(decoded).toEqual(sig);
    expect(decoded.length).toBe(64);
  });

  it("encodes zero bytes rather than truncating at them", () => {
    const sig = new Uint8Array(64);
    sig[63] = 1;
    expect(Uint8Array.from(atob(toBase64(sig)), c => c.charCodeAt(0)).length).toBe(64);
  });
});
