// Marketplace stats, derived only from records that already exist: the
// `listing.hired` audit events carry the exact lamports paid at hire time, and
// the HireAgreement rows carry the count and the timing. Nothing here is a
// price feed or an estimate — the same rule the analytics route follows.

const DAY_MS = 86_400_000;

export interface HiredEventLike {
  // AuditEvent.payload is a JSON string: { listingId, paidLamports, ... }.
  payload: string;
}

export interface HireLike {
  listingId: string;
  startsAt: Date;
}

/**
 * Is this rental live right now?
 *
 * `HireAgreement.status` defaults to "active" and nothing ever writes it
 * again — no expiry job, no cron. Counting rows by that flag therefore
 * reports every rental ever paid for as still running, which is why a
 * listing rented once last month advertised "1 active hire" forever. The
 * end date is the only field that tells the truth, and it is what
 * resolveHire() in routes/grants.ts already checks before letting a rented
 * agent be granted authority.
 */
export function isLiveHire(hire: { endsAt: Date; status?: string }, now: Date = new Date()): boolean {
  if (hire.status === "cancelled") return false;
  return hire.endsAt > now;
}

export interface ListingStats {
  totalHires: number;
  hires24h: number;
  volumeLamports: string;
  lastHiredAt: string | null;
}

/**
 * Sum of `paidLamports` per listing, read from `listing.hired` audit events.
 * A payload that does not parse, names no listing, or carries an unreadable
 * amount is skipped rather than counted as zero for the wrong row.
 */
export function volumeByListing(events: HiredEventLike[]): Map<string, bigint> {
  const out = new Map<string, bigint>();
  for (const ev of events) {
    let listingId: unknown;
    let paid: unknown;
    try {
      const p = JSON.parse(ev.payload) as Record<string, unknown>;
      listingId = p.listingId;
      paid = p.paidLamports;
    } catch {
      continue;
    }
    if (typeof listingId !== "string") continue;
    let lamports: bigint;
    try {
      lamports = BigInt(String(paid ?? "0"));
    } catch {
      continue;
    }
    out.set(listingId, (out.get(listingId) ?? 0n) + lamports);
  }
  return out;
}

/** Per-listing hire count, 24h count and the most recent hire time. */
export function hireStatsByListing(
  hires: HireLike[],
  now: Date = new Date(),
): Map<string, { totalHires: number; hires24h: number; lastHiredAt: string | null }> {
  const cutoff = now.getTime() - DAY_MS;
  const out = new Map<string, { totalHires: number; hires24h: number; lastHiredAt: string | null }>();
  for (const h of hires) {
    const cur = out.get(h.listingId) ?? { totalHires: 0, hires24h: 0, lastHiredAt: null as string | null };
    cur.totalHires += 1;
    const t = h.startsAt.getTime();
    if (t >= cutoff) cur.hires24h += 1;
    if (!cur.lastHiredAt || t > new Date(cur.lastHiredAt).getTime()) cur.lastHiredAt = h.startsAt.toISOString();
    out.set(h.listingId, cur);
  }
  return out;
}

/** Assemble one listing's stats from the two aggregates above. */
export function listingStats(
  listingId: string,
  volumes: Map<string, bigint>,
  counts: ReturnType<typeof hireStatsByListing>,
): ListingStats {
  const c = counts.get(listingId);
  return {
    totalHires: c?.totalHires ?? 0,
    hires24h: c?.hires24h ?? 0,
    volumeLamports: (volumes.get(listingId) ?? 0n).toString(),
    lastHiredAt: c?.lastHiredAt ?? null,
  };
}
