import type { AgentVersion, Grant, Hire, Listing } from "./api";
export function agentAccess(agent: Pick<AgentVersion, "id" | "publisherWallet" | "listings">, owner: string, hires: Hire[], listings: Listing[], now = Date.now()) {
  const listing = agent.listings?.[0] ?? listings.find(l => l.agentVersionId === agent.id) ?? hires.find(h => h.listing.agentVersionId === agent.id)?.listing;
  if (owner && listing?.developerWallet === owner) return "owned";
  const rentals = hires.filter(h => h.ownerWallet === owner && h.listing.agentVersionId === agent.id && (!listing || (h.listingId ?? h.listing.id) === listing.id));
  if (rentals.some(h => Date.parse(h.endsAt) > now)) return "rented";
  if (listing && listing.developerWallet && BigInt(listing.priceLamports) > 0n) return rentals.length ? "expired" : "rent-required";
  if (owner && agent.publisherWallet === owner) return "owned";
  return "available";
}
export function relatedAgent(id: string, owner: string, publisher: string | null | undefined, grants: Grant[], hires: Hire[]) {
  return Boolean(owner) && (publisher === owner || grants.some(g => g.owner.wallet === owner && g.agentVersion.id === id) || hires.some(h => h.ownerWallet === owner && h.listing.agentVersionId === id));
}
