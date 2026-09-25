-- Minimal stand-in for Supabase's auth schema and roles, for tests in PGlite only.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  raw_user_meta_data jsonb not null default '{}'
);
-- Same behaviour as Supabase's auth.uid(): the JWT "sub" claim of the current request.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
