# 0007. Move accounts and data to Supabase

Date: 2026-09-25. Status: accepted. Supersedes [0005](0005-local-data-layer-first.md).

## Context
The product owner wants password accounts with reset by email. Sending email needs a server, and real accounts make browser-only data pointless: partners need to use their own devices.

## Decision
- **Hosted Supabase project in an EU region** (no Docker) for Auth (email + password, email confirmation, reset links) and Postgres for all data.
- **Row level security on every table, with no client policies.** The app calls one `security definer` database function per repository action; each function checks `auth.uid()` and applies the same rules the TypeScript repository enforced before. Functions are executable by `authenticated` only.
- The TypeScript repository keeps its API and calls these functions, so screens barely change.
- **Tests run the real migrations in PGlite** (Postgres compiled to WebAssembly, in-process) with a small stand-in for Supabase's `auth` schema. No Docker, no network, and the privacy tests prove the database rules.
- Pair requests are addressed to an email instead of a local profile list, so users can't browse other accounts.
- Tests can move the clock through a `app.now` setting read by `app_now()`; production never sets it.

## Consequences
- You need a Supabase account and project; the anon key goes in `.env.local` (never committed, though it's safe to expose). The service-role key is never used by the app.
- Supabase's built-in email only reaches project team members; real users need custom SMTP before a pilot.
- Migrations live in `supabase/migrations` and are applied with `npx supabase db push`.
