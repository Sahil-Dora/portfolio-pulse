import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { applyShock, clampShock, SHOCK_MAX, SHOCK_MIN, type Shock } from '@/lib/what-if';
import { signedUsd, usd, type Holding } from '@/lib/portfolio-data';

const fmt = (n: number) => `${n > 0 ? '+' : ''}${n}%`;

export function WhatIfPanel({ holdings }: { holdings: Holding[] }) {
  const [shock, setShock] = useState<Shock>({ stock: 0, crypto: 0 });
  const r = useMemo(() => applyShock(holdings, shock), [holdings, shock]);
  const has = { stock: holdings.some((h) => h.assetClass === 'stock'), crypto: holdings.some((h) => h.assetClass === 'crypto') };
  const rows = [{ key: 'stock' as const, label: 'Stocks' }, { key: 'crypto' as const, label: 'Crypto' }];
  return <section className="panel analytics-section" aria-labelledby="whatif-title">
    <div className="panel-head"><div><h2 id="whatif-title">What-if price shock</h2><p className="panel-subtitle">Hypothetical only · nothing is saved</p></div><Button size="sm" variant="ghost" onClick={() => setShock({ stock: 0, crypto: 0 })}>Reset</Button></div>
    <div className="whatif-controls">{rows.map(({ key, label }) => <div className="whatif-row" key={key}>
      <div className="whatif-label"><span>{label}{!has[key] && ' · none held'}</span><strong>{fmt(shock[key])}</strong></div>
      <Slider aria-label={`${label} price change`} min={SHOCK_MIN} max={SHOCK_MAX} step={5} value={[shock[key]]} disabled={!has[key]} onValueChange={([v]) => setShock((s) => ({ ...s, [key]: clampShock(v ?? 0) }))} />
    </div>)}</div>
    <div className="drawdown-summary whatif-summary">
      <div><small>Hypothetical value</small><span className="whatif-value">{usd(r.after.totalValue)}</span></div>
      <div><small>Change in value</small><span className={`whatif-value ${r.valueChange >= 0 ? 'positive' : 'negative'}`}>{signedUsd(r.valueChange)}</span></div>
      <div><small>Unrealised P/L</small><span className={`whatif-value ${r.after.totalProfitLoss >= 0 ? 'positive' : 'negative'}`}>{signedUsd(r.after.totalProfitLoss)}</span></div>
      <div><small>Allocation</small><span>{r.allocation.map((a) => `${a.label} ${a.percent.toFixed(1)}%`).join(' · ')}</span></div>
      <div><small>Health score</small><span>{r.health ? `${r.health.score} / ${r.health.maxScore} · ${r.health.grade}` : 'No holdings'}</span></div>
    </div>
    <p className="analytics-note">Applies a uniform price change to each asset type. Quantities, cost basis and realised P/L stay the same. Your ledger is never changed. Not financial advice.</p>
  </section>;
}
