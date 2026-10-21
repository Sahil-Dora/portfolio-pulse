# Pre-Phase 10 Security and Release Check

Audit only. No files changed, nothing published, repository visibility untouched.

## What was checked (run this turn)

- All 113 tracked files, and the full history of all 67 commits, searched for API keys, passwords, tokens, private keys, cloud keys and login tokens.
- `.gitignore` contents.
- Production dependency scan (52 packages).
- Security header source and how browser storage is used.

## Results

- **Secrets:** none found, in current files or in history. Every match was harmless: the words "token" or "secret" in plans and the README, a variable named `token` in the import code, and a package name (`js-tokens`). No secret-like files are tracked.
- **Dependencies:** no known vulnerabilities.
- **Security headers:** content policy, nosniff, referrer policy and frame protection are applied to every response. This was checked live in Phase 8.
- **Browser storage:** only the ledger and its rollback copy are stored. They are validated on load, and no code runs raw HTML or `eval`.

## What is public, and what is protected

- **Public to every visitor:** all app code, styles, sample data and the README. A frontend-only app sends its whole code to the browser, so nothing in it can be secret. That is fine here because it contains no secrets.
- **Private to each visitor's browser:** the trades they enter. These stay on their device and never reach you, GitHub or Lovable. Anyone with access to that device, or a browser extension, can read them.
- **Protected by GitHub:** who can see the code and change it (if the repository is private), and your account (MFA).
- **Protected by Lovable:** project editing access, and whether the site is public or limited to your workspace.

## Confirmed risks and smallest fixes

| #   | Severity | Finding                                                                                          | Smallest safe fix                                                                           |
| --- | -------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 1   | Low      | `.gitignore` does not list `.env` files. Only `*.local` and `.dev.vars` are covered. No `.env` exists now. | Add `.env` and `.env.*` (keeping `!.env.example`), so a future key file can't be committed by accident. |
| 2   | Low      | No `Permissions-Policy` header. The app doesn't use the camera, microphone or location.          | Optional: add `Permissions-Policy: camera=(), microphone=(), geolocation=()` and a test line. |
| 3   | Info     | Ledger data is unencrypted in the browser. This is a design limit, not a bug.                    | Mention it in the README Limitations. No code change.                                       |

No high or medium risks were found.

## Not verified, and why

- **Live published headers and HTTPS:** the app isn't published. HTTPS and HSTS are expected to come from hosting; check them after publishing.
- **GitHub settings:** repository visibility, secret scanning, push protection, branch protection and MFA. I can't see these from here; please check them in GitHub's Settings.

## On approval

1. Fix 1 (`.gitignore`). Optionally fix 2 and the README note for 3.
2. Re-run tests, lint, typecheck and build, and report the results. Don't publish.
