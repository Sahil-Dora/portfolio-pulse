import { useMemo } from 'react';
import { usePortfolio } from '@/lib/transaction-store';
import { evaluateHealth } from '@/lib/health';

const statusLabel = { pass: 'Pass', warn: 'Warning', fail: 'Fail' } as const;

export function HealthPanel() {
  const { holdings } = usePortfolio();
  const report = useMemo(() => evaluateHealth(holdings), [holdings]);
  return <section className="panel" aria-labelledby="health-title">
    <div className="panel-head"><div><h2 id="health-title">Portfolio health</h2><p className="panel-subtitle">Rules-based score · simulated data</p></div><div className="health-score"><strong>{report.score}</strong><span>/ {report.maxScore} · {report.grade}</span></div></div>
    <div className="table-wrap"><table className="holdings-table health-table"><thead><tr><th>Rule</th><th>Input</th><th>Threshold</th><th>Result</th></tr></thead>
      <tbody>{report.rules.map((r) => <tr key={r.id}><td><strong>{r.label}</strong><small className="health-note">{r.kind === 'estimate' ? 'Estimate · ' : 'Measured · '}{r.explanation}</small></td><td>{r.input}</td><td>{r.threshold}</td><td><span className={`health-status ${r.status}`}>{statusLabel[r.status]} · {r.points} pts</span></td></tr>)}</tbody></table></div>
    <p className="health-disclaimer">Not financial advice. This score uses fixed illustrative rules on simulated data and does not consider your goals or circumstances.</p>
  </section>;
}
