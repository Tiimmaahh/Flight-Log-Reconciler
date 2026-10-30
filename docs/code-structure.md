# Code structure

The app entry point is src/main.tsx. It mounts App and imports the stylesheet; application behavior belongs in the modules below.

- src/app.tsx: screen navigation, selected aircraft/year/month, and composition.
- src/use-flight-data.ts: local persistence, shared refresh, serialized saves, audit, Undo, and restore coordination. UI components use this hook rather than calling repositories directly.
- src/app-header.tsx and src/restore-notice.tsx: backup controls and restore confirmation.
- src/backup.ts: backup export and shared import merge rules.
- src/aircraft-dialog.tsx: modal fields and validation messages.
- src/aircraft-profile.ts: pure aircraft validation and opening-total creation.
- src/entry-panel.tsx: month totals, date lookup, and five-column Entry table.
- src/entry-rows.tsx and src/time-field.tsx: day editing and time field behavior.
- src/overview-panel.tsx: Overview presentation.
- src/overview.ts and src/running-total.ts: independent calculations.
- src/core.ts: shared domain types, time arithmetic, and backup validation.
- src/repository.ts, src/shared-repository.ts, src/cloud.ts: persistence adapters and environment configuration.
- src/audit.ts: compact change history.
- src/calendar.ts: month labels and company-timezone current date.

## Changing the app

Keep calculations and validation in pure TypeScript modules, and cover new behavior with Node tests. Keep repository calls in the data hook; retain serialized writes and stale-revision checks. Shared mode must never automatically import device-local data or select an aircraft on startup.

Aircraft total checkpoints are inclusive of their date. Initial hours for a new aircraft are anchored to the preceding day, so Log book entries from its creation date onward add to the opening value. Estimated historical months remain excluded from averages.

Run pnpm test and pnpm build before publishing. The build includes TypeScript checks for unused variables and parameters. Source formatting uses Prettier 3.6.2 (pnpm dlx prettier@3.6.2 --write src index.html tsconfig.json).

- src/journey-upload.tsx: file/drop input and daily comparison before import.
- src/journey-import.ts: workbook extraction, validation, grouping and idempotent Journey Log replacement. ExcelJS is dynamically imported; parser and merge behavior have independent tests.
