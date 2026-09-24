# Product brief — REDLINE

## One sentence

REDLINE lets an owner bound what an AI agent may do with their capital on Solana, and puts a program in the way of every transfer so the bound holds whether or not the agent cooperates.

## Problem

Wallet automation has a permission gap. Manual signing does not scale, but unrestricted agent access creates unacceptable custody, operational, and audit risk. Existing dashboards show what agents did; they rarely prove what agents were allowed to do — and almost none can stop an agent that tries to exceed it.

## Primary user

The beachhead user is a small crypto fund or DAO treasury operator managing 50,000–2,000,000 USD in on-chain assets with a lean operations team. They want automation for monitoring and routine execution but need explicit controls before delegating authority.

Secondary users are active DeFi traders and agent developers.

## Jobs to be done

1. Define exactly which assets and amount an agent can touch.
2. Limit how often and how long the agent may act.
3. Catch unsafe configurations before signing.
4. Produce evidence of both halves: what the owner authorised, and what the chain decided about every attempt.
5. Revoke authority quickly without replacing the treasury wallet.

## MVP flow

1. Connect a Solana Wallet Standard wallet on Devnet.
2. Pick the published agent version this grant authorises — the grant records its `agentHash`, so the build cannot be swapped afterwards.
3. Allowlist the SPL assets and the destination addresses the agent may pay.
4. Set spend, transaction, cooldown, and expiry bounds.
5. Run AI-assisted risk review over a deterministic floor. `BLOCK` disables signing; `REVIEW` holds it until the owner accepts the flagged risk, and that acceptance is recorded.
6. Sign one `create_grant` in the wallet. Funds sit in a program-owned vault the backend cannot sign out of.
7. Start the agent. It proposes transfers; `execute_transfer` checks seven gates before moving anything, so a rejected proposal is a failed transaction with a named error and zero token movement.
8. Watch the audit trail, sourced from the program's own events, and revoke or withdraw from the wallet at any time.

## Why AI is needed

The deterministic engine provides a non-reducible safety floor. The AI layer explains combined operational risks in plain language and recommends safer bounds, but cannot lower the deterministic score or verdict. It never receives wallet secrets, signs transactions, or predicts profit.

## Success metrics

- Policy creation completion rate.
- Percentage of unsafe policies changed before signing.
- Time from policy draft to approved proof.
- Revocation latency.
- Value and transaction count protected by active policies.
- Paid teams and monthly active treasury operators.

The metrics shown in the UI are computed from the audit trail, not simulated. Anything the system cannot measure honestly — P&L, APY, win rate, uptime — is absent rather than estimated. None of these figures are success claims for the product.
