import type { Address, Signature } from "@solana/kit";
import { withRetry } from "./chain/solana.js";
import { eventsFromLogs, errorCodeToReason, extractCustomError } from "./chain/anchor.js";
import type { SolanaChain } from "./chain/solana.js";
import { prisma } from "./db/client.js";
import { audit } from "./db/audit.js";

// Listens to every transaction that mentions the program and turns Anchor
// events into audit rows + counter updates. This is the path that makes the
// dashboard trustworthy: numbers come from chain logs, not from whatever the
// runtime thought happened. Works for transactions we sent AND for ones sent
// by anyone else (browser wallet, another runtime, an attacker).

// A subscription only delivers what happens while it is open, so anything the
// chain emitted while this process was down or disconnected is lost to it. On
// every (re)connect, replay from the newest signature already recorded — a
// restart or a host spin-down must not leave a hole in the audit trail.
const BACKFILL_LIMIT = 1_000;

async function backfill(chain: SolanaChain, log: (msg: string) => void) {
  // Anchor on the newest signature *this indexer* wrote, not on any
  // `actorType: "chain"` row: the executor also writes chain-actor rows
  // (tx.confirmed / tx.rejected) for transactions it sent itself. Anchoring on
  // one of those made `until` exclude that very transaction, so its
  // chain.policy_decision row — the corroboration the audit page shows — was
  // never written after a restart.
  const last = await prisma.auditEvent.findFirst({
    where: { actorType: "chain", eventType: { startsWith: "chain." }, chainSignature: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { chainSignature: true },
  });
  // Nothing recorded yet: there is no gap to close, and replaying the
  // program's entire history on a fresh database is not the same thing.
  if (!last?.chainSignature) return;

  // Page backwards with `before` until the anchor is reached. One page of
  // 1,000 silently truncated any longer outage and left the oldest part of
  // the gap unfilled.
  const missed: { signature: Signature }[] = [];
  let before: Signature | undefined;
  for (let page = 0; page < 20; page += 1) {
    const batch = await withRetry(
      () => chain.rpc
        .getSignaturesForAddress(chain.programId as Address, {
          until: last.chainSignature as Signature,
          before,
          limit: BACKFILL_LIMIT,
          commitment: "confirmed",
        })
        .send(),
      "getSignaturesForAddress",
    );
    missed.push(...batch);
    if (batch.length < BACKFILL_LIMIT) break;
    before = batch[batch.length - 1].signature;
  }
  if (!missed.length) return;
  log(`indexer: backfilling ${missed.length} transaction(s) missed since ${last.chainSignature.slice(0, 8)}`);

  // Newest first from the RPC; replay oldest first so mirrored counters land
  // in the order the chain produced them.
  for (const entry of [...missed].reverse()) {
    try {
      // handle() dedups too, but only after the fetch; skipping here keeps a
      // long backfill from re-downloading transactions already on record.
      if (await alreadyIndexed(entry.signature as string)) continue;
      const tx = await withRetry(
        () => chain.rpc
          .getTransaction(entry.signature, { commitment: "confirmed", encoding: "json", maxSupportedTransactionVersion: 0 })
          .send(),
        "getTransaction",
      );
      if (!tx) continue;
      await handle(chain, entry.signature as string, tx.meta?.err ?? null, BigInt(tx.slot), [...(tx.meta?.logMessages ?? [])]);
    } catch (e) {
      log(`indexer: backfill failed on ${entry.signature}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

export async function startIndexer(chain: SolanaChain, log: (msg: string) => void) {
  let backoff = 1_000;
  for (;;) {
    try {
      const abort = new AbortController();
      const notifications = await chain.rpcSubscriptions
        .logsNotifications({ mentions: [chain.programId as Address] }, { commitment: "confirmed" })
        .subscribe({ abortSignal: abort.signal });
      log(`indexer: subscribed to ${chain.programId}`);
      backoff = 1_000;
      // After subscribing, not before: the stream is already capturing new
      // events, so the replay closes the gap without opening another one.
      // handle() is idempotent, so the overlap costs nothing.
      await backfill(chain, log);
      for await (const n of notifications) {
        try {
          await handle(chain, n.value.signature as string, n.value.err, n.context.slot, n.value.logs ?? []);
        } catch (e) {
          log(`indexer: failed on ${n.value.signature}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      log("indexer: subscription ended, reconnecting");
    } catch (e) {
      log(`indexer: ${e instanceof Error ? e.message : String(e)}; retry in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 30_000);
    }
  }
}

async function alreadyIndexed(signature: string): Promise<boolean> {
  return Boolean(await prisma.auditEvent.findFirst({ where: { chainSignature: signature, actorType: "chain", eventType: { startsWith: "chain." } }, select: { id: true } }));
}

async function handle(chain: SolanaChain, signature: string, err: unknown, slot: bigint, logs: readonly string[]) {
  // Idempotent: the executor may already have written this signature.
  if (await alreadyIndexed(signature)) return;

  if (err) {
    const code = extractCustomError(err) ?? extractCustomError(logs.join("\n"));
    const mapped = code === null ? null : errorCodeToReason(code);
    const grantId = await grantIdForSignature(signature);
    await audit({
      actorType: "chain", actorId: chain.programId, eventType: "chain.tx_failed", subjectType: "signature", subjectId: signature, chainSignature: signature,
      payload: { grantId, slot, code, variant: mapped?.variant ?? null, reasonCode: mapped?.reasonCode ?? null },
    });
    return;
  }

  for (const ev of eventsFromLogs(logs)) {
    if (ev.name === "PolicyDecision") {
      const grant = await prisma.agentGrant.findUnique({ where: { grantPda: ev.grant } });
      if (grant) {
        await prisma.agentGrant.update({
          where: { id: grant.id },
          data: { spentUnits: ev.spentUnits, transactionCount: ev.transactionCount, nextNonce: Number(ev.nonce) + 1, lastExecutionAt: new Date() },
        });
      }
      await audit({
        actorType: "chain", actorId: chain.programId, eventType: "chain.policy_decision", subjectType: "grant", subjectId: grant?.id ?? ev.grant, chainSignature: signature,
        payload: { grantId: grant?.id ?? null, grantPda: ev.grant, nonce: ev.nonce, mint: ev.mint, destination: ev.destination, amountUnits: ev.amountUnits, spentUnits: ev.spentUnits, transactionCount: ev.transactionCount, slot: ev.slot },
      });
    } else if (ev.name === "GrantRevoked") {
      const grant = await prisma.agentGrant.findUnique({ where: { grantPda: ev.grant } });
      if (grant) await prisma.agentGrant.update({ where: { id: grant.id }, data: { revoked: true } });
      await audit({ actorType: "chain", actorId: chain.programId, eventType: "chain.grant_revoked", subjectType: "grant", subjectId: grant?.id ?? ev.grant, chainSignature: signature, payload: { grantId: grant?.id ?? null, grantPda: ev.grant, owner: ev.owner, slot } });
    } else if (ev.name === "GrantCreated") {
      const grant = await prisma.agentGrant.findUnique({ where: { grantPda: ev.grant } });
      await audit({ actorType: "chain", actorId: chain.programId, eventType: "chain.grant_created", subjectType: "grant", subjectId: grant?.id ?? ev.grant, chainSignature: signature, payload: { grantId: grant?.id ?? null, grantPda: ev.grant, owner: ev.owner, vault: ev.vault, executor: ev.executor, policyHash: ev.policyHash, spendCapUnits: ev.spendCapUnits, maxTransactions: ev.maxTransactions, expiresAt: ev.expiresAt, slot } });
    } else {
      await audit({ actorType: "chain", actorId: chain.programId, eventType: `chain.${ev.name.toLowerCase()}`, subjectType: "signature", subjectId: signature, chainSignature: signature, payload: { ...ev, slot } });
    }
  }
}

async function grantIdForSignature(signature: string): Promise<string | null> {
  const tx = await prisma.chainTransaction.findUnique({ where: { signature }, include: { decision: { include: { intent: true } } } });
  return tx?.decision.intent.grantId ?? null;
}
