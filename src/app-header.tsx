import { type Data, validateBackup } from "./core.ts";
export function AppHeader({
  saved,
  shared,
  canUndo,
  onUndo,
  backup,
  onRestore,
  onError,
}: {
  saved: string;
  shared: boolean;
  canUndo: boolean;
  onUndo: () => void;
  backup: () => void;
  onRestore: (data: Data) => void;
  onError: (message: string) => void;
}) {
  return (
    <header>
      <h1>Flight Log Reconciler</h1>
      <div className="header-tools">
        <span
          className={saved === "Save failed" ? "error" : "save-status"}
          role="status"
        >
          {saved}
        </span>
        {canUndo && <button onClick={onUndo}>Undo</button>}
        <details className="backup-menu">
          <summary>Backup</summary>
          <div>
            <button onClick={backup}>Download backup</button>
            <label className="file-label">
              Restore backup
              <input
                aria-label="Restore backup file"
                type="file"
                accept=".json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    onRestore(validateBackup(JSON.parse(await f.text())));
                    onError("");
                  } catch (e) {
                    onError((e as Error).message);
                  }
                }}
              />
            </label>
            <small>
              {shared
                ? "Aircraft profiles are shared with everyone using this tool."
                : "Records belong to this browser and device."}
            </small>
          </div>
        </details>
      </div>
    </header>
  );
}
