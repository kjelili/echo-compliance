export default function DataOwnershipPanel({
  storageStatus,
  onConnectCloudFile,
  onSyncCloudFile,
  onDisconnectCloudFile,
  onExportBackup,
  onImportBackup
}) {
  const cloudSupported = Boolean(storageStatus?.cloudSyncSupported);
  const cloudConnected = Boolean(storageStatus?.cloudConnected);
  const lastSyncedAt = storageStatus?.lastSyncedAt;

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
    </section>
  );
}
