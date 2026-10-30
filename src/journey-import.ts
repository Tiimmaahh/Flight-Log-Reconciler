import {
  type Aircraft,
  type Data,
  type Flight,
  type TimeValue,
  emptyLog,
  fmt,
  parseTime,
  total,
} from "./core.ts";
export type JourneyRecord = {
  tail: string;
  date: string;
  flightId: string;
  time: TimeValue;
  station: string;
  amendment: number;
};
export type JourneyImport = { filename: string; records: JourneyRecord[] };
function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "richText" in value)
    return (value as { richText: { text: string }[] }).richText
      .map((t) => t.text)
      .join("")
      .trim();
  if (typeof value === "object" && "result" in value)
    return text((value as { result: unknown }).result);
  return String(value).trim();
}
function dateValue(value: unknown, date1904: boolean): string {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === "number")
    date = new Date(
      Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) +
        Math.floor(value) * 86400000,
    );
  else {
    const raw = text(value);
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso = match
      ? `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`
      : raw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw Error("Invalid flight date");
    date = new Date(iso + "T00:00:00Z");
    if (date.toISOString().slice(0, 10) !== iso)
      throw Error("Invalid flight date");
  }
  if (!Number.isFinite(date.getTime())) throw Error("Invalid flight date");
  return date.toISOString().slice(0, 10);
}
function duration(value: unknown): TimeValue {
  if (value instanceof Date) {
    const minutes = value.getUTCHours() * 60 + value.getUTCMinutes();
    return { minutes, raw: fmt(minutes), mode: "hm" };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0 || value > 365)
      throw Error("Invalid Excel duration");
    const minutes = Math.round(value * 1440);
    return { minutes, raw: fmt(minutes), mode: "hm" };
  }
  const raw = text(value);
  if (!/^\d+:\d{2}$/.test(raw))
    throw Error("Flight hours must use hours:minutes");
  const time = parseTime(raw);
  if (!time) throw Error("Missing flight hours");
  return time;
}
export async function readJourneyWorkbook(
  buffer: ArrayBuffer,
  filename: string,
): Promise<JourneyImport> {
  if (!/\.xlsx$/i.test(filename))
    throw Error("Choose a Journey Log .xlsx export.");
  if (buffer.byteLength > 20 * 1024 * 1024)
    throw Error("Workbook exceeds the 20 MB limit.");
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const records = new Map<string, JourneyRecord>();
  let found = false;
  for (const sheet of workbook.worksheets) {
    let header = 0;
    for (let row = 1; row <= Math.min(sheet.rowCount, 20); row++)
      if (
        text(sheet.getCell(row, 2).value).toUpperCase() === "ACFT TAIL" &&
        text(sheet.getCell(row, 8).value).toUpperCase() === "FLIGHT DATE" &&
        text(sheet.getCell(row, 12).value).toUpperCase() === "FLIGHT HOURS"
      ) {
        header = row;
        break;
      }
    if (!header) continue;
    found = true;
    if (sheet.rowCount > 50000) throw Error("Workbook has too many rows.");
    for (let row = header + 1; row <= sheet.rowCount; row++) {
      const tail = text(sheet.getCell(row, 2).value).toUpperCase();
      const flightId = text(sheet.getCell(row, 6).value);
      if (!tail && !flightId) continue;
      try {
        if (!/^[A-Z0-9-]{2,20}$/.test(tail) || !flightId)
          throw Error("Missing aircraft tail or Journey Log number");
        const record: JourneyRecord = {
          tail,
          flightId,
          date: dateValue(
            sheet.getCell(row, 8).value,
            Boolean(workbook.properties.date1904),
          ),
          time: duration(sheet.getCell(row, 12).value),
          station: text(sheet.getCell(row, 11).value),
          amendment: Number(text(sheet.getCell(row, 36).value) || 0),
        };
        if (!Number.isInteger(record.amendment) || record.amendment < 0)
          throw Error("Invalid amendment number");
        const key = tail + "/" + flightId;
        const previous = records.get(key);
        if (
          previous &&
          previous.amendment === record.amendment &&
          (previous.date !== record.date ||
            previous.time.minutes !== record.time.minutes)
        )
          throw Error("Conflicting duplicate Journey Log number");
        if (!previous || record.amendment > previous.amendment)
          records.set(key, record);
      } catch (e) {
        throw Error(`${sheet.name}, row ${row}: ${(e as Error).message}`);
      }
    }
  }
  if (!found)
    throw Error(
      "Expected ACFT TAIL in B, FLIGHT DATE in H, and FLIGHT HOURS in L.",
    );
  if (!records.size) throw Error("No Journey Log records found.");
  return {
    filename,
    records: [...records.values()].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.flightId.localeCompare(b.flightId),
    ),
  };
}
export function journeyImportDays(source: JourneyImport, aircraft: Aircraft) {
  if (source.records.some((r) => r.tail !== aircraft.tail.toUpperCase()))
    throw Error(
      `This workbook contains another aircraft. Select ${[...new Set(source.records.map((r) => r.tail))].join(", ")} or upload a single-aircraft export matching ${aircraft.tail}.`,
    );
  const grouped = new Map<string, JourneyRecord[]>();
  for (const record of source.records)
    grouped.set(record.date, [...(grouped.get(record.date) ?? []), record]);
  return grouped;
}
export function applyJourneyImport(
  data: Data,
  source: JourneyImport,
  aircraftId: string,
) {
  const aircraft = data.aircraft.find((a) => a.id === aircraftId);
  if (!aircraft) throw Error("Select an aircraft first.");
  const groups = journeyImportDays(source, aircraft);
  for (const [date, records] of groups) {
    let day = data.days.find(
      (d) => d.aircraftId === aircraftId && d.date === date,
    );
    if (!day) {
      day = { aircraftId, date, manual: emptyLog(), digital: emptyLog() };
      data.days.push(day);
    }
    const flights: Flight[] = records.map((r) => ({
      id: "journey:" + r.flightId,
      time: r.time,
      flightId: r.flightId,
      departure: "",
      origin: r.station,
      destination: "",
      pilot: "",
      tail: r.tail,
      notes: "",
    }));
    const unchanged =
      day.digital.method === "flights" &&
      day.digital.flights.length === flights.length &&
      day.digital.flights.every(
        (f, i) =>
          f.flightId === flights[i].flightId &&
          f.time?.minutes === flights[i].time?.minutes &&
          f.origin === flights[i].origin,
      );
    if (unchanged) continue;
    day.digital = {
      ...day.digital,
      method: "flights",
      total: null,
      flights,
      complete: true,
      reference: source.filename,
    };
  }
}
export function journeyPreview(
  source: JourneyImport,
  aircraft: Aircraft,
  days: Data["days"],
) {
  return [...journeyImportDays(source, aircraft)].map(([date, records]) => ({
    date,
    count: records.length,
    minutes: records.reduce((sum, r) => sum + r.time.minutes, 0),
    existing: total(
      days.find((d) => d.aircraftId === aircraft.id && d.date === date)
        ?.digital ?? emptyLog(),
    ),
  }));
}
