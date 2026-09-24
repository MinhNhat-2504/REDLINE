# Technical architecture — REDLINE

Status: deployed on Solana Devnet. Program `Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4`; backend, Postgres and dashboard all on Render from the repo's `render.yaml` blueprint. Every number below is verifiable on Solana Explorer.

## The one-line design

The off-chain runtime may **propose**; only the on-chain program can **move funds** — and it moves them only after seven checks. A rejected intent is a failed transaction with a custom error and zero token movement.

```text
Browser (React + Wallet Standard)
  ├─ owner signs init_vault / create_grant / revoke_grant / withdraw ──► Solana Devnet
  └─ reads grants, intents, audit; SSE live feed ◄──────────────────── REDLINE API
                                                                          │
REDLINE API (Fastify · Prisma · Postgres)                                 │
  ├─ policy engine: off-chain mirror of the 7 gates (advisory only)       │
  ├─ agent runtime: scripted / LLM planner → intent → execute_transfer ──► program
  ├─ indexer: logsNotifications → Anchor events → audit + counters ◄────── program logs
  └─ audit trail: append-only, every row carries a signature when one exists

Solana program `redline_guardrails` (Anchor)
  ├─ Vault PDA ["vault", owner]          holds SPL tokens; only the program can sign out
  ├─ Grant PDA ["grant", owner, agent_id] limits + counters + allowlists
  └─ execute_transfer: gates → CPI spl_token::transfer → counters, atomically
```

## On-chain program

Source: `programs/redline_guardrails/src/lib.rs` (Anchor 0.32, built and deployed via Solana Playground; IDL checked in at `backend/idl/redline_guardrails.json`).

| Instruction | Signer | Effect |
|---|---|---|
| `init_vault` | owner | creates the Vault PDA; token accounts are ATAs owned by it |
| `create_grant(agent_id, policy_hash, cap, max_tx, expires_at, cooldown, allowed_mints[≤4], allowed_destinations[≤4])` | owner | creates the Grant PDA bound to one executor key |
| `execute_transfer(nonce, amount)` | executor | the only path that moves funds |
| `revoke_grant` | owner | sets `active = false`; every later transfer fails |
| `withdraw(amount)` | owner | pulls tokens back; no gates — the owner's key is the authority |

Gate order inside `execute_transfer` (first failure returns; nothing below runs):

```rust
require!(grant.active,                                     Revoked);               // 6005
require!(now < grant.expires_at,                           Expired);               // 6006
require!(nonce == grant.next_nonce,                        NonceReplay);           // 6007
require!(grant.allowed_mints.contains(&mint),              MintNotAllowed);        // 6008
require!(grant.allowed_destinations.contains(&dest_owner), DestinationNotAllowed); // 6009
require!(grant.transaction_count < grant.max_transactions, TxCapExceeded);         // 6010
require!(spent + amount <= grant.spend_cap_units,          SpendCapExceeded);      // 6011
require!(now - last_execution_at >= cooldown,              CooldownActive);        // 6012
// counters updated, then CPI transfer signed with the vault PDA seeds — same transaction
```

`PolicyDecision` is emitted only on success; a rejection surfaces as the transaction error, which the explorer shows verbatim (e.g. `custom program error: 0x177b` = 6011).

Reference transaction — an agent trying to move 500 USDC against a remaining budget of 400 (500 cap, 100 already spent), rejected on-chain with token balances unchanged:
<https://explorer.solana.com/tx/t4Xb9MFdFBrw8ndHGc496a6fGbGHmNbB2apvPwYzxt36M2LqLxE9k11zhpoSPV1TChw9iKq4AuoofBx1aAwu9su?cluster=devnet>

## Off-chain services (`backend/`)

TypeScript throughout, sharing one canonical policy hash with the frontend.

