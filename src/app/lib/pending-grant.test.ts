import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { grantScope, readPendingGrant, savePendingGrant } from "./pending-grant";
import type { PendingGrant } from "./grant-operation";

const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());

describe("durable grant recovery scope", () => {
  it("restores a pending policy for the original owner, never a different wallet", () => {
    const pending = { version: 1, scope: grantScope("alice"), expiresAt: 123, executor: "executor", registration: { ownerWallet: "alice" } } as PendingGrant;
    savePendingGrant(pending);
    expect(readPendingGrant("alice")).toEqual(pending);
    expect(readPendingGrant("bob")).toBeNull();
  });
  it("does not accept broken or differently scoped recovery records", () => {
    const pending = { version: 1, scope: grantScope("alice"), registration: { ownerWallet: "bob" } } as PendingGrant;
    savePendingGrant(pending); expect(readPendingGrant("alice")).toBeNull();
    for (const key of data.keys()) data.set(key, "broken JSON");
    expect(readPendingGrant("alice")).toBeNull();
  });
  it("fails before signing when durable storage is blocked", () => {
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("blocked"); } });
    expect(() => savePendingGrant({ scope: "alice" } as PendingGrant)).toThrow("before signing");
  });
});
