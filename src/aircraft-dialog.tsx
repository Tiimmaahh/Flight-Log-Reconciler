import { useEffect, useRef, useState } from "react";
import { type Aircraft } from "./core.ts";
import { today } from "./calendar.ts";
import { createAircraftProfile } from "./aircraft-profile.ts";
export function AircraftDialog({
  aircraft,
  disabled,
  onAdd,
  onClose,
}: {
  aircraft: Aircraft[];
  disabled: boolean;
  onAdd: (profile: Aircraft) => boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tail, setTail] = useState("");
  const [initialHours, setInitialHours] = useState("");
  const [aircraftError, setAircraftError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function add() {
    try {
      const profile = createAircraftProfile(
        tail,
        initialHours,
        aircraft,
        today(),
      );
      if (onAdd(profile)) onClose();
    } catch (e) {
      setAircraftError((e as Error).message);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="aircraft-dialog"
      aria-labelledby="aircraft-dialog-title"
      onCancel={() => onClose()}
      onClose={() => onClose()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <h2 id="aircraft-dialog-title">Add aircraft</h2>
        <p>Create a shared aircraft profile.</p>
        <label>
          Tail number
          <input
            aria-label="Tail number"
            autoFocus
            required
            maxLength={20}
            placeholder="N467P"
            autoComplete="off"
            value={tail}
            onChange={(e) => setTail(e.target.value)}
          />
        </label>
        <label>
          Initial flight hours
          <input
            aria-label="Initial flight hours"
            required
            placeholder="11546:53"
            autoComplete="off"
            aria-describedby="initial-hours-help"
            value={initialHours}
            onChange={(e) => setInitialHours(e.target.value)}
          />
        </label>
        <small id="initial-hours-help">
          Use hours:minutes. This is the starting total before flight hours
          entered from today onward.
        </small>
        {aircraftError && (
          <p className="error" role="alert">
            {aircraftError}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={() => onClose()}>
            Cancel
          </button>
          <button className="primary" disabled={disabled}>
            Add aircraft
          </button>
        </div>
      </form>
    </dialog>
  );
}
