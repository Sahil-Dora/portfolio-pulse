// Rule-based insights. Deterministic; each insight names its input and threshold.
// Educational illustration on simulated data — not financial advice.
import { weights, type RuleKind } from './health';
import type { calculateAnalytics, calculateDrawdown } from './analytics';
import type { Holding } from './portfolio-data';

/** Thresholds reuse the health engine's "pass" limits. */
export const INSIGHT_THRESHOLDS = { largestPositionPct: 25, cryptoSharePct: 30, drawdownPct: 10 } as const;

export type InsightSeverity = 'info' | 'warn';
export interface Insight { id: string; severity: InsightSeverity; kind: RuleKind; message: string; input: string; threshold: string }

const pct = (n: number) => `${n.toFixed(1)}%`;

export function generateInsights(
  holdings: Holding[],
  analytics: ReturnType<typeof calculateAnalytics>,
  drawdown: ReturnType<typeof calculateDrawdown>,
): Insight[] {
  const ws = weights(holdings);
  if (!ws.length) return [];
  const out: Insight[] = [];
  const T = INSIGHT_THRESHOLDS;
  const top = ws.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.symbol < a.symbol) ? b : a));
  const topPct = top.weight * 100;
  if (topPct > T.largestPositionPct + 1e-9) out.push({ id: 'largest-position', severity: 'warn', kind: 'measured', message: `${top.symbol} is ${pct(topPct)} of your portfolio value.`, input: `${top.symbol} ${pct(topPct)}`, threshold: `> ${T.largestPositionPct}%` });
  const crypto = ws.filter((w) => w.assetClass === 'crypto').reduce((s, w) => s + w.weight, 0) * 100;
  if (crypto > T.cryptoSharePct + 1e-9) out.push({ id: 'crypto-share', severity: 'warn', kind: 'measured', message: `Crypto makes up ${pct(crypto)} of value, the more volatile asset type.`, input: `${pct(crypto)} crypto`, threshold: `> ${T.cryptoSharePct}%` });
  if (drawdown.maxDrawdownPct >= T.drawdownPct - 1e-9) out.push({ id: 'drawdown', severity: 'warn', kind: 'estimate', message: `Simulated history fell ${pct(drawdown.maxDrawdownPct)} from its peak in the selected period.`, input: `${pct(drawdown.maxDrawdownPct)} max drawdown`, threshold: `≥ ${T.drawdownPct}%` });
  for (const a of [...analytics.assets].filter((x) => x.value > 0 && x.unrealised < 0).sort((x, y) => x.symbol.localeCompare(y.symbol))) {
    out.push({ id: `loss-${a.symbol}`, severity: 'info', kind: 'measured', message: `${a.symbol} is below its average cost.`, input: `${a.unrealised.toFixed(2)} USD unrealised`, threshold: '< 0 USD' });
  }
  if (analytics.realised !== 0) out.push({ id: 'realised', severity: 'info', kind: 'measured', message: `Closed trades ${analytics.realised > 0 ? 'gained' : 'lost'} ${Math.abs(analytics.realised).toFixed(2)} USD (average cost).`, input: `${analytics.realised.toFixed(2)} USD realised`, threshold: '≠ 0 USD' });
  return out;
}
