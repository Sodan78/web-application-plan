# 0001. Use the Lovable default stack

Date: 2026-09-24. Status: accepted.

## Context
We want a fast-to-build web app with auth, a Postgres database and serverless functions, on a stack that is easy to hand between tools such as Lovable and Claude Code.

## Decision
Vite + React + TypeScript, Tailwind + shadcn/ui, React Router, TanStack Query, react-hook-form + zod, Supabase (Auth, Postgres with RLS, Edge Functions) in an EU region.

## Consequences
Access control will live in Postgres RLS, so policies need their own tests. For now there is no backend ([ADR 0005](0005-local-data-layer-first.md)). Edge functions run on Deno, not Node.
