import { describe, expect, it } from 'vitest';
import { completeness, evaluateHealth, grade3, hhi, weights } from '@/lib/health';
import { mockHoldings, type Holding } from '@/lib/portfolio-data';

const h = (symbol: string, assetClass: 'stock' | 'crypto', value: number, extra: Partial<Holding> = {}): Holding =>
  ({ symbol, name: symbol, assetClass, quantity: 1, avgCost: value, price: value, previousClose: value, ...extra });
const rule = (hs: Holding[], id: string) => evaluateHealth(hs).rules.find((r) => r.id === id)!;

describe('health helpers', () => {
  it('grades at thresholds inclusively', () => {
    expect([grade3(25, 25, 40), grade3(25.01, 25, 40), grade3(40, 25, 40), grade3(40.01, 25, 40)]).toEqual(['pass', 'warn', 'warn', 'fail']);
  });
  it('computes HHI on a 0–10,000 scale', () => {
    expect(hhi([1])).toBe(10000);
    expect(hhi([0.5, 0.5])).toBe(5000);
    expect(hhi([0.25, 0.25, 0.25, 0.25])).toBe(2500);
  });
  it('returns no weights for an empty portfolio', () => { expect(weights([])).toEqual([]); });
  it('measures completeness', () => {
    expect(completeness([])).toBe(0);
    expect(completeness([h('A', 'stock', 10), h('B', 'stock', 10, { previousClose: 0 })])).toBe(50);
  });
});

describe('health rules', () => {
  const even = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((s) => h(s, 'stock', 100));
  it('passes everything for an even, stock-only, complete portfolio', () => {
    const r = evaluateHealth(even);
    expect(r.rules.every((x) => x.status === 'pass')).toBe(true);
    expect([r.score, r.maxScore, r.grade]).toEqual([100, 100, 'Strong']);
  });
  it('fails a single-asset portfolio on concentration', () => {
    expect(rule([h('A', 'stock', 100)], 'largest-position').status).toBe('fail');
    expect(rule([h('A', 'stock', 100)], 'hhi').input).toContain('10,000');
  });
  it('grades crypto share', () => {
    expect(rule([h('A', 'stock', 70), h('B', 'crypto', 30)], 'crypto-share').status).toBe('pass');
    expect(rule([h('A', 'stock', 50), h('B', 'crypto', 50)], 'crypto-share').status).toBe('warn');
    expect(rule([h('A', 'stock', 40), h('B', 'crypto', 60)], 'crypto-share').status).toBe('fail');
  });
  it('estimates volatility from assumed asset-type rates', () => {
    const v = rule([h('A', 'stock', 50), h('B', 'crypto', 50)], 'volatility');
    expect(v.kind).toBe('estimate');
    expect(v.input).toContain('50.0%');
    expect(v.status).toBe('warn');
    expect(rule([h('B', 'crypto', 1)], 'volatility').status).toBe('fail');
  });
  it('flags incomplete data', () => {
    const hs = [h('A', 'stock', 10), h('B', 'stock', 10, { previousClose: Number.NaN })];
    expect(rule(hs, 'completeness').status).toBe('fail');
  });
  it('scores an empty portfolio as zero without throwing', () => {
    const r = evaluateHealth([]);
    expect(r.score).toBe(0);
    expect(r.rules).toHaveLength(5);
  });
  it('is deterministic and explains the sample portfolio', () => {
    const a = evaluateHealth(mockHoldings), b = evaluateHealth(mockHoldings);
    expect(a).toEqual(b);
    expect(a.rules.map((r) => r.status)).toEqual(['warn', 'warn', 'warn', 'warn', 'pass']);
    expect(a.score).toBe(60);
    for (const r of a.rules) expect(r.input && r.threshold && r.explanation).toBeTruthy();
  });
});
