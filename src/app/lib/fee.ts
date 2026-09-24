import type { ProtocolFee } from "./api";

// The renter's side of the marketplace take rate.
//
// This mirrors `backend/src/protocol-fee.ts` on purpose, and the backend
// remains the authority: it re-derives the split from its own configuration
// and checks both legs against the chain before recording a rental. What this
// file does is build a payment that will pass that check — so the rounding
// rule has to match exactly, or a payment would come up one lamport short and
// be rejected after the SOL had already moved.
//
// The rate is fetched from `GET /protocol/fee` at pay time rather than bundled
// here, so a fee change does not need a dashboard redeploy to take effect.

export const BPS_DENOMINATOR = 10_000n;

export interface RentalSplit {
  totalLamports: bigint;
  publisherLamports: bigint;
  protocolLamports: bigint;
  feeBps: number;
  treasury: string | null;
}

/** Split a rental the way the API will: fee out of the publisher's share, rounded down. */
export function splitRental(totalLamports: bigint, fee: ProtocolFee, publisherWallet: string): RentalSplit {
  const noFee: RentalSplit = {
    totalLamports,
    publisherLamports: totalLamports,
    protocolLamports: 0n,
    feeBps: 0,
    treasury: null,
  };
  if (!fee.enabled || !fee.treasury || fee.feeBps <= 0 || totalLamports <= 0n) return noFee;
  // Paying yourself is not revenue.
  if (fee.treasury === publisherWallet) return noFee;

  const protocolLamports = (totalLamports * BigInt(fee.feeBps)) / BPS_DENOMINATOR;
  if (protocolLamports <= 0n) return noFee;
  return {
    totalLamports,
    publisherLamports: totalLamports - protocolLamports,
    protocolLamports,
    feeBps: fee.feeBps,
    treasury: fee.treasury,
  };
}

/** `10%`, `2.5%` — what the card says the fee is. */
export function formatFeeRate(feeBps: number): string {
  return `${(feeBps / 100).toFixed(feeBps % 100 === 0 ? 0 : 2)}%`;
}
