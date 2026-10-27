# Simplified REDLINE interface

Follow-up: P0 functional/UI changes and current verification results are documented in [P0 implementation](P0_IMPLEMENTATION.md). The checks below describe the original simplification pass.

The working checkout is `redline/`. `repo/` and `extracted/CSaCLAB-main/` contain earlier, smaller interfaces; `redline-backup-2026-09-24/` is retained as a backup.

## Main changes

- Five primary destinations: Overview, Agents, Spending limits, Vault and Activity. Other tools remain under More, including a collapsed section in the mobile menu.
- Overview presents four setup steps. Completion comes from the connected wallet's verified session, current policies, funded vault and recorded runs. Missing data has loading, retry and unavailable states.
- Creating a policy is an explicit action. The four-step builder validates recipient addresses and token selection before allowing navigation. Selecting an agent from its detail page carries that selection into the builder.
- Policy cards show the budget, expiry, Start agent and Revoke access. Hashes, nonces, transfer monitoring and deliberate over-budget tests are available on demand.
- Agent details use a normal summary, with technical identity and reputation in expandable sections. The publication form opens only when requested.
- The in-app guide follows the same four steps and includes common troubleshooting questions in English and Vietnamese. A saved language choice is preserved; otherwise the browser language determines the initial language.
- Main surfaces have simpler borders and spacing. Decorative vault scenes, raised shadows, page numbering and previous/next page navigation no longer compete with the main actions. Sound controls are available in Settings → Experience.
- Secondary pages are loaded on demand. Explicit chart chunking keeps the chart library out of the initial HTML's module preloads.

## Run locally

From this checkout:

```powershell
npm run dev
```

Backend and Solana environment configuration are still required for real wallet and transaction operations; see the existing setup documentation.

## Verification

- `npm run build`: TypeScript and production build pass.
- `npm test`: 105 tests pass, including ownership, expiry, funding and recorded-run checks for setup progress.
- Chrome checks exercise production output across desktop, tablet and mobile widths, including navigation, the four policy steps, invalid addresses, agent selection, language switching, sign-in UI and unavailable backend data.
- Browser checks use an isolated browser profile and mocked wallet/API responses. They do not validate real signatures, Solana transactions or a live backend.

The local browser script, screenshots and layout results are stored in the workspace's sibling `ui-review/` directory. To rerun against a production preview at port 5174, start `npm exec -- vite preview --host 127.0.0.1 --port 5174 --strictPort`, then run the script from the workspace root:

```powershell
$env:QA_BASE_URL = 'http://127.0.0.1:5174/'
node ui-review/browser-review.mjs
```

The browser script uses the local Chrome installation and ports 9337 and 5174. Changes are local; no hosted deployment is performed.
