import type { Insight } from "@/lib/insights";

export function InsightsPanel({ insights, empty }: { insights: Insight[]; empty: boolean }) {
  return (
    <section className="panel analytics-section" aria-labelledby="insights-title">
      <div className="panel-head">
        <div>
          <h2 id="insights-title">Insights</h2>
          <p className="panel-subtitle">Fixed rules · simulated data</p>
        </div>
      </div>
      {empty ? (
        <p className="analytics-note">Record a buy to see insights.</p>
      ) : !insights.length ? (
        <p className="analytics-note">No rule thresholds were crossed.</p>
      ) : (
        <ul className="insight-list">
          {insights.map((i) => (
            <li key={i.id} className={`insight ${i.severity}`}>
              <strong>{i.message}</strong>
              <small>
                {i.kind === "estimate" ? "Estimate" : "Measured"} · Input {i.input} · Rule{" "}
                {i.threshold}
              </small>
            </li>
          ))}
        </ul>
      )}
      <p className="analytics-note">
        Not financial advice. Insights use fixed illustrative rules and do not consider your goals
        or circumstances.
      </p>
    </section>
  );
}
