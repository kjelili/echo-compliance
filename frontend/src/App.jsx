import { useEffect, useMemo, useRef, useState } from "react";
import ActionBoard from "./components/ActionBoard";
import CompliancePulsePanel from "./components/CompliancePulsePanel";
import DataOwnershipPanel from "./components/DataOwnershipPanel";
import HistoryList from "./components/HistoryList";
import LandingHero from "./components/LandingHero";
import LogForm from "./components/LogForm";
import OperationalInsights from "./components/OperationalInsights";
import SiteAssistPanel from "./components/SiteAssistPanel";
import StructuredReport from "./components/StructuredReport";
import {
  acknowledgeCriticalActions,
  connectCloudStorageFile,
  createLog,
  detectSensitiveDataForText,
  disconnectCloudStorageFile,
  exportEncryptedBackupFile,
  exportLocalBackupFile,
  exportPdf,
  fetchActions,
  fetchAuditEvents,
  fetchCompliancePulse,
  fetchDailyBrief,
  fetchDailyDigest,
  fetchEmailSummary,
  fetchHandover,
  fetchInsights,
  fetchLogs,
  fetchToolboxTalk,
  importEncryptedBackupFile,
  importLocalBackupFile,
  getStorageStatus,
  syncCloudStorageFile,
  updateAction
} from "./services/api";

