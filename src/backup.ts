import { type Data } from "./core.ts";
import { today } from "./calendar.ts";
export function downloadBackup(data: Data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `flight-log-backup-${today()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function mergeBackup(target: Data, backup: Data) {
  if (backup.demo)
    throw Error("Demo records cannot be imported into shared profiles.");
  for (const aircraft of backup.aircraft) {
    const index = target.aircraft.findIndex((a) => a.id === aircraft.id);
    if (index < 0) target.aircraft.push(aircraft);
    else target.aircraft[index] = aircraft;
    target.days = target.days
      .filter((d) => d.aircraftId !== aircraft.id)
      .concat(backup.days.filter((d) => d.aircraftId === aircraft.id));
  }
  Object.assign(target.reviews, backup.reviews);
}
