import "../src/env.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { createSolanaRpc, devnet, getAddressEncoder, getProgramDerivedAddress, type Address } from "@solana/kit";

// Downloads the deployed program's executable bytes from Devnet so tests can
// load the exact on-chain build into LiteSVM without a local Rust toolchain.
// Upgradeable loader layout: program account → programdata account (offset 4),
// programdata = 45-byte header + ELF.

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID = (process.env.REDLINE_PROGRAM_ID ?? "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4") as Address;
const LOADER = "BPFLoaderUpgradeab1e11111111111111111111111" as Address;

const rpc = createSolanaRpc(devnet(RPC));
const [programData] = await getProgramDerivedAddress({ programAddress: LOADER, seeds: [getAddressEncoder().encode(PROGRAM_ID)] });
const { value } = await rpc.getAccountInfo(programData, { encoding: "base64" }).send();
if (!value) throw new Error(`programdata ${programData} not found`);
const raw = Buffer.from(value.data[0], "base64");
const elf = raw.subarray(45);
mkdirSync("target/deploy", { recursive: true });
writeFileSync("target/deploy/redline_guardrails.so", elf);
console.log(`saved ${elf.length} bytes from ${programData} → target/deploy/redline_guardrails.so`);
