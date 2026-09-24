import { beforeEach, describe, expect, it } from "vitest";

// The suite runs on the node environment (no DOM), and the module under test
// reads localStorage at call time. A minimal in-memory stand-in is enough and
// keeps the suite free of a jsdom dependency it needs for nothing else.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}
const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });

const { isSignedIn, loadSession, storeSession } = await import("./api");

// The bug this guards: the UI enabled Publish and Rent as soon as a wallet was
// *connected*. Connecting only names an address — the API cannot tell it apart
// from one that was typed — so those buttons went straight to a 401 on a public
// deployment, or, before the API was fixed, straight through.
//
// isSignedIn is the single place the UI now asks "do we hold a signature for
// this exact wallet?".

const ALICE = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";
const BOB = "3vxQZz9vVMbibjDDJeFejLQVHhHd3AXgSYtTok8fHhRb";
const future = () => new Date(Date.now() + 3600_000).toISOString();
const past = () => new Date(Date.now() - 1000).toISOString();

beforeEach(() => { storeSession(null); });

describe("isSignedIn", () => {
  it("is false with no session at all — a connected wallet is not a signed one", () => {
    expect(isSignedIn(ALICE)).toBe(false);
  });

  it("is true for the wallet that actually signed", () => {
    storeSession({ token: "t", wallet: ALICE, expiresAt: future() });
    expect(isSignedIn(ALICE)).toBe(true);
  });

  it("is false for a different wallet, even while a session exists", () => {
    // Switching accounts in the wallet extension must not inherit the previous
    // account's authority.
    storeSession({ token: "t", wallet: ALICE, expiresAt: future() });
    expect(isSignedIn(BOB)).toBe(false);
  });

  it("is false once the session has expired", () => {
    storeSession({ token: "t", wallet: ALICE, expiresAt: past() });
    expect(isSignedIn(ALICE)).toBe(false);
    expect(loadSession()).toBeNull();
  });

  it("is false for a missing wallet, rather than throwing", () => {
    storeSession({ token: "t", wallet: ALICE, expiresAt: future() });
    expect(isSignedIn(null)).toBe(false);
    expect(isSignedIn(undefined)).toBe(false);
    expect(isSignedIn("")).toBe(false);
  });

  it("survives storage being unavailable", () => {
    // Private mode and blocked site data both throw here. A page that cannot
    // read a session should treat the user as signed out, not crash.
    storeSession({ token: "t", wallet: ALICE, expiresAt: future() });
    const original = storage.getItem.bind(storage);
    storage.getItem = () => { throw new Error("blocked"); };
    try {
      expect(isSignedIn(ALICE)).toBe(false);
    } finally {
      storage.getItem = original;
    }
  });
});
