# Couples Unite

Couples check-in web app for attachment security. See [intent.md](intent.md) and [PLAN.md](PLAN.md).

Stack: Vite + React + TypeScript, Tailwind + shadcn/ui, React Router, TanStack Query, react-hook-form + zod, Supabase.

## Docs

[intent.md](intent.md) (why) → [SPEC.md](SPEC.md) (what) → [PLAN.md](PLAN.md) (how) → [TASKS.md](TASKS.md) (work). Decisions in [docs/decisions](docs/decisions). Guidance for Claude Code in [CLAUDE.md](CLAUDE.md).

## Run locally

Requires Node 20+. No Docker: development uses a hosted Supabase dev project in an EU region (see [ADR 0002](docs/decisions/0002-hosted-supabase-no-docker.md)).

1. Create a Supabase project at supabase.com, region EU (e.g. Frankfurt).
2. In the project's Auth settings, add `http://localhost:5173` as Site URL / redirect URL.
3. Then:

```bash
npm install
npx supabase login
npx supabase link --project-ref <your-project-ref>
cp .env.example .env.local   # paste Project URL and anon key from Settings → API
npm run dev
```

## Scripts

- `npm run dev` / `build` / `preview`
- `npm run lint`, `npm run typecheck`, `npm test`
- `npm run db:push` applies `supabase/migrations` to the linked project
- `npm run db:types` regenerates `src/lib/database.types.ts`
