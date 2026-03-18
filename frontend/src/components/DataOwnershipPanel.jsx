export default function DataOwnershipPanel({
  storageStatus,
  auditEvents,
  onConnectCloudFile,
  onSyncCloudFile,
  onDisconnectCloudFile,
  onExportBackup,
  onImportBackup,
  onExportEncryptedBackup,
  onImportEncryptedBackup
}) {
  const cloudSupported = Boolean(storageStatus?.cloudSyncSupported);
  const cloudConnected = Boolean(storageStatus?.cloudConnected);
  const lastSyncedAt = storageStatus?.lastSyncedAt;
  const storageUsedMb = ((storageStatus?.usedBytes ?? 0) / (1024 * 1024)).toFixed(2);
  const storageQuotaMb = ((storageStatus?.quotaBytes ?? 0) / (1024 * 1024)).toFixed(2);

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Data Ownership</h2>
        <p>Your logs stay on this device by default. Optionally sync to your own file in Google Drive or OneDrive.</p>
      </div>

      <div className="badges">
        <span className="chip">Mode: Local-first</span>
        <span className="chip">{cloudConnected ? "Cloud file connected" : "Cloud file not connected"}</span>
        {lastSyncedAt ? <span className="chip chip--small">Last sync: {new Date(lastSyncedAt).toLocaleString()}</span> : null}
        <span className="chip chip--small">Logs: {storageStatus?.logsCount ?? 0}</span>
        <span className="chip chip--small">Audit events: {storageStatus?.auditEventsCount ?? 0}</span>
        <span className="chip chip--small">
          Storage: {storageUsedMb} MB / {storageQuotaMb} MB
          {storageStatus?.usagePercent != null ? ` (${storageStatus.usagePercent}%)` : ""}
        </span>
      </div>

      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={onExportBackup}>
          Export Backup
        </button>
        <label className="file-upload btn btn--secondary">
          Import Backup
          <input type="file" accept=".json,application/json" onChange={(event) => onImportBackup(event.target.files?.[0])} />
        </label>
      </div>

      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={onExportEncryptedBackup}>
          Export Encrypted Backup
        </button>
        <label className="file-upload btn btn--secondary">
          Import Encrypted Backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => onImportEncryptedBackup(event.target.files?.[0])}
          />
        </label>
      </div>

      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={onConnectCloudFile} disabled={!cloudSupported}>
          {cloudConnected ? "Reconnect Drive File" : "Connect Drive File"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onSyncCloudFile} disabled={!cloudConnected}>
          Sync Now
        </button>
        <button type="button" className="btn btn--ghost" onClick={onDisconnectCloudFile} disabled={!cloudConnected}>
          Disconnect
        </button>
      </div>

      {!cloudSupported ? (
        <p className="hint">Drive file sync requires a Chromium-based browser with File System Access support.</p>
      ) : (
        <p className="hint">Tip: choose a file inside your Google Drive or OneDrive synced folder for user-owned cloud backup.</p>
      )}

      <div>
        <h4>Recent Audit Trail</h4>
        {Array.isArray(auditEvents) && auditEvents.length > 0 ? (
          <ul className="report-list">
            {auditEvents.map((event) => (
              <li key={event.id}>
                {new Date(event.createdAt).toLocaleString()} - {event.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">No audit events yet.</p>
        )}
      </div>
    </section>
  );
}
