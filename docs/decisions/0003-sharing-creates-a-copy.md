# 0003. Sharing creates a separate copy

Date: 2026-09-24. Status: accepted.

## Context
Private first (SPEC P1): a partner must never be able to read a private reflection, even through a bug in sharing logic.

## Decision
Sharing inserts a row into `shares` holding the (optionally edited) shared text. `reflections` has an author-only RLS policy with no exceptions. Withdrawing sets `withdrawn_at`, which RLS hides from everyone but the author.

## Consequences
Shared text can drift from the original; that is intended. Tests must prove the partner gets zero rows from `reflections`.
