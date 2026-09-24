//! REDLINE guardrails v2 — on-chain enforcement for autonomous agents.
//!
//! The owner deposits SPL tokens into a Vault PDA and signs a Grant that
//! bounds what an executor (the agent runtime's key) may do with them.
//! `execute_transfer` is the only path that moves funds out of the vault and
//! it passes seven gates before the CPI. A rejected intent moves nothing.
//!
//! Gate order (mirrored by backend/src/policy/engine.ts):
//!   1 Revoked  2 Expired  3 NonceReplay  4 MintNotAllowed
//!   5 DestinationNotAllowed  6 TxCapExceeded / SpendCapExceeded  7 CooldownActive

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// Must match the address this is deployed at: Anchor rejects every
// instruction with DeclaredProgramIdMismatch when it does not. The binary
// live on Devnet embeds this exact id — verified by decoding the fetched
// programdata — so a rebuild from this source reproduces what is running.
declare_id!("Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4");

pub const MAX_ALLOWLIST: usize = 4;
pub const VAULT_SEED: &[u8] = b"vault";
pub const GRANT_SEED: &[u8] = b"grant";
pub const SWAP_POLICY_SEED: &[u8] = b"swap";
pub const BPS_DENOMINATOR: u64 = 10_000;

#[program]
pub mod redline_guardrails {
    use super::*;

    /// One vault per owner. Token accounts are ATAs owned by this PDA, so
    /// only this program can sign transfers out of them.
    pub fn init_vault(ctx: Context<InitVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.bump = ctx.bumps.vault;
        vault.created_at = Clock::get()?.unix_timestamp;
        emit!(VaultInitialized { vault: vault.key(), owner: vault.owner });
        Ok(())
    }

    /// Owner signs once. `agent_id` is a random 16-byte seed so one owner can
    /// hold many grants. `policy_hash` binds the human-readable policy the
    /// owner reviewed in the UI to this on-chain record.
    #[allow(clippy::too_many_arguments)]
    pub fn create_grant(
        ctx: Context<CreateGrant>,
        agent_id: [u8; 16],
        policy_hash: [u8; 32],
        spend_cap_units: u64,
        max_transactions: u32,
        expires_at: i64,
        cooldown_seconds: i64,
        allowed_mints: Vec<Pubkey>,
        allowed_destinations: Vec<Pubkey>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        require!(spend_cap_units > 0, RedlineError::InvalidSpendCap);
        require!(max_transactions > 0, RedlineError::InvalidTransactionCap);
        require!(expires_at > clock.unix_timestamp, RedlineError::InvalidExpiry);
        require!(cooldown_seconds >= 0, RedlineError::InvalidCooldown);
        require!(
            !allowed_mints.is_empty() && allowed_mints.len() <= MAX_ALLOWLIST,
            RedlineError::InvalidAllowlist
        );
        require!(
            !allowed_destinations.is_empty() && allowed_destinations.len() <= MAX_ALLOWLIST,
            RedlineError::InvalidAllowlist
        );

        let grant = &mut ctx.accounts.grant;
        grant.owner = ctx.accounts.owner.key();
        grant.vault = ctx.accounts.vault.key();
        grant.executor = ctx.accounts.executor.key();
        grant.agent_id = agent_id;
        grant.policy_hash = policy_hash;
        grant.spend_cap_units = spend_cap_units;
        grant.spent_units = 0;
        grant.max_transactions = max_transactions;
        grant.transaction_count = 0;
        grant.next_nonce = 0;
        grant.created_at = clock.unix_timestamp;
        grant.expires_at = expires_at;
        grant.cooldown_seconds = cooldown_seconds;
        grant.last_execution_at = 0;
        grant.active = true;
        grant.bump = ctx.bumps.grant;
        grant.allowed_mints = allowed_mints;
        grant.allowed_destinations = allowed_destinations;

        emit!(GrantCreated {
            grant: grant.key(),
            owner: grant.owner,
            vault: grant.vault,
            executor: grant.executor,
            policy_hash,
            spend_cap_units,
            max_transactions,
            expires_at,
        });
        Ok(())
    }

    /// The only instruction that moves funds. The executor proposes; the
    /// gates decide; the CPI and the counter update happen atomically.
    pub fn execute_transfer(ctx: Context<ExecuteTransfer>, nonce: u64, amount_units: u64) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        let grant = &mut ctx.accounts.grant;
        let mint = ctx.accounts.mint.key();
        let destination = ctx.accounts.destination_token_account.owner;

