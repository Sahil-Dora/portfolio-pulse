# Portfolio Pulse: Master Blueprint (Phases 5A-10) and Security Plan

Planning only. Nothing is built until you approve. All work stays in the existing `portfolio-pulse` repository and the existing connected branch. No new repository, paid services, backend, login, market APIs or new dependencies.

## 1. Current-state assessment

Execution note: I did not run any builds, typechecks or tests while making this plan. Everything below comes from reading the files.

Confirmed by reading the code:
- Stack: React 19, TypeScript, Tailwind v4, Lucide, Recharts, Zod, on TanStack Start (Vite-based, server-rendered). `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, which builds with Nitro for a Cloudflare Workers target, and points the server entry to `src/server.ts`.
- `src/server.ts` wraps TanStack Start's `fetch` handler (error normalisation only). It sets no security headers. `src/start.ts` has error and CSRF middleware. There is no `wrangler` file, `_headers` file or `public/_headers`.
- Pages: Overview, Portfolios, Transactions, Analytics, Watchlist, Settings. Portfolios, Analytics, Watchlist and Settings are placeholder layouts.
- Data: 5 simulated assets, 9 sample trades, fixed "today" of 2026-10-15.
- Holdings are calculated from the trade list using average cost (`holdingsFromTransactions`). Trades are sorted by date, then id. A sell takes away cost at the average cost.
- Realised P/L is not calculated anywhere. Unrealised P/L comes from `summarize()`.
- Fees: none. `Transaction` has no fee field.
- Saved trades: browser storage, schema-checked on load (max 10,000), oversell-checked. Corrupt data is removed silently and the sample data comes back.
- Trade form: Zod validation, no future dates, size limits, oversell check.
- The only `dangerouslySetInnerHTML` is the chart theme CSS, which uses developer-set values.
- Test scripts: `test` (`vitest run`), `lint`, `build`. The test environment is jsdom.
- Tests: one file with 6 test cases (1 test plus 5 from `it.each`), covering routing only. That matches the earlier "6 tests" claim. I did not re-run them.

Not verified, or gaps:
- Whether the 6 tests currently pass, and whether the build currently succeeds (not executed).
- Whether the published hosting sends static files through `src/server.ts`. If it doesn't, headers set there would only reach server-rendered pages. This must be checked against the published site.
- No tests for calculations, the store or validation. No CI, audit, secret scanning, headers, CSV import/export, backup, delete trade or reset.
- The simulated price history is generated from the current value.
- The README still holds the original prompt text.

## 2. Roadmap and dependency order

```text
5A Tests -> 7 Data safety -> 5 Health -> 6 Analytics -> 9 Insights -> 8 Security/release -> 10 Presentation
```

Phase numbers keep their original labels. Only the order changes:
- **5A first:** every later phase changes or reuses the calculation and store logic, so tests must lock in current behaviour before anything is touched.
- **7 before 5:** import, delete and reset change the trade data that Health and Analytics read. Data safety (backup, atomic import, recovering corrupt data) has to exist before users depend on new features. Realised P/L is added here as a pure function, because import checks and Phase 6 both need it.
- **5 before 6:** Health adds the allocation and concentration helpers that Analytics reuses.
- **6 before 9:** Insights and what-if scenarios read the Analytics outputs.
- **8 after the features:** the audit and headers apply to the finished feature set. Smaller security fixes still land inside each phase.
- **10 last:** the documentation and screenshots describe verified, final behaviour.

Phase scope:
- **5A, Financial tests:** pure unit tests, no UI changes. Details in section 4.
- **7, Data management:**
  - CSV export (formula-escaped) and JSON backup.
  - Atomic CSV/JSON import, described below.
  - Delete a trade and reset to samples, each with a confirmation step.
  - Quarantine corrupt saved data with a notice in the app.
  - Hand-written strict CSV parser.
  - Pure `realisedPnl()` function.
- **5, Health:** pure `health.ts`, rules-based. Covers largest-position share, HHI concentration, stock/crypto split, a volatility class per asset type (labelled as an estimate) and data completeness. Each rule shows its inputs and threshold. Includes a "Not financial advice" note.
- **6, Analytics:** allocation, cost basis vs value, realised vs unrealised P/L, and drawdown on the series labelled "simulated history".
- **9, Insights:** rule-based observations and a what-if price shock per asset type. No predictions and no AI.
- **8, Security and release:** headers (after the adapter check below), CI, regression tests, error boundaries, rollback guide.
- **10, Presentation:** accessibility, performance, accurate README and architecture document, screenshots, verified demo.

### Atomic import (Phase 7)

1. Read the file within limits: at most 1 MB and 10,000 rows. Otherwise reject it before parsing.
2. Parse and validate every row with the schema. Collect all errors with their row numbers. Nothing is saved yet.
3. Detect duplicates, both inside the file and against existing trades (same date, symbol, type, quantity and price).
4. Build the candidate ledger in memory (merge or replace) and run `isConsistent` on the whole result, so oversells and backdated sells are caught.
5. Show a preview: rows to add, duplicates skipped, errors. If there are any errors, the import is blocked.
6. Only after the user confirms, write the result once. If the write fails, nothing in memory changes and an error is shown.
7. A failed import, or one the user cancels, leaves saved data exactly as it was. A test compares storage before and after.

### Security headers (Phase 8): verify first

1. Confirm the adapter output (Nitro with a Cloudflare target, from the Lovable config) and whether published static files pass through `src/server.ts`. To check, run `curl -I` on the published HTML and on a published JS file.
2. If both pass through it, add headers by wrapping the response in `src/server.ts` (a standard `Response`/`Headers` copy, no new API).
3. If static files do not pass through it, document that hosting limitation. Apply headers to HTML responses only, and record the gap in the risk register.
4. The CSP has to allow the inline theme style that Recharts and the chart component use. Test it on the preview before publishing.

## 3. Security risk register

| # | Risk | Severity | Evidence | Mitigation |
|---|---|---|---|---|
| 1 | Silent data loss when saved data is corrupt | High | `load()` removes the key | Quarantine copy, in-app notice, backup (Phase 7) |
| 2 | Partial or corrupting import | High (future) | No import yet | Atomic import pipeline above |
| 3 | Formula injection in CSV | High (future) | No export yet | Prefix cells that start with `= + - @ \t \r` with `'` |
| 4 | Calculation errors | High | No logic tests | Phase 5A |
| 5 | Account takeover of GitHub or Lovable | High | Outside the code | MFA, branch protection, review commits |
| 6 | Vulnerable dependencies | Medium | Many unused UI packages | `npm audit` in CI, Dependabot, remove unused packages only with tests passing |
| 7 | Missing security headers | Medium | None set in `src/server.ts` | Verify the adapter first, then add headers (Phase 8) |
| 8 | Broken deployment or blank page | Medium | Only routing tests | Route tests, check after publishing, version-history rollback |
| 9 | XSS | Low | React text rendering only | No raw-HTML rule, lint rule |
| 10 | Secret exposure | Low | No secrets exist | GitHub secret scanning and push protection |
| 11 | Storage quota exceeded | Low | 10k cap exists, `save()` catches errors but shows nothing | Show a message to the user |

