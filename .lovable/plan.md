# Portfolio Pulse: Master Blueprint (Phases 5-10) and Security Plan

Planning only. Nothing is built until you approve.

## 1. Current-state assessment

Confirmed by reading the code:
- Stack: React 19, TypeScript, Tailwind v4, Lucide, Recharts, Zod, on TanStack Start (Vite-based, server-rendered, deploys to an edge worker). This is more than a plain Vite single-page app, and the README should say so.
- Pages: Overview, Portfolios, Transactions, Analytics, Watchlist, Settings. Portfolios, Analytics, Watchlist and Settings are still placeholder layouts.
- Data: 5 simulated assets (BTC, ETH, AAPL, NVDA, TSLA), 9 sample trades, fixed "today" of 2026-10-15.
- Holdings are calculated from the trade list using average cost (`transaction-store.ts`). There is no separate holdings list.
- Saved trades: browser storage, checked against a schema on load (max 10,000 rows), checked for overselling across the whole history, and corrupt data is removed and the sample data comes back.
- Trade form: Zod validation, no future dates, size limits, oversell check that accounts for later sells.
- No raw HTML from user input. The only `dangerouslySetInnerHTML` is the stock chart component's theme CSS, which uses developer-set values.
- No secrets, backend or login.

Not verified, or gaps:
- "6 tests pass": only one routing test file exists (`src/test/app-routing.test.tsx`). No tests cover the calculations, the store or validation. I did not re-run the tests, to save credits.
- Price history is generated from current value, so it is not real history. Drawdown analysis needs a disclaimer.
- No CI, dependency audit, secret scanning, security headers, CSV import/export, backup, delete/edit trade, or "reset to samples".
- When saved data is corrupt, it is removed with no warning to the user. That is a data-loss risk.
- The README still holds the original prompt text.

## 2. Roadmap (in dependency order)

Phases are reordered: tests and reliability come before new analytics.

```text
5A Test foundation -> 7 Data mgmt -> 5 Health -> 6 Analytics -> 9 Insights -> 8 Security/release -> 10 Presentation
```

- Phase 5A, Calculation tests (new, comes first): unit tests for `holdingsFromTransactions`, `isConsistent`, `availableQuantity`, `summarize`, the schema, rounding, backdated trades, overselling and corrupt storage. Pure logic tests only, no UI changes.
- Phase 7, Data management (moved earlier, because later phases need data to be safe):
  - CSV export with formula-injection escaping and a JSON backup.
  - CSV and JSON import: 1 MB and 10,000-row limits, schema check, duplicate detection, preview, then a choice to merge or replace.
  - Delete a trade, and reset to samples, each with a confirmation step.
  - When saved data is corrupt, keep a quarantined copy and show a notice instead of deleting silently.
  - CSV parsing written by hand (small and strict, no new package).
- Phase 5, Portfolio health: a pure `health.ts` with a rules-based score covering largest-position share, a concentration index (HHI), stock/crypto split, a volatility class per asset type (labelled as an estimate) and data completeness. Each rule shows its input, threshold and result. The panel carries a "Not financial advice" note.
- Phase 6, Analytics: fill the Analytics page with allocation by asset and type, cost basis vs value, realised vs unrealised profit/loss (from the trades), and drawdown on the simulated series, labelled "simulated history".
- Phase 9, Insights: written observations based on fixed rules, plus a "what-if" slider that applies a price shock to each asset type. No predictions and no AI.
- Phase 8, Security and release: the audit below, security headers, CI workflow, regression tests, error boundaries, and a rollback procedure.
- Phase 10, Presentation: accessibility pass, performance check, accurate README, architecture and trade-offs document, screenshots, published demo.

## 3. Security risk register

