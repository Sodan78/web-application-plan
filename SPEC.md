# Spec: Couples Unite

What the product must do and how we know it works. The *why* is in [intent.md](intent.md); the *how* is in [PLAN.md](PLAN.md); the work breakdown is in [TASKS.md](TASKS.md).

Status: v0.1, 2026-09-24. Requirement IDs are stable; reference them in tasks, tests and commits.

## Users

| Role | Description |
|---|---|
| Partner | Adult in a relationship, in couples therapy. Has their own account. Two partners form a couple. |
| Therapist | The couple's therapist. Has access only when both partners grant it. |

Out of scope: relationships with abuse or control; support for conflict in the moment.

## Principles (apply to every requirement)

- **P1 Private first.** Nothing a partner writes is visible to anyone else unless that partner explicitly shares it.
- **P2 Gentle disclosure.** No attachment label is ever shown. Insights are tendencies in situations, not a type.
- **P3 Enforced by the database.** Every access rule is enforced by Row Level Security and covered by a test.
- **P4 Sensitive data.** All reflections and assessment data are special-category personal data under GDPR.
- **P5 Not a medical device.** No diagnosis, treatment or clinical claims in the UI.

## Functional requirements

### Accounts and pairing
- **FR-1** A person can sign up and sign in with an emailed magic link.
- **FR-2** Before any reflection is stored, the user gives explicit consent per purpose (storing reflections, AI-generated insights, therapist access). Consent is versioned and can be withdrawn.
- **FR-3** A partner can invite the other partner by email. The invite link expires after 7 days and works once.
- **FR-4** A couple has exactly two partners. A user belongs to at most one active couple.

Acceptance: a second person accepting a used or expired invite is rejected; a third user can never join a couple.

### Self-assessment
- **FR-5** Each partner completes a self-assessment based on ECR-R / ECR-RS.
- **FR-6** After completion, the user sees a thank-you and what happens next. **No scores, labels or type are shown.**
- **FR-7** A partner can never see the other partner's answers or scores.

Acceptance: no screen, API response to the partner, or export for the partner contains the other's assessment data.

### Check-ins
- **FR-8** A couple has a recurring check-in (default weekly, configurable). Both partners get a reminder.
- **FR-9** In a check-in, each partner answers short private prompts (situation, feeling, need, action).
- **FR-10** Before finishing, the partner reviews each answer and chooses per item whether to share it. Default is not shared.
- **FR-11** A shared item may be edited before sharing; the shared version is stored separately from the private reflection.
- **FR-12** The author can withdraw a share at any time; it then disappears for the partner and therapist.
- **FR-13** A joint view shows both partners' shared items for a check-in, with a conversation prompt.

Acceptance: querying `reflections` as the partner returns zero rows; a withdrawn share returns zero rows for the partner.

### Insights
- **FR-14** Insights appear only after at least 4 completed check-ins and when evidence from several reflections is consistent.
- **FR-15** An insight is phrased as situation → tendency → a more secure alternative to try. It never uses type labels ("anxious", "avoidant", "disorganised") or diagnostic wording.
- **FR-16** An insight is based only on the user's own data, and is private to that user.
- **FR-17** The user can react to an insight (fits / doesn't fit / not now) and can share it like a reflection.

### Safety
- **FR-18** Each reflection is screened for signs of abuse, coercive control or acute risk.
- **FR-19** If triggered, only the author sees a calm screen with local support resources and the option to pause couple features. The partner is never notified.
- **FR-20** A quick-exit control is available on every page. The app name and notifications are neutral.

### Therapist access
- **FR-21** Therapist access requires consent from **both** partners. Either partner can revoke it at any time, which ends access immediately.
- **FR-22** A therapist sees only shared items and joint check-ins. Never private reflections, assessments or private insights.
- **FR-23** Every therapist read is recorded in an audit log visible to both partners.

### Data rights and separation
- **FR-24** A user can export all their own data (JSON) and delete their account.
- **FR-25** Either partner can end the couple. After that: private data stays with its owner; shared items become visible only to their author; therapist access ends automatically.

## Non-functional requirements

- **NFR-1** All data is stored and processed in the EU. Processors (Supabase, email, LLM) have data processing agreements.
- **NFR-2** WCAG 2.2 AA; works on phone width.
- **NFR-3** LLM calls run server-side only, with one person's own data per call; no provider training on the data.
- **NFR-4** Every RLS policy has an automated test proving both allowed and denied access.
- **NFR-5** A DPIA and a regulatory (EU MDR) assessment are completed before any external pilot.

## Success measures (3 months of use)

- Both partners report feeling safer bringing up hard topics (in-app survey at start and at 3 months).
- Both partners can name their own and each other's patterns (self-reported, and therapist confirmation where access is granted).

## Known risks

- ECR-R / ECR-RS used without a licence check (product owner decision). Must be resolved before commercial launch.
- MDR classification not yet assessed.
