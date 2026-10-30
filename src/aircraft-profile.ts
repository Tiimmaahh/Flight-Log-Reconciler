import { parseTime, uid, type Aircraft } from "./core.ts";
export function createAircraftProfile(
  tail: string,
  initialHours: string,
  existing: Aircraft[],
  date: string,
): Aircraft {
  const name = tail.trim().toUpperCase();
  if (!/^[A-Z0-9-]{2,20}$/.test(name))
    throw Error("Enter a tail number using letters, numbers or hyphens.");
  if (existing.some((a) => a.tail.toUpperCase() === name))
    throw Error("That aircraft already exists.");
  let time;
  try {
    if (!/^\d+:\d{2}$/.test(initialHours.trim())) throw Error();
    time = parseTime(initialHours);
    if (!time) throw Error();
  } catch {
    throw Error(
      "Enter initial flight hours as hours:minutes, for example 11546:53.",
    );
  }
  const openingDate = new Date(date + "T12:00:00Z");
  openingDate.setUTCDate(openingDate.getUTCDate() - 1);
  return {
    id: uid(),
    tail: name,
    totalTime: { date: openingDate.toISOString().slice(0, 10), time },
    manual: null,
    digital: null,
  };
}
