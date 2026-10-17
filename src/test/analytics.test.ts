import { describe, expect, it } from 'vitest';
import { calculateAnalytics, calculateDrawdown } from '@/lib/analytics';
import { buildHistory, summarize } from '@/lib/portfolio-data';
import { holdingsFromTransactions } from '@/lib/transaction-store';
import { mockTransactions, type Transaction } from '@/lib/transactions-data';

const tx = (id: string, date: string, type: 'buy' | 'sell', quantity: number, price: number): Transaction => ({ id, date, type, quantity, price, symbol: 'AAPL' });

describe('analytics accounting', () => {
  it('matches existing sample totals and realises gains only on sold quantities', () => {
    const a = calculateAnalytics(mockTransactions);
    expect(a.summary).toEqual(summarize(holdingsFromTransactions(mockTransactions)));
    expect(a.summary.totalValue).toBeCloseTo(95507.48, 2);
    expect(a.summary.totalCost).toBeCloseTo(74300, 2);
    expect(a.realised).toBeCloseTo(1115.5, 8);
    expect(a.unrealised).toBeCloseTo(21207.48, 2);
    expect(a.totalProfitLoss).toBeCloseTo(22322.98, 2);
  });
  it('individual assets and asset types reconcile to portfolio value', () => {
    const a = calculateAnalytics(mockTransactions);
    expect(a.assets.reduce((s, r) => s + r.value, 0)).toBeCloseTo(a.summary.totalValue, 8);
    expect(a.assets.reduce((s, r) => s + r.costBasis, 0)).toBeCloseTo(a.summary.totalCost, 8);
    expect(a.assets.reduce((s, r) => s + r.unrealised, 0)).toBeCloseTo(a.unrealised, 8);
    expect(a.assets.reduce((s, r) => s + r.percent, 0)).toBeCloseTo(100, 8);
    expect(a.assetTypes.map((r) => r.value)).toEqual([54447.8, 41059.68]);
    expect(a.assetTypes.reduce((s, r) => s + r.percent, 0)).toBeCloseTo(100, 8);
  });
  it('uses weighted average cost for partial sells and preserves realised losses', () => {
    const a = calculateAnalytics([tx('a', '2026-01-01', 'buy', 10, 100), tx('b', '2026-01-02', 'buy', 10, 200), tx('c', '2026-01-03', 'sell', 5, 120)]);
    expect(a.realised).toBe(-150);
    expect(a.summary.totalCost).toBe(2250);
    expect(a.unrealised).toBeCloseTo(15 * (189.98 - 150), 8);
  });
  it('retains realised gains for closed positions and resets cost on rebuy', () => {
    const closed = [tx('a', '2026-01-01', 'buy', 10, 100), tx('b', '2026-01-02', 'sell', 10, 120)];
    const a = calculateAnalytics(closed);
    expect(a.realised).toBe(200);
    expect(a.assets[0]).toMatchObject({ costBasis: 0, value: 0, unrealised: 0, percent: 0 });
    const rebuy = calculateAnalytics([...closed, tx('c', '2026-01-03', 'buy', 2, 300)]);
    expect(rebuy.realised).toBe(200);
    expect(rebuy.summary.totalCost).toBe(600);
  });
  it('orders backdated trades by date, and same-day trades by ID consistently', () => {
    const ordered = [tx('a', '2026-01-01', 'buy', 10, 100), tx('b', '2026-01-01', 'buy', 10, 200), tx('c', '2026-01-02', 'sell', 5, 200)];
    expect(calculateAnalytics([...ordered].reverse())).toEqual(calculateAnalytics(ordered));
    expect(calculateAnalytics(ordered).realised).toBe(250);
  });
  it('clears fractional crypto cost dust after a full sale', () => {
    const transactions: Transaction[] = [
      { ...tx('a', '2026-01-01', 'buy', 0.1, 50000), symbol: 'BTC' },
      { ...tx('b', '2026-01-01', 'buy', 0.2, 50000), symbol: 'BTC' },
      { ...tx('c', '2026-01-02', 'sell', 0.3, 60000), symbol: 'BTC' },
    ];
    const a = calculateAnalytics(transactions);
    expect(a.realised).toBeCloseTo(3000, 6);
    expect(a.summary.totalCost).toBe(0);
    expect(a.unrealised).toBe(0);
  });
  it('handles an empty ledger and a stock-only allocation', () => {
    const empty = calculateAnalytics([]);
    expect([empty.realised, empty.unrealised, empty.totalProfitLoss, empty.summary.totalValue]).toEqual([0, 0, 0, 0]);
    expect(empty.assets).toEqual([]);
    expect(empty.assetTypes.map((t) => t.percent)).toEqual([0, 0]);
    expect(calculateAnalytics([tx('a', '2026-01-01', 'buy', 1, 100)]).assetTypes.map((t) => t.percent)).toEqual([100, 0]);
  });
});

describe('simulated drawdown', () => {
  const history = [100, 80, 120, 90, 120].map((value, i) => ({ value, date: `2026-01-0${i + 1}` }));
  it('tracks running peaks, maximum loss, trough date and full recovery', () => {
    const d = calculateDrawdown(history);
    expect(d.points.map((p) => p.drawdownPct)).toEqual([0, 20, 0, 25, 0]);
    expect(d.maxDrawdownPct).toBe(25);
    expect(d.currentDrawdownPct).toBe(0);
    expect(d.maxPeakDate).toBe('2026-01-03');
    expect(d.troughDate).toBe('2026-01-04');
  });
  it('sorts history and measures ongoing drawdown', () => {
    const d = calculateDrawdown(history.slice(0, 4).reverse());
    expect(d.currentDrawdownPct).toBe(25);
    expect(d.points[0]?.date).toBe('2026-01-01');
  });
  it('handles empty, zero, single-point and rising histories', () => {
    for (const values of [[], [0, 0], [100], [0, 100, 120]]) {
      const d = calculateDrawdown(values.map((value, i) => ({ value, date: `2026-01-0${i + 1}` })));
      expect(d.maxDrawdownPct).toBe(0);
      expect(d.currentDrawdownPct).toBe(0);
      expect(d.troughDate).toBeNull();
    }
  });
  it('preserves percentage drawdown when simulated portfolio value scales', () => {
    const a = calculateDrawdown(buildHistory(1000)), b = calculateDrawdown(buildHistory(2000));
    expect(a.maxDrawdownPct).toBeGreaterThan(0);
    expect(a.maxDrawdownPct).toBeCloseTo(b.maxDrawdownPct, 2);
    expect(a.points.at(-1)?.value).toBe(1000);
  });
});