import { total, type Day, type Aircraft } from "./core.ts";

export function overviewSummary(
  days: Day[],
  aircraftId: string,
  _selectedYear: number,
) {
  const months = new Map<string, number>();
  const excludedMonths = new Set(
    days
      .filter((d) => d.aircraftId === aircraftId && d.estimatedDate)
      .map((d) => d.date.slice(0, 7)),
  );
  for (const day of days) {
    if (day.aircraftId !== aircraftId) continue;
    const minutes = total(day.manual);
    if (minutes === null) continue;
    const key = day.date.slice(0, 7);
    months.set(key, (months.get(key) ?? 0) + minutes);
  }
  const recordedYears = [
    ...new Set([...months.keys()].map((key) => Number(key.slice(0, 4)))),
  ];
  const startedYears = days
    .filter(
      (day) =>
        day.aircraftId === aircraftId &&
        day.date.slice(5, 7) === "01" &&
        (total(day.manual) !== null || total(day.digital) !== null),
    )
    .map((day) => Number(day.date.slice(0, 4)));
  const years = [
    ...new Set([
      2025,
      2026,
      ...recordedYears.filter((y) => y <= 2026),
      ...startedYears,
    ]),
  ].sort((a, b) => b - a);
  const minutes = months.size
    ? [...months.values()].reduce((sum, n) => sum + n, 0)
    : null;
  const averageMonths = [...months].filter(([key]) => !excludedMonths.has(key));
  return {
    months,
    excludedMonths,
    years,
    total: minutes,
    monthCount: months.size,
    yearCount: recordedYears.length,
    monthlyAverage: averageMonths.length
      ? Math.round(
          averageMonths.reduce((s, [, n]) => s + n, 0) / averageMonths.length,
        )
      : null,
    yearlyAverage:
      minutes === null ? null : Math.round(minutes / recordedYears.length),
    comparisonYear: years[0],
    previousYear: years[0] - 1,
  };
}

export function monthComparison(
  months: Map<string, number>,
  month: number,
  year: number,
) {
  const suffix = String(month).padStart(2, "0");
  const current = months.get(`${year}-${suffix}`) ?? null;
  const previous = months.get(`${year - 1}-${suffix}`) ?? null;
  return {
    current,
    previous,
    delta: current === null || previous === null ? null : current - previous,
  };
}

export function yearAnalysis(
  months: Map<string, number>,
  year: number,
  onlyMonths?: number[],
  excludedMonths = new Set<string>(),
) {
  const values = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((m) => !onlyMonths || onlyMonths.includes(m))
    .map((m) => months.get(`${year}-${String(m).padStart(2, "0")}`))
    .filter((n): n is number => n !== undefined);
  if (!values.length)
    return { total: null, average: null, variance: null, count: 0 };
  const sum = values.reduce((a, b) => a + b, 0),
    mean = sum / values.length;
  // Population variance of monthly hours, in hours squared; two months minimum.
  const variance =
    values.length < 2
      ? null
      : values.reduce((sum, n) => sum + ((n - mean) / 60) ** 2, 0) /
        values.length;
  const eligible = [...months]
    .filter(
      ([key]) =>
        Number(key.slice(0, 4)) === year &&
        (!onlyMonths || onlyMonths.includes(Number(key.slice(5)))) &&
        !excludedMonths.has(key),
    )
    .map(([, n]) => n);
  const average = eligible.length
    ? eligible.reduce((s, n) => s + n, 0) / eligible.length
    : null;
  return { total: sum, average, variance, count: values.length };
}

export function analysisDelta(
  months: Map<string, number>,
  year: number,
  excludedMonths = new Set<string>(),
) {
  const matched = Array.from({ length: 12 }, (_, i) => i + 1).filter(
    (m) => monthComparison(months, m, year).delta !== null,
  );
  const current = yearAnalysis(months, year, matched),
    previous = yearAnalysis(months, year - 1, matched);
  const subtract = (a: number | null, b: number | null) =>
    a === null || b === null ? null : a - b;
  const averageMatched = matched.filter(
    (m) =>
      ![year, year - 1].some((y) =>
        excludedMonths.has(`${y}-${String(m).padStart(2, "0")}`),
      ),
  );
  return {
    total: subtract(current.total, previous.total),
    average: subtract(
      yearAnalysis(months, year, averageMatched).average,
      yearAnalysis(months, year - 1, averageMatched).average,
    ),
    variance: subtract(current.variance, previous.variance),
  };
}

export function yearCards(
  days: Day[],
  aircraftId: string,
  year: number,
  checkpoint?: Aircraft["totalTime"],
) {
  const entered = days.filter(
    (day) => day.aircraftId === aircraftId && total(day.manual) !== null,
  );
  const withinYear = entered.filter(
    (day) => Number(day.date.slice(0, 4)) === year,
  );
  const sum = (rows: Day[]) =>
    rows.length ? rows.reduce((sum, day) => sum + total(day.manual)!, 0) : null;
  const yearlyTotal = sum(withinYear);
  const excludedMonths = new Set(
    entered
      .filter((day) => day.estimatedDate)
      .map((day) => day.date.slice(0, 7)),
  );
  const eligible = withinYear.filter(
    (day) => !excludedMonths.has(day.date.slice(0, 7)),
  );
  const averageTotal = sum(eligible);
  const dayCount = new Set(eligible.map((day) => day.date)).size;
  const monthCount = new Set(eligible.map((day) => day.date.slice(0, 7))).size;
  const allTimeTotal = checkpoint
    ? year < Number(checkpoint.date.slice(0, 4))
      ? null
      : checkpoint.time.minutes +
        entered
          .filter(
            (day) =>
              day.date > checkpoint.date &&
              Number(day.date.slice(0, 4)) <= year,
          )
          .reduce((s, day) => s + total(day.manual)!, 0)
    : sum(entered.filter((day) => Number(day.date.slice(0, 4)) <= year));
  return {
    allTimeTotal,
    yearTotal: yearlyTotal,
    dailyAverage: averageTotal === null ? null : averageTotal / dayCount,
    monthlyAverage: averageTotal === null ? null : averageTotal / monthCount,
  };
}

export function overviewCardYear(
  days: Day[],
  aircraftId: string,
  selectedYear: number,
) {
  if (selectedYear < 2026) return selectedYear;
  const started = days
    .filter(
      (day) =>
        day.aircraftId === aircraftId &&
        day.date.slice(5, 7) === "01" &&
        (total(day.manual) !== null || total(day.digital) !== null),
    )
    .map((day) => Number(day.date.slice(0, 4)));
  return Math.max(2026, ...started);
}
