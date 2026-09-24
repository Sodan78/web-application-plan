# Tasks

Work breakdown for [PLAN.md](PLAN.md). Each task names the requirement(s) from [SPEC.md](SPEC.md) it delivers. Tick a box only when the task's tests pass.

## Phase 0 — Foundation
- [x] Scaffold Vite + React + TS, Tailwind, shadcn/ui, React Router, TanStack Query
- [x] Magic-link sign-in page and protected routes (FR-1)
- [x] Vitest + Testing Library setup
- [x] Supabase config in repo
- [x] Git repo, SPEC/PLAN/TASKS/CLAUDE.md, ADRs
- [ ] Create hosted Supabase project in an EU region; link it (`supabase link`) and fill `.env.local`
- [ ] CI: lint, typecheck, test, build on every push

## Phase 1 — Couple and privacy core
- [ ] Migration: `profiles`, `couples`, `couple_members`, `invites`, `consents` with RLS (FR-2, FR-4)
- [ ] RLS tests for every Phase 1 table, allowed and denied (NFR-4)
- [ ] Consent screens, versioned (FR-2)
- [ ] Invite partner by email; accept flow; one-time, 7-day expiry (FR-3)

## Phase 2 — Assessment and check-ins
- [ ] ECR-R / ECR-RS questionnaire, scoring stored server-side, no result screen (FR-5, FR-6, FR-7)
- [ ] Migration: `assessments`, `checkins`, `reflections`, `shares` with RLS + tests
- [ ] Check-in flow with private prompts (FR-9)
- [ ] Review and share step, edited shared copy, withdraw (FR-10, FR-11, FR-12)
- [ ] Joint view (FR-13)
- [ ] Recurring schedule and reminders (FR-8)

## Phase 3 — Safety
- [ ] Safety screen edge function (FR-18)
- [ ] Support resources screen, pause couple features (FR-19)
- [ ] Quick exit, neutral notifications (FR-20)

## Phase 4 — Insights
- [ ] Extraction pipeline per reflection (NFR-3)
- [ ] Insight generation with guardrails: min evidence, banned labels (FR-14, FR-15, FR-16)
- [ ] Insight UI, feedback, share (FR-17)

## Phase 5 — Therapist and data rights
- [ ] Therapist accounts, dual-consent grants, revoke (FR-21)
- [ ] Therapist scoped view (FR-22) and audit log (FR-23)
- [ ] Export and account deletion (FR-24)
- [ ] End couple / separation flow (FR-25)

## Phase 6 — Pilot readiness
- [ ] DPIA and MDR assessment (NFR-5)
- [ ] Accessibility pass (NFR-2)
- [ ] Pilot with therapists and couples
