export const MAX_TOKEN_UNITS = 18_446_744_073_709_551_615n;

/** Parse decimal text directly to units, without floating point rounding. */
export function tokenUnits(text: string, decimals = 6): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(text.trim())) throw new Error("Enter a valid positive amount.");
  const [whole, fraction = ""] = text.trim().split(".");
  if (fraction.length > decimals) throw new Error("Use at most six decimal places.");
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
  if (units <= 0n) throw new Error("Amount must be greater than zero.");
  if (units > MAX_TOKEN_UNITS) throw new Error("Amount exceeds the supported token limit.");
  return units;
}

export function withdrawalProblem(text: string, balance: string | null | undefined): string {
  if (balance == null || !/^\d+$/.test(balance)) return "Refresh your balance before withdrawing.";
  try {
    return tokenUnits(text) > BigInt(balance) ? "Amount exceeds your available balance." : "";
  } catch (error) { return (error as Error).message; }
}
