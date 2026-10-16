// Rules-based portfolio health score. Deterministic and explainable.
// Educational illustration on simulated data — not financial advice.
import { holdingMetrics, type AssetClass, type Holding } from './portfolio-data';

export type RuleStatus = 'pass' | 'warn' | 'fail';
export type RuleKind = 'measured' | 'estimate';

export interface HealthRule {
  id: 'largest-position' | 'hhi' | 'crypto-share' | 'volatility' | 'completeness';
  label: string;
  kind: RuleKind;
  input: string;
  threshold: string;
  status: RuleStatus;
  points: number;
  explanation: string;
}

export interface HealthReport { score: number; maxScore: number; grade: string; rules: HealthRule[] }

/** Assumed annualised volatility by asset type. Illustrative estimates, not measured. */
export const ESTIMATED_VOLATILITY: Record<AssetClass, number> = { stock: 30, crypto: 70 };
export const RULE_POINTS: Record<RuleStatus, number> = { pass: 20, warn: 10, fail: 0 };

/** Lower is better: pass when value <= pass, warn when <= warn, otherwise fail. */
export function grade3(value: number, pass: number, warn: number): RuleStatus {
  return value <= pass + 1e-9 ? 'pass' : value <= warn + 1e-9 ? 'warn' : 'fail';
}

/** Position weights (0–1) by market value. Empty or zero-value portfolio gives []. */
export function weights(holdings: Holding[]) {
  const rows = holdings.map(holdingMetrics);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return total > 0 ? rows.map((r) => ({ symbol: r.symbol, assetClass: r.assetClass, weight: r.value / total })) : [];
}

/** Herfindahl–Hirschman Index on a 0–10,000 scale. */
export function hhi(ws: number[]) { return ws.reduce((s, w) => s + (w * 100) ** 2, 0); }

/** Share of holdings whose quantity, cost and prices are all positive and finite (0–100). */
export function completeness(holdings: Holding[]) {
  if (!holdings.length) return 0;
  const ok = holdings.filter((h) => [h.quantity, h.avgCost, h.price, h.previousClose].every((n) => Number.isFinite(n) && n > 0));
  return (ok.length / holdings.length) * 100;
}

const pct = (n: number) => `${n.toFixed(1)}%`;
const rule = (r: Omit<HealthRule, 'points'>): HealthRule => ({ ...r, points: RULE_POINTS[r.status] });

export function evaluateHealth(holdings: Holding[]): HealthReport {
  const ws = weights(holdings);
  const rules: HealthRule[] = [];
  if (!ws.length) {
    const none = { input: 'No holdings', status: 'fail' as const, explanation: 'Record a buy to evaluate this rule.' };
    rules.push(
      rule({ id: 'largest-position', label: 'Largest position', kind: 'measured', threshold: '≤ 25% pass · ≤ 40% warn', ...none }),
      rule({ id: 'hhi', label: 'Concentration (HHI)', kind: 'measured', threshold: '≤ 1,500 pass · ≤ 2,500 warn', ...none }),
      rule({ id: 'crypto-share', label: 'Crypto allocation', kind: 'measured', threshold: '≤ 30% pass · ≤ 50% warn', ...none }),
      rule({ id: 'volatility', label: 'Estimated volatility', kind: 'estimate', threshold: '≤ 35% pass · ≤ 50% warn', ...none }),
      rule({ id: 'completeness', label: 'Data completeness', kind: 'measured', threshold: '100% pass · ≥ 80% warn', ...none }),
    );
  } else {
    const top = ws.reduce((a, b) => (b.weight > a.weight ? b : a));
    const topPct = top.weight * 100;
    const h = hhi(ws.map((w) => w.weight));
    const crypto = ws.filter((w) => w.assetClass === 'crypto').reduce((s, w) => s + w.weight, 0) * 100;
    const vol = ws.reduce((s, w) => s + w.weight * ESTIMATED_VOLATILITY[w.assetClass], 0);
    const done = completeness(holdings);
    rules.push(
      rule({ id: 'largest-position', label: 'Largest position', kind: 'measured', input: `${top.symbol} ${pct(topPct)} of value`, threshold: '≤ 25% pass · ≤ 40% warn', status: grade3(topPct, 25, 40), explanation: 'A single asset dominating value raises single-asset risk.' }),
      rule({ id: 'hhi', label: 'Concentration (HHI)', kind: 'measured', input: `${Math.round(h).toLocaleString('en-US')} across ${ws.length} assets`, threshold: '≤ 1,500 pass · ≤ 2,500 warn', status: grade3(h, 1500, 2500), explanation: 'Sum of squared position weights; higher means fewer effective positions.' }),
      rule({ id: 'crypto-share', label: 'Crypto allocation', kind: 'measured', input: `${pct(crypto)} crypto · ${pct(100 - crypto)} stocks`, threshold: '≤ 30% pass · ≤ 50% warn', status: grade3(crypto, 30, 50), explanation: 'Share of value in the more volatile asset type.' }),
      rule({ id: 'volatility', label: 'Estimated volatility', kind: 'estimate', input: `${pct(vol)} per year (assumed)`, threshold: '≤ 35% pass · ≤ 50% warn', status: grade3(vol, 35, 50), explanation: `Weighted by assumed rates: stocks ${ESTIMATED_VOLATILITY.stock}%, crypto ${ESTIMATED_VOLATILITY.crypto}%. Not measured from prices.` }),
      rule({ id: 'completeness', label: 'Data completeness', kind: 'measured', input: `${pct(done)} of holdings complete`, threshold: '100% pass · ≥ 80% warn', status: done >= 100 - 1e-9 ? 'pass' : done >= 80 ? 'warn' : 'fail', explanation: 'Each holding needs positive quantity, cost and prices.' }),
    );
  }
  const score = rules.reduce((s, r) => s + r.points, 0);
  const maxScore = rules.length * RULE_POINTS.pass;
  const ratio = score / maxScore;
  return { score, maxScore, grade: ratio >= 0.8 ? 'Strong' : ratio >= 0.5 ? 'Fair' : 'Needs attention', rules };
}
