function renderList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="hint">{emptyText}</p>;
  }

  return (
    <ul className="report-list">
      {items.map((item, index) => (
        <li key={`${index}-${typeof item === "string" ? item : item.id}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function SiteAssistPanel({
  siteName,
  handover,
  toolboxTalk,
  insights,
  onCopySiteDigest
}) {
  if (!siteName) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Site Assist</h2>
        <p>Shift handover, toolbox talk draft, and recurring issue highlights.</p>
      </div>
      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={onCopySiteDigest}>
          Copy Daily Site Digest
        </button>
      </div>

      <div className="report-grid">
        <div>
          <h4>Shift Handover</h4>
          <p className="hint">{handover?.handoverText ?? "No handover generated yet."}</p>
          {renderList(
            (handover?.openActions ?? []).map(
              (action) =>
                `${action.description} (${action.owner}, due ${action.dueDate}${
                  action.reminderLevel === "critical"
                    ? ", CRITICAL"
                    : action.reminderLevel === "high"
                      ? ", high reminder"
                      : ""
                })`
            ),
            "No open actions."
          )}
        </div>
        <div>
          <h4>Toolbox Talk</h4>
          <p className="hint">{toolboxTalk?.talkTrack ?? "No talk track available yet."}</p>
          {renderList(toolboxTalk?.topics, "No talk topics identified.")}
        </div>
      </div>

      <div>
        <h4>Recurring Risks</h4>
        {Array.isArray(insights?.recurringRisks) && insights.recurringRisks.length > 0 ? (
          <div className="badges">
            {insights.recurringRisks.map((item) => (
              <span key={item.risk} className="chip">
                {item.risk} ({item.count})
              </span>
            ))}
          </div>
        ) : (
          <p className="hint">No recurring risks identified yet.</p>
        )}
      </div>
    </section>
  );
}
