import {
  type Aircraft,
  type Day,
  type Source,
  total,
  emptyLog,
  datesBetween,
  fmt,
  signed,
} from "./core.ts";
import { months } from "./calendar.ts";
import { runningTotals } from "./running-total.ts";
import { DayRow } from "./entry-rows.tsx";
function sum(days: Day[], source: Source) {
  const values = days
    .map((d) => total(d[source]))
    .filter((n): n is number => n !== null);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}
export function EntryPanel({
  aircraft,
  days,
  year,
  month,
  save,
}: {
  aircraft: Aircraft;
  days: Day[];
  year: number;
  month: number;
  save: (day: Day) => void;
}) {
  const id = aircraft.id;
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const aircraftDays = days.filter((d) => d.aircraftId === id);
  const monthDays = aircraftDays.filter((d) => d.date.startsWith(prefix));
  const m = sum(monthDays, "manual"),
    g = sum(monthDays, "digital");
  const monthly = { m, g, diff: m === null || g === null ? null : g - m };
  const entryDates = datesBetween(
    prefix + "-01",
    `${prefix}-${new Date(year, month, 0).getDate()}`,
  );
  const running = runningTotals(aircraftDays, aircraft, entryDates);
  const byDate = new Map(aircraftDays.map((day) => [day.date, day]));
  return (
    <>
      <div className="section-title">
        <h2>
          {months[month - 1]} {year}
        </h2>
        <span className="month-totals">
          Log book <b>{fmt(monthly.m)}</b>{" "}
          <span>
            Journey Log <b>{fmt(monthly.g)}</b>
          </span>{" "}
          Δ{" "}
          <b className={monthly.diff ? "different" : ""}>
            {signed(monthly.diff)}
          </b>
        </span>
      </div>
      <div className="table-scroll entry-scroll">
        <table className="entry-table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Log book entries</th>
              <th scope="col">Running total</th>
              <th scope="col">Journey Log entries</th>
              <th scope="col">Difference</th>
            </tr>
          </thead>
          <tbody>
            {entryDates.map((date) => {
              const day = byDate.get(date) ?? {
                aircraftId: id,
                date,
                manual: emptyLog(),
                digital: emptyLog(),
              };
              return (
                <DayRow
                  key={id + date}
                  day={day}
                  runningTotal={running.get(date) ?? null}
                  save={save}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