## 4. Acceptance criteria and tests per phase

Every phase ends by running `bun run test`, a TypeScript check and `bun run build`, and reports which were actually executed and what they returned.

- **5A:** these unit tests pass:
  - Average cost: single buy, multiple buys at different prices, buy then partial sell (cost removed at the average, average unchanged).
  - Sell to zero then rebuy: the average resets.
  - Ordering: same-date trades are ordered by id. Shuffled input gives the same result. Backdated buys and sells are re-sorted. A backdated sell before the matching buy is rejected by `isConsistent`, and the `availableQuantity` boundary cases are covered.
  - Unrealised P/L: matches the value minus the remaining cost, for each asset and in total.
  - Realised P/L: the expected values are written as tests first and marked pending until Phase 7 adds `realisedPnl()`. Example: buy 10 at 100, sell 4 at 150, realised = 200.
  - Rounding: fractional crypto amounts (0.1 + 0.2 style), the 1e-9 tolerance on oversell, quantity rounded to 8 decimals.
  - Overselling: rejected by `addTransaction`, and the state is unchanged afterwards.
  - Storage: invalid JSON, wrong schema, unknown symbol, an inconsistent ledger, and storage that is unavailable or throws.
  - Fees: not supported (no field). Tests assert that fee-free totals equal quantity × price. If fees are added later, they need a schema change and their own tests.
