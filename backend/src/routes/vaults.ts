import type { FastifyInstance } from "fastify";
import { getChain } from "../chain/index.js";
import { SolanaChain } from "../chain/solana.js";
import { findVaultPda } from "../chain/anchor.js";
import { callerWallet, identityEnforced } from "../auth.js";

// Vault view for the Treasury page: PDA, demo-USDC ATA and live balance.
// Withdraw is not here on purpose — it is owner-signed in the browser.
export async function vaultRoutes(app: FastifyInstance) {
  app.get("/vaults/:owner", async (req, reply) => {
    const { owner } = req.params as { owner: string };
    // Vault contents are on-chain and public, but serving them keyed by
    // wallet turns this into a balance-lookup service for any address a
    // stranger has seen. Signed-in callers read their own.
    const caller = callerWallet(req);
    if (identityEnforced() && caller !== owner) {
      return reply.code(403).send({ error: "you can only read your own vault" });
    }
    const chain = getChain();
    if (!(chain instanceof SolanaChain)) return reply.code(400).send({ error: "vault view needs CHAIN=solana" });
    const mint = process.env.DEMO_USDC_MINT;
    if (!mint) return reply.code(500).send({ error: "DEMO_USDC_MINT not configured" });
    const { address: vaultPda } = await findVaultPda(chain.programId, owner);
    const view = await chain.vaultView(vaultPda, mint);
    return { owner, vaultPda, mint, ...view };
  });
}
