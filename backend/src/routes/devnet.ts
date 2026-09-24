import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getChain } from "../chain/index.js";
import { SolanaChain } from "../chain/solana.js";
import { audit } from "../db/audit.js";
import { requireWallet } from "../auth.js";

// Demo-only helpers that exist because Devnet has no real USDC. Off on mock.
export async function devnetRoutes(app: FastifyInstance) {
  app.post("/devnet/fund", async (req, reply) => {
    const chain = getChain();
    if (!(chain instanceof SolanaChain)) return reply.code(400).send({ error: "CHAIN is not solana" });
    const mint = process.env.DEMO_USDC_MINT;
    if (!mint) return reply.code(500).send({ error: "DEMO_USDC_MINT not configured" });
    const { ownerWallet, amountUsdc } = z.object({ ownerWallet: z.string().min(32).max(44), amountUsdc: z.number().min(1).max(10_000).default(1_000) }).parse(req.body);
    // Free money on Devnet, but it still writes into one specific wallet's
    // vault; anyone could previously top up — or spam — a stranger's.
    requireWallet(req, ownerWallet);
    const amountUnits = BigInt(Math.round(amountUsdc * 1_000_000));
    const r = await chain.fundVault(ownerWallet, mint, amountUnits);
    const balance = await chain.tokenBalance(r.vaultAta);
    await audit({ actorType: "system", actorId: "devnet-faucet", eventType: "vault.funded", subjectType: "vault", subjectId: r.vaultPda, chainSignature: r.signature, payload: { ownerWallet, mint, amountUnits, balance } });
    return { ...r, balance };
  });
}
