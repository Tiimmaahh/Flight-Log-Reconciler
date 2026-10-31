import { useState, useEffect } from "react";
import { type TimeValue, parseTime, fmt } from "./core.ts";
export function TimeField({
  value,
  label,
  save,
}: {
  value: TimeValue | null;
  label: string;
  save: (t: TimeValue | null) => void;
}) {
  const [raw, setRaw] = useState(value ? fmt(value.minutes) : "");
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    setRaw(value ? fmt(value.minutes) : "");
    setDirty(false);
    setErr("");
  }, [value]);
  const commit = () => {
    if (!dirty) return;
    try {
      const parsed = parseTime(raw);
      save(parsed);
      setRaw(parsed ? fmt(parsed.minutes) : "");
      setDirty(false);
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div className="time-input">
      <input
        value={raw}
        aria-label={label}
        placeholder="HH:MM"
        aria-invalid={!!err}
        onChange={(e) => {
          setRaw(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
            const inputs = Array.from(
              document.querySelectorAll<HTMLInputElement>("main input"),
            ).filter((el) => el.getClientRects().length && !el.disabled);
            inputs[inputs.indexOf(e.currentTarget) + 1]?.focus();
          }
        }}
      />
      {err && <small role="alert">{err}</small>}
      {dirty && !err && <small>Tab or Enter to save</small>}
    </div>
  );
}
