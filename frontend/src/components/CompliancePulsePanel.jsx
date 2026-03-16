function renderZones(zones = []) {
  if (!Array.isArray(zones) || zones.length === 0) {
    return <p className="hint">No attention zones available yet.</p>;
  }

  return (
    <div className="badges">
      {zones.map((zone) => (
        <span key={zone.zone} className="chip">
          {zone.zone} ({zone.count})
        </span>
      ))}
    </div>
  );
}

function renderFocus(focus = []) {
  if (!Array.isArray(focus) || focus.length === 0) {
    return <p className="hint">No immediate focus actions suggested.</p>;
  }

  return (
    <ul className="report-list">
      {focus.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function CompliancePulsePanel({ siteName, pulse, onCopyBriefing }) {
  if (!siteName) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Compliance Pulse</h2>
        <p>Predictive readiness view for near-term slippage and evidence discipline.</p>
      </div>

      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={onCopyBriefing} disabled={!pulse}>
          Copy Pulse Briefing
        </button>
      </div>

      {!pulse ? (
        <p className="hint">Pulse will appear once a site report is available.</p>
      ) : (
        <>
          <div className="insight-metrics">
            <div className="metric">
              <strong>
                {pulse.score} ({pulse.grade})
              </strong>
              <span>Compliance readiness score</span>
            </div>
            <div className="metric">
              <strong>{pulse.metrics?.dueIn48Hours ?? 0}</strong>
              <span>Actions due in 48 hours</span>
            </div>
            <div className="metric">
              <strong>{pulse.metrics?.criticalPending ?? 0}</strong>
              <span>Critical pending escalations</span>
            </div>
            <div className="metric">
              <strong>{pulse.metrics?.evidenceGapHighPriority ?? 0}</strong>
              <span>High-priority evidence gaps</span>
            </div>
            <div className="metric">
              <strong>{pulse.riskMomentum?.trend ?? "stable"}</strong>
              <span>
                Risk momentum ({pulse.riskMomentum?.recentMentions ?? 0} vs{" "}
                {pulse.riskMomentum?.previousMentions ?? 0})
              </span>
            </div>
          </div>

          <div>
            <h4>Attention Zones</h4>
            {renderZones(pulse.attentionZones)}
          </div>

          <div>
            <h4>Recommended Focus</h4>
            {renderFocus(pulse.recommendedFocus)}
          </div>
        </>
      )}
    </section>
  );
}
