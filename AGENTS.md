<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the shared Portfolio Pulse shell around the root Outlet and give each navigation destination a leaf route, so navigation stays consistent and directly addressable.
- Keep initial portfolio displays as explicitly labeled static sample data; do not imply a live market or connected account before those services exist.
- Define visual roles in src/styles.css and use shared design-system controls, so the interface remains consistent as screens expand.
- Holdings are derived from the transaction ledger in src/lib/transaction-store.ts (browser localStorage, validated on load); never keep a separate editable holdings list, so ledger and dashboard can't drift.
- Portfolio health scoring lives in src/lib/health.ts as pure, deterministic rules (input, threshold, status, points); UI only renders the report, so scores stay explainable and testable.
- Average-cost ledger accounting is shared through src/lib/ledger-accounting.ts; analytics and transaction-derived holdings use it so realised gains and remaining costs cannot drift.
- Advanced analytics calculations live in src/lib/analytics.ts; drawdown uses the existing synthetic value history and resets its running peak at each selected range, keeping assumptions explicit and testable.
