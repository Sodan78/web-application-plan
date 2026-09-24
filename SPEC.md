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

---

# Detailed spec: Phase 2 — Self-assessment and check-ins

Status: draft for review. Covers FR-5..FR-13 at screen level for the browser-only stage. Acceptance criteria are `AC-2.n`.

## Scope

In:
- Self-assessment before the first check-in (FR-5..7)
- Weekly check-in rhythm set by the couple, with an in-app "due" notice (FR-8)
- Check-in flow: private prompts → review and share → done (FR-9..11)
- Joint view per check-in, with withdraw (FR-12, FR-13)
- Check-in history

Out: email/push reminders (need backend), safety screen (Phase 3), insights and AI guide (Phase 4).

## Instrument choice

**ECR-RS, romantic partner domain** (Fraley et al., 2011): 9 items, 7-point agreement scale, two scores, *avoidance* and *anxiety*.
Why this rather than the 36-item ECR-R: it is about this relationship specifically, takes about two minutes, and feels less like a test. ECR-R can be added later as an optional deeper version.

Scoring (stored, never shown):
- Avoidance = mean of items 1–6, with items 1–4 reverse-scored (8 − answer).
- Anxiety = mean of items 7–9.

Item wording lives in one file, `src/features/assessment/ecr-rs.ts`, with the instrument name and version.

## User stories

- **US-5** As a partner, I want a short, calm questionnaire that doesn't label me, so I can start without feeling judged.
- **US-6** As a partner, I want to write privately first and decide afterwards what to share, so I can be honest.
- **US-7** As a partner, I want to see what my partner shared only once I've finished my own, so neither of us is swayed by the other.
- **US-8** As a partner, I want to take back something I shared, so sharing never feels permanent.

## Data model changes

```ts
type Assessment = {
  id: Id
  userId: Id
  instrument: 'ECR-RS-partner'
  version: 1
  answers: number[]            // 9 values, 1..7
  scores: { avoidance: number; anxiety: number }
  completedAt: string
}

type Couple = {
  // …existing
  checkinWeekday: 0 | 1 | 2 | 3 | 4 | 5 | 6   // 0 = Sunday; default 0
}

type Checkin = {
  id: Id
  coupleId: Id
  createdAt: string
  completedBy: Id[]            // members who have finished
  closedAt: string | null      // set when both finished
}
```

`Reflection` stays as is, but there is at most one per (check-in, author, prompt): saving again replaces the text.

## Repository API changes

| Function | Rule |
|---|---|
| `hasCompletedAssessment(viewerId)` | Returns a boolean only. **No function ever returns answers or scores to the UI** (FR-6, FR-7). |
| `saveAssessment(viewerId, answers)` | Needs store consent. Exactly 9 answers, each an integer 1–7. Computes and stores scores. Retaking replaces it. |
| `setCheckinWeekday(viewerId, weekday)` | Either member of the active couple. |
| `getCheckinStatus(viewerId)` | `{ due: boolean, nextDate, open: CheckinView \| null }`. Due when no check-in has been started since the most recent scheduled weekday. |
| `startCheckin(viewerId)` | Needs store consent, an active couple and a completed assessment. If an open check-in exists, returns it instead of creating another. |
| `saveReflection(viewerId, checkinId, prompt, body)` | Upsert. Refused once the viewer has finished this check-in. Empty body deletes the draft. |
| `finishCheckin(viewerId, checkinId, shares)` | `shares` = list of `{ prompt, body }` to share. Needs at least one saved reflection. Creates the shares, marks the viewer finished, closes the check-in when both have finished. One step: all or nothing. |
| `listShares(viewerId, checkinId)` | Own shares always. Partner's shares only when the viewer has finished this check-in, the partner's share isn't withdrawn, and the couple is active. |
| `listCheckins(viewerId)` | Newest first, with per-check-in status for the viewer: `not_started`, `in_progress`, `finished`, and whether the partner has finished (yes/no only). |

## Screens and behaviour

