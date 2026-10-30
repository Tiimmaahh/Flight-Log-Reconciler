# Shared aircraft profiles

The app is prepared for the existing Supabase project `htdkaltakpwkkfblzwfx`. Its aircraft data, validation helpers and revision history live in `flight_reconciler`. Only two uniquely prefixed API functions live in `public`: `flight_reconciler_profiles` and `flight_reconciler_save`. No supplemental-app tables, functions or permissions are modified. The custom schema remains private and does not need to be added to Exposed schemas.

## Database activation

Run `supabase/migrations/202610300001_flight_reconciler.sql` in that project's SQL editor. It enables anonymous profile reads and updates as requested, plus authenticated calls for future sign-in support. Table access and history deletion are denied to browser roles. Every successful profile save records a server-side revision snapshot. Concurrent writes to the same aircraft require the loaded revision; stale writes fail rather than overwrite another editor. Different aircraft have independent revisions.

The migration was executed against an embedded PostgreSQL test database with Supabase's roles and `auth.uid()` stubbed. Tests verify anonymous create/read, stale-write rejection, protected history, and isolation of an existing unrelated table. The migration has also been applied to the connected Supabase project. Anonymous production profile creation, time entry and loading from a fresh page were verified on October 30, 2026; the temporary test profile was removed.

## Configure and deploy

Keep this app in its own GitHub repository and Vercel project. Set Node.js 24.x, build `pnpm build`, output `dist`, and install `pnpm install --frozen-lockfile`; `vercel.json` includes these commands.

Set `VITE_SUPABASE_URL` to `https://htdkaltakpwkkfblzwfx.supabase.co` and `VITE_SUPABASE_ANON_KEY` to that project's public publishable or legacy anon key. Never use a service-role key. Use `.env.local` for local development, excluded from Git. Vercel environment values must be followed by a rebuild.

Without both settings the app retains its existing browser-local mode. With both configured, it starts from shared storage, never automatically uploads local records, and always requires aircraft selection. It checks for shared updates every 15 seconds and on window focus, avoiding refresh while editing an input or saving. Failed writes retain local working data for Download backup and stop further edits until reload. The cloud cache uses a separate key, leaving the existing local dataset intact.

## Seed and hosted verification

Use Backup → Restore backup to explicitly import `reference/Current aircraft data.json` after connecting. Confirm the import; it adds or updates profiles in the file and retains other shared aircraft. N467P is a selectable profile, never automatically selected. Its 663 days, estimated-month exclusions and total-time checkpoint of 11546:53 on 2026-10-27 are preserved.

In a second browser, verify the aircraft list and values load without an account. Edit a clearly identified test aircraft, refresh the other browser and verify the edit. Keep one browser stale and attempt a conflicting edit to verify the warning and recoverable backup. Do not use operational aircraft for test edits.

Anonymous access is intentional for this initial version. Login can later use the same Supabase Auth directory, with app-specific access checks added to the two API functions. Browser history currently has no authenticated identity; server revisions still record timestamp and values. Application revision snapshots are separate from the original local audit and backups, which remain preserved locally.

## Production

- URL: https://flight-log-reconciler.vercel.app/
- GitHub: https://github.com/Tiimmaahh/Flight-Log-Reconciler
- Vercel project: `flight-log-reconciler` in team `timmaayy1`
- Production branch: `main`
- Shared profiles are already seeded; do not reimport historical backups automatically.
- Public HTTP access and blank aircraft selection were verified. N467P has 663 days and its original checkpoint.
