# Tasks

Work breakdown for [PLAN.md](PLAN.md). Each task names the requirement(s) from [SPEC.md](SPEC.md) it delivers. Tick a box only when the task's tests pass.

## Phase 0 — Foundation
- [x] Scaffold Vite + React + TS, Tailwind, shadcn/ui, React Router, TanStack Query
- [x] Local profile sign-in and protected routes (FR-1, local stand-in)
- [x] Vitest + Testing Library setup
- [x] Local data layer: types, storage, repository with privacy tests (ADR 0005)
- [x] Git repo, SPEC/PLAN/TASKS/CLAUDE.md, ADRs
- [ ] CI: lint, typecheck, test, build on every push

## Phase 1 — Couple and privacy core
- [ ] Pair two local profiles; end couple (FR-4, FR-25; repository done, UI to do)
- [ ] Consents in the data model and repository, with tests (FR-2, NFR-4)
- [ ] Consent screens, versioned (FR-2)
- [ ] Invite partner by email; one-time, 7-day expiry (FR-3). Needs backend

## Phase 2 — Assessment and check-ins
- [ ] ECR-R / ECR-RS questionnaire, scoring stored server-side, no result screen (FR-5, FR-6, FR-7)
- [ ] Add `Assessment` to the data model; repository tests (FR-7)
- [ ] Check-in flow with private prompts (FR-9)
- [ ] Review and share step, edited shared copy, withdraw (FR-10, FR-11, FR-12)
- [ ] Joint view (FR-13)
- [ ] Recurring schedule (FR-8); reminders need backend

## Phase 3 — Safety
- [ ] Safety screen (FR-18): keyword rules locally; LLM classifier needs backend
- [ ] Support resources screen, pause couple features (FR-19)
- [ ] Quick exit, neutral notifications (FR-20)

## Phase 4 — Insights
- [ ] Extraction pipeline per reflection (NFR-3)
- [ ] Insight generation with guardrails: min evidence, banned labels (FR-14, FR-15, FR-16)
- [ ] Insight UI, feedback, share (FR-17)

## Backend (before Phases 4–5 and any real users)
- [ ] ADR: choose backend (Supabase EU planned); move repository rules to RLS, repository tests to RLS tests
- [ ] Real auth (magic link) replaces local profiles (FR-1)

## Phase 5 — Therapist and data rights
- [ ] Therapist accounts, dual-consent grants, revoke (FR-21)
- [ ] Therapist scoped view (FR-22) and audit log (FR-23)
- [ ] Export and account deletion (FR-24)
- [ ] End couple / separation flow (FR-25)

## Phase 6 — Pilot readiness
- [ ] DPIA and MDR assessment (NFR-5)
- [ ] Accessibility pass (NFR-2)
- [ ] Pilot with therapists and couples
