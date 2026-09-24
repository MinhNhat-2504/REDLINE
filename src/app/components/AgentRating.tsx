import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck, Star } from "lucide-react";
import { api, isSignedIn, type AgentRating, type AgentReview, type Reviewable } from "../lib/api";
import { color, mono, sans, tint } from "../theme";
import { useT } from "../i18n/LanguageContext";

const VI: Record<string, string> = {
  "unrated": "chưa đánh giá",
  "from execution evidence": "từ bằng chứng thực thi",
  "from renter reviews": "từ đánh giá của người thuê",
  "evidence + renter reviews": "bằng chứng + đánh giá người thuê",
  "not enough evidence yet": "chưa đủ bằng chứng",
  "No decisions and no reviews yet — unrated is not the same as badly rated": "Chưa có quyết định hay đánh giá nào — chưa đánh giá không có nghĩa là bị đánh giá kém",
  "UNRATED": "CHƯA ĐÁNH GIÁ",
  "Reputation": "Uy tín",
  "Policy compliance": "Tuân thủ chính sách",
  "allowed": "cho phép",
  "blocked": "bị chặn",
  "On-chain success": "Thành công on-chain",
  "transfers": "lệnh chuyển",
  "Grants": "Grant",
  "runs completed": "lượt chạy hoàn tất",
  "Renter reviews": "Đánh giá người thuê",
  "average": "trung bình",
  "none yet": "chưa có",
  "Compliance and on-chain success come from recorded policy decisions and transaction results — they cannot be voted on. Reviews come only from wallets that paid to rent this agent.": "Tuân thủ và thành công on-chain lấy từ quyết định chính sách và kết quả giao dịch đã ghi — không thể bình chọn. Đánh giá chỉ đến từ ví đã trả tiền thuê agent này.",
  "Update your review": "Cập nhật đánh giá của bạn",
  "You rented this agent — leave a review": "Bạn đã thuê agent này — hãy để lại đánh giá",
  "stars": "sao",
  "Did it stay inside the policy? Anything a treasury should know?": "Agent có ở trong giới hạn chính sách không? Có gì một ngân quỹ nên biết?",
  "Update review": "Cập nhật đánh giá",
  "Submit review": "Gửi đánh giá",
  "Only wallets that rented this agent can review it — that is what keeps the score honest.": "Chỉ ví đã thuê agent này mới được đánh giá — đó là điều giữ cho điểm số trung thực.",
  "Sign in with your wallet to review.": "Đăng nhập bằng ví để đánh giá.",
  "Sign in with your wallet to leave a review.": "Đăng nhập bằng ví để để lại đánh giá.",
  "you": "bạn",
  "One rental buys one review.": "Một lượt thuê, một đánh giá.",
};

// Palette aliases so this file reads against the Astral tokens, not raw hex.
const GOOD = color.verified, WARN = color.warn, STAR = color.primary, INFO = color.info;

// Reputation, shown as two things rather than one star count.
//
// RELIABILITY is what the chain and the policy engine recorded: how often this
// agent's proposals passed the gates, and how often the transfers it was
// allowed to make actually confirmed. Nobody can vote it up.
//
// REVIEWS are what renters said. Only a wallet that paid for a rental can
// leave one, and the rental row is the receipt.
//
// Blending them into a single number would let opinion quietly overwrite
// evidence, so the headline score names its own basis.

export function Stars({ value, size = 12 }: { value: number | null; size?: number }) {
  const tr = useT(VI);
  if (value === null) return <span className="text-[12px]" style={{ ...mono, color: color.textMuted }}>{tr("unrated")}</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} style={{ color: i <= Math.round(value) ? STAR : color.border }} fill={i <= Math.round(value) ? STAR : "none"} />
      ))}
    </span>
  );
}

const BASIS_LABEL: Record<AgentRating["basis"], string> = {
  reliability: "from execution evidence",
  reviews: "from renter reviews",
  both: "evidence + renter reviews",
  insufficient: "not enough evidence yet",
};

