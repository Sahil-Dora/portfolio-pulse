import { allocation, holdingMetrics, summarize, type HistoryPoint } from './portfolio-data';
import { holdingsFromTransactions, ledgerPositions } from './ledger-accounting';
import type { Transaction } from './transactions-data';

/** Positive percentages denote losses from the running peak, not investment returns. */
export function calculateDrawdown(history: HistoryPoint[]) {
  let peakValue = 0, peakDate: string | null = null;
  let maxDrawdownPct = 0, maxPeakDate: string | null = null, troughDate: string | null = null;
  const points = [...history].sort((a, b) => a.date.localeCompare(b.date)).map((point) => {
    if (point.value > peakValue) { peakValue = point.value; peakDate = point.date; }
    const drawdownPct = peakValue > 0 ? Math.max(0, (peakValue - point.value) / peakValue * 100) : 0;
    if (drawdownPct > maxDrawdownPct) {
      maxDrawdownPct = drawdownPct; maxPeakDate = peakDate; troughDate = point.date;
    }
    return { ...point, peakValue, drawdownPct };
  });
  return { points, maxDrawdownPct, currentDrawdownPct: points.at(-1)?.drawdownPct ?? 0, maxPeakDate, troughDate };
}

/** Quotes/history are simulated; fees are not supported by the existing ledger. */
export function calculateAnalytics(transactions: Transaction[]) {
  const holdings = holdingsFromTransactions(transactions);
  const summary = summarize(holdings);
  const metrics = holdings.map(holdingMetrics);
  const assets = ledgerPositions(transactions).filter((p) => transactions.some((t) => t.symbol === p.quote.symbol)).map((p) => {
    const current = metrics.find((h) => h.symbol === p.quote.symbol);
    return {
      symbol: p.quote.symbol, name: p.quote.name, assetClass: p.quote.assetClass,
      value: current?.value ?? 0, costBasis: current?.costBasis ?? 0,
      unrealised: current?.profitLoss ?? 0, realised: p.realised,
      percent: summary.totalValue ? (current?.value ?? 0) / summary.totalValue * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value || a.symbol.localeCompare(b.symbol));
  const realised = assets.reduce((sum, a) => sum + a.realised, 0);
  return { assets, assetTypes: allocation(holdings), summary, realised, unrealised: summary.totalProfitLoss, totalProfitLoss: realised + summary.totalProfitLoss };
}