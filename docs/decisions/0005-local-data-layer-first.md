# 0005. Start with a browser-only data layer

Date: 2026-09-24. Status: accepted. Supersedes [0002](0002-hosted-supabase-no-docker.md).

## Context
We want to build and try the core flows (profiles, pairing, check-ins, private reflections, sharing) without setting up a backend, Docker or accounts.

## Decision
For now there is no backend. All data lives in the browser (`localStorage`) behind one module, `src/lib/data`:
- `types.ts`: the core model: profiles, couples, check-ins, reflections, shares.
- `storage.ts`: where data is persisted (`browserStorage`, `memoryStorage` for tests).
- `repository.ts`: the only API the app uses. Every call takes the viewer's id and enforces the privacy rules. The API is async so a network backend can replace it without changing screens.

"Sign in" is picking or creating a local profile. Both partners use the same browser to try pairing and sharing.

## Consequences
- Runs with just `npm install && npm run dev`.
- **Not for real user data.** Privacy is enforced in the repository, not by a server, and anyone with the browser can read storage. Use only test data.
- No real two-device use, emails, reminders or AI until a backend is added. Supabase (EU) remains the planned backend; when it's added, the repository rules become RLS policies and the repository tests become RLS tests.
