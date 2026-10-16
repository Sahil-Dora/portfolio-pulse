import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockHoldings, summarize, type Holding } from '@/lib/portfolio-data';
import { holdingsFromTransactions } from '@/lib/transaction-store';
import { mockTransactions, type Transaction } from '@/lib/transactions-data';

const tx = (id: string, date: string, symbol: string, type: 'buy' | 'sell', quantity: number, price: number): Transaction => ({ id, date, symbol, type, quantity, price });
const KEY = 'portfolio-pulse:transactions:v1';

describe('average cost', () => {
  it('averages multiple buys', () => {
    const [h] = holdingsFromTransactions([tx('a', '2026-01-01', 'AAPL', 'buy', 10, 100), tx('b', '2026-01-02', 'AAPL', 'buy', 10, 200)]);
    expect(h.quantity).toBe(20);
    expect(h.avgCost).toBeCloseTo(150, 10);
  });
  it('keeps average cost unchanged after a partial sell', () => {
    const [h] = holdingsFromTransactions([tx('a', '2026-01-01', 'AAPL', 'buy', 10, 100), tx('b', '2026-01-02', 'AAPL', 'buy', 10, 200), tx('c', '2026-01-03', 'AAPL', 'sell', 5, 999)]);
    expect(h.quantity).toBe(15);
    expect(h.avgCost).toBeCloseTo(150, 10);
  });
  it('resets average cost after selling to zero and rebuying', () => {
    const [h] = holdingsFromTransactions([tx('a', '2026-01-01', 'AAPL', 'buy', 10, 100), tx('b', '2026-01-02', 'AAPL', 'sell', 10, 120), tx('c', '2026-01-03', 'AAPL', 'buy', 2, 300)]);
    expect(h.quantity).toBe(2);
    expect(h.avgCost).toBeCloseTo(300, 10);
  });
  it('applies trades by date regardless of input order (backdated buy)', () => {
    const ordered = [tx('a', '2026-01-01', 'AAPL', 'buy', 10, 100), tx('b', '2026-02-01', 'AAPL', 'sell', 5, 150), tx('c', '2026-03-01', 'AAPL', 'buy', 5, 200)];
    const shuffled = [ordered[2], ordered[0], ordered[1]];
    expect(holdingsFromTransactions(shuffled)).toEqual(holdingsFromTransactions(ordered));
    expect(holdingsFromTransactions(ordered)[0].avgCost).toBeCloseTo(150, 10);
  });
  it('reproduces the sample holdings from the sample ledger', () => {
    const derived = holdingsFromTransactions(mockTransactions);
    for (const m of mockHoldings) {
      const d = derived.find((h) => h.symbol === m.symbol)!;
      expect(d.quantity).toBeCloseTo(m.quantity, 8);
      expect(d.avgCost).toBeCloseTo(m.avgCost, 6);
    }
  });
});

describe('rounding', () => {
  it('drops a crypto position fully sold with floating-point fractions', () => {
    expect(holdingsFromTransactions([tx('a', '2026-01-01', 'BTC', 'buy', 0.1, 50000), tx('b', '2026-01-01', 'BTC', 'buy', 0.2, 50000), tx('c', '2026-01-02', 'BTC', 'sell', 0.3, 60000)])).toEqual([]);
  });
  it('rounds quantity to 8 decimals', () => {
    const [h] = holdingsFromTransactions([tx('a', '2026-01-01', 'BTC', 'buy', 0.1, 1), tx('b', '2026-01-01', 'BTC', 'buy', 0.2, 1)]);
    expect(h.quantity).toBe(0.3);
  });
});

describe('portfolio totals', () => {
  it('sums value, cost, profit/loss and day change', () => {
    const hs: Holding[] = [
      { symbol: 'A', name: 'A', assetClass: 'stock', quantity: 10, avgCost: 100, price: 120, previousClose: 110 },
      { symbol: 'B', name: 'B', assetClass: 'crypto', quantity: 2, avgCost: 500, price: 400, previousClose: 450 },
    ];
    const s = summarize(hs);
    expect(s.totalValue).toBe(2000);
    expect(s.totalCost).toBe(2000);
    expect(s.totalProfitLoss).toBe(0);
    expect(s.dayChange).toBe(0);
    expect([s.assetCount, s.stockCount, s.cryptoCount]).toEqual([2, 1, 1]);
  });
  it('handles an empty portfolio without dividing by zero', () => {
    const s = summarize([]);
    expect([s.totalValue, s.totalProfitLossPct, s.dayChangePct]).toEqual([0, 0, 0]);
  });
});

describe('transaction store', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });
  const load = async () => (await import('@/lib/transaction-store'));

  it('rejects overselling and leaves state unchanged', async () => {
    const m = await load();
    expect(m.addTransaction(tx('x', '2026-10-01', 'TSLA', 'sell', 1000, 200))).toMatch(/Not enough TSLA/);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(m.availableQuantity('TSLA', '2026-10-15')).toBe(30);
  });
  it('rejects a backdated sell before the asset was bought', async () => {
    const m = await load();
    expect(m.availableQuantity('ETH', '2026-01-01')).toBe(0);
    expect(m.addTransaction(tx('x', '2026-01-01', 'ETH', 'sell', 1, 2000))).not.toBeNull();
  });
  it('limits sells by later sells too', async () => {
    const m = await load();
    // BTC: bought 0.5 on 2025-12-12, sold 0.1 on 2026-07-02 → only 0.4 available even on 2026-01-01
    expect(m.availableQuantity('BTC', '2026-01-01')).toBeCloseTo(0.4, 10);
  });
  it('persists valid transactions', async () => {
    const m = await load();
    expect(m.addTransaction(tx('n1', '2026-10-10', 'ETH', 'buy', 1, 3000))).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toHaveLength(mockTransactions.length + 1);
  });
  it('loads saved data on startup', async () => {
    localStorage.setItem(KEY, JSON.stringify([tx('s1', '2026-01-01', 'AAPL', 'buy', 3, 100)]));
    const m = await load();
    expect(m.availableQuantity('AAPL', '2026-10-15')).toBe(3);
    expect(m.availableQuantity('BTC', '2026-10-15')).toBe(0);
  });
  it.each([
    ['invalid JSON', '{not json'],
    ['wrong schema', JSON.stringify([{ id: 1, symbol: 'AAPL' }])],
    ['unknown symbol', JSON.stringify([tx('s1', '2026-01-01', 'DOGE', 'buy', 1, 1)])],
    ['negative quantity', JSON.stringify([tx('s1', '2026-01-01', 'AAPL', 'buy', -1, 1)])],
    ['oversold ledger', JSON.stringify([tx('s1', '2026-01-01', 'AAPL', 'sell', 1, 1)])],
  ])('falls back to sample data on %s', async (_, raw) => {
    localStorage.setItem(KEY, raw);
    const m = await load();
    expect(m.availableQuantity('TSLA', '2026-10-15')).toBe(30);
  });
});
