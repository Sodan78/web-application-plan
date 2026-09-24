# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project

Couples Unite: a web app for couples in therapy to do private-first check-ins about attachment patterns.

Read before changing behaviour:
- [intent.md](intent.md): why (problem, outcome, constraints)
- [SPEC.md](SPEC.md): what (requirements FR-/NFR- with acceptance criteria)
- [PLAN.md](PLAN.md): how (architecture, data model, phases)
- [TASKS.md](TASKS.md): current work; tick tasks only when tests pass
- [docs/decisions/](docs/decisions/): ADRs; add one for any significant, hard-to-reverse choice

## Workflow

1. Pick a task from TASKS.md. If the requirement is unclear or missing, update SPEC.md first.
2. Plan the change, then implement with tests.
3. Run `npm run lint && npm run typecheck && npm test && npm run build` before calling it done.
4. Reference requirement IDs in commit messages, e.g. `feat(checkin): share toggle (FR-10)`.

## Commits

- Author is the repo's git config: Gustav Arrhenius <skysodan@gmail.com>. Don't change it.
- When an AI agent makes the commit, say so in the message: end it with a `Committed-by: AI agent (<tool and model>)` line, plus any co-author trailer the tool adds.
- Commit only when asked. The GitHub repo is public: never commit secrets, `.env.local`, or real user data.

## Commands

- `npm run dev`: dev server at http://localhost:5173
- `npm run lint` (oxlint), `npm run typecheck`, `npm test` (Vitest), `npm run build`
- `npx supabase db push`: apply `supabase/migrations` to the linked hosted project
- `npx supabase gen types typescript --linked > src/lib/database.types.ts`: regenerate DB types after a migration

There is no local Docker database. We work against a hosted Supabase dev project in an EU region (see ADR 0002).

## Stack and layout

Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui (`src/components/ui`, generated; add via `npx shadcn@latest add <name>`, don't hand-edit unless needed), React Router, TanStack Query, react-hook-form + zod, Supabase.

- `src/features/<feature>/`: feature code (auth, pairing, assessment, checkin, sharing, insights, safety, therapist, settings)
- `src/routes/`: page components
- `src/lib/`: supabase client, query client, utils
- `supabase/migrations/`: schema and RLS policies (SQL)
- `supabase/functions/`: edge functions (Deno)
- `supabase/tests/`: RLS tests
- Import with the `@/` alias.

## Rules that must not be broken

- **Privacy is enforced in the database.** Every new table enables RLS and gets policies plus tests for allowed and denied access. Never rely on the frontend to hide data.
- **A partner can never read the other's `reflections`, `assessments`, `insights` or `safety_flags`.** Sharing creates a row in `shares`; it never exposes the original.
- **No attachment labels in the UI or in LLM output** ("anxious", "avoidant", "secure type", etc.). Use situation → tendency wording.
- **No clinical claims** (diagnose, treat, therapy replacement). The app supports therapy; it isn't therapy.
- **LLM calls only from edge functions**, with one user's own data per call. Never put secrets or the service-role key in frontend code.
- **Safety flags are never visible to the partner** and never trigger notifications to them.
- Don't log reflection text or assessment answers.

## Style

- TypeScript strict; no `any` without a comment explaining why.
- Zod schemas for all form and edge-function inputs.
- Calm, plain-language copy. Short sentences. Second person.