### 1. Home, once paired
Top to bottom:
1. **Assessment not done:** card "Before your first check-in" — "A short questionnaire about how you tend to feel in your relationship. About two minutes. There are no right answers, and you won't get a score or a label." **Start**.
2. **Check-in open for me:** "Your check-in is open." **Start writing** (or, once I've written something, "Your check-in is in progress." **Continue**). If the partner has finished: add "{name} has finished theirs."
   If I've finished and my partner hasn't: "You've finished this week's check-in. {name} hasn't finished yet." **See what you shared**.
3. **Check-in due, none open:** "It's time for your weekly check-in." **Start check-in**.
4. **Not due:** "Next check-in: {weekday, date}." + **Start one now** (secondary).
5. **Recent check-ins:** up to 5, each with date and status, linking to the joint view.

### 2. Self-assessment (`/assessment`)
- One statement per screen, with a progress indicator ("3 of 9").
- Answer scale: 7 radio buttons from "Strongly disagree" to "Strongly agree", labelled at both ends and the middle ("Neutral"). Keyboard: arrow keys move, Enter continues.
- **Back** keeps answers. Nothing is saved until the last answer.
- Finish screen: "Thank you. This helps the app ask better questions over time. You won't see a score or a type. Your picture builds gradually through your check-ins." **Go to home**.

### 3. Check-in: write (`/checkin/:id`)
Intro: "This is private. Nothing is shared unless you choose to at the end."

Four prompts, each a text area on one page:

| Prompt | Label | Helper text |
|---|---|---|
| situation | A moment this week | Something that happened between you, big or small. |
| feeling | What I felt | In your body or your mind. |
| need | What I needed | What would have helped you in that moment. |
| action | What I did | How you responded, or what you held back. |

- Each answer saves when the field loses focus ("Saved" shown quietly).
- Answers are optional, but at least one is needed to continue.
- **Review and share** goes to step 4.

### 4. Check-in: review and share
Heading: "Choose what to share. Nothing is shared unless you choose."

For each answered prompt:
- The private text (read-only).
- A "Share this" switch, **off** by default.
- When on, an editable text box prefilled with the private text, labelled "What {partner} will see". Editing changes only the shared copy.

Buttons: **Back** (to edit) and **Finish check-in**. Finish with nothing shared asks: "Finish without sharing anything? That's okay." [Finish] [Back].

### 5. Joint view (`/checkin/:id/together`)
- **Before I've finished:** redirect to my write step.
- **I've finished, partner hasn't:** my shares, plus "{name} hasn't finished yet. Their shares will appear here when they do."
- **Both finished:** two columns (stacked on phones), "You shared" and "{name} shared", grouped by prompt. If a partner shared nothing: "{name} didn't share anything this time." with no other emphasis.
- Conversation prompt under the shares, one per check-in, rotating from a fixed list, e.g. "What's one thing you'd like the other to understand better?"
- Each of my shares has **Take back** → confirm "Take this back? {name} won't see it any more." After that it shows as "You took this back." to me only.

### 6. Settings addition
Under "Your couple": "Weekly check-in day" select (Monday–Sunday). Change shows "Saved" and applies to both partners.

## Edge cases

- Couple ends during an open check-in → the check-in stays readable to each person for their own reflections and shares only; it can't be finished.
- Both partners start at the same time → both get the same open check-in.
- A new check-in can't start while one is open. An open check-in older than 14 days is closed automatically; unfinished drafts stay private and are never shared.
- Retaking the assessment is possible from Settings ("Retake questionnaire"); no result is shown either way.
- Withdrawing store consent mid-check-in → drafts stay, writing is blocked (Phase 1 rule).

## Acceptance criteria

Assessment
- **AC-2.1** No repository function returns assessment answers or scores; the UI can only learn whether it's completed.
- **AC-2.2** Saving requires exactly 9 integer answers from 1 to 7; scores match the scoring rule, including reverse-scored items.
- **AC-2.3** No screen shows a score, a style name or a type after the assessment (P2).
- **AC-2.4** A check-in can't be started or written in before the viewer has completed the assessment.

Check-ins
- **AC-2.5** Only one open check-in per couple; starting again returns the open one.
- **AC-2.6** Reflections are one per prompt per person; saving again replaces the text; empty text removes it.
- **AC-2.7** After a person finishes, they can't change their reflections for that check-in.
- **AC-2.8** Finishing needs at least one reflection, and all shares plus the finished mark are saved together or not at all.
- **AC-2.9** "Share this" is off by default; only switched-on items create shares, with the edited text.
- **AC-2.10** A partner's shares are hidden until the viewer has finished that check-in.
- **AC-2.11** A taken-back share disappears for the partner and shows "You took this back." to the author.
- **AC-2.12** Due status follows the couple's weekday: due once that day arrives if no check-in has started since.
- **AC-2.13** Open check-ins older than 14 days close automatically without sharing drafts.

General
- **AC-2.14** Every flow works by keyboard, text areas have visible labels, and layouts work at phone width (NFR-2).
- **AC-2.15** No copy uses labels, clinical words or pressure ("you should", "failed", "missed").