        // Gate 1–7. First failure returns; nothing below runs.
        require!(grant.active, RedlineError::Revoked);
        require!(now < grant.expires_at, RedlineError::Expired);
        require!(nonce == grant.next_nonce, RedlineError::NonceReplay);
        require!(grant.allowed_mints.contains(&mint), RedlineError::MintNotAllowed);
        require!(
            grant.allowed_destinations.contains(&destination),
            RedlineError::DestinationNotAllowed
        );
        require!(
            grant.transaction_count < grant.max_transactions,
            RedlineError::TxCapExceeded
        );
        let new_spent = grant
            .spent_units
            .checked_add(amount_units)
            .ok_or(RedlineError::ArithmeticOverflow)?;
        require!(new_spent <= grant.spend_cap_units, RedlineError::SpendCapExceeded);
        if grant.last_execution_at > 0 {
            require!(
                now - grant.last_execution_at >= grant.cooldown_seconds,
                RedlineError::CooldownActive
            );
        }

        // Counters first, then CPI — both revert together if the CPI fails.
        grant.spent_units = new_spent;
        grant.transaction_count += 1;
        grant.next_nonce += 1;
        grant.last_execution_at = now;

        let vault = &ctx.accounts.vault;
        let owner_key = vault.owner;
        let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, owner_key.as_ref(), &[vault.bump]]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.destination_token_account.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer_seeds,
            ),
            amount_units,
        )?;

        emit!(PolicyDecision {
            grant: grant.key(),
            executor: ctx.accounts.executor.key(),
            nonce,
            mint,
            destination,
            amount_units,
            spent_units: grant.spent_units,
            transaction_count: grant.transaction_count,
            slot: clock.slot,
        });
        Ok(())
    }

    /// Turn trading on for one grant.
    ///
    /// Kept in its own account rather than added to `Grant` on purpose: a new
    /// field on `Grant` would change the layout of every grant already signed
    /// on Devnet, and an upgrade that makes live permissions undecodable is a
    /// worse outcome than an extra account. A grant with no SwapPolicy cannot
    /// swap at all, which is the state every grant signed before this existed
    /// is in — and the state it should stay in until its owner says otherwise.
    pub fn create_swap_policy(
        ctx: Context<CreateSwapPolicy>,
        allowed_programs: Vec<Pubkey>,
        max_slippage_bps: u16,
    ) -> Result<()> {
        require!(
            !allowed_programs.is_empty() && allowed_programs.len() <= MAX_ALLOWLIST,
            RedlineError::InvalidAllowlist
        );
        // A tolerance at or above 100% would set the floor to zero, which is
        // the same as having no floor. Refuse it rather than record a policy
        // that only looks like one.
        require!(max_slippage_bps < BPS_DENOMINATOR as u16, RedlineError::InvalidSlippage);

        let policy = &mut ctx.accounts.swap_policy;
        policy.grant = ctx.accounts.grant.key();
        policy.allowed_programs = allowed_programs;
        policy.max_slippage_bps = max_slippage_bps;
        policy.bump = ctx.bumps.swap_policy;

        emit!(SwapPolicyCreated {
            grant: policy.grant,
            swap_policy: policy.key(),
            programs: policy.allowed_programs.len() as u8,
            max_slippage_bps,
        });
        Ok(())
    }

    /// Trade inside the policy.
    ///
    /// The adapter deliberately does not parse the DEX instruction. Every
    /// venue encodes a swap differently, a parser is one upgrade behind the
    /// venue forever, and a route that looked correct can still hand the vault
    /// back less than it agreed to accept. So the program brackets the call:
    /// it records the vault's two balances, invokes whatever program the owner
    /// allowlisted, reads the balances again, and judges the trade on what
    /// actually moved.
    ///
    /// That makes the guarantee venue-agnostic and, more importantly, honest:
    /// `min_out` is enforced against tokens in the account, not against a
    /// number the route claimed before it ran.
    pub fn execute_swap(
        ctx: Context<ExecuteSwap>,
        nonce: u64,
        amount_in: u64,
        /// What the agent says the route will return before slippage. Recorded
        /// on-chain so the audit trail shows the quote, the floor it implied
        /// and the fill that actually landed.
        quoted_out: u64,
        min_out: u64,
        route_data: Vec<u8>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        let input_mint = ctx.accounts.input_mint.key();
        let output_mint = ctx.accounts.output_mint.key();
        let dex_program = ctx.accounts.dex_program.key();

        {
            let grant = &ctx.accounts.grant;
            let policy = &ctx.accounts.swap_policy;

            // Gates 1-4: identical to a transfer, because a trade is still a
            // spend of the same vault under the same grant.
            require!(grant.active, RedlineError::Revoked);
            require!(now < grant.expires_at, RedlineError::Expired);
            require!(nonce == grant.next_nonce, RedlineError::NonceReplay);
            require!(grant.allowed_mints.contains(&input_mint), RedlineError::MintNotAllowed);

            // Gate 5, in its trade form. A transfer asks "may the money go to
            // that account?"; a swap has no recipient, so it asks "may this
            // grant route through that program, and may it buy that token?".
            // The second half is what stops an agent swapping a treasury into
            // a token nobody can sell.
            require!(policy.allowed_programs.contains(&dex_program), RedlineError::ProgramNotAllowed);
            require!(grant.allowed_mints.contains(&output_mint), RedlineError::OutputMintNotAllowed);
            require!(input_mint != output_mint, RedlineError::InvalidSwapPair);

            // Gates 6-7: the input counts against the same caps a transfer does.
            require!(grant.transaction_count < grant.max_transactions, RedlineError::TxCapExceeded);
            let new_spent = grant
                .spent_units
                .checked_add(amount_in)
                .ok_or(RedlineError::ArithmeticOverflow)?;
            require!(new_spent <= grant.spend_cap_units, RedlineError::SpendCapExceeded);
            if grant.last_execution_at > 0 {
                require!(
                    now - grant.last_execution_at >= grant.cooldown_seconds,
                    RedlineError::CooldownActive
                );
            }

            // Hold the executor to its own quote.
            //
            // The program cannot know a fair price — it has no oracle, and the
            // two sides of a pair have different decimals, so no floor can be
            // derived from `amount_in`. What it can do is make the quote part
            // of the transaction and require the accepted minimum to sit
            // within the owner's tolerance of it.
            //
            // Be precise about what that buys. It defends against the route:
            // a sandwich, a stale pool or a venue that fills worse than it
            // promised all fail here, because the quote was fixed before the
            // swap ran. It does not defend against an executor that quotes
            // dishonestly in the first place — a compromised runtime could
            // quote low and accept low. What bounds *that* is the spend cap
            // and the mint allowlist: it can lose at most the cap, and only
            // into a token the owner named. Slippage is a quality control,
            // not a custody control.
            require!(quoted_out > 0 && min_out > 0, RedlineError::SlippageExceeded);
            let floor = (quoted_out as u128)
                .checked_mul((BPS_DENOMINATOR - policy.max_slippage_bps as u64) as u128)
                .ok_or(RedlineError::ArithmeticOverflow)?
                / BPS_DENOMINATOR as u128;
            require!(min_out as u128 >= floor, RedlineError::SlippageExceeded);
        }

        // What the vault holds before the route runs.
        let before_in = ctx.accounts.vault_input_account.amount;
        let before_out = ctx.accounts.vault_output_account.amount;

        // Hand the route its own accounts, with the vault PDA signing so the
        // DEX can pull the input. Every account comes from the caller except
        // that signature, which only this program can produce.
        let vault_key = ctx.accounts.vault.key();
        let account_metas: Vec<AccountMeta> = ctx
            .remaining_accounts
            .iter()
            .map(|account| AccountMeta {
                pubkey: *account.key,
                is_signer: account.is_signer || *account.key == vault_key,
                is_writable: account.is_writable,
            })
            .collect();
        let instruction = anchor_lang::solana_program::instruction::Instruction {
            program_id: dex_program,
            accounts: account_metas,
            data: route_data,
        };
        let owner_key = ctx.accounts.vault.owner;
        let vault_bump = ctx.accounts.vault.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, owner_key.as_ref(), &[vault_bump]]];
        anchor_lang::solana_program::program::invoke_signed(
            &instruction,
            ctx.remaining_accounts,
            signer_seeds,
        )?;

        // What actually moved. The DEX has had its turn; these two numbers are
        // the only evidence that matters.
        ctx.accounts.vault_input_account.reload()?;
        ctx.accounts.vault_output_account.reload()?;
        let spent_in = before_in
            .checked_sub(ctx.accounts.vault_input_account.amount)
            .ok_or(RedlineError::ArithmeticOverflow)?;
        let received_out = ctx
            .accounts
            .vault_output_account
            .amount
            .checked_sub(before_out)
            .ok_or(RedlineError::ArithmeticOverflow)?;

        // A route that pulled more input than it was authorised to is the
        // failure a quote-only check never sees.
        require!(spent_in <= amount_in, RedlineError::InputOverspent);
        // And the sandwich case: the instruction was well-formed, the route
        // ran, and the vault came back with less than the owner accepted.
        require!(received_out >= min_out, RedlineError::SlippageExceeded);

        let grant = &mut ctx.accounts.grant;
        grant.spent_units = grant
            .spent_units
            .checked_add(spent_in)
            .ok_or(RedlineError::ArithmeticOverflow)?;
        grant.transaction_count += 1;
        grant.next_nonce += 1;
        grant.last_execution_at = now;

        emit!(SwapDecision {
            grant: grant.key(),
            executor: ctx.accounts.executor.key(),
            nonce,
            input_mint,
            output_mint,
            dex_program,
            amount_in: spent_in,
            quoted_out,
            min_out,
            amount_out: received_out,
            spent_units: grant.spent_units,
            transaction_count: grant.transaction_count,
            slot: clock.slot,
        });
        Ok(())
    }

    pub fn revoke_grant(ctx: Context<ManageGrant>) -> Result<()> {
        let grant = &mut ctx.accounts.grant;
        require!(grant.active, RedlineError::Revoked);
        grant.active = false;
        emit!(GrantRevoked { grant: grant.key(), owner: ctx.accounts.owner.key() });
        Ok(())
    }

    /// Owner pulls tokens back out of the vault at any time. No gates: the
    /// owner's own key is the authority here, not a grant.
    pub fn withdraw(ctx: Context<Withdraw>, amount_units: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let owner_key = vault.owner;
        let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, owner_key.as_ref(), &[vault.bump]]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer_seeds,
            ),
            amount_units,
        )?;
        emit!(Withdrawn { vault: vault.key(), owner: owner_key, mint: ctx.accounts.mint.key(), amount_units });
        Ok(())
    }
}

