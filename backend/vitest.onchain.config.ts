import { defineConfig } from "vitest/config";
// LiteSVM suite: run explicitly with `npm run test:onchain` (Linux/macOS or CI).
export default defineConfig({ test: { environment: "node", include: ["test/onchain*.test.ts"], testTimeout: 60_000 } });
