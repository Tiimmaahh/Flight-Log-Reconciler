import { useState } from "react";
import { type Data } from "./core.ts";
import { today, months } from "./calendar.ts";
import { useFlightData } from "./use-flight-data.ts";
import { downloadBackup } from "./backup.ts";
import { AppHeader } from "./app-header.tsx";
import { RestoreNotice } from "./restore-notice.tsx";
import { AircraftDialog } from "./aircraft-dialog.tsx";
import { EntryPanel } from "./entry-panel.tsx";
import { OverviewPanel } from "./overview-panel.tsx";
export function App() {
  const store = useFlightData();
  const { data } = store;
  const [page, setPage] = useState<"overview" | "entry">("overview");
  const [id, setId] = useState("");
  const [year, setYear] = useState(Number(today().slice(0, 4)));
  const [month, setMonth] = useState(Number(today().slice(5, 7)));
  const [adding, setAdding] = useState(false);
  const [restore, setRestore] = useState<Data | null>(null);
  const aircraft = data.aircraft.find((a) => a.id === id);
  const backup = () => downloadBackup(data);
  const openAircraft = () => setAdding(true);
  return (
    <div className="app">
      <AppHeader
        saved={store.saved}
        shared={store.shared}
        canUndo={store.canUndo}
        onUndo={store.undoLast}
        backup={backup}
        onRestore={setRestore}
        onError={store.setError}
      />
      <nav aria-label="Workspace tabs">
        <button
          aria-pressed={page === "overview"}
          className={page === "overview" ? "active" : ""}
          onClick={() => setPage("overview")}
        >
          Overview
        </button>
        <button
          aria-pressed={page === "entry"}
          className={page === "entry" ? "active" : ""}
          onClick={() => setPage("entry")}
        >
          Entry
        </button>
      </nav>
      <main>
        {store.error && (
          <div className="notice error" role="alert">
            {store.error}
          </div>
        )}
        {restore && (
          <RestoreNotice
            data={restore}
            shared={store.shared}
            backup={backup}
            cancel={() => setRestore(null)}
            confirm={() => {
              if (store.restore(restore)) {
                setRestore(null);
                setId("");
              }
            }}
          />
        )}{" "}
        {data.demo && (
          <div className="notice">Demo data — not actual aircraft records.</div>
        )}
        <fieldset className="workspace-fields" disabled={store.disabled}>
          <div className="controls">
            <label>
              Aircraft
              <select
                aria-label="Aircraft"
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setPage("overview");
                  setAdding(false);
                }}
              >
                <option value="">Select an aircraft...</option>
                {data.aircraft.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tail}
                  </option>
                ))}
              </select>
            </label>
            {aircraft && (
              <>
                <label>
                  Year
                  <input
                    aria-label="Year"
                    type="number"
                    min="1900"
                    max="2200"
                    value={year}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (n >= 1900 && n <= 2200) setYear(n);
                    }}
                  />
                </label>
                {page === "entry" && (
                  <label>
                    Month
                    <select
                      aria-label="Month"
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                    >
                      {months.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            <button className="quiet" onClick={openAircraft}>
              ＋ Aircraft
            </button>
          </div>

          {!aircraft && !adding && (
            <section className="aircraft-welcome">
              <h2>Select an aircraft to begin</h2>
              <p>
                Choose an aircraft above to view its flight hours or enter
                times.
              </p>
              <button className="primary" onClick={openAircraft}>
                Create aircraft profile
              </button>
            </section>
          )}
          {aircraft && page === "overview" && (
            <OverviewPanel
              totalTime={aircraft.totalTime}
              days={data.days}
              aircraftId={id}
              year={year}
              month={month}
              openMonth={(y, m) => {
                setYear(y);
                setMonth(m);
                setPage("entry");
              }}
            />
          )}
          {aircraft && page === "entry" && (
            <EntryPanel
              aircraft={aircraft}
              days={data.days}
              year={year}
              month={month}
              save={store.edit}
              onImport={(source) => store.importJourney(source, id)}
            />
          )}
        </fieldset>
        {adding && (
          <AircraftDialog
            aircraft={data.aircraft}
            disabled={store.disabled}
            onClose={() => setAdding(false)}
            onAdd={(profile) => {
              if (!store.addAircraft(profile)) return false;
              setId(profile.id);
              setPage("overview");
              return true;
            }}
          />
        )}
        <footer>
          {store.shared
            ? "Aircraft profiles are shared. Changes are visible to everyone using this tool."
            : "Saved locally on this device. Source-system records are unchanged."}
        </footer>
      </main>
    </div>
  );
}
