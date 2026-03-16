const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" }
];

export default function ActionBoard({
  actions,
  onUpdateAction,
  highlightedActionId,
  showAcknowledged,
  onToggleShowAcknowledged,
  criticalPendingCount,
  onAcknowledgeAllCritical,
  actionView,
  onSetActionView
}) {
  const hasActions = Array.isArray(actions) && actions.length > 0;

  function renderReminderChip(action) {
    if (action.reminderLevel === "critical") {
      return <span className="chip chip--danger">Critical reminder</span>;
    }
    if (action.reminderLevel === "high") {
      return <span className="chip chip--warning">High reminder</span>;
    }
    return null;
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Action Board</h2>
        <p>Track follow-ups with owner, due date, and overdue visibility.</p>
      </div>
      <div className="actions">
        <button
          type="button"
          className={`btn btn--ghost ${actionView === "all" ? "btn--active" : ""}`}
          onClick={() => onSetActionView("all")}
        >
          All Actions
        </button>
        <button
          type="button"
          className={`btn btn--ghost ${actionView === "critical_pending" ? "btn--active" : ""}`}
          onClick={() => onSetActionView("critical_pending")}
        >
          Critical Pending
        </button>
        <button type="button" className="btn btn--ghost" onClick={onToggleShowAcknowledged}>
          {showAcknowledged ? "Hide Acknowledged" : "Show Acknowledged"}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--danger"
          onClick={onAcknowledgeAllCritical}
          disabled={criticalPendingCount === 0}
        >
          Acknowledge All Critical ({criticalPendingCount})
        </button>
      </div>

      {!hasActions ? <p className="hint">No actions available for this view.</p> : null}
      {hasActions ? (
        <div className="history">
          {actions.map((action) => (
            <article
              key={action.id}
              id={`action-${action.id}`}
              className={`history__item ${highlightedActionId === action.id ? "history__item--highlighted" : ""}`}
            >
              <div className="actions-row">
                <strong>{action.description}</strong>
                <div className="badges">
                  {action.overdue ? (
                    <span className="chip chip--danger">
                      Overdue {action.overdueDays > 0 ? `${action.overdueDays}d` : ""}
                    </span>
                  ) : null}
                  {renderReminderChip(action)}
                  {action.escalationAcknowledged ? (
                    <span className="chip chip--small">Escalation acknowledged</span>
                  ) : null}
                </div>
              </div>
              <p>
                {action.siteName} - Due {action.dueDate}
              </p>
              <div className="grid">
                <label>
                  Owner
                  <input
                    defaultValue={action.owner}
                    onBlur={(event) =>
                      onUpdateAction(action.id, {
                        owner: event.target.value
                      })
                    }
                  />
                </label>
                <label>
                  Status
                  <select
                    value={action.status}
                    onChange={(event) => onUpdateAction(action.id, { status: event.target.value })}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Due Date
                <input
                  type="date"
                  defaultValue={action.dueDate}
                  onBlur={(event) => onUpdateAction(action.id, { dueDate: event.target.value })}
                />
              </label>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
