import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/clock.js", () => ({ nowSeconds: () => 1000 }));
vi.mock("../src/chain/index.js", () => ({ getChain: () => ({ kind: "mock", programId: "simulation", executorPubkey: "simulation" }) }));
vi.mock("../src/db/client.js", () => ({ prisma: {
  agentGrant: { findMany: vi.fn(async () => [
    { id: "valid", revoked: false, spentUnits: 0n, transactionCount: 0, policyVersion: { expiresAt: new Date(1001_000) } },
    { id: "expired-at-boundary", revoked: false, spentUnits: 0n, transactionCount: 0, policyVersion: { expiresAt: new Date(1000_000) } },
    { id: "revoked", revoked: true, spentUnits: 0n, transactionCount: 0, policyVersion: { expiresAt: new Date(2000_000) } },
  ]) },
  policyDecision: { findMany: vi.fn(async () => []) },
} }));

import { protocolRoutes } from "../src/routes/protocol.js";

describe("active permission count", () => {
  it("excludes revoked and expired grants using the policy clock", async () => {
    const app = Fastify(); await app.register(protocolRoutes);
    try {
      const response = await app.inject({ url: "/protocol/overview" });
      expect(response.statusCode).toBe(200);
      expect(response.json().activity).toMatchObject({ activeGrants: 1, totalGrants: 3 });
    } finally { await app.close(); }
  });
});
