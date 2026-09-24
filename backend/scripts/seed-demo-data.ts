import "../src/env.js";
import { prisma } from "../src/db/client.js";

async function main() {
  console.log("Seeding demo data into SQLite database...");

  // 1. Owner & Vault
  const walletAddress = "MockWalletOwner1111111111111111111111111111";
  const owner = await prisma.owner.upsert({
    where: { wallet: walletAddress },
    update: {},
    create: { wallet: walletAddress },
  });

  const vaultPda = "MockVaultPda1111111111111111111111111111111111";
  const vault = await prisma.vault.upsert({
    where: { vaultPda },
    update: {},
    create: {
      ownerId: owner.id,
      vaultPda,
      network: "mock",
    },
  });

  // 2. AgentVersion
  const agentHash = "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef";
  const agentVersion = await prisma.agentVersion.upsert({
    where: { agentHash_publisherWallet: { agentHash, publisherWallet: walletAddress } },
    update: {},
    create: {
      name: "REDLINE Autonomous Trader v1.2",
      version: "1.2.0",
      strategy: "DeFi Momentum & Arbitrage",
      modelHash: "model_hash_gemini_2_5_flash",
      codeHash: "code_hash_solana_kit_agent",
      configHash: "config_hash_default",
      agentHash,
      publisherWallet: walletAddress,
    },
  });

  // 3. PolicyVersions & Grants
  const policyHash1 = "p111111111111111111111111111111111111111111111111111111111111111";
  const policyVersion1 = await prisma.policyVersion.upsert({
    where: { policyHash: policyHash1 },
    update: {},
    create: {
      policyHash: policyHash1,
      canonicalJson: JSON.stringify({ spendCapUsdc: 50, maxTransactions: 10 }),
      spendCapUnits: 50_000_000n, // 50 USDC (6 decimals)
      maxTransactions: 10,
      cooldownSeconds: 30,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days from now
      allowedMints: JSON.stringify(["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]), // USDC
      allowedDests: JSON.stringify(["TargetWallet11111111111111111111111111111111"]),
    },
  });

  const grantPda1 = "GrantPda11111111111111111111111111111111111111";
  const grant1 = await prisma.agentGrant.upsert({
    where: { grantPda: grantPda1 },
    update: {
      spentUnits: 38_000_000n,
      transactionCount: 3,
    },
    create: {
      ownerId: owner.id,
      vaultId: vault.id,
      agentVersionId: agentVersion.id,
      policyVersionId: policyVersion1.id,
      grantPda: grantPda1,
      agentId: "agt_1042_demo",
      executorPubkey: "ExecutorPubkey11111111111111111111111111111111",
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      spentUnits: 38_000_000n, // 38 USDC spent out of 50 USDC
      transactionCount: 3,
      nextNonce: 4,
      revoked: false,
    },
  });

  // 4. Create Transaction Intents & Decisions
  // Intent 1: Allowed 25 USDC
  const intent1 = await prisma.transactionIntent.create({
    data: {
      grantId: grant1.id,
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amountUnits: 25_000_000n,
      destination: "TargetWallet11111111111111111111111111111111",
      nonce: 1,
      reason: "DEX Arbitrage Rebalance",
      intentHash: "intent_hash_001",
      decision: {
        create: {
          allow: true,
          reasonCode: "OK",
          ruleSnapshotHash: policyHash1,
          stage: "onchain",
          chainTx: {
            create: {
              signature: "5Kq...TxSignature001Allowed",
              slot: 289100234n,
              programId: "MockRedline11111111111111111111111111111111",
              result: "success",
            },
          },
        },
      },
    },
  });

  // Intent 2: Blocked by SPEND_CAP_EXCEEDED
  const intent2 = await prisma.transactionIntent.create({
    data: {
      grantId: grant1.id,
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amountUnits: 65_000_000n, // 65 USDC exceeds remaining cap!
      destination: "TargetWallet11111111111111111111111111111111",
      nonce: 2,
      reason: "High Volume Liquidity Swap",
      intentHash: "intent_hash_002",
      decision: {
        create: {
          allow: false,
          reasonCode: "SPEND_CAP_EXCEEDED",
          ruleSnapshotHash: policyHash1,
          stage: "precheck",
        },
      },
    },
  });

  // Intent 3: Blocked by DESTINATION_NOT_ALLOWED
  const intent3 = await prisma.transactionIntent.create({
    data: {
      grantId: grant1.id,
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amountUnits: 5_000_000n,
      destination: "UnknownUnauthorizedWallet9999999999999999",
      nonce: 3,
      reason: "External Transfer Attempt",
      intentHash: "intent_hash_003",
      decision: {
        create: {
          allow: false,
          reasonCode: "DESTINATION_NOT_ALLOWED",
          ruleSnapshotHash: policyHash1,
          stage: "precheck",
        },
      },
    },
  });

  // 5. Audit Events
  await prisma.auditEvent.createMany({
    data: [
      {
        actorType: "owner",
        actorId: walletAddress,
        eventType: "grant.created",
        subjectType: "grant",
        subjectId: grant1.id,
        payloadHash: "payload_hash_1",
        payload: JSON.stringify({ grantPda: grantPda1, agent: "REDLINE Autonomous Trader v1.2", spendCapUsdc: 50 }),
      },
      {
        actorType: "agent",
        actorId: "agt_1042_demo",
        eventType: "chain.policy_decision",
        subjectType: "intent",
        subjectId: intent2.id,
        payloadHash: "payload_hash_2",
        payload: JSON.stringify({ reasonCode: "SPEND_CAP_EXCEEDED", requested: 65, cap: 50 }),
      },
      {
        actorType: "agent",
        actorId: "agt_1042_demo",
        eventType: "chain.policy_decision",
        subjectType: "intent",
        subjectId: intent3.id,
        payloadHash: "payload_hash_3",
        payload: JSON.stringify({ reasonCode: "DESTINATION_NOT_ALLOWED", destination: "UnknownUnauthorizedWallet9999999999999999" }),
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch(e => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
