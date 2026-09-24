# Business model — REDLINE

## Wedge

Start with treasury teams that already use DeFi automation but still rely on broad hot-wallet permissions or manual multisig approvals. REDLINE becomes the enforcement and evidence layer between a treasury and its agents — a limit the agent cannot exceed, not a policy it is asked to respect.

## Revenue

### Team subscription — planned, not built

- Starter: free Devnet policies and local risk checks.
- Pro: 99 USD/month for production policies, alerts, history, and five operators.
- Treasury: 499 USD/month for approval workflows, exports, custom limits, and support.

### Agent marketplace — implemented

REDLINE charges **10% of verified agent rental revenue**, and this is the one
revenue line that exists in the product rather than on this page.

A rental is a single wallet-signed transaction carrying two transfers: the
publisher's 90% and the protocol's 10%. `POST /hires` verifies both legs against
Devnet before recording the rental, so a payment that skips the fee is rejected
rather than accepted — the take rate is enforced, not requested. Every lamport
collected is listed at `GET /protocol/revenue` and on the Marketplace page, each
row linking to the payment on Explorer.

The rate is configuration (`PROTOCOL_FEE_BPS`, capped at 20%) and the collector
is a wallet (`PROTOCOL_TREASURY`). A deployment that sets neither charges
nothing and pays publishers in full — which is what a fork, and every local run,
does today.

Subscriptions below remain unbuilt, and are priced here as a plan, not a claim.

### Enterprise

Annual contracts for dedicated RPC, custom policy templates, SIEM/webhook export, private deployment, and security review.

## Go-to-market

1. Recruit five design partners from Solana treasury and agent-builder communities.
2. Offer free policy reviews and Devnet onboarding.
3. Publish reproducible “unsafe vs bounded agent” demos with Explorer proofs.
4. Partner with wallet, multisig, automation, and agent SDK teams.
5. Convert teams when they need persistent history, approvals, and production support.

## Validation plan

- Interview at least 10 treasury operators; document current approval time and incidents.
- Run three supervised Devnet pilots.
- Measure whether users voluntarily reduce limits after the risk review.
- Secure two written design-partner commitments before pricing claims are used in a pitch.

## Defensibility

- Reusable policy templates and incident-informed risk rules.
- On-chain evidence and organization-level audit history.
- Integrations across wallets, multisigs, agent runtimes, and DeFi protocols.
- Trust earned through conservative defaults and transparent failure handling.
