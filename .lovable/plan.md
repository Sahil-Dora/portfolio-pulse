# Portfolio Pulse: Pre-Release Engineering Audit

Audit only. No files changed. I reused earlier verified results instead of re-running them: 107 tests passing, a clean TypeScript check, a successful production build, a clean dependency scan, live security headers, and browser checks at 1280px and 360px from Phases 6–9.

## New checks run in this audit
- Lint (ESLint and Prettier), the size of the existing build output, the project files, the README, page landmarks, and labels on icon-only buttons.

## Confirmed defects

| # | Severity | Finding | Evidence | Impact | Smallest safe fix |
|---|---|---|---|---|---|
| 1 | High (release/demo) | Lint fails with 819 errors | `bunx eslint src`: 818 are Prettier formatting issues that can be fixed automatically. 1 is a real rule hit: `no-control-regex` at `src/lib/ledger-files.ts:13` | A reviewer running `npm run lint` sees it fail; this blocks any lint check in CI | Run `prettier --write` on `src` (formatting only). Add a scoped `eslint-disable-next-line no-control-regex` with a comment, because the control-character regex is intentional (it strips control characters for safety). Re-run tests. |
| 2 | High (release/demo) | README is the generic template and still contains the original prompt text | `README.md` lines 1–20 | Weak first impression; nothing explains features, simulated data, the architecture or how to run tests | Rewrite the README: overview, features, "simulated data / not financial advice", architecture (derived holdings, pure calculation modules), scripts, testing, security notes and limitations. |
| 3 | Medium | No CI | No `.github/` folder | Tests, typecheck and build are not checked automatically on every change | Add one free GitHub Actions workflow: install, lint, typecheck, test, build. |
| 4 | Low | The whole app's code downloads as two large files: about 428 KB and 408 KB of JS | `dist/client/assets` (charts library bundled) | Slower first load on mobile; it still works | Optional: load the charts only when needed, using the existing lazy pattern. Not a blocker. |
| 5 | Low | Some error pages use `min-h-screen` | `src/routes/__root.tsx:19,47` | Small layout jump on mobile browsers | Change to `min-h-dvh`. |

## Checked and found no defect
- Financial calculations: average cost, realised/unrealised P/L, totals, rounding, backdated trades, overselling, drawdown, insights and shocks. Covered by 107 passing tests, with sample totals reconciled ($95,507.48 value, $74,300 cost, $1,115.50 realised).
- Data safety: imports apply all-or-nothing, a rollback copy is kept, damaged data is preserved until recovery, a change from another tab is detected and blocked, and failed saves leave data unchanged (Phase 7 tests and browser checks).
- Security: no secrets in the project; protection against spreadsheet formula injection; file and row limits; content policy, nosniff, referrer policy and frame protection are all live; the dependency scan is clean.
- Accessibility: one `<main>`, icon-only buttons have labels, sliders have names, `lang="en"` is set, and statuses use text, not colour alone.
- Every page has a unique title and description.

## Not verified, and why
- **Live published site** (headers, hosting behaviour): the app is not published yet.
- **Full screen-reader and keyboard-only walkthrough**: only spot checks were done. A full manual pass with an automated accessibility checker (axe) was not run.
- **Lighthouse performance score**: not run. It needs the published site for meaningful numbers.
- **Browsers other than Chromium** (Safari, Firefox): only Chromium was tested.
- **Colour contrast on every token**: not measured. The theme tokens are used consistently, but they are unmeasured.
- **Small tap-target sizes**: the 36px icon buttons in the header are below the 44px guideline. Not measured on a device.

## Optional improvements (not defects)
- Add an automated accessibility test (axe) in the existing test setup.
- Add a "Demo data" note to the profile name "Jamie Davis" in the sidebar. It is already labelled "Demo" nearby.
- Increase icon-button tap targets on mobile to 44px.

## Release-blocker checklist
- [ ] Lint passes (finding 1)
- [ ] README rewritten (finding 2)
- [ ] CI workflow added and green (finding 3)
- [x] Tests, typecheck and build pass
- [x] Dependency scan clean; security headers present
- [x] Simulated-data and "Not financial advice" labels present
- [ ] Published, and live headers checked (needs your publish)

## Resume and demo readiness
- **Strengths:** a clean split between pure calculation code and the screens, thorough financial and data-safety tests, careful handling of bad files and broken saved data, security headers, and explainable scoring.
- **Gaps a reviewer would notice:** failing lint, the generic README, and no CI. Fixing findings 1–3 makes the project ready to show.
- **Status:** functionally ready; presentation is not ready until findings 1–3 are fixed.

## Proposed order on approval
1. Fix lint: formatting plus the one rule exception. Re-run tests.
2. Rewrite the README.
3. Add the CI workflow.
4. Optionally, findings 5 and then 4.
5. Re-run lint, typecheck, tests and build, and report the actual results.
