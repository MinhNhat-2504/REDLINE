import type { Grant } from "./api";

// Fold a fresh read of the grants into what the panel already shows.
//
// A grant row is assembled from two reads: the list (database) and a per-grant
// detail that adds the account's state as read from Solana. The second read
// can fail on its own — a rate limit, an RPC hiccup — and the panel used to
// respond by showing the bare list row. That swapped on-chain numbers for
// database numbers and back again on alternate refreshes: spend, expiry and
// status all flickered between two sources that were each right about
// different things.
//
// The rules here are about what a missing or lagging read is evidence OF:
//   - a failed chain read is not evidence the chain state went away, so the
//     last known on-chain state stays;
//   - the program only ever increments spent / transaction count / nonce, so a
//     lower number is a lagging RPC node, not a refund — the higher one wins;
//   - revocation is one-way on-chain, so a grant seen revoked stays revoked.

const maxUnits = (a: string | undefined, b: string | undefined): string => {
  if (a === undefined) return b ?? "0";
  if (b === undefined) return a;
  try { return BigInt(a) >= BigInt(b) ? a : b; } catch { return b; }
};

function mergeOne(prev: Grant, next: Grant): Grant {
  const was = prev.onchain ?? null;
  const now = next.onchain ?? null;
  const onchain = now && was
    ? {
        ...now,
        spentUnits: maxUnits(was.spentUnits, now.spentUnits),
        transactionCount: Math.max(was.transactionCount, now.transactionCount),
        nextNonce: Math.max(was.nextNonce, now.nextNonce),
        active: was.active === false ? false : now.active,
      }
    : now ?? was;
  return {
    ...next,
    onchain,
    revoked: prev.revoked || next.revoked,
    spentUnits: maxUnits(prev.spentUnits, next.spentUnits),
    transactionCount: Math.max(prev.transactionCount, next.transactionCount),
    nextNonce: Math.max(prev.nextNonce, next.nextNonce),
    // The list row carries no runs; losing them made "AGENT RUNNING" blink.
    runs: next.runs ?? prev.runs,
  };
}

export function mergeGrants(prev: Grant[], next: Grant[]): Grant[] {
  const known = new Map(prev.map(g => [g.id, g]));
  // `next` decides membership and order: a grant the API no longer returns is
  // gone, and a new one appears where the API put it.
  return next.map(g => {
    const before = known.get(g.id);
    return before ? mergeOne(before, g) : g;
  });
}

/** A revoked grant whose chain state is already known cannot change again. */
export function isSettled(g: Grant): boolean {
  return (g.revoked || g.onchain?.active === false) && !!g.onchain;
}
