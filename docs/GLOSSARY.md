# Glossary — the words REDLINE uses, and what each one means

The vocabulary had drifted. The same word meant different things in the schema,
the API and the sidebar, and several distinct ideas shared one name. That is not
a documentation problem: "which agent is mine?" is unanswerable while *agent*
means four things at once, and "sign in" is confusing while *session* means both
a wallet login and a policy window.

This file fixes one name per concept. Where a rename was cheap and clarifying it
has been applied; where a rename would touch live database columns it is
recorded as a deliberate exception with the reason.

---

## The four roles

Every wallet in REDLINE is playing one of these at a time. They were previously
all called "owner" or "developer" somewhere.

| Role | Who they are | Where it lives |
|---|---|---|
| **Publisher** | The wallet that published an agent build. Owns it, prices it, gets paid for rentals. | `AgentVersion.publisherWallet` |
| **Payout wallet** | Where a listing's rental payments go. Normally the publisher; kept separate so a team can be paid elsewhere. | `AgentListing.developerWallet` |
| **Renter** | The wallet that paid to use someone else's agent for a term. | `HireAgreement.ownerWallet` |
| **Treasury owner** | The wallet whose vault an agent spends from, and who signs and revokes its authority. | `Owner.wallet`, `AgentGrant.owner` |

The publisher and the treasury owner are usually **different people**. That is the
whole product: you run someone else's agent against your own money, under limits
you set. Collapsing both into "owner" is what made the marketplace unreadable.

---

## The core objects

### Agent build — `AgentVersion`
One immutable published build: a model reference, a code reference and a config,
fingerprinted as `agentHash = sha256(modelHash | codeHash | configHash)`.
Changing any input produces a **new build**, never an edit.

*It is not:* a running process, a marketplace offer, or a permission.
*Owned by:* a publisher. Two publishers may offer identical bytes; each gets
their own row, which is why `agentHash` is unique **per publisher**, not globally.

### Listing — `AgentListing`
A publisher's offer to rent one build: a price per 24 h and a payout wallet.
Created unpriced alongside every build; it becomes a real offer only when the
publisher sets both.

*It is not:* the agent. A build with no price is published, not offered.

### Rental — `HireAgreement`
A renter's paid term on a listing, funded by a verified SOL transfer. It is the
receipt: it authorises a grant against someone else's build, and it is the only
thing that entitles a wallet to review.

*Say "rental", not "hire" in the UI* — "hire" reads as employment.

### Policy — `PolicyVersion`
The rules themselves: spend cap, transaction cap, cooldown, expiry, allowed
mints and destinations. Canonicalised and hashed; `policyHash` is what goes
on-chain, so the rules a wallet signed are provable afterwards.

*It is not:* the permission. A policy is a document; it grants nothing.

### Permission — `AgentGrant`
The on-chain object that binds **one treasury owner, one vault, one build, one
policy and (when renting) one rental** — and names the executor allowed to act.
This is the thing the program enforces and the owner revokes.

*Previously called:* "session" in the UI, which collided with wallet sign-in.
Call it a **permission** or a **grant**; never a session.

### Vault — `Vault`
The program-owned account (a PDA) holding the tokens an agent may spend from.
Only the program can sign transfers out of it.

*UI label:* **Treasury**. The page is the treasury; the account is the vault.
Both words are kept because they name different levels — the treasury is what an
operator manages, the vault is where it sits on-chain.

### Intent, decision, transaction — `TransactionIntent` → `PolicyDecision` → `ChainTransaction`
What the agent proposed, what the gates said, and what the chain did. Three rows,
never merged: a proposal that was refused still happened and still matters.

### Audit event — `AuditEvent`
Append-only record of every hand-off. Full to the wallet it concerns; redacted
to everyone else (see `backend/src/redact.ts`).

### Wallet session — `Session`
A signed-in browser. Issued after a wallet signs a server challenge; proves
which wallet is calling. **This is the only thing "session" means.**

### Review — `AgentReview`
One renter's rating and comment, keyed to one rental. See *Reputation* below.

---

## Reputation, in two halves

A single star rating would let opinion overwrite evidence, so the two are
reported separately and the headline score names its own basis.

| Half | Source | Can it be gamed? |
|---|---|---|
| **Reliability** | Recorded policy decisions and on-chain transaction results | No — an agent whose proposals were refused has a low compliance rate regardless of what anyone says |
| **Reviews** | Wallets that paid for a rental, one review per rental | Only by renting again, which costs real SOL |

An agent with neither is **unrated** — not zero, and not five stars.

---

## Renames applied

| Layer | Was | Now | Why |
|---|---|---|---|
| Component | `SessionsPage` | `GuardrailsPage` | The sidebar already said "Guardrails"; the file said "Sessions", which collided with wallet sign-in |
| Component | `VaultPage` | `TreasuryPage` | Matches the sidebar label; the on-chain account keeps the name "vault" |
| UI copy | "hire" | "rental" / "rent" | "Hire" reads as employment |
| UI copy | "My Agents" (showing everyone's) | "Agents", with each row marked | The page could not tell whose was whose; now it does |
| API | *(none)* | `AgentVersion.publisherWallet` | There was no way to say who published a build |
| API | `GET /agents` | `GET /agents?mine=true` | "Which are mine" was previously unanswerable |

## Renames deliberately **not** applied

| Name | Why it stays |
|---|---|
| `AgentListing.developerWallet` | Renaming a live column needs a migration, and the field genuinely means "payout wallet", which may differ from the publisher. Documented above instead. |
| `HireAgreement` | The table and its `hireId` foreign keys are referenced by grants and reviews; the UI says "rental" while the schema keeps `hire`. |
| `Owner` | Accurate for what it holds: the treasury owner. The ambiguity was in the UI, not the model. |

---

## Using these words

- An agent is **published**, not deployed. Deploying is what happens to the program.
- A permission is **granted** and **revoked**, not created and deleted.
- An agent **proposes**; the program **allows** or **refuses**. It never "sends".
- A rejected transfer **moved nothing** — say that, because it is the point.
- An unrated agent is **unrated**, not unproven and not bad.
