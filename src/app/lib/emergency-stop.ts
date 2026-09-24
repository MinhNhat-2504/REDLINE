// Revoking everything at once.
//
// The Settings page has said, as though it were a constraint: "Each grant is
// revoked separately because the on-chain program accepts one owner-signed
// revocation per policy account." Half of that is true — the program does take
// one revocation per grant — but a Solana transaction carries many
// instructions, so N grants is N instructions in ONE transaction and ONE wallet
// prompt. The limitation was the dashboard's, not the chain's.
//
// That matters because it is the difference between a product that prevents and
// a product that responds. Preventing is what the seven gates do. Responding is
// what someone needs at three in the morning when an agent is behaving oddly and
// they do not want to click through nine confirmations to stop it.

import type { Lang } from "../i18n/LanguageContext";

/**
 * Grants per transaction.
 *
 * A Solana transaction is capped at 1232 bytes. Each extra revocation costs a
 * 32-byte grant address in the account table plus about 13 bytes of
 * instruction, so roughly 45 — which leaves room for around twenty. Twelve is
 * deliberately well under that: the cost of guessing high is a transaction the
 * wallet rejects as oversized *after* the owner has decided to stop everything,
 * which is the worst possible moment to be wrong.
 */
export const MAX_REVOKES_PER_TRANSACTION = 12;

export interface StoppableGrant {
  id: string;
  grantPda: string;
  revoked: boolean;
}

export interface StopPlan {
  /** Grants that will actually be revoked, in batches of one transaction each. */
  batches: StoppableGrant[][];
  /** How many grants are being stopped. */
  total: number;
  /** How many wallet prompts this will take. One is the common case. */
  signatures: number;
  /** Already revoked, so left alone — revoking twice would just fail. */
  skipped: number;
}

/**
 * Work out what an emergency stop would do, before doing any of it.
 *
 * Returned rather than executed so the button can say "this revokes 3 grants
 * in 1 signature" instead of asking someone to find out by pressing it.
 */
export function planEmergencyStop(
  grants: StoppableGrant[],
  perTransaction: number = MAX_REVOKES_PER_TRANSACTION,
): StopPlan {
  const active = grants.filter(g => !g.revoked);
  const size = Math.max(1, perTransaction);
  const batches: StoppableGrant[][] = [];
  for (let i = 0; i < active.length; i += size) batches.push(active.slice(i, i + size));
  return {
    batches,
    total: active.length,
    signatures: batches.length,
    skipped: grants.length - active.length,
  };
}

/** Plain-language summary for the confirmation, so nobody stops nine things meaning to stop one. */
export function describeStopPlan(plan: StopPlan, lang: Lang = "en"): string {
  if (lang === "vi") {
    if (plan.total === 0) return "Không có grant nào đang hoạt động — không có gì để dừng.";
    const prompts = plan.signatures === 1 ? "một chữ ký ví" : `${plan.signatures} chữ ký ví`;
    return `Thu hồi ${plan.total} grant đang hoạt động trong ${prompts}. Mọi agent mất quyền ngay lập tức; tiền của bạn vẫn nằm trong vault.`;
  }
  if (plan.total === 0) return "No active grants — there is nothing to stop.";
  const grants = `${plan.total} active grant${plan.total === 1 ? "" : "s"}`;
  const prompts = plan.signatures === 1 ? "one wallet signature" : `${plan.signatures} wallet signatures`;
  return `Revokes ${grants} in ${prompts}. Every agent loses authority immediately; your funds stay in the vault.`;
}

export interface StopResult {
  /** Grants the chain confirmed as revoked. */
  revoked: number;
  /** Grants still active because their transaction failed or was rejected. */
  failed: number;
  /** First failure, verbatim — the owner needs to know what to retry. */
  error: string | null;
  /**
   * Revoked on-chain but the API never recorded it.
   *
   * These grants ARE stopped — the program is the authority and it has already
   * accepted the revocation — so they are not counted as failures. Only the
   * dashboard row is stale, and saying so is better than either silently
   * dropping it or frightening someone about a grant that is dead.
   */
  unrecorded?: number;
}

/**
 * What to say afterwards.
 *
 * A partial stop is the dangerous case: batch one confirms, batch two is
 * rejected in the wallet, and a summary of "stopped" would leave someone
 * believing every agent is off while some still hold authority. So a partial
 * result names the number still running rather than leading with the successes.
 */
export function describeStopResult(result: StopResult, lang: Lang = "en"): string {
  const { revoked, failed, error, unrecorded = 0 } = result;
  if (lang === "vi") {
    const lag = unrecorded > 0 ? ` ${unrecorded} lệnh thu hồi chưa tới được API — chain đã ghi nhận; dashboard này sẽ tự cập nhật.` : "";
    if (failed === 0 && revoked === 0) return `Không có gì được thu hồi.${lag}`;
    if (failed === 0) return `Đã dừng ${revoked} grant. Không agent nào còn quyền với vault nữa.${lag}`;
    const tail = error ? ` ${error}` : "";
    if (revoked === 0) return `Không dừng được gì — ${failed} grant vẫn đang hoạt động.${tail}${lag}`;
    return `Đã dừng ${revoked}, nhưng ${failed} grant VẪN ĐANG HOẠT ĐỘNG — hãy thử dừng lại.${tail}${lag}`;
  }
  const lag = unrecorded > 0 ? ` ${unrecorded} revocation${unrecorded === 1 ? "" : "s"} did not reach the API — the chain has them; this dashboard will catch up.` : "";
  if (failed === 0 && revoked === 0) return `Nothing was revoked.${lag}`;
  if (failed === 0) return `Stopped ${revoked} grant${revoked === 1 ? "" : "s"}. No agent holds authority over the vault any more.${lag}`;
  const tail = error ? ` ${error}` : "";
  if (revoked === 0) return `Nothing was stopped — ${failed} grant${failed === 1 ? " is" : "s are"} still active.${tail}${lag}`;
  return `Stopped ${revoked}, but ${failed} grant${failed === 1 ? " is" : "s are"} STILL ACTIVE — retry the stop.${tail}${lag}`;
}
