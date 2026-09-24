# Security and threat model — REDLINE

## Principles

- The wallet remains the only signer.
- **Identity is a signature, never a claim.** A wallet address in a request body proves
  nothing; every route that acts on someone's property resolves the caller from a signed
  session instead. The shared `REDLINE_API_KEY` ships inside the public frontend bundle
  and is treated as public knowledge — it throttles drive-by traffic, it does not
  authenticate.
- **A read is scoped to the reader.** One wallet's grants, rentals, runs, vault and audit
  trail are its own. Strangers get an empty set or a redacted projection, never someone
  else's addresses.
- AI output is advisory and cannot bypass deterministic or on-chain checks.
- Default permissions are narrow, expiring, and revocable.
- Only a policy digest is public; no prompt, secret, API key, or private strategy is written on-chain.
- Prototype data is labeled and separated from live RPC data.

## Primary threats

| Threat | Control |
|---|---|
| Agent drains treasury | spend cap, transaction cap, allowlist, cooldown, expiry, revocation |
| Prompt injection changes policy | AI cannot sign; canonical user-reviewed policy is hashed after assessment |
| Compromised frontend | wallet displays and approves the final transaction; production requires signed releases and CSP |
| API key exposure | OpenAI key exists only in the serverless environment, never a `VITE_` variable |
| AI provider outage/refusal | deterministic fallback returns a labeled result |
| Replay or policy substitution | canonical SHA-256 digest binds all displayed policy fields |
| Unsafe high-frequency loop | cooldown and transaction counter checked on-chain |
| Misleading metrics | analytics are derived from the audit trail; figures with no source in the system (P&L, APY, win rate, uptime) are not shown at all |
| RPC failure | explicit error states; no fabricated confirmation or signature |
| Impersonation via request body (publish, rent, grant, revoke, fund as another wallet) | every such route resolves the caller from a wallet session and compares it to the wallet being acted on (`requireWallet`, `requireGrantOwner`, `requireSession` in `backend/src/auth.ts`) |
| Wallet harvesting from the audit trail | `GET /audit` and the SSE feed redact identity and linkage **server-side** for anyone who does not own the events (`backend/src/redact.ts`); reason codes, amounts and on-chain signatures survive, so the evidence stays checkable |
| Listing hijack — a stranger prices someone else's agent and points payouts at themselves | pricing a listing requires being the wallet that published the build (`AgentVersion.publisherWallet`), not merely the first caller to claim it |
| Reputation farming — a publisher inflates their own agent's score | published reliability counts only grants that ran under a paid rental (`AgentGrant.hireId`); the publisher's own runs are reported separately and excluded from the score. Reviews are one per rental, enforced by a unique index |
| Denial of service against another account's agent | starting *and* stopping a run both check grant ownership; `GET /runs` no longer publishes other accounts' live run ids |
| Faucet abuse draining the demo keypair | `POST /devnet/fund` mints only into the caller's own vault |

## Current limitations

- A deployment with **no** `REDLINE_API_KEY` is deliberately open: writes are unguarded and
  reads unscoped, so `backend/scripts/demo.sh` can drive the whole demo headlessly. That is
  the local/mock mode. Never run a public instance without the key set.
- The shared key is still accepted for writes that do not act on a specific wallet's
  property. It is a throttle, not a credential; the long-term answer is per-caller
  sessions everywhere.
- `AgentVersion.publisherWallet` is nullable, because rows published before publishing
  required a signature have no publisher to name. Those are shown as **unclaimed** rather
  than attributed, and cannot be claimed retroactively — reconstructing the build inputs
  would otherwise let a stranger take them.
- On `CHAIN=mock` the rental payment check is a no-op, so the review gate is only as
  strong as the mock. It is enforced on Devnet, where the payment transaction is fetched
  and checked against the signer, the payee and the rate.
- Reputation can still be nudged by a publisher renting their own agent from a second
  wallet: the rent flows back to their own payout wallet, so the only real cost is fees.
  The gate makes farming *cost a rental*, not impossible; distinct-renter counts and the
  self-test figure are shown alongside the score so a reader can weigh thin evidence.
- Redaction masks identity but keeps on-chain signatures, from which a determined reader
  can recover addresses via an explorer. This removes bulk harvesting and cross-wallet
  linkage, not the underlying public nature of a settled transaction.
- Public Devnet RPC is rate-limited and not suitable for production reliability.
- A professional audit is required before mainnet deployment or custody claims.

## Responsible demo policy

Use Devnet only. Do not ask users to connect a treasury/mainnet wallet. Do not present simulated P&L, APY, or transaction history as real. Agent reviews **are** real — they come only from wallets that paid for a rental — but an agent with no rented history is shown as *unrated*, and that must not be dressed up as a good score. Do not promise returns. Show the Explorer proof and explain the enforcement roadmap precisely.
