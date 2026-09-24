import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deterministic } from "../src/routes/risk.js";

// Half of a contract. The other half is src/app/lib/risk-engine.test.ts, which
// runs the same vectors through the browser's offline fallback.
//
// The two implementations are not shared code — the packages build separately —
// so nothing but this file stops them drifting. If they do, a browser that
// cannot reach the API would gate signing on a verdict the server would never
// have given, and no other test would notice.
const vectorsPath = fileURLToPath(new URL("../../risk-vectors.json", import.meta.url));
const { vectors } = JSON.parse(readFileSync(vectorsPath, "utf8")) as {
  vectors: { name: string; policy: Parameters<typeof deterministic>[0]; score: number; level: string; decision: string }[];
};

describe("deterministic risk floor — shared contract", () => {
  it("has vectors to check", () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  for (const v of vectors) {
    it(`server: ${v.name}`, () => {
      const got = deterministic(v.policy);
      expect({ score: got.score, level: got.level, decision: got.decision })
        .toEqual({ score: v.score, level: v.level, decision: v.decision });
    });
  }
});
