# Plan: Couples Unite web app

Based on [intent.md](intent.md) and [SPEC.md](SPEC.md). Task breakdown in [TASKS.md](TASKS.md). Status: decisions in §9 confirmed 2026-09-24.

## 1. What we are building

A web app a couple uses together, alongside couples therapy, for regular check-ins:

1. Each partner has their own account and links with their partner.
2. Each partner completes an attachment self-assessment. **No label is shown afterwards.**
3. In each check-in, each partner reflects **privately**, then chooses what (if anything) to share.
4. Over time the app surfaces *tendencies in situations* ("when plans change last-minute, you tend to…"), built from that person's own reflections, and offers prompts toward more secure ways of relating.
5. Optionally, the couple grants their therapist access.

Success after 3 months: the couple feels safer raising hard topics and both can name their own and each other's patterns.

## 2. Stack (Lovable default)

| Layer | Choice | Notes |
|---|---|---|
| Build | Vite + React 19 + TypeScript | SPA, same as Lovable scaffolds |
| UI | Tailwind CSS + shadcn/ui (Radix) + lucide-react | Calm, accessible components |
| Routing | React Router | |
| Server state | TanStack Query | |
| Forms | react-hook-form + zod | zod schemas shared with edge functions |
| Backend | Supabase (hosted): Postgres, Auth, Row Level Security, Edge Functions (Deno), Storage | **EU region** (e.g. Frankfurt) for GDPR; hosted dev project, no Docker (ADR 0002) |
| AI | Supabase Edge Function calling an LLM (e.g. Claude `claude-sonnet-5`) | Server-side only; data-processing agreement and EU residency need confirming (see §8) |
| Email | Supabase Auth emails + Resend for invites/reminders | |
| Hosting | Lovable hosting or Vercel/Netlify (static SPA) | |
| Testing | Vitest + Testing Library; Playwright for key flows; SQL tests for RLS run against the hosted dev project | RLS tests are required, not optional |

## 3. Architecture

```
Browser (React SPA)
   │  supabase-js (JWT)
   ▼
Supabase (EU)
 ├─ Auth ............ email magic link / password, optional MFA
 ├─ Postgres + RLS .. all access rules enforced in the database
 ├─ Edge Functions .. pairing, sharing, insight generation, safety screen, export/delete
 └─ Cron ............ check-in reminders, insight batch jobs
          │
          ▼
      LLM API (only from edge functions, only one person's own data per call)
```

Principle: **the database, not the frontend, guarantees privacy.** Every table has RLS; the client never sees a row it isn't allowed to.

## 4. Data model (first cut)

| Table | Key columns | Visible to |
|---|---|---|
| `profiles` | id (= auth user), display_name, locale | self; partner sees display_name |
| `couples` | id, status (`pending`/`active`/`separated`), created_at | both members |
| `couple_members` | couple_id, user_id, role (`partner`) | both members |
| `invites` | couple_id, token_hash, email, expires_at | inviter |
| `assessments` | user_id, instrument, version, answers (jsonb), scores (jsonb), completed_at | **self only**; scores never rendered as a label |
| `checkins` | id, couple_id, scheduled_for, status | both members |
| `reflections` | id, checkin_id, author_id, prompt_id, body, mood, created_at | **author only** |
| `shares` | id, reflection_id, author_id, couple_id, shared_body, shared_at, withdrawn_at | both members (and therapist if granted) |
| `insights` | id, user_id, situation, tendency, evidence_refs, confidence, shown_at, feedback | **self only**; user may choose to share one via `shares` |
| `therapist_grants` | couple_id, therapist_id, scope, granted_by[], revoked_at | members + therapist |
| `consents` | user_id, purpose, version, given_at, withdrawn_at | self |
| `safety_flags` | user_id, source, category, created_at | self + system; never partner |
| `audit_log` | actor, action, target, at | admin only |

Design decisions:
- **Sharing makes a copy.** A share stores the chosen text (possibly edited/trimmed) rather than exposing the reflection row. Private reflections stay private under RLS no matter what.
- Sharing can be **withdrawn** by the author (sets `withdrawn_at`; hidden from others).
- Reflection bodies encrypted at rest by Supabase; consider column-level encryption (pgsodium / Vault) for `reflections.body` and `assessments.answers`.

## 5. Core flows

**Onboarding & pairing**
Sign up → consent screens (plain-language, per purpose) → invite partner by email link → partner signs up and accepts → couple becomes `active`. Neither partner sees the other's assessment.

**Self-assessment**
Validated instrument: ECR-R / ECR-RS. Stored scores seed the insight model only. Completion screen: thanks + what happens next, *no type or label*.

**Check-in (weekly default, configurable)**
1. Short private prompts (situation, what I felt, what I needed, what I did).
2. Review screen: "Nothing is shared unless you choose." Per-item share toggle, with ability to edit the shared version.
3. Joint view: both partners' shared items side by side, with a gentle conversation prompt.

