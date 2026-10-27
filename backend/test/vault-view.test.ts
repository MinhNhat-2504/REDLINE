import { describe, expect, it, vi } from "vitest";
import { SolanaChain } from "../src/chain/solana.js";

const owner = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";
const mint = "7g5KxUnDjxDXqAV9yxuD6mVN8CLVu4s73jLU6UpTccoY";
describe("vault balance availability", () => {
  it("reports zero only when the token account is known to be absent", async () => {
    const info = vi.fn().mockResolvedValueOnce({ value: { owner } }).mockResolvedValueOnce({ value: null });
    const balance = vi.fn();
    const chain = Object.assign(Object.create(SolanaChain.prototype), { rpc: { getAccountInfo: () => ({ send: info }) }, tokenBalance: balance }) as SolanaChain;
    expect(await chain.vaultView(owner, mint)).toMatchObject({ exists: true, balanceUnits: "0" });
    expect(balance).not.toHaveBeenCalled();
  });
  it("does not turn a balance read failure into an empty vault", async () => {
    const chain = Object.assign(Object.create(SolanaChain.prototype), {
      rpc: { getAccountInfo: () => ({ send: async () => ({ value: { owner } }) }) },
      tokenBalance: async () => { throw new Error("RPC temporarily unavailable"); },
    }) as SolanaChain;
    expect(await chain.vaultView(owner, mint)).toMatchObject({ exists: true, balanceUnits: null });
  });
});
