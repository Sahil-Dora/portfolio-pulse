import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { Wallet, TrendingUp, ArrowLeftRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortfolio } from '@/lib/transaction-store';
import { calculateAnalytics, calculateDrawdown } from '@/lib/analytics';
import { rangeDays, sliceHistory, signedUsd, usd, type RangeKey } from '@/lib/portfolio-data';
import { AllocationPanel } from './portfolio-charts';
import { generateInsights } from '@/lib/insights';
import { InsightsPanel } from './insights-panel';
import { WhatIfPanel } from './what-if-panel';

const ranges = Object.keys(rangeDays) as RangeKey[];
const fmtDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const tooltipStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 };

export function AnalyticsPage() {
  const { transactions, history, holdings } = usePortfolio();
  const report = calculateAnalytics(transactions);
  const [range, setRange] = useState<RangeKey>('1Y');
  const drawdown = calculateDrawdown(sliceHistory(history, range));
  const openAssets = report.assets.filter((a) => a.value > 0);
  const metrics = [
    { label: 'Current value', value: usd(report.summary.totalValue), context: `Cost basis ${usd(report.summary.totalCost)}`, icon: Wallet, gain: null },
    { label: 'Realised profit / loss', value: signedUsd(report.realised), context: 'Closed trades · average cost', icon: ArrowLeftRight, gain: report.realised },
    { label: 'Unrealised profit / loss', value: signedUsd(report.unrealised), context: 'Open positions · simulated quotes', icon: TrendingUp, gain: report.unrealised },
    { label: 'Combined profit / loss', value: signedUsd(report.totalProfitLoss), context: 'Realised + unrealised · no fees', icon: Layers, gain: report.totalProfitLoss },
  ];
  return <div className="page analytics-page">
    <div className="page-heading"><div><h1>Portfolio analytics</h1><p>Allocation, gains and risk · simulated data · USD.</p></div><span className="plan-tag">SIMULATED</span></div>
    <section className="metrics" aria-label="Analytics summary">{metrics.map(({ label, value, context, icon: Icon, gain }) => <article className="metric" key={label}><div className="metric-label">{label}<Icon /></div><div className={`metric-value ${gain === null ? '' : gain >= 0 ? 'positive' : 'negative'}`}>{value}</div><div className="metric-footer">{context}</div></article>)}</section>
    <div className="chart-row">
      <section className="panel"><div className="panel-head"><div><h2>Cost basis vs. current value</h2><p className="panel-subtitle">Remaining positions · simulated current quotes</p></div></div>
        <div className="analytics-bar-chart">{openAssets.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={openAssets} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" /><XAxis dataKey="symbol" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} /><YAxis tickFormatter={(v: number) => usd(v, 0)} width={70} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} /><Tooltip formatter={(v: number) => usd(v)} contentStyle={tooltipStyle} /><Bar dataKey="costBasis" name="Cost basis" fill="var(--analytics-cost)" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar dataKey="value" name="Current value" fill="var(--primary)" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer> : <p className="analytics-empty">No open positions</p>}</div>
        <div className="analytics-legend"><span><i className="cost" />Cost basis</span><span><i className="value" />Current value</span></div>
      </section><AllocationPanel />
    </div>
    <section className="panel analytics-section"><div className="panel-head"><div><h2>Allocation & profit / loss by asset</h2><p className="panel-subtitle">Average-cost method · fully sold assets retain realised gains · fees not supported</p></div></div>
      <div className="table-wrap"><table className="holdings-table analytics-table"><thead><tr><th>Asset</th><th>Type</th><th>Allocation</th><th>Cost basis</th><th>Current value</th><th>Realised P/L</th><th>Unrealised P/L</th></tr></thead><tbody>{report.assets.map((a) => <tr key={a.symbol}><td><div className="asset"><span className="asset-icon">{a.symbol.slice(0, 1)}</span><div><strong>{a.symbol}</strong><small>{a.name}</small></div></div></td><td>{a.assetClass === 'stock' ? 'Stock' : 'Crypto'}</td><td>{a.percent.toFixed(2)}%</td><td>{usd(a.costBasis)}</td><td>{usd(a.value)}</td><td className={a.realised >= 0 ? 'positive' : 'negative'}>{signedUsd(a.realised)}</td><td className={a.unrealised >= 0 ? 'positive' : 'negative'}>{signedUsd(a.unrealised)}</td></tr>)}{!report.assets.length && <tr><td colSpan={7} className="ledger-empty">No transactions</td></tr>}</tbody><tfoot><tr><td>Total</td><td>USD</td><td>{report.summary.totalValue ? '100.00%' : '0.00%'}</td><td>{usd(report.summary.totalCost)}</td><td>{usd(report.summary.totalValue)}</td><td className={report.realised >= 0 ? 'positive' : 'negative'}>{signedUsd(report.realised)}</td><td className={report.unrealised >= 0 ? 'positive' : 'negative'}>{signedUsd(report.unrealised)}</td></tr></tfoot></table></div>
    </section>
    <section className="panel analytics-section"><div className="panel-head analytics-drawdown-head"><div><h2>Portfolio drawdown · simulated</h2><p className="panel-subtitle">Decline from the running peak within the selected period</p></div><div className="range-filter" role="group" aria-label="Drawdown range">{ranges.map((r) => <Button key={r} size="sm" variant={range === r ? 'secondary' : 'ghost'} aria-pressed={range === r} onClick={() => setRange(r)}>{r}</Button>)}</div></div>
      <div className="drawdown-summary"><div><small>Maximum drawdown</small><strong>{drawdown.maxDrawdownPct.toFixed(2)}%</strong></div><div><small>Current drawdown</small><strong>{drawdown.currentDrawdownPct.toFixed(2)}%</strong></div><div><small>Peak → trough</small><span>{drawdown.maxPeakDate && drawdown.troughDate ? `${fmtDate(drawdown.maxPeakDate)} → ${fmtDate(drawdown.troughDate)}` : 'No decline in period'}</span></div></div>
      <div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={drawdown.points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" /><XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={28} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} /><YAxis domain={[0, 'auto']} reversed tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={44} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} /><Tooltip labelFormatter={(l: string) => fmtDate(l)} formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']} contentStyle={tooltipStyle} /><Area dataKey="drawdownPct" type="linear" stroke="var(--destructive)" fill="var(--analytics-drawdown-fill)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
      <p className="analytics-note">Synthetic value history scaled to current holdings, not historical ledger valuations or cash-flow-adjusted returns. Not financial advice.</p>
    </section>
    <InsightsPanel insights={generateInsights(holdings, report, drawdown)} empty={!holdings.length} />
    <WhatIfPanel holdings={holdings} />
    <footer className="page-footer"><span>Simulated data · Not connected to live markets</span><span>Portfolio Pulse © 2026</span></footer>
  </div>;
}