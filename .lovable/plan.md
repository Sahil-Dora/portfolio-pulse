# Phase 8: Security Audit Findings (no code changed)

## What was checked
- Production dependency scan against the lockfile (52 packages).
- Source search for secrets, keys, tokens, `eval`, `innerHTML`, `dangerouslySetInnerHTML`.
- Repository root for `.env` / credential files and `.gitignore`.
- Server entry, error page, and response headers.

## Verified findings

1. **Dependency advisories (high, build/server-side only)**
   - `source-map-js` via `@tailwindcss/vite` — denial-of-service in source-map parsing. Build-time tool; not shipped to users.
   - `js-yaml` (2 advisories) via `@tanstack/react-start` — CPU exhaustion on crafted YAML. The app never parses user YAML, so not reachable by visitors.
   - Smallest fix: update those two packages to the newest versions that include the patched sub-packages; if none exists yet, pin the patched sub-package versions via `overrides` in package.json. Then re-run tests and the dependency scan.

2. **No security headers set** (low-medium)
   - Responses carry no Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, or frame protection. Imported files are parsed as data and rendered as text, so no injection path was found, but headers add defence.
   - Smallest fix: add the headers in the existing `src/server.ts` wrapper around the response (the verified Cloudflare/Nitro entry). CSP must allow Google Fonts and inline styles used by charts.

## Checked and clear
- No secrets, API keys, or `.env` files in the project; no backend credentials exist.
- Only `dangerouslySetInnerHTML` is the chart theming helper using fixed, developer-defined colours — no user input.
- No `eval` / `new Function` / raw `innerHTML`.
- Error pages show no stack traces to visitors.
- CSV formula injection, file/row limits, and atomic imports already covered by tests (Phase 7).
- localStorage holds only simulated ledger data; no personal or account data.

## Not verified
- Live headers on the published site (app not yet published).

## Proposed fixes on approval
1. Dependency update/overrides + rescan.
2. Security headers in the server wrapper + a small test confirming they are present.
