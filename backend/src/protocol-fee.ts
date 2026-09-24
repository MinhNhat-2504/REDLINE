// The marketplace take rate, as an actual transfer rather than a claim.
//
// docs/BUSINESS_MODEL.md has said "REDLINE can charge a 10% fee on verified
// agent rental revenue" since before there was a marketplace. The code sent
// 100% of every rental to the publisher, so the business model was a sentence
// in a document with nothing behind it. This module is the other half: the fee
// is split out of the rental, paid to a REDLINE wallet in the *same*
// transaction the publisher is paid in, and verified on-chain before the
// rental is recorded.
//
// Why split rather than surcharge: the fee comes out of the publisher's
// revenue, the way a storefront's take rate does. The renter pays the price
// on the card and nothing more — a surcharge would make the advertised price
// a lie, and "10% of rental revenue" means 10% of what the publisher earns.
//
// Why it is optional: a deployment with no PROTOCOL_TREASURY charges nothing
// and produces exactly the single-transfer payment the marketplace made
// before. That is what keeps CHAIN=mock and scripts/demo.sh working, and it
// means a fork can run the protocol without paying anyone.

export const BPS_DENOMINATOR = 10_000n;
export const DEFAULT_FEE_BPS = 1_000; // 10%
export const MAX_FEE_BPS = 2_000;     // a take rate above 20% is a bug, not a decision

export interface FeeConfig {
  /** Wallet that collects the take rate, or null when the fee is switched off. */
  treasury: string | null;
  /** Basis points of the rental taken as the fee. 0 when no treasury is set. */
  feeBps: number;
}

export interface RentalSplit {
  /** What the renter signs away in total — the advertised price. */
  totalLamports: bigint;
  /** What lands in the publisher's wallet. */
  publisherLamports: bigint;
  /** What lands in the REDLINE treasury. Zero when the fee is off. */
  protocolLamports: bigint;
  feeBps: number;
  treasury: string | null;
}

/**
 * Read the fee from the environment.
 *
 * An out-of-range or unparseable PROTOCOL_FEE_BPS falls back to the default
 * rather than throwing: a typo in a deploy variable should not take the
 * marketplace down, and it must never silently become a 90% rake.
 */
export function feeConfigFromEnv(env: NodeJS.ProcessEnv = process.env): FeeConfig {
  const treasury = env.PROTOCOL_TREASURY?.trim();
  if (!treasury) return { treasury: null, feeBps: 0 };
  const raw = Number(env.PROTOCOL_FEE_BPS ?? DEFAULT_FEE_BPS);
  const feeBps = Number.isFinite(raw) && raw >= 0 && raw <= MAX_FEE_BPS ? Math.round(raw) : DEFAULT_FEE_BPS;
  return { treasury, feeBps };
}

/**
 * Split one rental into the publisher's share and the protocol's.
 *
 * Rounding goes to the publisher: integer division truncates the fee, so a
 * rental too small to carry a whole lamport of fee carries none. Charging a
 * rounded-up lamport on a 5-lamport rental would cost more in explanation than
 * it collects.
 */
export function splitRental(totalLamports: bigint, config: FeeConfig, publisherWallet: string): RentalSplit {
  const noFee: RentalSplit = {
    totalLamports,
    publisherLamports: totalLamports,
    protocolLamports: 0n,
    feeBps: 0,
    treasury: null,
  };
  if (!config.treasury || config.feeBps <= 0 || totalLamports <= 0n) return noFee;
  // A publisher who is also the treasury would be paying themselves; the
  // transfer would net to nothing and the "revenue" would be fictitious.
  if (config.treasury === publisherWallet) return noFee;

  const protocolLamports = (totalLamports * BigInt(config.feeBps)) / BPS_DENOMINATOR;
  if (protocolLamports <= 0n) return noFee;
  return {
    totalLamports,
    publisherLamports: totalLamports - protocolLamports,
    protocolLamports,
    feeBps: config.feeBps,
    treasury: config.treasury,
  };
}

/** `10%`, `2.5%` — for a UI that has to explain where the money went. */
export function formatFeeRate(feeBps: number): string {
  return `${(feeBps / 100).toFixed(feeBps % 100 === 0 ? 0 : 2)}%`;
}

export interface PaymentLegs {
  publisher: bigint;
  protocol: bigint;
}

/**
 * Did this transaction pay both legs of the split?
 *
 * Works from balance deltas rather than decoded instructions: lamports can
 * arrive through a CPI or a batched instruction, and what matters is that they
 * landed. Throws with the reason so the route can hand it straight to the UI.
 *
 * The fee check is the point. Verifying only the publisher leg would let a
 * hand-built transaction pay the publisher, skip the treasury, and still
 * register the rental — which is how a take rate quietly becomes optional.
 */
export function checkPaymentLegs(
  accountKeys: readonly string[],
  preBalances: readonly bigint[],
  postBalances: readonly bigint[],
  payer: string,
  payee: string,
  split: RentalSplit,
): PaymentLegs {
  if (accountKeys[0] !== payer) throw new Error("payment was not signed by the renting wallet");

  const credited = (wallet: string): bigint | null => {
    const index = accountKeys.indexOf(wallet);
    if (index === -1) return null;
    return (postBalances[index] ?? 0n) - (preBalances[index] ?? 0n);
  };

  const publisher = credited(payee);
  if (publisher === null) throw new Error("payment does not touch the developer wallet");
  if (publisher < split.publisherLamports) {
    throw new Error(`the publisher received ${publisher} lamports, below the ${split.publisherLamports} their share of this rental comes to`);
  }

  if (split.protocolLamports <= 0n || !split.treasury) return { publisher, protocol: 0n };
  const protocol = credited(split.treasury);
  if (protocol === null) {
    throw new Error("this rental carries a protocol fee and the payment does not pay it — rebuild the payment from the current listing");
  }
  if (protocol < split.protocolLamports) {
    throw new Error(`the protocol fee received ${protocol} lamports, below the ${split.protocolLamports} due on this rental`);
  }
  return { publisher, protocol };
}