/** Compact badge for a marketplace or agent list row. */
export function RatingBadge({ rating }: { rating: AgentRating | null | undefined }) {
  const tr = useT(VI);
  if (!rating || rating.basis === "insufficient") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px]"
        style={{ ...mono, background: color.surfaceInset, border: `1px solid ${color.border}`, color: color.textMuted }}
        title={tr("No decisions and no reviews yet — unrated is not the same as badly rated")}>{tr("UNRATED")}</span>
    );
  }
  const tone = rating.score !== null && rating.score >= 80 ? GOOD : rating.score !== null && rating.score >= 50 ? WARN : color.danger;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-semibold"
      style={{ ...mono, background: tint(tone, 0.14), border: `1px solid ${tint(tone, 0.32)}`, color: tone }}
      title={`${rating.score}/100 · ${tr(BASIS_LABEL[rating.basis])}`}>
      <ShieldCheck size={10} />{rating.score}
      {rating.reviews.count > 0 && <span style={{ color: color.textDim }}>· {rating.reviews.average?.toFixed(1)}★ ({rating.reviews.count})</span>}
    </span>
  );
}

/** The full breakdown, for a detail panel. */
export function RatingDetail({ rating }: { rating: AgentRating | null | undefined }) {
  const tr = useT(VI);
  if (!rating) return null;
  const r = rating.reliability;
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: color.surfaceInset, border: `1px solid ${color.border}` }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11.5px] font-bold tracking-[0.18em] uppercase" style={{ ...mono, color: color.textDim }}>{tr("Reputation")}</div>
          <div className="text-[12px] mt-0.5" style={{ ...sans, color: color.textMuted }}>{tr(BASIS_LABEL[rating.basis])}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ ...mono, color: rating.score === null ? color.textMuted : GOOD }}>
            {rating.score === null ? "—" : rating.score}<span className="text-xs" style={{ color: color.textDim }}>/100</span>
          </div>
          <Stars value={rating.reviews.average} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: tr("Policy compliance"), value: pct(r.complianceRate), hint: `${r.allowed} ${tr("allowed")} · ${r.denied} ${tr("blocked")}` },
          { label: tr("On-chain success"), value: pct(r.onChainSuccessRate), hint: `${r.onChainSuccesses}/${r.onChainAttempts} ${tr("transfers")}` },
          { label: tr("Grants"), value: String(r.grants), hint: `${r.completedRuns} ${tr("runs completed")}` },
          { label: tr("Renter reviews"), value: String(rating.reviews.count), hint: rating.reviews.average ? `${rating.reviews.average.toFixed(2)} ${tr("average")}` : tr("none yet") },
        ].map(cell => (
          <div key={cell.label} className="rounded-lg p-2.5" style={{ background: color.surface, border: `1px solid ${color.border}` }}>
            <div className="text-[10.5px] uppercase tracking-wider" style={{ ...mono, color: color.textDim }}>{cell.label}</div>
            <div className="text-sm font-bold mt-0.5" style={{ ...mono, color: color.text }}>{cell.value}</div>
            <div className="text-[10.5px] mt-0.5" style={{ ...sans, color: color.textMuted }}>{cell.hint}</div>
          </div>
        ))}
      </div>
      <p className="text-[11.5px]" style={{ ...sans, color: color.textMuted, lineHeight: 1.6 }}>{tr("Compliance and on-chain success come from recorded policy decisions and transaction results — they cannot be voted on. Reviews come only from wallets that paid to rent this agent.")}</p>
    </div>
  );
}

