import { useRef, useState } from "react";
import { type Aircraft, type Day, fmt } from "./core.ts";
import {
  type JourneyImport,
  readJourneyWorkbook,
  journeyPreview,
} from "./journey-import.ts";
export function JourneyUpload({
  aircraft,
  days,
  onImport,
}: {
  aircraft: Aircraft;
  days: Day[];
  onImport: (source: JourneyImport, fillLogBook: boolean) => boolean;
}) {
  const [source, setSource] = useState<JourneyImport | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [fillLogBook, setFillLogBook] = useState(false);
  const request = useRef(0);
  async function read(file: File) {
    const sequence = ++request.current;
    setBusy(true);
    setSource(null);
    setFillLogBook(false);
    setError("");
    setMessage("");
    try {
      const next = await readJourneyWorkbook(
        await file.arrayBuffer(),
        file.name,
      );
      journeyPreview(next, aircraft, days);
      if (sequence === request.current) setSource(next);
    } catch (e) {
      if (sequence === request.current) setError((e as Error).message);
    } finally {
      if (sequence === request.current) setBusy(false);
    }
  }
  const rows = source ? journeyPreview(source, aircraft, days) : [];
  return (
    <section
      className="journey-upload"
      aria-label="Import Journey Log"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length !== 1) {
          setError("Drop one .xlsx file at a time.");
          return;
        }
        void read(e.dataTransfer.files[0]);
      }}
    >
      <div className="upload-prompt">
        <div>
          <b>Import Journey Log</b>
          <small>Drop a Journey Log .xlsx export here, or choose a file.</small>
        </div>
        <label className="upload-file">
          Choose file
          <input
            type="file"
            aria-label="Upload Journey Log workbook"
            accept=".xlsx"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void read(file);
            }}
          />
        </label>
      </div>
      {busy && <p role="status">Reading workbook…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {source && (
        <div className="journey-preview">
          <b>
            {aircraft.tail}: {source.records.length} Journey Log records ·{" "}
            {rows.length} days · {fmt(rows.reduce((s, r) => s + r.minutes, 0))}
          </b>
          <p>
            {rows[0].date} through {rows.at(-1)!.date}. Import replaces Journey
            Log entries only on the listed dates, including existing manual
            Journey Log entries.{" "}
            {fillLogBook
              ? "Log book entries on these dates will also be replaced: Shift 1 gets the daily Journey Log total, and Shifts 2 and 3 become 00:00."
              : "Log book shifts remain unchanged."}{" "}
            Repeat uploads do not add duplicates.
          </p>
          <div className="import-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Records</th>
                  <th>Imported time</th>
                  <th>Existing time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>{row.count}</td>
                    <td>{fmt(row.minutes)}</td>
                    <td>{fmt(row.existing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dialog-actions import-actions">
            <button type="button" onClick={() => setSource(null)}>
              Cancel
            </button>
            <label className="import-both">
              <input
                type="checkbox"
                checked={fillLogBook}
                onChange={(e) => setFillLogBook(e.target.checked)}
              />
              Use for Journey Log and Log book
            </label>
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (onImport(source, fillLogBook)) {
                  setMessage(
                    `Imported ${source.records.length} Journey Log records across ${rows.length} days. ${fillLogBook ? "Log book shifts initialized from daily totals. " : ""}Check the shared save status above.`,
                  );
                  setSource(null);
                  setFillLogBook(false);
                }
              }}
            >
              Import Journey Log times
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