| # | Risk | Severity | Evidence | Mitigation |
|---|---|---|---|---|
| 1 | Data loss when saved data is corrupt | High | `load()` removes it silently | Quarantine key, notice in the app, backup export (Phase 7) |
| 2 | Formula injection in CSV export | High (once export exists) | No export yet | Prefix cells that start with `= + - @ \t \r` with `'` |
| 3 | Malformed or oversized imports | High (once import exists) | No import yet | Size and row limits, strict schema, preview, no automatic replace |
| 4 | Calculation errors in money values | High | No logic tests | Phase 5A tests, rounding rules |
| 5 | Account takeover of GitHub or Lovable | High | Outside the code | Turn on MFA, branch protection, review the commit history |
| 6 | Vulnerable dependencies | Medium | Many unused Radix packages | `bun audit` / `npm audit` in CI, Dependabot (free), remove unused packages carefully |
| 7 | Missing security headers | Medium | None set | CSP, X-Content-Type-Options, Referrer-Policy and frame-ancestors, sent from the server entry |
| 8 | XSS | Low | Values rendered as React text only | Keep the rule "no raw HTML", add a lint rule |
| 9 | Secret exposure | Low | No secrets exist | GitHub secret scanning and push protection (free) |
| 10 | Broken deployment or blank page | Medium | No smoke test | Route-render tests, a check after publishing, Lovable version history for rollback |
| 11 | Browser storage quota or abuse | Low | 10k cap exists | Handle quota errors, show a message |

## 4. Acceptance criteria and tests per phase

- 5A: at least 25 unit tests pass, covering oversell, backdated sell, sell to zero then rebuy, float rounding, invalid JSON, wrong schema, inconsistent ledger.
- 7: a file exported and re-imported produces the same trades. Tests cover a formula cell, a BOM, CRLF line endings, quoted commas, an empty file, an oversized file, duplicates, bad dates and an oversell inside an import. Replace needs confirmation. Recovering corrupt data is tested.
- 5: score inputs are fixed, so the same input always gives the same score. Each rule has a unit test. Disclaimer is shown.
- 6: the numbers match `summarize()`. A drawdown test runs on a known series. A limitations label is shown.
- 9: what-if math is tested. With a 0% shock, the result equals the current value.
- 8: headers are confirmed with curl on the published site. The CI workflow is green. An error boundary test passes. The rollback steps are written down.
- 10: Lighthouse accessibility score of at least 95, keyboard navigation works, the README matches the code, and the demo URL loads.

## 5. Architecture decisions to keep

- Holdings are always calculated from the trade list. There is never a separate holdings store.
- All calculations stay in pure functions in `src/lib`. Screens only display results.
- Browser storage only, validated on every load. No backend, login or market API.
- All data is labelled simulated.
- Shared app frame around the root, with one page per menu item.
- Design tokens live in `styles.css`.
- Zod is the only validation library. No new dependencies unless a phase justifies one.

## 6. Zero-budget tools and deployment

- Lovable publish for the demo, on its free subdomain.
- GitHub Actions on a public repo (free): lint, typecheck, test, build, `npm audit`.
- Dependabot, secret scanning and push protection.
- Lighthouse and axe DevTools in the browser for quality checks.
- Rollback through Lovable version history or a GitHub revert commit. Never rewrite history.

## 7. Low-credit prompts per phase

- 5A: "Phase 5A only: add Vitest unit tests for src/lib calculations and transaction-store (oversell, backdated, rounding, corrupt storage). No UI changes. Run tests, report results."
- 7: "Phase 7 only: on Settings, add CSV/JSON export (formula-escaped), validated import with preview, merge/replace, duplicate detection, delete trade and reset with confirmation, and quarantine corrupt storage. Pure logic in src/lib with tests. No new deps."
- 5: "Phase 5 only: add src/lib/health.ts rules-based score with explainable rules plus tests, and a health panel on Overview with a not-advice disclaimer. Minimal UI."
- 6: "Phase 6 only: fill the Analytics page with allocation, realised/unrealised P/L and drawdown using existing data. Label the simulated history. Tests for the new math."
- 9: "Phase 9 only: rule-based insights and a what-if price shock on Analytics. Pure functions with tests. No AI, no predictions."
- 8: "Phase 8 only: add security headers in the server entry, a GitHub Actions CI workflow, an error boundary test, and docs/SECURITY.md plus a rollback guide. Verify headers."
- 10: "Phase 10 only: accessibility fixes, rewrite README and docs/ARCHITECTURE.md to match the code, add screenshots. No feature changes."

## 8. Final release checklist

- Functionality: every page loads, trades can be added, deleted and imported, the totals match, and data survives a reload.
- Security: headers present, audit clean or exceptions documented, no secrets in the repo, MFA on, branch protection on.
- Accessibility: keyboard and screen-reader labels work, contrast meets AA, usable on a 360px-wide screen.
- Deployment: published URL works, clean console, rollback tested once.
- Documentation: README, architecture, limitations and security files match reality.
- Recovery: backup export and restore checked from start to finish, corrupt-data recovery shown.