**Insights (gradual disclosure)**
- Only after N check-ins (e.g. ≥4) and only when evidence is consistent.
- Framed as situation → tendency → a secure-leaning alternative to try.
- User can react ("fits / doesn't fit / not now"), which feeds back.
- Private by default; can be shared like a reflection.

**Therapist access**
Therapist account → couple requests access → consent step (see open questions) → therapist sees scoped view.

**Leaving / separation**
Either partner can unlink. Private data stays with its owner; handling of shared items per decision in §9.

## 6. AI and pattern detection

- Runs only in edge functions; never sends one partner's private reflections into a call about the other partner.
- Pipeline: extract situations/emotions per reflection → aggregate over time per person → generate a candidate insight → rule checks (min evidence, no labels like "anxious/avoidant type", no diagnosis wording) → queue for display.
- Store structured extractions, not raw prompts, where possible; keep provider zero-retention if available.
- Prompts and outputs versioned for review with clinical advisors.

## 7. Safety: abuse and control (out of scope, but must be detected)

- A **safety screen** runs on each reflection (keyword + LLM classifier) for signs of abuse, coercive control, or acute risk.
- If triggered: show the author (only) a calm screen with local support resources (per country) and a note that this app isn't the right tool for this; offer to pause couple features. **Never notify the partner.**
- Include a quick-exit button and neutral app name/notifications, since a controlling partner may see the screen.
- Exact criteria and resource lists need clinical input.

## 8. Privacy, GDPR, and regulation

- Reflections and assessments are likely **special-category data (health/mental health, Art. 9)** → explicit consent per purpose, DPIA before launch, data processing agreements with Supabase, email, and LLM providers, EU hosting.
- Data subject rights built in from v1: export (JSON), delete account, withdraw consent, withdraw shares.
- Retention policy and audit log of therapist access.
- **EU MDR:** position the intended purpose as a reflection and communication aid used alongside therapy — no diagnosis, treatment recommendations, or clinical claims in UI or marketing. Get a regulatory assessment before external pilots; this decision affects wording across the app.

## 9. Decisions

| Question | Decision |
|---|---|
| Therapist consent | **Confirmed:** both partners must consent; either can revoke at any time. |
| What the therapist sees | Proposed: only shared items and joint check-ins; never private reflections, assessments, or private insights. |
| MDR status | Proposed: treat as non-device wellbeing tool; get formal regulatory opinion before pilot. |
| Abuse detection | Proposed: safety screen as in §7; redirect to resources; clinical sign-off on criteria. |
| Instrument | **Confirmed:** use ECR-R / ECR-RS. No licence check (decision by product owner; known risk for commercial launch). |
| Data on separation | **Confirmed:** private data stays with owner. Shared items become visible only to their author; each partner can export their own data. Therapist access ends automatically. |

## 10. Phases

**Phase 0 — Foundation (week 1)**
Scaffold Vite/React/TS/Tailwind/shadcn, Supabase project (EU), auth, base layout, CI (lint, typecheck, tests).

**Phase 1 — Couple & privacy core (weeks 2–3)**
Profiles, pairing via invite, consent records, full schema with RLS + RLS test suite.

**Phase 2 — Assessment & check-ins (weeks 3–5)**
Self-assessment (ECR-R / ECR-RS), check-in flow, private reflections, sharing/withdrawing, joint view, reminders.

**Phase 3 — Safety (week 5–6)**
Safety screen, resources page, quick exit. Built *before* insights.

**Phase 4 — Insights (weeks 6–8)**
Extraction pipeline, gradual insight display, feedback loop, wording guardrails.

**Phase 5 — Therapist & data rights (weeks 8–9)**
Therapist accounts and grants, export, delete, separation flow, audit log.

**Phase 6 — Pilot readiness**
DPIA, regulatory opinion, accessibility pass (WCAG 2.2 AA), small pilot with therapists and couples.

## 11. Project structure

```
couplesunite/
├─ src/
│  ├─ components/ui/        # shadcn components
│  ├─ components/           # app components
│  ├─ features/
│  │  ├─ auth/  pairing/  assessment/  checkin/
│  │  ├─ sharing/  insights/  therapist/  safety/  settings/
│  ├─ lib/                  # supabase client, query client, utils
│  ├─ routes/               # React Router pages
│  └─ main.tsx
├─ supabase/
│  ├─ migrations/           # schema + RLS policies
│  ├─ functions/            # edge functions (invite, share, insights, safety, export)
│  └─ tests/                # RLS tests
├─ tests/e2e/               # Playwright
├─ docs/decisions/          # ADRs
└─ intent.md, SPEC.md, PLAN.md, TASKS.md, CLAUDE.md
```

## 12. Next step

Phase 0 done (app shell, magic-link auth, routing, Tailwind/shadcn, Vitest, Supabase config). Next: Phase 1 schema + RLS.
