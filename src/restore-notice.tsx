import { type Data } from "./core.ts";
export function RestoreNotice({
  data,
  shared,
  backup,
  confirm,
  cancel,
}: {
  data: Data;
  shared: boolean;
  backup: () => void;
  confirm: () => void;
  cancel: () => void;
}) {
  return (
    <div className="notice">
      <b>
        Restore {data.aircraft.length} aircraft and {data.days.length} days?
      </b>
      <p>
        {shared
          ? "Import adds or updates the aircraft in this backup for everyone. Other shared aircraft are retained."
          : "This replaces this device’s records. Download a backup first if you need to keep them."}
      </p>
      <button onClick={backup}>Back up current records</button>{" "}
      <button className="primary" onClick={confirm}>
        Confirm restore
      </button>{" "}
      <button onClick={cancel}>Cancel</button>
    </div>
  );
}
