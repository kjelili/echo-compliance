function collectTopTags(logs) {
  const counts = new Map();
  logs.forEach((log) => {
    (log.tags ?? []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
}

export default function OperationalInsights({ logs, insights }) {
  const topTags = collectTopTags(logs);
  const highPriorityCount = logs.filter((log) => log.structured?.reportPriority === "High").length;
  const mediumPriorityCount = logs.filter((log) => log.structured?.reportPriority === "Medium").length;
  const riskMentions = logs.reduce(
    (total, log) => total + (log.structured?.riskWatchlist?.length ?? log.structured?.potentialRisks?.length ?? 0),
    0
  );
  const noPhotoHighPriority = insights?.highPriorityWithoutPhotos ?? 0;

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Operational Insights</h2>
        <p>Action-oriented view to help teams prioritize field follow-ups.</p>
      </div>

      <div className="insight-metrics">
        <div className="metric">
          <strong>{logs.length}</strong>
          <span>Total logs captured</span>
        </div>
        <div className="metric">
          <strong>{highPriorityCount}</strong>
          <span>High-priority reports</span>
        </div>
        <div className="metric">
          <strong>{mediumPriorityCount}</strong>
          <span>Medium-priority reports</span>
        </div>
        <div className="metric">
          <strong>{riskMentions}</strong>
          <span>Total risk mentions</span>
        </div>
        <div className="metric">
          <strong>{noPhotoHighPriority}</strong>
          <span>High-priority logs without photos</span>
        </div>
      </div>

      <div>
        <h4>Most Frequent Topics</h4>
        {topTags.length === 0 ? (
          <p className="hint">Tags will appear once reports are generated.</p>
        ) : (
          <div className="badges">
            {topTags.map(([tag, count]) => (
              <span key={tag} className="chip">
                {tag} ({count})
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
