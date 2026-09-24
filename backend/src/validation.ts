import { address } from "@solana/kit";
import { z } from "zod";

export const MAX_U64 = 18_446_744_073_709_551_615n;

export const SolanaAddressSchema = z.string().superRefine((value, context) => {
  try { address(value); }
  catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "must be a valid 32-byte Solana address" });
  }
});

export const PositiveU64StringSchema = z.string()
  .regex(/^(0|[1-9]\d*)$/, "must be a base-10 integer")
  .superRefine((value, context) => {
    if (!/^(0|[1-9]\d*)$/.test(value)) return;
    const amount = BigInt(value);
    if (amount < 1n) context.addIssue({ code: z.ZodIssueCode.custom, message: "must be greater than zero" });
    if (amount > MAX_U64) context.addIssue({ code: z.ZodIssueCode.custom, message: "must fit in an unsigned 64-bit integer" });
  });
