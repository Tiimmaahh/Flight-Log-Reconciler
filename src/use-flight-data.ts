import { type JourneyImport, applyJourneyImport } from "./journey-import.ts";
import { useEffect, useRef, useState } from "react";
import { type Data, type Day, type Aircraft, emptyData, uid } from "./core.ts";
import { cloud } from "./cloud.ts";
import { BrowserRepository } from "./repository.ts";
import { auditChange } from "./audit.ts";
import { mergeBackup } from "./backup.ts";
const repo = new BrowserRepository(
  localStorage,
  cloud ? "flight-reconciler-shared-cache-v1" : "flight-reconciler-v1",
);
export function useFlightData() {
  const [data, setData] = useState<Data>(() => {
    try {
      return cloud ? emptyData() : repo.load();
    } catch {
      return emptyData();
    }
  });
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(!cloud);
  const failed = useRef(false);
  const pending = useRef(0);
  const queue = useRef(Promise.resolve());
  const latest = useRef(data);
  latest.current = data;
  const [saved, setSaved] = useState(
    cloud ? "Connecting to shared profiles..." : "Saved on this device",
  );
  const [undo, setUndo] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (cloud) return;
    try {
      repo.load();
    } catch (e) {
      setLoadError(
        "Unable to read saved data. Restore a backup to continue. " +
          (e as Error).message,
      );
    }
  }, []);

  useEffect(() => {
    if (!cloud) return;
    let active = true,
      fetching = false;
    async function refresh(initial = false) {
      if (
        fetching ||
        pending.current ||
        failed.current ||
        (!initial && document.activeElement?.matches("input,textarea"))
      )
        return;
      fetching = true;
      try {
        const remote = await cloud!.load();
        if (!active || pending.current || failed.current) return;
        if (JSON.stringify(remote) !== JSON.stringify(latest.current)) {
          latest.current = remote;
          setData(remote);
          setUndo(null);
        }
        setReady(true);
        setSaved("Shared profiles · connected");
        setLoadError("");
      } catch (e) {
        if (active) {
          setLoadError((e as Error).message);
          setSaved("Shared connection unavailable");
        }
      } finally {
        fetching = false;
      }
    }
    void refresh(true);
    const timer = setInterval(() => void refresh(), 15000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, []);
  function change(action: string, update: (data: Data) => void): boolean {
    if (!ready || failed.current) {
      setError(
        "Shared profiles are unavailable. Download a backup of unsaved work, then reload.",
      );
      return false;
    }
    const base = latest.current;
    const next = structuredClone(base);
    try {
      update(next);
      if (JSON.stringify(next) === JSON.stringify(base)) return true;
      next.audit.push({
        id: uid(),
        at: new Date().toISOString(),
        action,
        ...auditChange(base, next),
      });
      repo.save(next);
      latest.current = next;
      setData(next);
      setUndo(base);
      setSaved(cloud ? "Saving shared profile..." : "Saved on this device");
      setError("");
      if (cloud) {
        pending.current++;
        queue.current = queue.current
          .then(async () => {
            if (failed.current) return;
            await cloud!.save(base, next);
          })
          .catch((e) => {
            failed.current = true;
            setError((e as Error).message);
            setSaved("Save failed");
          })
          .finally(() => {
            pending.current--;
            if (!failed.current && !pending.current)
              setSaved("Saved to shared profiles");
          });
      }
      return true;
    } catch (e) {
      setSaved("Save failed");
      setError((e as Error).message);
      return false;
    }
  }
  function importJourney(source: JourneyImport, aircraftId: string) {
    return change("Import Journey Log " + source.filename, (data) =>
      applyJourneyImport(data, source, aircraftId),
    );
  }
  function edit(day: Day) {
    change("Edit " + day.date, (d) => {
      const index = d.days.findIndex(
        (x) => x.aircraftId === day.aircraftId && x.date === day.date,
      );
      if (index < 0) d.days.push(day);
      else d.days[index] = day;
    });
  }
  function addAircraft(profile: Aircraft) {
    return Boolean(
      change("Add aircraft", (d) => {
        d.aircraft.push(profile);
      }),
    );
  }
  function restore(backup: Data) {
    try {
      if (cloud)
        return Boolean(
          change("Import aircraft profiles", (d) => mergeBackup(d, backup)),
        );
      repo.save(backup);
      setUndo(latest.current);
      latest.current = backup;
      setData(backup);
      setSaved("Saved on this device");
      setError("");
      setLoadError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  // Shared storage intentionally does not support deleting aircraft with Undo.
  const canUndo = Boolean(
    undo &&
      (!cloud ||
        data.aircraft.every((a) =>
          undo.aircraft.some((old) => old.id === a.id),
        )),
  );
  function undoLast() {
    if (!undo || !canUndo) return;
    const old = undo;
    if (
      change("Undo last edit", (d) => {
        d.days = old.days;
        d.aircraft = old.aircraft;
        d.reviews = old.reviews;
        d.tolerance = old.tolerance;
      })
    )
      setUndo(null);
  }
  return {
    data,
    saved,
    error: error || loadError,
    setError,
    disabled: !ready || failed.current,
    shared: Boolean(cloud),
    edit,
    importJourney,
    addAircraft,
    restore,
    canUndo,
    undoLast,
  };
}
