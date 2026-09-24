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
- **P2 Gentle disclosure.** The app never assigns an attachment label. Patterns are tendencies in situations, not a type. A person may name a style themselves; the app can then explore it with them as a tendency ([ADR 0006](docs/decisions/0006-ai-reflection-guide.md)).
- **P3 Enforced in one place.** Every access rule is enforced in the data layer (the repository now, database policies once there is a backend), never in screens, and covered by a test.
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
- **FR-15** An insight is phrased as situation → tendency → a more secure alternative to try. It never assigns type labels ("anxious", "avoidant", "fearful-avoidant", "disorganised") or uses diagnostic wording.
- **FR-16** An insight is based only on the user's own data, and is private to that user.
- **FR-17** The user can react to an insight (fits / doesn't fit / not now) and can share it like a reflection.

### Safety
- **FR-18** Each reflection is screened for signs of abuse, coercive control or acute risk.
- **FR-19** If triggered, only the author sees a calm screen with local support resources and the option to pause couple features. The partner is never notified.
- **FR-20** A quick-exit control is available on every page. The app name and notifications are neutral.

### AI reflection guide
A one-to-one AI conversation that helps a person reflect on their own reflections ([ADR 0006](docs/decisions/0006-ai-reflection-guide.md)). Built after Phases 2 and 3.

- **FR-26** Available only when the person has given the "Insights from my reflections" consent. Turning it off stops the guide immediately. Conversations are private to the person, like reflections.
- **FR-27** The guide asks open, non-judging questions that help the person notice situation → feeling → need → reaction, and reflects back their own words. It doesn't diagnose, give treatment advice, or tell them what they are.
- **FR-28** The guide never introduces a style label (anxious, avoidant, fearful-avoidant, disorganised, "secure type"). If the person uses one first, the guide may explore it as a tendency in particular situations, and never confirms it as a type.
- **FR-29** The guide has a neutral name ("your reflection guide"), says it is an AI and not a therapist, never presents as or names a real person, and encourages bringing what they notice to their therapist.
- **FR-30** Every message the person sends passes the safety screen (FR-18) before it reaches the model. If it triggers, the guide stops and the FR-19 support screen is shown.
- **FR-31** The guide sees only the person's own reflections and assessment. Never the partner's data, shared or not.
- **FR-32** The person can turn a takeaway from a conversation into a share, with the same review and withdraw rules as reflections (FR-10..12).
- **FR-33** The approach is based on established, published attachment theory. System prompts are versioned and reviewed by a clinical advisor before any pilot.

Acceptance: an automated evaluation set of scripted conversations, run on every prompt change, shows zero introduced labels (FR-28), zero partner data in model input (FR-31), and a correct hand-off on every safety case (FR-30).

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
- **NFR-4** Every access rule has an automated test proving both allowed and denied access (repository tests now; database policy tests once there is a backend).
- **NFR-5** A DPIA and a regulatory (EU MDR) assessment are completed before any external pilot.

## Success measures (3 months of use)

- Both partners report feeling safer bringing up hard topics (in-app survey at start and at 3 months).
- Both partners can name their own and each other's patterns (self-reported, and therapist confirmation where access is granted).

## Known risks

- ECR-R / ECR-RS used without a licence check (product owner decision). Must be resolved before commercial launch.
- MDR classification not yet assessed. The AI reflection guide raises this risk and must be covered by the assessment.
- No backend yet (ADR 0005): data is in the browser and must be test data only. FR-1, FR-3, FR-8 reminders, FR-14..17, FR-21..23 and the AI guide (FR-26..33) need a backend.

---

# Detailed spec: Phase 1 — Couple and privacy core

Status: draft for review. Covers FR-2, FR-4 and FR-25 at screen level, for the current browser-only stage ([ADR 0005](docs/decisions/0005-local-data-layer-first.md)). Acceptance criteria are numbered `AC-1.n` and each one maps to at least one test.

## Scope

In:
- Consent before first use, and changing it later (FR-2)
- Pairing two profiles through a request the partner accepts (FR-4); a local stand-in for email invites (FR-3)
- Ending a couple (FR-25)
- A Settings page holding the above

Out (later phases): email invites and expiry emails (needs backend), self-assessment, check-ins UI, therapist access, export and deletion, quick exit.

Because there is no backend, both partners use the same browser and switch profile. Every flow below must still work as if they were on separate devices: nothing one partner does is decided for the other.

## User stories

- **US-1** As a partner, I want to understand and agree to how my data is used before I write anything, so I feel safe using the app.
- **US-2** As a partner, I want to ask my partner to join me, and have them accept, so we are only linked when we both want it.
- **US-3** As a partner, I want to change my consent later, so I stay in control.
- **US-4** As a partner, I want to end our couple on my own, so I'm never stuck linked to someone.

## Data model additions

```ts
type ConsentPurpose = 'store_reflections' | 'ai_insights' | 'therapist_access'

type Consent = {
  id: Id
  userId: Id
  purpose: ConsentPurpose
  version: number          // text version the user agreed to; current = 1
  givenAt: string
  withdrawnAt: string | null
}

type PairRequest = {
  id: Id
  fromId: Id
  toId: Id
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
  createdAt: string
  expiresAt: string        // createdAt + 7 days
  resolvedAt: string | null
}
```

Consent history is append-only: changing a consent withdraws the old row and adds a new one. Never edit or delete a given consent.

## Repository API additions

All take the viewer's id; all rules are enforced here (P3).

| Function | Rule |
|---|---|
| `getConsents(viewerId)` | Returns only the viewer's current (not withdrawn) consents. |
| `setConsent(viewerId, purpose, given)` | Records give/withdraw for the viewer only. |
| `listPairCandidates(viewerId)` | Other profiles that are not in an active couple. Returns display name and id only. |
| `requestPair(viewerId, toId)` | Viewer must have `store_reflections` consent, not be in an active couple, and have no other pending outgoing request. Not to self. |
| `listPairRequests(viewerId)` | Pending requests the viewer sent or received. Expired ones are marked `expired` on read. |
| `respondToPair(viewerId, requestId, accept)` | Only the recipient. Accepting requires the recipient's `store_reflections` consent and that neither person is now in an active couple; creates the couple and cancels all other pending requests involving either person. |
| `cancelPairRequest(viewerId, requestId)` | Only the sender. |
| `endCouple(viewerId)` | Either member (exists). |

## Screens and behaviour

### 1. Consent (`/consent`)
Shown right after a new profile is created, and whenever the viewer has no current `store_reflections` consent. Every other signed-in route redirects here until it is given.

Content, in this order:

> **Before you start**
> Your reflections are private. Your partner only sees what you choose to share, and you can take a share back at any time.
>
> **Store my reflections** (required to use check-ins)
> We keep what you write so you can come back to it. Right now it is stored only in this browser.
>
> **Insights from my reflections** (optional, off by default)
> Later, the app can suggest patterns it notices in your own reflections. Nothing is analysed until you turn this on. *Not available yet.*
>
> **Therapist access** (optional, off by default)
> Your therapist can see what you and your partner have shared, only if you both agree. *Not available yet.*
>
> [ Continue ]

- "Store my reflections" is a checkbox, unchecked by default. **Continue** is disabled until it is checked.
- The two optional items are checkboxes, unchecked, and can be set now or later. They are stored but have no effect in Phase 1.
- No pre-ticked boxes, no "accept all".

### 2. Home (`/`)
Shows one of four states:

| State | What the viewer sees |
|---|---|
| Not paired, no requests | "You're not linked with a partner yet." + **Invite your partner** |
| Outgoing request pending | "Waiting for {name} to accept." + **Cancel request** |
| Incoming request(s) | For each: "{name} would like to link with you." + **Accept** / **Decline** |
| Paired | "You're linked with {name}." Placeholder for check-ins. |

Incoming requests show above everything else. If the viewer has both an outgoing and an incoming request, both are shown.

### 3. Invite your partner (dialog)
- Lists pair candidates by display name. If none: "No one else has a profile in this browser yet. Ask your partner to create one." + **Switch profile**.
- Choosing a name and confirming sends the request: toast "Request sent to {name}."

### 4. Accept / decline
- **Accept** → confirm dialog: "Link with {name}? You'll do check-ins together. Your reflections stay private unless you share them." [Link] [Not now]. On Link: toast "You're now linked with {name}."
- **Decline** → no confirm; request is declined silently. The sender sees the request disappear and the "not paired" state again, with no "declined" message (avoids pressure).

### 5. Settings (`/settings`)
Reachable from the header on every signed-in page.

- **Profile:** display name (read-only in Phase 1).
- **Privacy choices:** the three consents as switches, with the same short descriptions as the Consent screen.
  - Turning off "Store my reflections" asks: "Turn this off? You won't be able to write check-ins until you turn it back on. What you've already written is kept until you delete it." [Turn off] [Keep on]. Afterwards the viewer is taken straight to the Consent screen.
- **Your couple** (only when paired): "Linked with {name} since {date}." + **End our couple**.

### 6. End our couple (dialog)
> **End your couple with {name}?**
> - Your private reflections stay yours.
> - Things you shared become visible only to you. The same goes for {name}.
> - This can't be undone. You can link again later with a new request.
>
> [End couple] [Cancel]

- Takes effect immediately. The other partner does not need to agree.
- The other partner's Home, on their next visit, shows the "not paired" state with a one-time neutral notice: "Your couple link has ended." No name of who ended it, no reason.

## Edge cases

- Request to someone who pairs with another person before accepting → request becomes `cancelled`; sender's Home returns to "not paired".
- Both people send each other a request → either can accept the incoming one; accepting cancels the other.
- Request older than 7 days → `expired`; treated as gone for both.
- Viewer withdraws `store_reflections` while a request is pending → the request is cancelled.
- A profile never sees another profile's consents.

## Acceptance criteria

Consent
- **AC-1.1** A new profile is redirected to `/consent` from every signed-in route until "Store my reflections" is given.
- **AC-1.2** Continue is disabled until the required box is checked; optional boxes start unchecked.
- **AC-1.3** Changing a consent keeps the old record (with `withdrawnAt`) and adds a new one.
- **AC-1.4** `getConsents` for one profile never returns another profile's consents.

Pairing
- **AC-1.5** A profile cannot request itself, or request while in an active couple, or send a second pending request.
- **AC-1.6** Only the recipient can accept or decline; only the sender can cancel.
- **AC-1.7** Accepting creates a couple with exactly those two members and cancels every other pending request involving either of them.
- **AC-1.8** Accepting fails if either person is already in an active couple.
- **AC-1.9** A request older than 7 days cannot be accepted and shows as gone for both.
- **AC-1.10** A declined request shows no "declined" message to the sender.

Ending
- **AC-1.11** Either member can end the couple without the other's action; the couple becomes `ended` immediately.
- **AC-1.12** After ending, each person's shares are visible only to themselves (existing test), and both can send new pair requests.
- **AC-1.13** The other partner sees "Your couple link has ended." once, without who or why.

General
- **AC-1.14** All flows work by keyboard only, and every control has a visible label (NFR-2).
- **AC-1.15** No screen uses attachment labels or clinical wording (P2, P5).