/** Reviews list plus the form, shown only to wallets that actually rented. */
export function ReviewPanel({ listingId, wallet }: { listingId: string; wallet: string }) {
  const tr = useT(VI);
  const [rating, setRating] = useState<AgentRating | null>(null);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [reviewable, setReviewable] = useState<Reviewable | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // isSignedIn reads localStorage, which React cannot subscribe to. Signing in
  // happens in the header, so without this the panel would sit there offering
  // nothing until the page was reloaded.
  const [signedIn, setSignedIn] = useState(() => isSignedIn(wallet));
  useEffect(() => {
    const sync = () => setSignedIn(isSignedIn(wallet));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    const t = setInterval(sync, 3_000);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", sync); clearInterval(t); };
  }, [wallet]);

  const load = useCallback(async () => {
    try {
      const data = await api.reviews(listingId);
      setRating(data.rating); setReviews(data.reviews);
      if (signedIn) setReviewable(await api.reviewable(listingId));
      else setReviewable(null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [listingId, signedIn]);
  useEffect(() => { void load(); }, [load]);

  const openHire = reviewable?.hires.find(h => !h.reviewed) ?? reviewable?.hires[0] ?? null;

  async function submit() {
    if (!openHire) return;
    setBusy(true); setError("");
    try {
      await api.submitReview(listingId, { hireId: openHire.id, reviewerWallet: wallet, rating: stars, comment: comment.trim() || undefined });
      setComment("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <RatingDetail rating={rating} />

      {reviewable?.canReview && openHire && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: color.surfaceInset, border: `1px solid ${tint(GOOD, 0.3)}` }}>
          <div className="text-[12px] font-semibold" style={{ ...sans, color: color.text }}>
            {openHire.reviewed ? tr("Update your review") : tr("You rented this agent — leave a review")}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} type="button" onClick={() => setStars(i)} aria-label={`${i} ${tr("stars")}`} aria-pressed={stars === i} className="p-0.5">
                <Star size={16} style={{ color: i <= stars ? STAR : color.border }} fill={i <= stars ? STAR : "none"} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value.slice(0, 600))} rows={2}
            placeholder={tr("Did it stay inside the policy? Anything a treasury should know?")}
            className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
            style={{ ...sans, background: color.surface, border: `1px solid ${color.border}`, color: color.text }} />
          <button type="button" onClick={submit} disabled={busy}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-40"
            style={{ ...sans, background: tint(GOOD, 0.16), border: `1px solid ${tint(GOOD, 0.36)}`, color: GOOD }}>
            {busy ? <LoaderCircle size={11} className="animate-spin inline" /> : null} {openHire.reviewed ? tr("Update review") : tr("Submit review")}
          </button>
        </div>
      )}

      {reviewable && !reviewable.canReview && (
        <p className="text-[11.5px]" style={{ ...sans, color: color.textMuted }}>
          {reviewable.reason === "no-rental" ? tr("Only wallets that rented this agent can review it — that is what keeps the score honest.") : tr("Sign in with your wallet to review.")}
        </p>
      )}
      {!signedIn && wallet && (
        <p className="text-[11.5px]" style={{ ...sans, color: color.textMuted }}>{tr("Sign in with your wallet to leave a review.")}</p>
      )}

      {reviews.length > 0 && (
        <div className="space-y-2">
          {reviews.map(r => (
            <div key={r.id} className="rounded-lg p-2.5" style={{ background: color.surface, border: `1px solid ${color.border}` }}>
              <div className="flex items-center justify-between gap-2">
                <Stars value={r.rating} size={11} />
                <span className="text-[10.5px]" style={{ ...mono, color: color.textDim }}>
                  {r.isMine ? tr("you") : `${r.reviewerWallet.slice(0, 4)}…${r.reviewerWallet.slice(-4)}`} · {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="text-[12px] mt-1.5" style={{ ...sans, color: color.textSecondary, lineHeight: 1.6 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-[11.5px]" style={{ ...mono, color: color.danger }}>{error}</p>}
      <p className="text-[10.5px]" style={{ ...mono, color: INFO, opacity: 0.7 }}>{tr("One rental buys one review.")}</p>
    </div>
  );
}