- **7:** an export then re-import gives identical trades. CSV cases: BOM, CRLF, quoted commas, empty file, header only, oversized file, too many rows, formula cells. Duplicates inside the file and against saved trades. Bad dates and future dates. An oversell created by the import. A failed or cancelled import leaves storage byte-identical. A failed write leaves the state unchanged. Corrupt data is quarantined. Delete and reset need confirmation.
- **5:** the score is deterministic. Each rule is tested at its thresholds. The disclaimer is shown.
- **6:** totals match `summarize()`. Realised plus unrealised is reconciled against the trades. Drawdown is tested on a known series. The limitations label is shown.
- **9:** a 0% shock equals the current value. A -100% crypto shock removes only the crypto value.
- **8:** the adapter check is recorded. Headers are confirmed with `curl -I` on the published site. CI is green. The error boundary test passes. The rollback guide is written.
- **10:** Lighthouse accessibility score of at least 95, keyboard navigation works, the README matches the code, and the demo URL loads.

## 5. Architecture decisions to keep

- Holdings are always calculated from the trade list. There is never a separate holdings store.
- Financial logic stays in pure functions in `src/lib`. Screens only display results.
- Every save to storage goes through the store. Validation is complete before anything is written.
- Browser storage only. No backend, login or market API.
- All financial data is labelled simulated.
- Shared app frame at the root, with one page per menu item.
- Design tokens live in `styles.css`. Zod is the only validator. No new dependencies without a justification.
- One existing repository and branch. History is never rewritten.

## 6. Zero-budget tools and deployment

- Lovable publish on its free subdomain for the demo.
- GitHub Actions on the existing public repo: lint, typecheck, test, build, `npm audit`.
- Dependabot, secret scanning, push protection, MFA, branch protection.
- Lighthouse and axe in the browser.
- Rollback: Lovable version history, or a GitHub revert commit.

## 7. Low-credit prompts per phase

- **5A:** "Phase 5A only: add Vitest unit tests for src/lib (average cost, unrealised P/L, ordering, backdated trades, rounding, oversell, corrupt storage; realised P/L as pending specs). No source or UI changes. Run tests and report actual results."
- **7:** "Phase 7 only: on Settings, add formula-safe CSV/JSON export, atomic validated import with preview (validate all rows, duplicates, dates and holdings before any write), delete and reset with confirmation, quarantine corrupt storage, and realisedPnl(). Pure logic with tests. No new deps. Report test, typecheck and build results."
- **5:** "Phase 5 only: src/lib/health.ts rules-based score with tests, plus a minimal Overview panel with a not-advice disclaimer."
- **6:** "Phase 6 only: Analytics page with allocation, realised/unrealised P/L and drawdown labelled simulated. Tests for the new math."
- **9:** "Phase 9 only: rule-based insights and a what-if price shock. Pure functions with tests. No AI or predictions."
- **8:** "Phase 8 only: first verify with curl whether the published static assets pass through src/server.ts, then add security headers accordingly, a CI workflow, an error boundary test, SECURITY.md and a rollback guide. Report evidence."
- **10:** "Phase 10 only: accessibility fixes, README and ARCHITECTURE.md matching the code, screenshots. No feature changes."

## 8. Final release checklist

- Functionality: every page loads. Add, delete, import and export work. The totals reconcile. Data survives a reload.
- Security: the adapter check is recorded and headers are verified. The audit is clean or its exceptions are documented. No secrets. MFA and branch protection are on.
- Accessibility: keyboard and screen-reader labels work, contrast meets AA, the layout works at 360px.
- Deployment: the published URL works, the console is clean, rollback has been tested once.
- Documentation: README, architecture, limitations and security files match reality, and test results are cited with evidence.
- Recovery: backup and restore are checked from start to finish, a failed import has been shown to leave data unchanged, and corrupt-data recovery is shown.
