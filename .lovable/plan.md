# Portfolio Pulse — Backend Master Plan (Phases 11–16)

Planning only. No files, branches, packages or backend change until you approve. Nothing is published.

## 0. First action after approval (on `main`, docs only)
- `roadmap.md`: change the open Phase 10 line to complete: "GitHub Actions CI run #6 on main passed: install, lint (0 errors), TypeScript, 117 tests, production build. Not published or deployed." Put Phase 2 and Phase 3 on separate lines (they're currently merged). Add Phases 11–16 as open items.
- This is the last change to `main` until backend work is merged.

## 1. Branch strategy
- You create `phase-11-backend` from `main` on GitHub (Branches → New branch). I cannot run Git commands.
- In Lovable: Project Settings → GitHub → switch the working branch to `phase-11-backend`. All Phase 11–16 edits land there. `main` stays stable and CI keeps checking both branches.
- Rollback for any phase: revert that phase's commits on the branch. Abandoning the whole effort means deleting the branch; `main` is unaffected.
- Caution: switching the backend on connects one backend to the project. Run database changes as forward-only migrations, each with a written "down" script, so the schema can be reverted without touching `main` code.

## 2. Target architecture
```text
Browser (existing UI + calculations, unchanged)
  ├─ TanStack Query cache ── server functions (createServerFn, signed-in)
  │                              ├─ Postgres (RLS: owner-only rows)
  │                              ├─ market_prices cache (shared, read-only to users)
  │                              └─ optional AI call (server-only key, quotas)
  └─ localStorage ledger (stays as offline copy + migration source)
Scheduled server route /api/public/cron/refresh-prices (secret-verified) ─▶ free crypto API
```
- Platform fit: this app runs TanStack Start on Cloudflare Workers. Backend logic uses server functions and server routes. Separate Edge Functions are **not** used. Lovable Cloud provides Postgres, Auth and a scheduler.
- The existing pure modules stay the single source of truth: `ledger-accounting.ts`, `ledger-validation.ts`, `analytics.ts`, `health.ts`, `insights.ts`, `what-if.ts`, `ledger-files.ts`. The server reuses the same validation so rules can't drift between browser and server.

## 3. Proposed file structure (new)
```text
supabase/migrations/            11_profiles, 12_portfolios_ledger, 13_market, 14_ai_usage
src/integrations/supabase/      generated clients + auth attacher (Cloud-managed)
src/routes/auth.tsx             sign in / sign up / reset
src/routes/_authenticated/      account.tsx (profile, sessions, data export/delete)
src/lib/server/                 portfolios.functions.ts, transactions.functions.ts,
                                watchlist.functions.ts, market.functions.ts,
                                ai.functions.ts, usage.functions.ts
src/lib/sync/                   migrate-local.ts (pure), sync-queue.ts
src/lib/queries/                queryOptions per resource
src/routes/api/public/cron/refresh-prices.ts
src/test/                       rls.*, migrate-local.*, market-cache.*, ai-quota.*
```
Changed: `transaction-store.ts` (gets a cloud adapter; localStorage stays as fallback), `__root.tsx` (auth listener), `pulse-shell.tsx` (account menu), `settings.tsx`, `watchlist.tsx`, `README.md`, `AGENTS.md`, `.github/workflows/ci.yml`.

## 4. Database design
| Table | Key columns | RLS |
|---|---|---|
| profiles | id = auth user, display_name, base_currency, ai_opt_in (default false) | owner select/update |
| portfolios | id, user_id, name, created_at, archived_at | owner CRUD |
| transactions | id (keeps client ID), portfolio_id, user_id, date, symbol, asset_type, side, quantity numeric(38,18), price numeric(38,10), fee, source, deleted_at | owner CRUD; unique(portfolio_id, id) |
| transaction_audit | id, transaction_id, user_id, action, before jsonb, after jsonb, at | owner select only; written by trigger |
| watchlists / watchlist_items | user_id, symbol, added_at | owner CRUD |
| market_assets / market_prices | symbol, price, source, fetched_at | authenticated select; writes by server only |
| ai_requests | user_id, kind, tokens_in/out, status, created_at | owner select; insert via server |
| usage_limits | user_id, day, ai_calls, imports | owner select |
| sync_batches | id, user_id, item_count, checksum, status | owner select |

- Every table follows: create → GRANT (authenticated + service_role, no anon) → enable RLS → policies using `auth.uid() = user_id`.
- Oversell and date rules run in a Postgres function (`record_transaction`), not only in the browser. The server function also runs the shared TypeScript validation before calling it.
- Soft delete plus the audit trigger means every change can be traced and restored.

## 5. Phases

### Phase 11 — Cloud foundation, auth, profiles
- Now: browser-only. Goal: optional sign-in, while signed-out mode keeps working exactly as it does today.
- Steps: enable Lovable Cloud → email/password + Google sign-in → profiles table plus a trigger on signup → auth page → `_authenticated` account page → auth listener in root → session list and sign-out-everywhere.
- Secrets: none added by hand; Cloud injects the backend URL and keys. The service key is server-only.
- Risks: redirect loops (avoided by a client-only gate), open signup spam (email confirmation, leaked-password check).
- Tests/done: sign up, sign in and out; signed-out mode passes all 117 existing tests; profile visible only to its owner.

### Phase 12 — Schema and strict RLS
- Steps: migrations from §4 → audit trigger → `record_transaction` function → server functions for portfolio, transaction and watchlist CRUD (Zod input, requireSupabaseAuth).
- Tests/done: user A cannot read, update or delete user B's rows (scripted with two test users); an oversell is rejected in the database; every mutation writes an audit row; the security scan shows no RLS gaps.
- Rollback: down migrations drop the new tables. The frontend is untouched in this phase.

### Phase 13 — Crypto market data
- Source: CoinGecko public API (free, roughly 10–30 calls/min, attribution required). Stock prices stay simulated unless a free source is approved later. This is labelled in the UI.
- Steps: market tables → refresh server route verified by `CRON_SECRET` → scheduled every 5–10 min, batched in one request → `getPrices` server function reads only from the cache → show "updated X min ago" and "stale" when data is older than 30 min.
- Failure: keep the last good price, back off on 429 errors, never call the provider from the browser.
- Tests/done: cache hit with no outbound call; stale flag; a provider outage shows the last value labelled stale.

### Phase 14 — Optional AI analysis
- Off by default; turned on per user in Settings. Uses Lovable AI by default (no OpenAI key needed). OpenAI only if you supply a key, stored as a server secret.
- Input is the computed summaries from `health.ts`/`insights.ts`, never raw ledger rows. Output follows a fixed schema that cites the rule IDs it is based on, labelled "Not financial advice".
- Controls: daily per-user limit in `usage_limits` (e.g. 5/day), max tokens, global kill switch (`AI_ENABLED`), each request logged in `ai_requests`.
- Tests/done: limit reached returns a clear message; disabled means no call is made; schema-invalid output is rejected; the key never appears in the browser bundle (checked by grep in CI).

### Phase 15 — Frontend integration and migration
- TanStack Query options per resource; Zod parsing on every response.
- Migration from localStorage, step by step: (1) validate the local ledger with existing rules → (2) preview counts → (3) upload one batch with a checksum, deduplicated by transaction ID → (4) server confirms the count and checksum → (5) only then mark local as "synced". The local copy and its rollback copy are never deleted automatically.
- Conflicts: compare by ID; differing content is shown to the user instead of being overwritten silently.
- Import/export works against the cloud ledger and reuses `ledger-files.ts`.
- Tests/done: migrating 10,000 rows loses nothing (same count, totals and P/L as the local calculation); a failed upload leaves both sides unchanged; offline still works.

### Phase 16 — Audit, testing and release
- Security scan, dependency scan, RLS review, header check on the published preview, and a secret grep in CI.
- Tests: unit tests (existing), RLS integration tests, Playwright journeys (sign up → migrate → trade → logout).
- Load test with k6 (free) against preview at a small scale (e.g. 50 virtual users). Capacity claims are reported only from measured results; no 5,000-user claim without evidence.
- Backup: user-facing JSON export plus a documented database export procedure. Recovery tested via the audit history and soft deletes. Free tier has no point-in-time restore; this is documented.
- Done: all checks green in CI on the branch → merge request into `main` reviewed by you.

## 6. Dependency map
```text
0 roadmap ─▶ 11 auth ─▶ 12 schema/RLS ─┬─▶ 13 market ─┐
                                       ├─▶ 14 AI ─────┤
                                       └─▶ 15 sync ◀──┘ ─▶ 16 release
```
13 and 14 are independent of each other. 15 needs 12, and needs 13 for live prices.

## 7. Free-tier limits (verify at enable time)
Cloud free usage is limited (database size, monthly users, egress). CoinGecko rate limits apply. Lovable AI usage consumes workspace credits. A scheduler running every 5 min is about 8.6k runs/month. All of these are recorded in the README.

## 8. Tomorrow's exact start
1. Approve this plan. I mark Phase 10 complete in `roadmap.md` on `main`.
2. You create `phase-11-backend` from `main` on GitHub and switch Lovable to that branch.
3. Tell me "start Phase 11". I enable Lovable Cloud and build auth and profiles only, then run tests, lint, typecheck and build, and stop.
