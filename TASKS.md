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
Detailed spec: [SPEC.md → Phase 1](SPEC.md#detailed-spec-phase-1--couple-and-privacy-core).
- [x] Data model + repository: `Consent`, `PairRequest`, new functions, tests for AC-1.3..1.9, 1.11, 1.12
- [x] Consent screen and redirect (AC-1.1, 1.2)
- [x] Home states, invite dialog, accept/decline (AC-1.5..1.10)
- [x] Settings: privacy choices, end couple dialog, ended notice (AC-1.11..1.13)
- [x] Keyboard and copy check (AC-1.14, 1.15)
- [ ] Invite partner by email; one-time, 7-day expiry (FR-3). Needs backend

## Phase 2 — Assessment and check-ins
Detailed spec: [SPEC.md → Phase 2](SPEC.md#detailed-spec-phase-2--self-assessment-and-check-ins).
- [x] Data + repository: `Assessment`, weekday, check-in status, upsert reflections, `finishCheckin`, share visibility; tests for AC-2.1, 2.2, 2.4..2.13
- [x] ECR-RS partner items file and scoring (AC-2.2)
- [x] Assessment screens, no result shown (AC-2.3)
- [x] Home states for assessment and check-ins
- [x] Check-in write and review-and-share steps (AC-2.6..2.9)
- [x] Joint view with take back (AC-2.10, 2.11)
- [x] Settings: weekday, retake questionnaire (AC-2.12)
- [x] Keyboard, phone width and copy check (AC-2.14, 2.15)

## Phase 3 — Safety
- [ ] Safety screen (FR-18): keyword rules locally; LLM classifier needs backend
- [ ] Support resources screen, pause couple features (FR-19)
- [ ] Quick exit, neutral notifications (FR-20)

## Backend (before Phases 4–5 and any real users)
- [ ] Server function for model calls; API key only server-side (NFR-3)
- [ ] ADR: choose backend (Supabase EU planned); move repository rules to RLS, repository tests to RLS tests
- [ ] Real auth (magic link) replaces local profiles (FR-1)

## Phase 4 — AI reflection guide and insights
- [ ] Guide system prompt v1 and output checks (FR-27, FR-28, FR-29)
- [ ] Evaluation set: introduced labels, partner-data isolation, safety hand-off (FR-28, FR-30, FR-31)
- [ ] Guide chat UI, gated by `ai_insights` consent (FR-26); share a takeaway (FR-32)
- [ ] Clinical review of prompts before pilot (FR-33)
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
