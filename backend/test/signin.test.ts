import { webcrypto } from "node:crypto";
import { getAddressDecoder } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { challenge, verifySignature } from "../src/auth.js";

// The whole sign-in feature rests on one claim: a Solana address is a raw
// ed25519 public key, so a signature made by the wallet verifies against the
// address itself with no extra key material. These tests exercise that against
// the runtime's own crypto rather than assuming the platform supports it.

const addressDecoder = getAddressDecoder();

async function walletFixture() {
  const pair = (await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const raw = new Uint8Array(await webcrypto.subtle.exportKey("raw", pair.publicKey));
  return {
    address: addressDecoder.decode(raw) as string,
    sign: async (message: string) => {
      const sig = await webcrypto.subtle.sign({ name: "Ed25519" }, pair.privateKey, new TextEncoder().encode(message));
      return Buffer.from(new Uint8Array(sig)).toString("base64");
    },
  };
}

describe("verifySignature", () => {
  it("accepts a signature the wallet's own key produced", async () => {
    const wallet = await walletFixture();
    const message = challenge(wallet.address, "nonce-1", new Date("2026-01-01T00:00:00Z"));
    expect(await verifySignature(wallet.address, message, await wallet.sign(message))).toBe(true);
  });

  it("rejects a signature over a different message", async () => {
    const wallet = await walletFixture();
    const signed = challenge(wallet.address, "nonce-1", new Date("2026-01-01T00:00:00Z"));
    // Same wallet, same shape, different nonce: replaying a signature onto
    // another challenge must not authenticate.
    const other = challenge(wallet.address, "nonce-2", new Date("2026-01-01T00:00:00Z"));
    expect(await verifySignature(wallet.address, other, await wallet.sign(signed))).toBe(false);
  });

  it("rejects another wallet's signature over the right message", async () => {
    const alice = await walletFixture();
    const mallory = await walletFixture();
    const message = challenge(alice.address, "nonce-1", new Date("2026-01-01T00:00:00Z"));
    expect(await verifySignature(alice.address, message, await mallory.sign(message))).toBe(false);
  });

  it("rejects malformed input instead of throwing", async () => {
    const wallet = await walletFixture();
    const message = challenge(wallet.address, "nonce-1", new Date("2026-01-01T00:00:00Z"));
    for (const bad of ["", "not-base64!!", Buffer.from("too short").toString("base64")]) {
      expect(await verifySignature(wallet.address, message, bad)).toBe(false);
    }
    expect(await verifySignature("not-an-address", message, await wallet.sign(message))).toBe(false);
  });
});

describe("challenge message", () => {
  it("binds the wallet, the nonce and the time it was issued", () => {
    const text = challenge("2828FT2CggMGyHUPucL8Bv16FXXGhitnMgSM3Cc6ZEye", "abc123", new Date("2026-01-01T00:00:00Z"));
    expect(text).toContain("2828FT2CggMGyHUPucL8Bv16FXXGhitnMgSM3Cc6ZEye");
    expect(text).toContain("abc123");
    expect(text).toContain("2026-01-01T00:00:00.000Z");
  });

  // Why the issued message is stored instead of rebuilt at verification: the
  // stamp inside it comes from the API process, while a row's createdAt comes
  // from the database clock. A few milliseconds apart is still a different
  // string, and a signature over one never verifies against the other.
  it("changes with the issued-at stamp, so it cannot be reconstructed later", async () => {
    const wallet = await walletFixture();
    const issued = new Date("2026-01-01T00:00:00.000Z");
    const aMomentLater = new Date("2026-01-01T00:00:00.004Z");
    const signed = challenge(wallet.address, "n", issued);

    expect(challenge(wallet.address, "n", aMomentLater)).not.toBe(signed);
    expect(await verifySignature(wallet.address, challenge(wallet.address, "n", aMomentLater), await wallet.sign(signed))).toBe(false);
  });

  it("tells the signer what they are agreeing to", () => {
    const text = challenge("2828FT2CggMGyHUPucL8Bv16FXXGhitnMgSM3Cc6ZEye", "abc123", new Date());
    expect(text).toMatch(/authorises no transfer and moves no funds/);
  });
});
