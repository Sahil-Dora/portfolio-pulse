// Hypothetical price shocks. Pure: never reads or writes the ledger.
import { allocation, summarize, type Holding } from './portfolio-data';
import { evaluateHealth } from './health';

export const SHOCK_MIN = -50;
export const SHOCK_MAX = 50;
export interface Shock { stock: number; crypto: number }

/** Non-finite values fall back to 0; others are clamped to the allowed range. */
export function clampShock(pct: number) {
  return Number.isFinite(pct) ? Math.min(SHOCK_MAX, Math.max(SHOCK_MIN, pct)) : 0;
}

export function shockHoldings(holdings: Holding[], shock: Shock): Holding[] {
  return holdings.map((h) => ({ ...h, price: h.price * (1 + clampShock(shock[h.assetClass]) / 100) }));
}

export function applyShock(holdings: Holding[], shock: Shock) {
  const shocked = shockHoldings(holdings, shock);
  const before = summarize(holdings);
  const after = summarize(shocked);
  return {
    before, after,
    valueChange: after.totalValue - before.totalValue,
    allocation: allocation(shocked),
    health: shocked.length ? evaluateHealth(shocked) : null,
  };
}