// ───────────────────────── accounts ─────────────────────────

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(agent_id: [u8; 16])]
pub struct CreateGrant<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Grant::INIT_SPACE,
        seeds = [GRANT_SEED, owner.key().as_ref(), agent_id.as_ref()],
        bump
    )]
    pub grant: Account<'info, Grant>,
    #[account(seeds = [VAULT_SEED, owner.key().as_ref()], bump = vault.bump, has_one = owner)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: stored as a pubkey; must sign every execute_transfer.
    pub executor: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteTransfer<'info> {
    #[account(mut, has_one = vault, has_one = executor)]
    pub grant: Account<'info, Grant>,
    #[account(seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    pub executor: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint)]
    pub destination_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateSwapPolicy<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + SwapPolicy::INIT_SPACE,
        seeds = [SWAP_POLICY_SEED, grant.key().as_ref()],
        bump
    )]
    pub swap_policy: Account<'info, SwapPolicy>,
    #[account(has_one = owner)]
    pub grant: Account<'info, Grant>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteSwap<'info> {
    #[account(mut, has_one = vault, has_one = executor)]
    pub grant: Account<'info, Grant>,
    #[account(
        seeds = [SWAP_POLICY_SEED, grant.key().as_ref()],
        bump = swap_policy.bump,
        constraint = swap_policy.grant == grant.key() @ RedlineError::SwapsNotEnabled
    )]
    pub swap_policy: Account<'info, SwapPolicy>,
    #[account(seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    pub executor: Signer<'info>,
    pub input_mint: Account<'info, Mint>,
    pub output_mint: Account<'info, Mint>,
    // Both sides are the vault's own associated accounts. That constraint is
    // what makes "the output returns to the vault" a fact rather than a hope:
    // a route cannot deliver the proceeds somewhere else and still satisfy it.
    #[account(mut, associated_token::mint = input_mint, associated_token::authority = vault)]
    pub vault_input_account: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = output_mint, associated_token::authority = vault)]
    pub vault_output_account: Account<'info, TokenAccount>,
    /// CHECK: checked against the grant's own allowlist before it is invoked;
    /// there is no fixed set of DEX programs to name in a type.
    pub dex_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ManageGrant<'info> {
    #[account(mut, has_one = owner)]
    pub grant: Account<'info, Grant>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(seeds = [VAULT_SEED, owner.key().as_ref()], bump = vault.bump, has_one = owner)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ───────────────────────── state ─────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub owner: Pubkey,
    pub bump: u8,
    pub created_at: i64,
}

