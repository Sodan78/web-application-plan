# 0006. AI reflection guide: self-discovery, no assigned labels

Date: 2026-09-24. Status: accepted.

## Context
The product owner wants an AI with the skill of a trained couples therapist to help each person reflect and discover for themselves whether they tend to act anxious, avoidant or fearful-avoidant. The intent says no attachment label is shown and patterns are tendencies in situations, not types. An AI acting as a therapist also raises EU MDR risk and needs safety measures.

## Decision
- Build an **AI reflection guide**, one-to-one with each person, using open questions to help them notice situation → feeling → need → reaction in their own words.
- **The guide never introduces a style label.** If the person names one themselves (e.g. "I think I'm avoidant"), the guide may explore it with them as a tendency in certain situations, never confirming it as a type or diagnosis.
- Grounded in established, publicly published attachment theory. It does **not** present as, name, or imitate any real person or their programmes.
- It says it is an AI, not a therapist, and points people back to their therapist for deeper work.
- Opt-in via the `ai_insights` consent; sees only the person's own data; never the partner's.
- **Built after** check-ins (Phase 2) and the safety screen (Phase 3). Needs a backend so the model API key is never in the browser; the backend choice gets its own ADR.

## Consequences
- SPEC P2 and FR-15 are reworded from "never shown" to "never assigned"; the guide gets FR-26..FR-33.
- MDR risk goes up (software that supports therapy with individual guidance). The regulatory assessment (NFR-5) must cover the guide before any pilot.
- Guide behaviour needs an automated evaluation set (no introduced labels, no partner data, safety hand-off), run on every prompt change.
