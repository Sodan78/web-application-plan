# 0002. Develop against hosted Supabase, not local Docker

Date: 2026-09-24. Status: accepted.

## Context
Running Supabase locally requires Docker. The team prefers not to install Docker.

## Decision
Use a hosted Supabase **dev** project in an EU region for development, separate from staging and production. Migrations live in `supabase/migrations` and are applied with `supabase db push`. RLS tests run against the dev project.

## Consequences
- Development needs internet access.
- Only synthetic test data goes into the dev project, never real reflections.
- If the team later accepts Docker, `supabase start` works with the same migrations.