/// Field order is the wire layout decoded by backend/src/chain/anchor.ts.
/// Append new fields at the end; never reorder.
#[account]
#[derive(InitSpace)]
pub struct Grant {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub executor: Pubkey,
    pub agent_id: [u8; 16],
    pub policy_hash: [u8; 32],
    pub spend_cap_units: u64,
    pub spent_units: u64,
    pub max_transactions: u32,
    pub transaction_count: u32,
    pub next_nonce: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub cooldown_seconds: i64,
    pub last_execution_at: i64,
    pub active: bool,
    pub bump: u8,
    #[max_len(MAX_ALLOWLIST)]
    pub allowed_mints: Vec<Pubkey>,
    #[max_len(MAX_ALLOWLIST)]
    pub allowed_destinations: Vec<Pubkey>,
}

/// Trading permission for one grant. Separate account, separate decision:
/// an owner who signed a transfer policy has not thereby agreed to let an
/// agent trade.
#[account]
#[derive(InitSpace)]
pub struct SwapPolicy {
    pub grant: Pubkey,
    pub max_slippage_bps: u16,
    pub bump: u8,
    #[max_len(MAX_ALLOWLIST)]
    pub allowed_programs: Vec<Pubkey>,
}

// ───────────────────────── events ─────────────────────────

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct GrantCreated {
    pub grant: Pubkey,
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub executor: Pubkey,
    pub policy_hash: [u8; 32],
    pub spend_cap_units: u64,
    pub max_transactions: u32,
    pub expires_at: i64,
}

