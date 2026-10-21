# Portfolio Pulse

A stock and cryptocurrency portfolio analytics app that runs entirely in the browser. It tracks a buy/sell ledger and derives holdings, profit/loss, allocation, risk scoring, insights and what-if scenarios from it.

> **Simulated data only.** Prices, quotes and value history are fixed sample values. The app is not connected to live markets, brokers or accounts. Nothing here is financial advice.

## Features

- **Overview** — KPI cards, a value chart (1W / 1M / 3M / 1Y), a stock/crypto allocation chart, top holdings, and a rules-based **Portfolio health** score.
- **Transactions** — a ledger with search, asset and type filters, and a validated buy/sell form. It blocks future dates and overselling, including backdated sells.
- **Ledger tools** — CSV export, JSON backup, and CSV/JSON import with a preview and a choice to merge or replace. Duplicates are detected, deletion and reset need confirmation, and damaged saved data can be recovered.
- **Analytics** — allocation by asset and by type, cost basis vs. current value, realised and unrealised P/L (average-cost method), simulated drawdown, rule-based **Insights**, and a **What-if price shock** with stock and crypto sliders from −50% to +50%. The price shock is temporary and never saved.
- **Portfolios, Watchlist, Settings** — layout pages showing sample content.
- Responsive from 360px phones to desktop.

## Architecture

- **Stack:** React 19, TypeScript, TanStack Start/Router, Vite, Tailwind CSS v4, shadcn/ui (Radix), Recharts, Lucide icons, Zod. Server rendering on a Cloudflare Worker target via Nitro.
- **Single source of truth:** the transaction ledger, stored in browser `localStorage`. Holdings are always derived from it and never edited separately.
- **Pure calculation modules** in `src/lib`, each unit-tested:
  - `ledger-accounting.ts` — average-cost positions, realised gains, derived holdings
  - `portfolio-data.ts` — totals, allocation, deterministic simulated history
  - `analytics.ts` — P/L breakdown and drawdown
  - `health.ts` — deterministic health rules (input → threshold → status → points)
  - `insights.ts` — rule-based insights that show their inputs and thresholds
  - `what-if.ts` — in-memory price shocks, values clamped to ±50%
  - `ledger-validation.ts` / `ledger-files.ts` — schema and chronology validation, CSV/JSON parsing and export
  - `transaction-store.ts` — persistence: writes first, then updates the app; keeps a rollback copy
- **UI** in `src/components/pulse`; routes in `src/routes` (one route per navigation destination).

## Data safety

- Imports apply all-or-nothing: every row is checked for schema, duplicates, dates and holdings before anything is saved. A failed import leaves the existing data unchanged.
- Each change saves a rollback copy first. A failed save never changes the ledger on screen.
- Damaged saved data is kept untouched until you recover it yourself. Changes saved from another tab are detected and blocked.
- Limits: files up to 2 MiB and 10,000 rows.

## Security

- No backend, accounts, API keys or secrets. All data stays in your browser.
- Spreadsheet formula injection is blocked in CSV export.
- Every response sends a Content-Security-Policy, `X-Content-Type-Options: nosniff`, a `Referrer-Policy` and frame protection (`frame-ancestors`), set in `src/lib/security-headers.ts`.
- Dependencies are scanned for known vulnerabilities. Patched versions of transitive packages are pinned with `overrides` in `package.json`.

## Limitations

- All market prices and history are simulated. Drawdown uses synthetic history, not ledger valuations.
- Fees, dividends, splits, multiple currencies (USD only) and multiple portfolios are not supported.
- Data is stored per browser. Clearing site data removes it, so download a backup first.
- Health scores, insight thresholds and assumed volatility rates are illustrative.

## Setup

Requires [Bun](https://bun.sh) 1.3+ (npm works too).

```sh
git clone <this-repository-url>
cd portfolio-pulse
bun install
bun run dev        # http://localhost:8080
```

## Scripts

| Script | Purpose |
|---|---|
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run lint` | ESLint and Prettier checks |
| `bun run format` | Apply Prettier formatting |
| `bun run test` | Run the Vitest suite once |
| `bun run test:watch` | Run Vitest in watch mode |
| `bunx tsc --noEmit` | TypeScript type check |

## Tests

Vitest and Testing Library tests in `src/test` cover:
- average cost, totals, rounding, backdated trades and overselling
- realised/unrealised P/L and drawdown
- health rules, insights and what-if shocks
- CSV/JSON import and export: formula escaping, limits, duplicates, malformed input and atomic failure
- storage recovery and routing

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request. It installs dependencies, then runs lint, the type check, the tests and the production build.

---

Built with [Lovable](https://lovable.dev).
