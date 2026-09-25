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
- `npx supabase db push`: apply `supabase/migrations` to the linked hosted project (after `npx supabase login` and `npx supabase link`)

Backend: hosted Supabase in an EU region (ADR 0007), no Docker. `.env.local` holds the project URL and anon key and is never committed. Data tests run the real migrations in PGlite, in-process.

## Stack and layout

Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui (`src/components/ui`, generated; add via `npx shadcn@latest add <name>`, don't hand-edit unless needed), React Router, TanStack Query, react-hook-form + zod, Supabase (Auth + Postgres).

- `src/features/<feature>/`: feature code (auth, pairing, assessment, checkin, sharing, insights, safety, therapist, settings)
- `src/routes/`: page components
- `supabase/migrations/`: schema, row level security and one `security definer` function per app action
- `src/lib/data/`: `types.ts` (shapes), `repository.ts` (the only data API; calls the database functions), tests against PGlite
- `src/lib/`: Supabase client, query client, utils
- Import with the `@/` alias.

## Rules that must not be broken

- **Privacy is enforced in the database.** Tables have RLS on and no client access; every rule lives in a function in `supabase/migrations` that checks `auth.uid()`. Components only use `repo` functions. Every rule gets tests for allowed and denied access in `src/lib/data/*.test.ts`. New functions: `security definer`, `set search_path`, executable by `authenticated` only.
- **Never use the service-role key in the app**, and never put it in any file.
- **A partner can never read the other's reflections, assessments, insights or safety flags.** Sharing creates a `Share` copy; it never exposes the original.
- **The app never assigns an attachment label** ("anxious", "avoidant", "fearful-avoidant", "secure type", etc.) in UI or AI output. Use situation → tendency wording. The AI guide may explore a label only after the person uses it first (ADR 0006).
- **The AI guide never presents as or names a real person**, and always says it's an AI, not a therapist.
- **No clinical claims** (diagnose, treat, therapy replacement). The app supports therapy; it isn't therapy.
- **No LLM calls or API keys in frontend code.** AI calls go in server functions. Never commit secrets (the repo is public).
- **Safety flags are never visible to the partner** and never trigger notifications to them.
- Don't log reflection text or assessment answers.

## Style

- TypeScript strict; no `any` without a comment explaining why.
- Zod schemas for all form and edge-function inputs.
- Calm, plain-language copy. Short sentences. Second person.
- Look: warm and calm (SPEC NFR-6). Use the theme tokens in `src/index.css`, `ActionCard` for home cards, `AuthLayout` for signed-out pages, Fraunces for headings.
