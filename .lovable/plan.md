# Phase 9 Preflight: Rule-Based Insights + What-If Price Shock

Planning only. No files changed, no installs, no commands that change anything.

## What exists to reuse (checked)
- Holdings come from the ledger via `usePortfolio()` in `src/lib/transaction-store.ts`.
- `holdingMetrics` / `summarize` / `allocation` in `src/lib/portfolio-data.ts` give value, cost, P/L, and the stock/crypto split.
- `evaluateHealth`, `weights`, `hhi`, `ESTIMATED_VOLATILITY` in `src/lib/health.ts` give concentration and risk rules.
- `calculateAnalytics` and `calculateDrawdown` in `src/lib/analytics.ts` give realised/unrealised P/L and drawdown.
- Overview already shows `HealthPanel`; Analytics uses the `panel` / `metrics` styles and the shared `Button`.

## What gets built
1. **Insights**: a short list of plain-language notes, each tied to a fixed rule, a threshold and the number that triggered it. For example: "BTC is 42% of your portfolio (above 35%)", "Crypto is 58% of value", "Largest drawdown in 1Y: −12% (simulated)", "AAPL has an unrealised loss". Each note says whether it was measured or estimated. The panel says "Not financial advice" and that the data is simulated.
2. **What-if price shock**: two sliders, Stocks and Crypto, each from −50% to +50% in 5% steps, plus a Reset button. The panel shows the new total value, the change in value and P/L, the new stock/crypto split, and the health score after the shock. Nothing is saved, and the ledger is never changed.

Placement: both panels go on the Analytics page, below the existing sections. Overview stays as it is.

## Files
- New `src/lib/insights.ts`: pure `generateInsights(holdings, analytics, drawdown)` returning `{ id, severity, kind, message, input, threshold }[]`. Thresholds are exported constants that reuse the health thresholds where they exist.
- New `src/lib/what-if.ts`: pure `applyShock(holdings, { stock, crypto })`. It returns new holdings with only `price` scaled, then reuses `summarize`, `allocation` and `evaluateHealth`. Cost basis, quantity and realised P/L stay the same.
- New `src/components/pulse/insights-panel.tsx` and `src/components/pulse/what-if-panel.tsx`, using the existing `panel` classes and shared `Button` / `Slider`.
- Edit `src/components/pulse/analytics-page.tsx`: render the two panels.
- Edit `src/styles.css`: a few rules for the insight list and slider rows, with 360px checked.
- New tests `src/test/insights.test.ts` and `src/test/what-if.test.ts`.
- After verification: one line each in `roadmap.md` and `AGENTS.md`.

## Edge cases
- Empty ledger: no insights, only an empty-state message. The shock panel shows $0 and no health score, with no division by zero.
- Only stocks or only crypto: the slider for the missing type does nothing and is labelled so.
- Values are clamped to −50% to +50%. Bad values (NaN, out of range) fall back to 0. Prices can never go to zero or below.
- A 0/0 shock must equal the current totals exactly.
- Rounding: totals reconcile with `summarize` to the cent.
- Insights are always in the same order, so output is the same for the same input.
- Damaged-storage mode: the panels use the sample state shown, and the existing warning stays.

## Focused tests
- `applyShock` at 0/0 equals the current summary.
- −10% stocks only: stock value falls exactly 10%, crypto is unchanged, and the total equals the sum of the two.
- Cost basis and realised P/L stay the same after a shock; unrealised P/L changes by the value change.
- Clamping and NaN handling.
- Empty and single-type portfolios.
- Each insight fires exactly at, above and below its threshold, and does not fire otherwise.
- Same input gives the same insight list.
- The shocked health score matches `evaluateHealth` on the shocked holdings.

## Verification on approval
Run the full test suite, the TypeScript check and the production build. Check in the browser at 1280px and 360px with sliders moved and the ledger empty. Update `roadmap.md` only after all checks pass.

## Not included
No live prices, AI, backend, new packages, saved scenarios, or changes to existing calculations.
