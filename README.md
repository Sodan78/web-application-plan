# Couples Unite

Couples check-in web app for attachment security. See [intent.md](intent.md) and [PLAN.md](PLAN.md).

Stack: Vite + React + TypeScript, Tailwind + shadcn/ui, React Router, TanStack Query, react-hook-form + zod. Accounts and data in Supabase, EU region ([ADR 0007](docs/decisions/0007-supabase-backend.md)).

## Docs

[intent.md](intent.md) (why) → [SPEC.md](SPEC.md) (what) → [PLAN.md](PLAN.md) (how) → [TASKS.md](TASKS.md) (work). Decisions in [docs/decisions](docs/decisions). Guidance for Claude Code in [CLAUDE.md](CLAUDE.md).

## Run locally

Requires Node 20+ and a free Supabase project. No Docker.

1. Create a project at supabase.com in an **EU region** (e.g. Frankfurt).
2. In **Authentication → URL Configuration**: Site URL `http://localhost:5173`, redirect URL `http://localhost:5173/reset-password`. In **Authentication → Providers → Email**, keep "Confirm email" on and set minimum password length to 8.
3. Apply the database:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

4. Copy `.env.example` to `.env.local` and paste the Project URL and anon key (Project Settings → API). Never use the service-role key.
5. Run:

```bash
npm install
npm run dev
```

Supabase's built-in email only reaches your project's team members. Add a custom SMTP provider before inviting other people.

## Scripts

- `npm run dev` / `build` / `preview`
- `npm run lint`, `npm run typecheck`, `npm test` (data tests run the real migrations in PGlite)
