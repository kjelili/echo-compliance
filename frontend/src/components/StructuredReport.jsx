function renderList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="hint">{emptyText}</p>;
  }

  return (
    <ul className="report-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function StructuredReport({ report }) {
  if (!report) {
    return null;
  }

  const title = report.reportHeadline ?? "Daily Compliance Brief";
  const priority = report.reportPriority ?? "Low";
  const summary = report.executiveSummary ?? report.complianceNotes ?? "No summary available.";
  const progress = report.progressPoints ?? report.keyActivities;
  const risks = report.riskWatchlist ?? report.potentialRisks;
  const actions = report.recommendedActions;
  const handover = report.handoverNotes;

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Latest AI Structured Report</h2>
        <p>Readable site brief with actions and handover notes.</p>
      </div>

      <div className="report-card">
        <div className="report-card__top">
          <h3>{title}</h3>
          <span className="chip">{priority} Priority</span>
        </div>
        <p>{summary}</p>
      </div>

      <div className="report-grid">
        <div>
          <h4>Progress</h4>
          {renderList(progress, "No progress points captured.")}
        </div>
        <div>
          <h4>Risk Watchlist</h4>
          {renderList(risks, "No explicit risks detected.")}
        </div>
        <div>
          <h4>Recommended Actions</h4>
          {renderList(actions, "No immediate actions suggested.")}
        </div>
        <div>
          <h4>Handover Notes</h4>
          {renderList(handover, "No handover notes available.")}
        </div>
      </div>
    </section>
  );
}
