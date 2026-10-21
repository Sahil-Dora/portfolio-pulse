import { createFileRoute } from "@tanstack/react-router";
import { TransactionLedger } from "@/components/pulse/transaction-ledger";
export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions | Portfolio Pulse" },
      { name: "description", content: "Your investment activity and transaction history." },
      { property: "og:title", content: "Transactions | Portfolio Pulse" },
      { property: "og:description", content: "Your investment activity and transaction history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});
function Page() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p>Your investment activity in one place · simulated data.</p>
        </div>
      </div>
      <TransactionLedger />
      <footer className="page-footer">
        <span>Simulated data · Not connected to live markets</span>
        <span>Portfolio Pulse © 2026</span>
      </footer>
    </div>
  );
}
