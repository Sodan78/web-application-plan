# 0004. Therapist access needs both partners' consent

Date: 2026-09-24. Status: accepted.

## Context
Intent open question: does therapist access need consent from both partners, and what does the therapist see?

## Decision
Access is active only when both partners have granted it (FR-21). Either can revoke it, which ends it immediately. Therapists see only shared items and joint check-ins (FR-22), and every read is audited (FR-23). Ending the couple revokes access automatically (FR-25).

## Consequences
`therapist_grants` stores one consent per partner; RLS checks both exist and neither is revoked.
