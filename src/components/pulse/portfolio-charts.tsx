import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { allocation, mockHoldings, portfolioHistory, rangeDays, signedPct, sliceHistory, usd, type RangeKey } from '@/lib/portfolio-data';

const ranges = Object.keys(rangeDays) as RangeKey[];
const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function PerformancePanel() {
  const [range, setRange] = useState<RangeKey>('1M');
  const data = sliceHistory(portfolioHistory, range);
  const first = data[0]?.value ?? 0, last = data[data.length - 1]?.value ?? 0;
  const pct = first ? ((last - first) / first) * 100 : 0;
  const up = pct >= 0;
  return <section className="panel">
    <div className="panel-head"><div><h2>Portfolio performance</h2><p className="panel-subtitle">Simulated portfolio value over time</p></div>
      <div className="range-filter" role="group" aria-label="Chart range">{ranges.map((r) => <Button key={r} size="sm" variant={r === range ? 'secondary' : 'ghost'} aria-pressed={r === range} onClick={() => setRange(r)}>{r}</Button>)}</div></div>
    <div className="chart-summary"><strong>{usd(last)}</strong><span className={`change ${up ? 'positive' : 'negative'}`}>{up ? <ArrowUpRight /> : <ArrowDownRight />}{signedPct(pct)}</span></div>
    <div className="performance-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs><linearGradient id="pulse-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-fill)" /><stop offset="100%" stopColor="var(--card)" /></linearGradient></defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis domain={['auto', 'auto']} tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip formatter={(v: number) => [usd(v), 'Value']} labelFormatter={(l: string) => fmtDate(l)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
          <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} fill="url(#pulse-chart-fill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <div className="chart-legend"><i />Portfolio value · simulated</div>
  </section>;
}

export function AllocationPanel() {
  const slices = allocation(mockHoldings);
  const colors = { stock: 'var(--stock)', crypto: 'var(--crypto)' };
  return <section className="panel">
    <div className="panel-head"><div><h2>Asset allocation</h2><p className="panel-subtitle">Stocks vs crypto by value</p></div></div>
    <div className="allocation-visual">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={slices} dataKey="value" nameKey="label" innerRadius="70%" outerRadius="100%" stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>{slices.map((s) => <Cell key={s.assetClass} fill={colors[s.assetClass]} />)}</Pie>
          <Tooltip formatter={(v: number) => usd(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} /></PieChart>
      </ResponsiveContainer>
      <div className="donut-label"><small>Total assets</small><strong>{mockHoldings.length}</strong></div>
    </div>
    <div className="allocation-list">{slices.map((s) => <div key={s.assetClass}><span><i className={`allocation-dot ${s.assetClass === 'stock' ? 'stocks' : 'crypto'}`} />{s.label}</span><strong>{s.percent.toFixed(1)}%</strong></div>)}</div>
  </section>;
}
