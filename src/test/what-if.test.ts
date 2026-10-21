import { describe, expect, it } from 'vitest';
import { applyShock, clampShock, shockHoldings } from '@/lib/what-if';
import { allocation, mockHoldings, summarize } from '@/lib/portfolio-data';
import { evaluateHealth } from '@/lib/health';

const stocks = mockHoldings.filter((h) => h.assetClass === 'stock');
const crypto = mockHoldings.filter((h) => h.assetClass === 'crypto');
const value = (hs: typeof mockHoldings) => summarize(hs).totalValue;

describe('what-if price shock', () => {
  it('0/0 shock equals current totals exactly', () => {
    const r = applyShock(mockHoldings, { stock: 0, crypto: 0 });
    expect(r.after).toEqual(summarize(mockHoldings));
    expect(r.valueChange).toBe(0);
  });
  it('-10% stocks lowers only stock value by exactly 10%', () => {
    const shocked = shockHoldings(mockHoldings, { stock: -10, crypto: 0 });
    const a = allocation(shocked);
    expect(a[0]!.value).toBeCloseTo(value(stocks) * 0.9, 6);
    expect(a[1]!.value).toBeCloseTo(value(crypto), 6);
    expect(summarize(shocked).totalValue).toBeCloseTo(a[0]!.value + a[1]!.value, 6);
  });
  it('keeps cost and quantity; P/L moves by the value change', () => {
    const r = applyShock(mockHoldings, { stock: 20, crypto: -30 });
    expect(r.after.totalCost).toBe(r.before.totalCost);
    expect(r.after.totalProfitLoss - r.before.totalProfitLoss).toBeCloseTo(r.valueChange, 6);
    expect(shockHoldings(mockHoldings, { stock: 20, crypto: -30 }).map((h) => h.quantity)).toEqual(mockHoldings.map((h) => h.quantity));
  });
  it('does not mutate input holdings', () => {
    const copy = structuredClone(mockHoldings);
    applyShock(mockHoldings, { stock: -50, crypto: 50 });
    expect(mockHoldings).toEqual(copy);
  });
  it('clamps to ±50 and maps NaN/Infinity to 0', () => {
    expect(clampShock(80)).toBe(50);
    expect(clampShock(-99)).toBe(-50);
    expect(clampShock(Number.NaN)).toBe(0);
    expect(clampShock(Infinity)).toBe(0);
    const r = applyShock(mockHoldings, { stock: -1000, crypto: 0 });
    expect(r.after.totalValue).toBeCloseTo(value(stocks) * 0.5 + value(crypto), 6);
    expect(r.after.totalValue).toBeGreaterThan(0);
  });
  it('empty portfolio gives $0 and no health score', () => {
    const r = applyShock([], { stock: -20, crypto: 20 });
    expect(r.after.totalValue).toBe(0);
    expect(r.health).toBeNull();
    expect(r.allocation.every((s) => s.percent === 0)).toBe(true);
  });
  it('shock on a missing type has no effect', () => {
    expect(applyShock(stocks, { stock: 0, crypto: -40 }).valueChange).toBe(0);
  });
  it('health matches evaluateHealth on shocked holdings', () => {
    const s = { stock: -50, crypto: 50 };
    expect(applyShock(mockHoldings, s).health).toEqual(evaluateHealth(shockHoldings(mockHoldings, s)));
  });
});
