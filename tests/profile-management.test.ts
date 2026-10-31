import { test } from "node:test";
import assert from "node:assert/strict";
import { createAircraftProfile } from "../src/aircraft-profile.ts";
import { mergeBackup } from "../src/backup.ts";
import { emptyData, emptyLog, validateBackup } from "../src/core.ts";
test("new aircraft normalizes tail and preserves opening hours across year boundaries", () => {
  const profile = createAircraftProfile(
    " n123-ab ",
    "11546:53",
    [],
    "2027-01-01",
  );
  assert.equal(profile.tail, "N123-AB");
  assert.equal(profile.totalTime?.date, "2026-12-31");
  assert.equal(profile.totalTime?.time.minutes, 692813);
  assert.equal(
    createAircraftProfile("NZERO", "0:00", [], "2026-03-01").totalTime?.time
      .minutes,
    0,
  );
  assert.equal(
    validateBackup({ ...emptyData(), aircraft: [profile] }).aircraft[0]
      .totalTime?.time.minutes,
    692813,
  );
  for (const hours of ["", "123:99", "-1:00", "Infinity:00", "12"])
    assert.throws(() =>
      createAircraftProfile("NTEST", hours, [], "2026-10-30"),
    );
  assert.throws(
    () => createAircraftProfile("n123-ab", "1:00", [profile], "2026-10-30"),
    /already exists/,
  );
  assert.throws(
    () => createAircraftProfile("!", "1:00", [], "2026-10-30"),
    /tail number/,
  );
});
test("shared backup merge replaces only imported aircraft and preserves unrelated profiles", () => {
  const a = createAircraftProfile("NAAA", "100:00", [], "2026-10-30");
  const b = createAircraftProfile("NBBB", "200:00", [], "2026-10-30");
  const day = (aircraftId: string) => ({
    aircraftId,
    date: "2026-10-30",
    manual: emptyLog(),
    digital: emptyLog(),
  });
  const target = {
    ...emptyData(),
    aircraft: [a, b],
    days: [day(a.id), day(b.id)],
  };
  const backup = {
    ...emptyData(),
    aircraft: [{ ...a, tail: "NUPDATED" }],
    days: [],
    reviews: {
      [a.id + "/review"]: {
        fingerprint: "a",
        status: "open",
        note: "",
        proposed: "",
        correction: "",
        explanation: "",
        history: [],
      },
    },
  };
  const original = structuredClone(backup);
  mergeBackup(target, backup);
  assert.equal(target.aircraft.length, 2);
  assert.equal(target.aircraft[0].tail, "NUPDATED");
  assert.deepEqual(target.aircraft[1], b);
  assert.deepEqual(target.days, [day(b.id)]);
  assert.deepEqual(backup, original);
  assert.equal(Object.keys(target.reviews).length, 1);
  assert.throws(
    () => mergeBackup(target, { ...backup, demo: true }),
    /Demo records/,
  );
});
