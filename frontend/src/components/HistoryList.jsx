export default function HistoryList({
  logs,
  onSearch,
  searchValue,
  onExportPdf,
  onCopyEmail,
  onCopyDailyBrief,
  quickFilter,
  onQuickFilter
}) {
  const quickFilterOptions = [
    { id: "all", label: "All" },
    { id: "high_priority", label: "High Priority" },
    { id: "open_actions", label: "Open Actions" },
    { id: "no_photos", label: "No Photos" }
  ];

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Searchable History</h2>
        <p>Find reports by site, foreman, tags, risks, or summary text.</p>
      </div>

      <input
        value={searchValue}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search logs..."
      />

      <div className="badges">
        {quickFilterOptions.map((option) => (
          <button
            type="button"
            key={option.id}
            className={`btn btn--ghost ${quickFilter === option.id ? "btn--active" : ""}`}
            onClick={() => onQuickFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="history">
        {logs.length === 0 ? <p className="hint">No logs found yet.</p> : null}
        {logs.map((log) => (
          <article key={log.id} className="history__item">
            <div>
              <h3>{log.siteName}</h3>
              <p>
                {new Date(log.createdAt).toLocaleString()} - {log.foreman}
              </p>
            </div>
            <div className="badges">
              {log.structured?.reportPriority ? (
                <span className="chip chip--small">{log.structured.reportPriority} priority</span>
              ) : null}
              {log.tags?.map((tag) => (
                <span key={`${log.id}-${tag}`} className="chip chip--small">
                  {tag}
                </span>
              ))}
            </div>
            <p>{log.summary}</p>
            {Array.isArray(log.structured?.recommendedActions) &&
            log.structured.recommendedActions.length > 0 ? (
              <p className="hint">
                Next action: {log.structured.recommendedActions[0]}
              </p>
            ) : null}
            <div className="actions">
              <button className="btn btn--ghost" onClick={() => onExportPdf(log.id)}>
                Export PDF
              </button>
              <button className="btn btn--ghost" onClick={() => onCopyEmail(log.id)}>
                Copy Email Summary
              </button>
              <button className="btn btn--ghost" onClick={() => onCopyDailyBrief(log.id)}>
                Copy Daily Brief
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