const SEARCH_DEBOUNCE_MS = 250;
const API_UNAVAILABLE_MESSAGE = "Backend API is not available for this deployment yet.";
const SESSION_PIN_HASH_KEY = "echo-compliance:session-pin-hash:v1";
const SESSION_IDLE_MINUTES_KEY = "echo-compliance:session-idle-minutes:v1";

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
  const [storageStatus, setStorageStatus] = useState({
    mode: "local-first",
    cloudSyncSupported: false,
    cloudConnected: false,
    lastSyncedAt: ""
  });
  const [auditEvents, setAuditEvents] = useState([]);
  const [hasSessionPin, setHasSessionPin] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(10);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [unlockPinInput, setUnlockPinInput] = useState("");
  const [highlightedActionId, setHighlightedActionId] = useState("");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [actionView, setActionView] = useState("all");
  const actionBoardRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  function shouldSilenceBootstrapError(message = "") {
    return message.includes(API_UNAVAILABLE_MESSAGE);
  }

  async function hashPin(pin) {
    const encoded = new TextEncoder().encode(pin);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  async function refreshPrivacyMeta() {
    const [status, audit] = await Promise.all([getStorageStatus(), fetchAuditEvents(12)]);
    setStorageStatus(status);
    setAuditEvents(audit.events ?? []);
  }

  function confirmSensitiveShare(text, channelLabel) {
    const matches = detectSensitiveDataForText(text);
    if (matches.length === 0) {
      return true;
    }
    const uniqueMatches = [...new Set(matches)];
    return window.confirm(
      `Potential sensitive data detected (${uniqueMatches.join(", ")}) in ${channelLabel}. Continue anyway?`
    );
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
    refreshPrivacyMeta();
    const storedPinHash = window.localStorage.getItem(SESSION_PIN_HASH_KEY);
    const storedIdleMinutes = Number.parseInt(window.localStorage.getItem(SESSION_IDLE_MINUTES_KEY) ?? "", 10);
    setHasSessionPin(Boolean(storedPinHash));
    setIdleMinutes(Number.isNaN(storedIdleMinutes) || storedIdleMinutes <= 0 ? 10 : storedIdleMinutes);
  }, []);

  useEffect(() => {
    const markActivity = () => {
      if (!isSessionLocked) {
        lastActivityRef.current = Date.now();
      }
    };
    window.addEventListener("mousemove", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("click", markActivity);
    window.addEventListener("scroll", markActivity);

    return () => {
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("click", markActivity);
      window.removeEventListener("scroll", markActivity);
    };
  }, [isSessionLocked]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!hasSessionPin || isSessionLocked) {
        return;
      }
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= idleMinutes * 60 * 1000) {
        setIsSessionLocked(true);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [hasSessionPin, idleMinutes, isSessionLocked]);

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
      await refreshPrivacyMeta();
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
      const targetLog = logs.find((item) => item.id === logId);
      const previewText = targetLog ? JSON.stringify(targetLog) : "";
      if (!confirmSensitiveShare(previewText, "PDF export")) {
        return;
      }
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
      if (!confirmSensitiveShare(emailText, "email summary")) {
        return;
      }
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
      if (!confirmSensitiveShare(result.brief, "daily brief")) {
        return;
      }
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
      await refreshPrivacyMeta();
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
      if (!confirmSensitiveShare(result.digestText, "daily site digest")) {
        return;
      }
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
      if (!confirmSensitiveShare(result.briefingText, "compliance pulse briefing")) {
        return;
      }
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
      await refreshPrivacyMeta();
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
      await refreshPrivacyMeta();
      setToast(
        result.updatedCount > 0
          ? `${result.updatedCount} critical escalation(s) acknowledged.`
          : "No critical escalations to acknowledge."
      );
    } catch (ackError) {
      setError(ackError.message);
    }
  }

  async function handleConnectCloudFile() {
    try {
      setError("");
      await connectCloudStorageFile();
      const data = await fetchLogs(search);
      setLogs(data.logs ?? []);
      await refreshPrivacyMeta();
      setToast("Drive file connected.");
    } catch (connectError) {
      setError(connectError.message);
    }
  }

  async function handleSyncCloudFile() {
    try {
      setError("");
      await syncCloudStorageFile();
      await refreshPrivacyMeta();
      setToast("Cloud file synced.");
    } catch (syncError) {
      setError(syncError.message);
    }
  }

  async function handleDisconnectCloudFile() {
    try {
      setError("");
      await disconnectCloudStorageFile();
      await refreshPrivacyMeta();
      setToast("Cloud file disconnected.");
    } catch (disconnectError) {
      setError(disconnectError.message);
    }
  }

  async function handleExportBackup() {
    try {
      setError("");
      await exportLocalBackupFile();
      await refreshPrivacyMeta();
      setToast("Backup exported.");
    } catch (backupError) {
      setError(backupError.message);
    }
  }

  async function handleImportBackup(file) {
    if (!file) {
      return;
    }
    try {
      setError("");
      const result = await importLocalBackupFile(file);
      const logsResult = await fetchLogs(search);
      setLogs(logsResult.logs ?? []);
      await refreshPrivacyMeta();
      setToast(`Backup imported (${result.importedCount} log(s)).`);
    } catch (importError) {
      setError(importError.message);
    }
  }

  async function handleExportEncryptedBackup() {
    const passphrase = window.prompt("Enter passphrase (min 8 chars) for encrypted backup:");
    if (!passphrase) {
      return;
    }
    try {
      setError("");
      await exportEncryptedBackupFile(passphrase);
      await refreshPrivacyMeta();
      setToast("Encrypted backup exported.");
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  async function handleImportEncryptedBackup(file) {
    if (!file) {
      return;
    }
    const passphrase = window.prompt("Enter passphrase for encrypted backup:");
    if (!passphrase) {
      return;
    }
    try {
      setError("");
      const result = await importEncryptedBackupFile(file, passphrase);
      const logsResult = await fetchLogs(search);
      setLogs(logsResult.logs ?? []);
      await refreshPrivacyMeta();
      setToast(`Encrypted backup imported (${result.importedCount} log(s)).`);
    } catch (importError) {
      setError(importError.message);
    }
  }

  async function handleSetSessionPin() {
    const pin = window.prompt("Set a session PIN (min 4 digits):");
    if (!pin) {
      return;
    }
    if (!/^\d{4,}$/.test(pin)) {
      setError("PIN must be numeric and at least 4 digits.");
      return;
    }
    const pinHash = await hashPin(pin);
    window.localStorage.setItem(SESSION_PIN_HASH_KEY, pinHash);
    setHasSessionPin(true);
    setToast("Session PIN enabled.");
  }

  function handleClearSessionPin() {
    window.localStorage.removeItem(SESSION_PIN_HASH_KEY);
    setHasSessionPin(false);
    setIsSessionLocked(false);
    setUnlockPinInput("");
    setToast("Session PIN removed.");
  }

  function handleLockNow() {
    if (!hasSessionPin) {
      setError("Set a session PIN first.");
      return;
    }
    setIsSessionLocked(true);
  }

  async function handleUnlockSession() {
    const storedHash = window.localStorage.getItem(SESSION_PIN_HASH_KEY);
    if (!storedHash) {
      setIsSessionLocked(false);
      return;
    }
    const providedHash = await hashPin(unlockPinInput);
    if (providedHash !== storedHash) {
      setError("Invalid PIN.");
      return;
    }
    setUnlockPinInput("");
    setError("");
    lastActivityRef.current = Date.now();
    setIsSessionLocked(false);
  }

  function handleIdleMinutesChange(nextValue) {
    const parsed = Number.parseInt(nextValue, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 120) {
      setError("Idle lock must be between 1 and 120 minutes.");
      return;
    }
    setError("");
    setIdleMinutes(parsed);
    window.localStorage.setItem(SESSION_IDLE_MINUTES_KEY, String(parsed));
    setToast("Idle lock timeout updated.");
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

  if (isSessionLocked) {
    return (
      <div className="app-shell">
        <main className="container">
          <section className="panel">
            <div className="panel__head">
              <h2>Session Locked</h2>
              <p>Enter your PIN to continue. Data remains on this device.</p>
            </div>
            {error ? <div className="alert">{error}</div> : null}
            <label>
              PIN
              <input
                type="password"
                value={unlockPinInput}
                onChange={(event) => setUnlockPinInput(event.target.value)}
                placeholder="Enter PIN"
              />
            </label>
            <div className="actions">
              <button type="button" className="btn btn--primary" onClick={handleUnlockSession}>
                Unlock
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

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
        <DataOwnershipPanel
          storageStatus={storageStatus}
          auditEvents={auditEvents}
          onConnectCloudFile={handleConnectCloudFile}
          onSyncCloudFile={handleSyncCloudFile}
          onDisconnectCloudFile={handleDisconnectCloudFile}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onExportEncryptedBackup={handleExportEncryptedBackup}
          onImportEncryptedBackup={handleImportEncryptedBackup}
        />
        <section className="panel">
          <div className="panel__head">
            <h2>Session Security</h2>
            <p>Optional app lock on shared devices with automatic idle timeout.</p>
          </div>
          <div className="badges">
            <span className="chip">{hasSessionPin ? "PIN enabled" : "PIN disabled"}</span>
            <span className="chip chip--small">Idle lock: {idleMinutes} min</span>
          </div>
          <div className="actions">
            <button type="button" className="btn btn--ghost" onClick={handleSetSessionPin}>
              {hasSessionPin ? "Change PIN" : "Set PIN"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleClearSessionPin} disabled={!hasSessionPin}>
              Remove PIN
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleLockNow} disabled={!hasSessionPin}>
              Lock Now
            </button>
          </div>
          <label>
            Idle lock minutes (1-120)
            <input
              type="number"
              min={1}
              max={120}
              defaultValue={idleMinutes}
              onBlur={(event) => handleIdleMinutesChange(event.target.value)}
            />
          </label>
        </section>
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