- **Chain adapter** (`src/chain/`). `MockChain` runs the identical gate logic in memory so the whole product works without a wallet or RPC; `SolanaChain` sends real transactions. The Anchor wire format (discriminators, Borsh arguments, `Grant` account layout, error codes, events) is hand-encoded in `src/chain/anchor.ts` and pinned by tests — no generated client, no IDL at runtime.
- **Policy engine** (`src/policy/engine.ts`). Same seven gates in the same order, so a precheck reason code always equals the program error the chain would return. It explains rejections and avoids paying for doomed transactions; it is never the authority.
- **Agent runtime** (`src/runtime/`). The scripted planner performs three compliant, paced transfers and stops; the LLM planner uses a strict JSON schema. Every proposal passes the same precheck and the program remains authoritative. Rejection scenarios live in Policy Lab so the interface never has to manufacture a failed transaction.
- **Indexer** (`src/indexer.ts`). Subscribes to program logs, decodes events, updates mirrored counters and writes audit rows — for our transactions and anyone else's. Because a subscription only carries what happens while it is open, each connect first replays every signature the chain produced after the newest one already recorded, so a restart or a dropped socket cannot silently shorten the audit trail.
- **Audit trail + SSE**. Append-only `audit_event`; the dashboard feed is the same stream an auditor reads back later.
- **Resilience**. Retries with backoff on RPC throttling; a throttled step does not end an agent run. `execute_transfer` is sent with `skipPreflight` on purpose so a rejection lands on-chain as evidence.
- **Access control**. A write takes a wallet session or the shared key. The session is the real credential: the server issues a challenge naming the wallet and a single-use nonce, the wallet signs it, and because a Solana address is an ed25519 public key the signature verifies against the address with no extra key material. Sessions are stored as a hash of the token. Routes acting on someone's property require a session and reject the key: claiming a marketplace listing, and the two that make the executor spend — starting a run and submitting an intent — which check the caller owns the grant. Owner actions on-chain are authorised by the wallet signature the program verifies, independent of all this.

## Frontend

React 19 + Vite + `@solana/kit` 8 + Wallet Standard. The wizard builds the policy, runs the AI risk copilot (deterministic floor the model cannot lower), then the wallet signs `create_grant`; the API only records `grantPda` + signature. Active Policy Accounts reads counters from the PDA; the Treasury page shows the live vault balance with owner-signed `withdraw`. The Marketplace publishes and rents agents for real SOL, with the payment checked against the chain before the agreement is written; Analytics is computed from the audit trail. P&L, APY, win-rate and uptime cards were removed rather than simulated — nothing in the system measures them.

The dashboard's spatial transaction spine is a projection of `GET /protocol/overview`, not a second policy implementation. The API owns the ordered gate catalog and rejection rollup; the browser only maps that domain response into motion. The canvas background and page transitions honor `prefers-reduced-motion`, and the core workflow remains usable without WebGL.

## Trust boundaries

```text
Owner wallet      the only signer for vault, grant, revoke, withdraw; never leaves the browser
Executor key      lives in the backend; can only call execute_transfer, which the program gates
Backend/DB        proposes and records; cannot move funds outside a grant even if compromised
LLM               advisory input to the runtime; never trusted, never signs
Program           the sole authority over vault funds
```

## Testing

- `backend/test/engine.test.ts` — each gate, cumulative cap, cooldown, gate precedence.
- `backend/test/anchor.test.ts` — discriminators, Borsh encoding, `Grant` layout round-trip, PDAs, error mapping, event decoding.
- `backend/test/onchain.test.ts` — the **deployed Devnet binary** loaded into LiteSVM: 3 allows, nonce replay, spend cap (balance unchanged), foreign destination, wrong signer, revoke. Runs in CI (`.github/workflows/backend-ci.yml`) on Linux; LiteSVM has no Windows build.
- `backend/test/auth.test.ts`, `transient.test.ts` — API key guard, RPC error classification.

## Trading inside a policy

The swap adapter is venue-agnostic by construction: it does not parse DEX
instructions, it brackets the call and measures the vault's balances before and
after. A route may spend no more than authorised and must return at least the
floor the owner accepted, with the output landing back in the vault's own
account. See `backend/README.md` for the reasoning and the deployment note — the
off-chain half is live and tested; `execute_swap` is written and awaiting the
program upgrade.

## Known limitations

- The swap adapter enforces its guarantees from balance deltas rather than
  instruction inspection, which makes it venue-agnostic. `execute_swap` is
  written and tested against the gates in LiteSVM, but the deployed program has
  not been upgraded yet, so trading runs only under `CHAIN=mock` today. Devnet
  liquidity also makes a real Jupiter/Orca fill impractical to demo.
- Slippage protection binds the executor to its own quote within a transaction.
  It stops a route filling worse than promised; it does not stop a compromised
  executor quoting badly. The spend cap and mint allowlist are what bound that.
- Demo USDC is a Devnet mint we control; `POST /devnet/fund` exists only for demos.
- The hosted demo runs on the public Devnet endpoint, which rate-limits shared cloud IPs like Render's. The chain adapter retries with backoff and an agent run survives a throttled step, but a dedicated RPC is the real fix and is not yet in place.
- The shared API key still opens the write routes that record public facts — registering a grant the chain already holds, funding a Devnet vault, recording a paid rental. It ships in the frontend bundle where anyone can read it, so those routes are open in practice. The routes where that would cause harm (spending from a vault, claiming a listing) require a wallet session instead. Retiring the key entirely means giving the remaining routes an owner to check against. No professional audit has been performed; mainnet use is out of scope.