/// Emitted only on ALLOW. A rejection surfaces as the transaction error
/// (custom code 6000 + variant index) — see RedlineError.
#[event]
pub struct PolicyDecision {
    pub grant: Pubkey,
    pub executor: Pubkey,
    pub nonce: u64,
    pub mint: Pubkey,
    pub destination: Pubkey,
    pub amount_units: u64,
    pub spent_units: u64,
    pub transaction_count: u32,
    pub slot: u64,
}

#[event]
pub struct SwapPolicyCreated {
    pub grant: Pubkey,
    pub swap_policy: Pubkey,
    pub programs: u8,
    pub max_slippage_bps: u16,
}

/// Emitted only on a swap that settled inside the policy. `amount_in` and
/// `amount_out` are measured, not quoted — they are the balance deltas the
/// program read after the route ran.
#[event]
pub struct SwapDecision {
    pub grant: Pubkey,
    pub executor: Pubkey,
    pub nonce: u64,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub dex_program: Pubkey,
    pub amount_in: u64,
    pub quoted_out: u64,
    pub min_out: u64,
    pub amount_out: u64,
    pub spent_units: u64,
    pub transaction_count: u32,
    pub slot: u64,
}

#[event]
pub struct GrantRevoked {
    pub grant: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct Withdrawn {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub amount_units: u64,
}

// ───────────────────────── errors ─────────────────────────

/// Variant order is the error code (6000 + index). The backend maps these
/// numbers back to reason codes, so append only.
#[error_code]
pub enum RedlineError {
    #[msg("Spend cap must be greater than zero")]
    InvalidSpendCap, // 6000
    #[msg("Transaction cap must be greater than zero")]
    InvalidTransactionCap, // 6001
    #[msg("Expiry must be in the future")]
    InvalidExpiry, // 6002
    #[msg("Cooldown cannot be negative")]
    InvalidCooldown, // 6003
    #[msg("Allowlists must have 1 to 4 entries")]
    InvalidAllowlist, // 6004
    #[msg("Grant has been revoked")]
    Revoked, // 6005
    #[msg("Grant has expired")]
    Expired, // 6006
    #[msg("Nonce does not match the grant's next nonce")]
    NonceReplay, // 6007
    #[msg("Mint is not on the grant allowlist")]
    MintNotAllowed, // 6008
    #[msg("Destination is not on the grant allowlist")]
    DestinationNotAllowed, // 6009
    #[msg("Transaction cap exceeded")]
    TxCapExceeded, // 6010
    #[msg("Spend cap exceeded")]
    SpendCapExceeded, // 6011
    #[msg("Cooldown is still active")]
    CooldownActive, // 6012
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow, // 6013
    // Swap errors are appended, never interleaved: an existing code is part of
    // every audit record already written, and renumbering would rewrite what
    // those records mean.
    #[msg("This grant authorises transfers only — no swap policy exists for it")]
    SwapsNotEnabled, // 6014
    #[msg("That DEX program is not on the grant allowlist")]
    ProgramNotAllowed, // 6015
    #[msg("The token this swap would buy is not on the grant allowlist")]
    OutputMintNotAllowed, // 6016
    #[msg("The swap returned less than the minimum the owner accepted")]
    SlippageExceeded, // 6017
    #[msg("The route spent more of the vault than it was authorised to")]
    InputOverspent, // 6018
    #[msg("Slippage tolerance must be below 100%")]
    InvalidSlippage, // 6019
    #[msg("A swap must exchange two different tokens")]
    InvalidSwapPair, // 6020
}
