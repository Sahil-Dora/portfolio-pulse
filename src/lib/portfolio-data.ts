// Simulated portfolio data. Not connected to live markets or accounts.
export type AssetClass = 'stock' | 'crypto';
export type RangeKey = '1W' | '1M' | '3M' | '1Y';

export interface Holding {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  avgCost: number;
  price: number;
  previousClose: number;
}

export interface HoldingMetrics extends Holding {
  value: number;
  costBasis: number;
  profitLoss: number;
  dayChange: number;
  dayChangePct: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  dayChange: number;
  dayChangePct: number;
  assetCount: number;
  stockCount: number;
  cryptoCount: number;
}

export interface AllocationSlice { assetClass: AssetClass; label: string; value: number; percent: number }
export interface HistoryPoint { date: string; value: number }

export const mockHoldings: Holding[] = [
  { symbol: 'BTC', name: 'Bitcoin', assetClass: 'crypto', quantity: 0.4, avgCost: 52000, price: 67432.8, previousClose: 65558.1 },
  { symbol: 'ETH', name: 'Ethereum', assetClass: 'crypto', quantity: 4, avgCost: 2900, price: 3521.64, previousClose: 3549.33 },
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'stock', quantity: 150, avgCost: 155, price: 189.98, previousClose: 187.65 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', assetClass: 'stock', quantity: 20, avgCost: 610, price: 924.79, previousClose: 894.2 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', assetClass: 'stock', quantity: 30, avgCost: 215, price: 248.5, previousClose: 243.3 },
];

export function holdingMetrics(h: Holding): HoldingMetrics {
  const value = h.quantity * h.price;
  const costBasis = h.quantity * h.avgCost;
  const dayChange = h.quantity * (h.price - h.previousClose);
  return { ...h, value, costBasis, profitLoss: value - costBasis, dayChange, dayChangePct: ((h.price - h.previousClose) / h.previousClose) * 100 };
}

export function summarize(holdings: Holding[]): PortfolioSummary {
  const rows = holdings.map(holdingMetrics);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalCost = rows.reduce((s, r) => s + r.costBasis, 0);
  const dayChange = rows.reduce((s, r) => s + r.dayChange, 0);
  const previousValue = totalValue - dayChange;
  return {
    totalValue, totalCost,
    totalProfitLoss: totalValue - totalCost,
    totalProfitLossPct: totalCost ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    dayChange, dayChangePct: previousValue ? (dayChange / previousValue) * 100 : 0,
    assetCount: holdings.length,
    stockCount: holdings.filter((h) => h.assetClass === 'stock').length,
    cryptoCount: holdings.filter((h) => h.assetClass === 'crypto').length,
  };
}

export function allocation(holdings: Holding[]): AllocationSlice[] {
  const rows = holdings.map(holdingMetrics);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (['stock', 'crypto'] as const).map((assetClass) => {
    const value = rows.filter((r) => r.assetClass === assetClass).reduce((s, r) => s + r.value, 0);
    return { assetClass, label: assetClass === 'stock' ? 'Stocks' : 'Cryptocurrency', value, percent: total ? (value / total) * 100 : 0 };
  });
}

/** Deterministic simulated daily history (365 days) ending at the current portfolio value. */
export function buildHistory(endValue: number, endDate = new Date(Date.UTC(2026, 9, 15))): HistoryPoint[] {
  const days = 365;
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const raw: number[] = [];
  let v = 1;
  for (let i = 0; i < days; i++) { v *= 1 + (rand() - 0.47) * 0.024 + Math.sin(i / 18) * 0.002; raw.push(v); }
  const scale = endValue / raw[raw.length - 1];
  return raw.map((r, i) => {
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    return { date: d.toISOString().slice(0, 10), value: Math.round(r * scale * 100) / 100 };
  });
}

export const rangeDays: Record<RangeKey, number> = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };
export function sliceHistory(history: HistoryPoint[], range: RangeKey) { return history.slice(-rangeDays[range]); }

export const usd = (n: number, digits = 2) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
export const signedUsd = (n: number) => `${n >= 0 ? '+' : '−'}${usd(Math.abs(n))}`;
export const signedPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`;

export const portfolioSummary = summarize(mockHoldings);
export const portfolioHistory = buildHistory(portfolioSummary.totalValue);
