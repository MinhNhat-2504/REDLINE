import { grantScope } from "./pending-grant";
import type { TransactionReceipt } from "./transaction-status";

export interface ActionReceipt extends TransactionReceipt { amountUnits?: string }
const key = (owner: string, action: string) => `redline:receipt:v1:${grantScope(owner)}:${action}`;
export function actionReceipt(owner: string, action: string): ActionReceipt | null {
  if (!owner) return null;
  try { return JSON.parse(localStorage.getItem(key(owner, action)) ?? "null") as ActionReceipt | null; } catch { return null; }
}
export function saveActionReceipt(owner: string, action: string, receipt: ActionReceipt) {
  try { localStorage.setItem(key(owner, action), JSON.stringify(receipt)); }
  catch { throw new Error("Allow local storage to save recovery information before signing."); }
}
export function clearActionReceipt(owner: string, action: string) { localStorage.removeItem(key(owner, action)); }
