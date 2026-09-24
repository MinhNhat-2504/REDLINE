import "../src/env.js";
import { prisma } from "../src/db/client.js";

// Intents that never got a decision are debris from a crashed request
// (e.g. the RPC died between precheck and send). They are not evidence of
// anything, so sweep the ones older than 10 minutes. Safe to run any time.
const cutoff = new Date(Date.now() - 10 * 60 * 1000);
const stale = await prisma.transactionIntent.deleteMany({ where: { decision: null, createdAt: { lt: cutoff } } });
console.log(`removed ${stale.count} intents without a decision older than ${cutoff.toISOString()}`);
await prisma.$disconnect();
