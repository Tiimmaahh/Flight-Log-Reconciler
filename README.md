# Flight Log Reconciler

Live app: https://flight-log-reconciler.vercel.app/

Compare aircraft Log book and Journey Log flight time with a shared aircraft selector, Overview and Entry screens. React, TypeScript and Vite; hosted on Vercel with shared profiles in Supabase.

## Use

Choose an aircraft to begin, or create a profile. No aircraft is automatically selected on startup. Log book has Shift 1 and Shift 2; Journey Log supports individual flight fields. Times use HH:MM, without wrapping after 24 hours. Bare numbers from 0 to 59 mean minutes. Tab or Enter saves. Blank means unknown; 00:00 is an explicit zero.

Overview shows aircraft total time, daily and monthly averages, annual totals, and monthly year comparisons. Months marked with estimated dates count toward totals but are excluded from daily and monthly averages. A future year appears when its first January value is entered; columns narrow as more years appear. The cards advance to the newest year with January entries. An aircraft total-time checkpoint includes the stated date and adds subsequent Log book time.

With Supabase configured, anyone using the site can load and update the same profiles without an account. Successful saves have server-side revision history. Conflicting edits to the same aircraft stop with a warning rather than silently overwrite another user's changes. Download a backup of unsaved work before reloading after a conflict. Shared profiles refresh periodically and on window focus.

Backup downloads the loaded data. Restore validates a backup before confirmation. Shared-mode imports add or update the aircraft in the backup while retaining other shared profiles. Source workbooks and operational backups are not bundled into the website or committed to this repository.

## Development

Use Node.js 24 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

Copy `.env.example` to `.env.local` and configure the Supabase project URL and public publishable key. Without those settings the app operates with browser-local records instead. A service-role key must never be used in frontend configuration.

## Deployment

See [shared deployment](docs/shared-deployment.md). Vercel builds `dist/` using `vercel.json`. Keep this repository and Vercel project separate from other company applications. Only the Supabase account directory and database infrastructure are shared; this application's storage lives in the separate `flight_reconciler` schema.

## Code organization

See [code structure and maintenance](docs/code-structure.md) for module responsibilities and upgrade guidance.

Entry supports three Log book shifts. Missing Shift 3 in historical backups remains blank. Additional Journey Log flight fields collapse when another day is clicked or receives keyboard focus.

Journey Log uploads: In Entry, drop a PHI Journey Log .xlsx export or choose a file. The preview reads tail B, Journey Log number F, flight date H, and flight hours L. Confirming replaces Journey Log entries on the listed dates and preserves Log book shifts. Repeated files are idempotent; conflicting duplicates, wrong aircraft, and invalid dates/times are rejected. Only extracted flight fields are saved to shared profiles; the workbook itself stays in the browser. The Excel reader is loaded only when importing.
