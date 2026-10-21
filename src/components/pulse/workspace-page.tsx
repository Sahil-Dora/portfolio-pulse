import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ArrowLeftRight,
  Star,
  Settings,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HoldingsTable } from "./overview";
const details = {
  portfolios: {
    title: "Portfolios",
    subtitle: "A home for every investment.",
    icon: BriefcaseBusiness,
    empty: "No connected portfolios",
  },
  analytics: {
    title: "Analytics",
    subtitle: "A deeper perspective on your portfolio.",
    icon: ChartNoAxesCombined,
    empty: "No analytics yet",
  },
  transactions: {
    title: "Transactions",
    subtitle: "Your investment activity in one place.",
    icon: ArrowLeftRight,
    empty: "No transactions yet",
  },
  watchlist: {
    title: "Watchlist",
    subtitle: "Keep your next investment in sight.",
    icon: Star,
    empty: "No saved watchlist yet",
  },
  settings: {
    title: "Settings",
    subtitle: "Your account and workspace.",
    icon: Settings,
    empty: "Demo workspace",
  },
};
export function WorkspacePage({ section }: { section: keyof typeof details }) {
  const { title, subtitle, icon: Icon, empty } = details[section];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {section === "portfolios" ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Sample portfolio</h2>
              <p className="panel-subtitle">Stocks & cryptocurrency · USD</p>
            </div>
            <span className="plan-tag">SAMPLE</span>
          </div>
          <HoldingsTable />
        </section>
      ) : (
        <section className="destination">
          <span className="destination-icon">
            <Icon size={23} />
          </span>
          <h2>{empty}</h2>
          <p>
            {section === "settings"
              ? "Jamie Davis · Personal account"
              : "Your workspace is ready for what comes next."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Back to overview</Link>
          </Button>
        </section>
      )}
      <footer className="page-footer">
        <span>Sample data · Not connected to live markets</span>
        <span>Portfolio Pulse © 2026</span>
      </footer>
    </div>
  );
}
