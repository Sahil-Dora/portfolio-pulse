import { Link } from '@tanstack/react-router';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, ChartNoAxesCombined, Layers, CalendarDays, ChevronRight, Bitcoin, Diamond, Apple, Car, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { holdingMetrics, mockHoldings, portfolioSummary as s, signedPct, signedUsd, usd } from '@/lib/portfolio-data';
import { AllocationPanel, PerformancePanel } from './portfolio-charts';

const icons: Record<string, { icon: LucideIcon; type: string }> = {
  AAPL: { icon: Apple, type: 'apple' }, BTC: { icon: Bitcoin, type: 'bitcoin' }, NVDA: { icon: TrendingUp, type: 'nvidia' }, ETH: { icon: Diamond, type: 'ethereum' }, TSLA: { icon: Car, type: 'tesla' },
};

export function HoldingsTable() {
  const rows = mockHoldings.map(holdingMetrics).sort((a, b) => b.value - a.value);
  return <div className="table-wrap"><table className="holdings-table"><thead><tr><th>Asset</th><th>Price</th><th>24h change</th><th>Value</th></tr></thead><tbody>{rows.map((h) => { const { icon: Icon, type } = icons[h.symbol] ?? { icon: Layers, type: "" }; return <tr key={h.symbol}><td><div className="asset"><span className={`asset-icon ${type}`}><Icon size={17} /></span><div><strong>{h.symbol}</strong><small>{h.name}</small></div></div></td><td>{usd(h.price)}</td><td className={h.dayChangePct >= 0 ? 'positive' : 'negative'}>{signedPct(h.dayChangePct)}</td><td>{usd(h.value)}</td></tr>; })}</tbody></table></div>;
}

export function Overview() {
  const metrics = [
    { label: 'Total portfolio value', value: usd(s.totalValue), change: signedUsd(s.dayChange), context: 'today', up: s.dayChange >= 0, icon: Wallet },
    { label: 'Total profit / loss', value: signedUsd(s.totalProfitLoss), change: signedPct(s.totalProfitLossPct), context: 'on cost basis', up: s.totalProfitLoss >= 0, icon: TrendingUp },
    { label: 'Daily change', value: signedUsd(s.dayChange), change: signedPct(s.dayChangePct), context: 'vs. previous close', up: s.dayChange >= 0, icon: ChartNoAxesCombined },
    { label: 'Total assets', value: String(s.assetCount), change: `${s.stockCount} stocks`, context: `${s.cryptoCount} cryptocurrencies`, up: null, icon: Layers },
  ];
  return <div className="page"><div className="page-heading"><div><h1>Portfolio overview</h1><p>Your investments, all in one place · simulated data.</p></div><span className="heading-meta"><CalendarDays size={14} />Oct 15, 2026</span></div>
    <section className="metrics" aria-label="Simulated portfolio summary">{metrics.map(({ label, value, change, context, up, icon: Icon }) => <article className="metric" key={label}><div className="metric-label">{label}<Icon /></div><div className="metric-value">{value}</div><div className="metric-footer"><span className={up === null ? '' : `change ${up ? 'positive' : 'negative'}`}>{up === true && <ArrowUpRight />}{up === false && <ArrowDownRight />}{change}</span><span>{up === null ? '· ' : ''}{context}</span></div></article>)}</section>
    <div className="chart-row"><PerformancePanel /><AllocationPanel /></div>
    <div className="lower-row"><section className="panel"><div className="panel-head"><div><h2>Top holdings</h2><p className="panel-subtitle">Your largest positions by value</p></div><Button asChild variant="ghost" size="sm"><Link to="/portfolios">View all<ChevronRight /></Link></Button></div><HoldingsTable /></section><section className="panel"><div className="panel-head"><div><h2>Your watchlist</h2><p className="panel-subtitle">On your radar</p></div><Button asChild variant="ghost" size="icon" title="View watchlist"><Link to="/watchlist" aria-label="View watchlist"><ArrowUpRight /></Link></Button></div><div className="watchlist">{[{ symbol: 'SOL', name: 'Solana', price: '$148.72', change: '+4.62%', down: false },{ symbol: 'MSFT', name: 'Microsoft', price: '$425.52', change: '−0.32%', down: true },{ symbol: 'AMZN', name: 'Amazon.com, Inc.', price: '$186.40', change: '+0.88%', down: false }].map((a) => <div className="watch-item" key={a.symbol}><div className="asset"><span className="asset-icon">{a.symbol === 'SOL' ? '≋' : a.symbol === 'AMZN' ? 'a' : '⊞'}</span><div><strong>{a.symbol}</strong><small>{a.name}</small></div></div><div className="watch-price"><strong>{a.price}</strong><small className={a.down ? 'negative' : 'positive'}>{a.change}</small></div></div>)}</div></section></div>
    <footer className="page-footer"><span>Simulated data · Not connected to live markets</span><span>Portfolio Pulse © 2026</span></footer>
  </div>;
}
