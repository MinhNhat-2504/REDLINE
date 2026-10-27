/** Current browser flow creates Devnet permissions for this single mint. */
export const paymentAsset = {
  policySymbol: "USDC",
  label: "dUSDC",
  decimals: 6,
  mint: (import.meta.env.VITE_DEMO_USDC_MINT ?? "").trim(),
  network: "devnet",
} as const;
export const MAX_RECIPIENTS = 4;

export function paymentScope(mint = paymentAsset.mint) {
  return { tokens: [paymentAsset.policySymbol], allowedMints: [mint] };
}
