import { AccountRole, type Address, type Instruction } from "@solana/kit";

// Plain System Program SOL transfer — used to pay a marketplace listing's
// rental price. No REDLINE program involved: renting is an off-chain
// agreement (backend/src/routes/listings.ts) funded by an ordinary
// wallet-signed payment, verified against Devnet before the hire is recorded.
const SYSTEM_PROGRAM = "11111111111111111111111111111111" as Address;
const TRANSFER_DISCRIMINANT = 2;

export function transferSolInstruction(source: string, destination: string, lamports: bigint): Instruction {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, TRANSFER_DISCRIMINANT, true);
  view.setBigUint64(4, lamports, true);
  return {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: source as Address, role: AccountRole.WRITABLE_SIGNER },
      { address: destination as Address, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

export interface RentalSplit {
  publisherLamports: bigint;
  protocolLamports: bigint;
  treasury: string | null;
}

/**
 * The instructions that pay one rental.
 *
 * Both transfers ride in a single transaction, so the renter signs one prompt
 * and there is no state where the publisher was paid and the marketplace fee
 * was not — the wallet either lands both or neither. The API re-checks both
 * legs against the chain before recording the rental, so a hand-built payment
 * that drops the fee is rejected rather than quietly accepted.
 */
export function rentalPaymentInstructions(payer: string, publisher: string, split: RentalSplit): Instruction[] {
  const instructions = [transferSolInstruction(payer, publisher, split.publisherLamports)];
  if (split.treasury && split.protocolLamports > 0n) {
    instructions.push(transferSolInstruction(payer, split.treasury, split.protocolLamports));
  }
  return instructions;
}
