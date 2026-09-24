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
There is no backend yet (ADR 0005). Data lives in the browser via `src/lib/data`; don't add Supabase, Docker or other services without an ADR.

## Stack and layout

Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui (`src/components/ui`, generated; add via `npx shadcn@latest add <name>`, don't hand-edit unless needed), React Router, TanStack Query, react-hook-form + zod. Data: `src/lib/data` over localStorage.

- `src/features/<feature>/`: feature code (auth, pairing, assessment, checkin, sharing, insights, safety, therapist, settings)
- `src/routes/`: page components
- `src/lib/data/`: `types.ts` (model), `storage.ts` (persistence), `repository.ts` (the only data API), with tests
- `src/lib/`: query client, utils
- Import with the `@/` alias.

## Rules that must not be broken

- **Privacy is enforced in the repository** (`src/lib/data/repository.ts`), never in components. Components only use `repo` functions, which take the viewer's id. Every rule gets tests for allowed and denied access. Components never touch `localStorage` for app data.
- **A partner can never read the other's reflections, assessments, insights or safety flags.** Sharing creates a `Share` copy; it never exposes the original.
- **No attachment labels in the UI or in LLM output** ("anxious", "avoidant", "secure type", etc.). Use situation → tendency wording.
- **No clinical claims** (diagnose, treat, therapy replacement). The app supports therapy; it isn't therapy.
- **No LLM calls or API keys in frontend code.** AI waits for a backend. Never commit secrets (the repo is public).
- **Safety flags are never visible to the partner** and never trigger notifications to them.
- Don't log reflection text or assessment answers.

## Style

- TypeScript strict; no `any` without a comment explaining why.
- Zod schemas for all form and edge-function inputs.
- Calm, plain-language copy. Short sentences. Second person.
