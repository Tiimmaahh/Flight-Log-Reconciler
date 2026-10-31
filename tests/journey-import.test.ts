import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  readJourneyWorkbook,
  applyJourneyImport,
  journeyPreview,
} from "../src/journey-import.ts";
import {
  emptyData,
  emptyLog,
  parseTime,
  total,
  validateBackup,
} from "../src/core.ts";
async function workbook(rows: unknown[][], date1904 = false) {
  const w = new ExcelJS.Workbook();
  w.properties.date1904 = date1904;
  const s = w.addWorksheet("Journey export");
  s.getCell("B3").value = "ACFT TAIL";
  s.getCell("H3").value = "FLIGHT DATE";
  s.getCell("L3").value = { richText: [{ text: "FLIGHT HOURS\n" }] };
  rows.forEach((r, i) => {
    [2, 6, 8, 12, 11, 36].forEach((col, j) => {
      s.getCell(i + 4, col).value = r[j] as ExcelJS.CellValue;
    });
  });
  return w.xlsx.writeBuffer();
}
const aircraft = { id: "a", tail: "N467P", manual: null, digital: null };
test("reads date and duration formats, explicit zero, duplicate IDs and latest amendment", async () => {
  const bytes = await workbook([
    ["N467P", "JL1", 46296, "0:18", "DENTX", 0],
    ["N467P", "JL2", new Date("2026-10-01T00:00:00Z"), 0.5 / 24, "DENTX", 0],
    ["N467P", "JL3", 46297, "0:00", "DENTX", 0],
    ["N467P", "JL1", 46296, "0:19", "DENTX", 1],
    ["N467P", "JL1", 46296, "0:19", "DENTX", 1],
  ]);
  const source = await readJourneyWorkbook(bytes, "sample.xlsx");
  assert.equal(source.records.length, 3);
  assert.equal(source.records[0].date, "2026-10-01");
  assert.equal(source.records[0].time.minutes, 19);
  assert.equal(source.records[1].time.minutes, 30);
  assert.equal(source.records[2].time.minutes, 0);
  const data = emptyData();
  data.aircraft = [aircraft];
  data.days = [
    {
      aircraftId: "a",
      date: "2026-10-01",
      manual: {
        ...emptyLog(),
        method: "shifts",
        shifts: {
          day: parseTime("01:00"),
          night: null,
          third: parseTime("00:01"),
        },
      },
      digital: { ...emptyLog(), total: parseTime("99:00") },
    },
  ];
  const manual = structuredClone(data.days[0].manual);
  applyJourneyImport(data, source, "a");
  assert.deepEqual(data.days[0].manual, manual);
  assert.equal(total(data.days[0].digital), 49);
  assert.equal(data.days.length, 2);
  assert.equal(total(data.days[1].manual), null);
  assert.equal(total(data.days[1].digital), 0);
  const once = JSON.stringify(data);
  applyJourneyImport(data, source, "a");
  assert.equal(JSON.stringify(data), once);
  assert.equal(validateBackup(data).days[0].digital.flights[0].flightId, "JL1");
  assert.equal(journeyPreview(source, aircraft, data.days).length, 2);
  const wrong = { ...aircraft, tail: "NOTHER" };
  assert.throws(
    () => journeyPreview(source, wrong, data.days),
    /another aircraft/,
  );
});
test("rejects conflicting rows and invalid dates or times rather than partially importing", async () => {
  for (const rows of [
    [["N467P", "JL1", "2026-02-30", "0:18", "", 0]],
    [["N467P", "JL1", 46296, "0:99", "", 0]],
    [["N467P", "JL1", 46296, "", "", 0]],
    [
      ["N467P", "JL1", 46296, "0:18", "", 0],
      ["N467P", "JL1", 46296, "0:19", "", 0],
    ],
  ])
    await assert.rejects(
      readJourneyWorkbook(await workbook(rows), "sample.xlsx"),
    );
  await assert.rejects(
    readJourneyWorkbook(new ArrayBuffer(1), "sample.csv"),
    /xlsx/,
  );
  const source = await readJourneyWorkbook(
    await workbook([["N467P", "JL1", 44834, "1:00", "", 0]], true),
    "sample.xlsx",
  );
  assert.equal(source.records[0].date, "2026-10-01");
});
