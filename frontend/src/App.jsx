import { useEffect, useMemo, useRef, useState } from "react";
import ActionBoard from "./components/ActionBoard";
import CompliancePulsePanel from "./components/CompliancePulsePanel";
import HistoryList from "./components/HistoryList";
import LandingHero from "./components/LandingHero";
import LogForm from "./components/LogForm";
import OperationalInsights from "./components/OperationalInsights";
import SiteAssistPanel from "./components/SiteAssistPanel";
import StructuredReport from "./components/StructuredReport";
import {
  acknowledgeCriticalActions,
  createLog,
  exportPdf,
  fetchActions,
  fetchCompliancePulse,
  fetchDailyBrief,
  fetchDailyDigest,
  fetchEmailSummary,
  fetchHandover,
  fetchInsights,
  fetchLogs,
  fetchToolboxTalk,
  updateAction
} from "./services/api";

const SEARCH_DEBOUNCE_MS = 250;
const API_UNAVAILABLE_MESSAGE = "Backend API is not available for this deployment yet.";

export default function App() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [actions, setActions] = useState([]);
  const [handover, setHandover] = useState(null);
  const [toolboxTalk, setToolboxTalk] = useState(null);
  const [insights, setInsights] = useState(null);
  const [compliancePulse, setCompliancePulse] = useState(null);
  const [highlightedActionId, setHighlightedActionId] = useState("");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [actionView, setActionView] = useState("all");
  const actionBoardRef = useRef(null);

  function shouldSilenceBootstrapError(message = "") {
    return message.includes(API_UNAVAILABLE_MESSAGE);
  }

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const data = await fetchLogs(search);
        setLogs(data.logs ?? []);
      } catch (fetchError) {
        if (!shouldSilenceBootstrapError(fetchError.message)) {
          setError(fetchError.message);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!highlightedActionId) {
      return undefined;
    }

    const timeout = setTimeout(() => setHighlightedActionId(""), 2500);
    return () => clearTimeout(timeout);
  }, [highlightedActionId]);

  const topLog = useMemo(() => logs[0], [logs]);
  const activeSiteName = topLog?.siteName ?? "";

  useEffect(() => {
    if (!activeSiteName) {
      setActions([]);
      setHandover(null);
      setToolboxTalk(null);
      setCompliancePulse(null);
      return;
    }

    const loadAssistData = async () => {
      try {
        const [actionsResult, handoverResult, toolboxResult, pulseResult] = await Promise.all([
          fetchActions({ siteName: activeSiteName }),
          fetchHandover(activeSiteName),
          fetchToolboxTalk(activeSiteName),
          fetchCompliancePulse(activeSiteName)
        ]);
        setActions(actionsResult.actions ?? []);
        setHandover(handoverResult);
        setToolboxTalk(toolboxResult);
        setCompliancePulse(pulseResult);
      } catch (loadError) {
        if (!shouldSilenceBootstrapError(loadError.message)) {
          setError(loadError.message);
        }
      }
    };

    loadAssistData();
  }, [activeSiteName]);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const result = await fetchInsights();
        setInsights(result);
      } catch (loadError) {
        if (!shouldSilenceBootstrapError(loadError.message)) {
          setError(loadError.message);
        }
      }
    };

    loadInsights();
  }, [logs.length]);

  async function handleCreateLog(payload) {
    try {
      setError("");
      setLoading(true);
      await createLog(payload);
      const data = await fetchLogs(search);
      setLogs(data.logs ?? []);
      setToast("Structured log created.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf(logId) {
    try {
      setError("");
      await exportPdf(logId);
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  async function handleCopyEmail(logId) {
    try {
      setError("");
      const result = await fetchEmailSummary(logId);
      const emailText = `Subject: ${result.subject}\n\n${result.body}`;
      await navigator.clipboard.writeText(emailText);
      setToast("Email summary copied.");
    } catch (copyError) {
      setError(copyError.message);
    }
  }

  async function handleCopyDailyBrief(logId) {
    try {
      setError("");
      const result = await fetchDailyBrief(logId);
      await navigator.clipboard.writeText(result.brief);
      setToast("Daily brief copied.");
    } catch (copyError) {
      setError(copyError.message);
    }
  }

  async function handleUpdateAction(actionId, payload) {
    try {
      setError("");
      await updateAction(actionId, payload);
      const [actionsResult, logsResult] = await Promise.all([
        fetchActions({ siteName: activeSiteName }),
        fetchLogs(search)
      ]);
      setActions(actionsResult.actions ?? []);
      setLogs(logsResult.logs ?? []);
      setToast("Action updated.");
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function handleCopySiteDigest() {
    if (!activeSiteName) {
      return;
    }

    try {
      setError("");
      const result = await fetchDailyDigest(activeSiteName);
      await navigator.clipboard.writeText(result.digestText);
      setToast("Daily site digest copied.");
    } catch (digestError) {
      setError(digestError.message);
    }
  }

  async function handleCopyPulseBriefing() {
    if (!activeSiteName) {
      return;
    }

    try {
      setError("");
      const result = await fetchCompliancePulse(activeSiteName);
      await navigator.clipboard.writeText(result.briefingText);
      setCompliancePulse(result);
      setToast("Compliance pulse briefing copied.");
    } catch (pulseError) {
      setError(pulseError.message);
    }
  }

  function jumpToAction(actionId) {
    setHighlightedActionId(actionId);
    actionBoardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      document.getElementById(`action-${actionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }

  function focusCriticalPendingView() {
    setActionView("critical_pending");
    setShowAcknowledged(false);
    actionBoardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearActionFocus() {
    setActionView("all");
    actionBoardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleAcknowledgeEscalation(actionId) {
    try {
      setError("");
      await updateAction(actionId, { escalationAcknowledged: true });
      const actionsResult = await fetchActions({ siteName: activeSiteName });
      setActions(actionsResult.actions ?? []);
      setToast("Escalation acknowledged.");
    } catch (ackError) {
      setError(ackError.message);
    }
  }

  async function handleAcknowledgeAllCritical() {
    if (!activeSiteName) {
      return;
    }

    try {
      setError("");
      const result = await acknowledgeCriticalActions(activeSiteName);
      const actionsResult = await fetchActions({ siteName: activeSiteName });
      setActions(actionsResult.actions ?? []);
      setToast(
        result.updatedCount > 0
          ? `${result.updatedCount} critical escalation(s) acknowledged.`
          : "No critical escalations to acknowledge."
      );
    } catch (ackError) {
      setError(ackError.message);
    }
  }

  const filteredLogs = useMemo(() => {
    if (quickFilter === "high_priority") {
      return logs.filter((log) => log.structured?.reportPriority === "High");
    }
    if (quickFilter === "open_actions") {
      return logs.filter((log) => (log.actionItems ?? []).some((item) => item.status !== "closed"));
    }
    if (quickFilter === "no_photos") {
      return logs.filter((log) => (log.structured?.photoCount ?? 0) === 0);
    }
    return logs;
  }, [logs, quickFilter]);

  const criticalActions = useMemo(
    () =>
      actions
        .filter((action) => action.reminderLevel === "critical" && !action.escalationAcknowledged)
        .slice(0, 5),
    [actions]
  );

  const displayedActions = useMemo(() => {
    let nextActions = actions;
    if (!showAcknowledged) {
      nextActions = nextActions.filter((action) => !action.escalationAcknowledged);
    }
    if (actionView === "critical_pending") {
      nextActions = nextActions.filter(
        (action) => action.reminderLevel === "critical" && !action.escalationAcknowledged
      );
    }
    return nextActions;
  }, [actions, showAcknowledged, actionView]);

  const acknowledgedTodayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return actions.filter((action) => (action.acknowledgedAt ?? "").slice(0, 10) === today).length;
  }, [actions]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">Echo Compliance</span>
        <div className="topbar__meta">
          <button type="button" className="chip topbar-chip topbar-chip--button" onClick={focusCriticalPendingView}>
            Ops: {criticalActions.length} critical pending / {acknowledgedTodayCount} acknowledged today
          </button>
          {actionView === "critical_pending" ? (
            <button type="button" className="btn btn--ghost topbar-clear-btn" onClick={clearActionFocus}>
              Clear Focus
            </button>
          ) : null}
          <span className="hint">Voice to report in under one minute.</span>
        </div>
      </header>

      <main className="container">
        <LandingHero onGetStarted={() => document.querySelector("form")?.scrollIntoView()} />
        {error ? <div className="alert">{error}</div> : null}
        {toast ? <div className="toast">{toast}</div> : null}
        {criticalActions.length > 0 ? (
          <section className="escalation-banner">
            <div>
              <strong>Critical action escalation</strong>
              <p>{criticalActions.length} action(s) are overdue by 3+ days and need immediate attention.</p>
            </div>
            <div className="badges">
              {criticalActions.map((action) => (
                <div key={action.id} className="actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--danger"
                    onClick={() => jumpToAction(action.id)}
                  >
                    {action.siteName}: {action.description.slice(0, 42)}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => handleAcknowledgeEscalation(action.id)}
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <section className="layout">
          <LogForm onSubmit={handleCreateLog} loading={loading} />
          <HistoryList
            logs={filteredLogs}
            onSearch={setSearch}
            searchValue={search}
            onExportPdf={handleExportPdf}
            onCopyEmail={handleCopyEmail}
            onCopyDailyBrief={handleCopyDailyBrief}
            quickFilter={quickFilter}
            onQuickFilter={setQuickFilter}
          />
        </section>
        <div ref={actionBoardRef}>
          <ActionBoard
            actions={displayedActions}
            onUpdateAction={handleUpdateAction}
            highlightedActionId={highlightedActionId}
            showAcknowledged={showAcknowledged}
            onToggleShowAcknowledged={() => setShowAcknowledged((value) => !value)}
            criticalPendingCount={criticalActions.length}
            onAcknowledgeAllCritical={handleAcknowledgeAllCritical}
            actionView={actionView}
            onSetActionView={setActionView}
          />
        </div>
        <SiteAssistPanel
          siteName={activeSiteName}
          handover={handover}
          toolboxTalk={toolboxTalk}
          insights={insights}
          onCopySiteDigest={handleCopySiteDigest}
        />
        <CompliancePulsePanel
          siteName={activeSiteName}
          pulse={compliancePulse}
          onCopyBriefing={handleCopyPulseBriefing}
        />
        <OperationalInsights logs={logs} insights={insights} />
        {topLog ? (
          <StructuredReport report={topLog.structured} />
        ) : null}
      </main>
    </div>
  );
}
