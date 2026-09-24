# Couples Unite

Couples check-in web app for attachment security. See [intent.md](intent.md) and [PLAN.md](PLAN.md).

Stack: Vite + React + TypeScript, Tailwind + shadcn/ui, React Router, TanStack Query, react-hook-form + zod. No backend yet: data is stored in the browser ([ADR 0005](docs/decisions/0005-local-data-layer-first.md)), so use test data only.

## Docs

[intent.md](intent.md) (why) → [SPEC.md](SPEC.md) (what) → [PLAN.md](PLAN.md) (how) → [TASKS.md](TASKS.md) (work). Decisions in [docs/decisions](docs/decisions). Guidance for Claude Code in [CLAUDE.md](CLAUDE.md).

## Run locally

Requires Node 20+. Nothing else: no Docker, no accounts.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and create a profile. To try pairing, create a second profile in the same browser.

## Scripts

- `npm run dev` / `build` / `preview`
- `npm run lint`, `npm run typecheck`, `npm test`
