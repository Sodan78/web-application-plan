-- Couples Unite core schema (ADR 0007).
-- Every table has row level security on and no client policies: clients can't touch tables.
-- The app calls the public functions below; each checks auth.uid() and applies the SPEC rules.

create schema if not exists private;

-- Clock. Tests set app.now to move time; production never sets it.
create or replace function private.app_now() returns timestamptz
language sql stable as $$
  select coalesce(nullif(current_setting('app.now', true), '')::timestamptz, now())
$$;

create or replace function private.fail(message text) returns void
language plpgsql as $$
begin
  raise exception using errcode = 'CU403', message = message;
end $$;

create or replace function private.require_uid() returns uuid
language plpgsql stable as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform private.fail('Please sign in'); end if;
  return uid;
end $$;

-- Tables -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 40),
  email text not null,
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purpose text not null check (purpose in ('store_reflections', 'ai_insights', 'therapist_access')),
  version int not null,
  given_at timestamptz not null,
  withdrawn_at timestamptz
);

create table public.pair_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  resolved_at timestamptz
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  member_ids uuid[] not null check (cardinality(member_ids) = 2),
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null,
  ended_at timestamptz,
  ended_by uuid,
  end_notice_seen_by uuid[] not null default '{}',
  checkin_weekday smallint not null default 0 check (checkin_weekday between 0 and 6)
);

-- Answers and scores are never returned to any client (AC-2.1).
create table public.assessments (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  instrument text not null,
  version int not null,
  answers smallint[] not null,
  avoidance numeric not null,
  anxiety numeric not null,
  completed_at timestamptz not null
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_at timestamptz not null,
  completed_by uuid[] not null default '{}',
  closed_at timestamptz
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  prompt text not null check (prompt in ('situation', 'feeling', 'need', 'action')),
  body text not null,
  created_at timestamptz not null,
  unique (checkin_id, author_id, prompt)
);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references public.reflections (id) on delete cascade,
  prompt text not null,
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  shared_at timestamptz not null,
  withdrawn_at timestamptz
);

do $$
declare t text;
begin
  foreach t in array array['profiles', 'consents', 'pair_requests', 'couples', 'assessments', 'checkins', 'reflections', 'shares'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
  end loop;
end $$;

-- New auth users get a profile.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email)
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function private.handle_new_user();

-- Helpers ------------------------------------------------------------------

create or replace function private.active_couple(uid uuid) returns public.couples
language sql stable as $$
  select * from public.couples where status = 'active' and uid = any (member_ids) limit 1
$$;

create or replace function private.has_consent(uid uuid, p_purpose text) returns boolean
language sql stable as $$
  select exists (select 1 from public.consents where user_id = uid and purpose = p_purpose and withdrawn_at is null)
$$;

create or replace function private.require_store_consent(uid uuid) returns void
language plpgsql as $$
begin
  if not private.has_consent(uid, 'store_reflections') then
    perform private.fail('Consent to store reflections is required');
  end if;
end $$;

create or replace function private.require_assessment(uid uuid) returns void
language plpgsql as $$
begin
  if not exists (select 1 from public.assessments where user_id = uid) then
    perform private.fail('Complete the questionnaire first');
  end if;
end $$;

-- Marks old pending requests expired (AC-1.9) and old open check-ins closed (AC-2.13).
create or replace function private.tidy() returns void
language plpgsql as $$
begin
  update public.pair_requests set status = 'expired', resolved_at = private.app_now()
  where status = 'pending' and expires_at <= private.app_now();
  update public.checkins set closed_at = private.app_now()
  where closed_at is null and created_at <= private.app_now() - interval '14 days';
end $$;

create or replace function private.cancel_pending_involving(uids uuid[], except_id uuid default null) returns void
language plpgsql as $$
begin
  update public.pair_requests r set status = 'cancelled', resolved_at = private.app_now()
  where r.status = 'pending'
    and r.id is distinct from except_id
    and (r.from_id = any (uids)
         or r.to_email in (select email from public.profiles where id = any (uids)));
end $$;

create or replace function private.checkin_for(uid uuid, p_checkin uuid) returns public.checkins
language plpgsql stable as $$
declare c public.checkins;
begin
  select ch.* into c from public.checkins ch join public.couples co on co.id = ch.couple_id
  where ch.id = p_checkin and uid = any (co.member_ids);
  if c.id is null then perform private.fail('No access to check-in'); end if;
  return c;
end $$;

create or replace function private.require_writable(uid uuid, c public.checkins) returns void
language plpgsql as $$
begin
  if (select status from public.couples where id = c.couple_id) <> 'active' then
    perform private.fail('This couple has ended');
  end if;
  if c.closed_at is not null then perform private.fail('This check-in is closed'); end if;
  if uid = any (c.completed_by) then perform private.fail('You have finished this check-in'); end if;
end $$;

create or replace function private.checkin_view(uid uuid, c public.checkins) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', c.id,
    'createdAt', c.created_at,
    'closedAt', c.closed_at,
    'myStatus', case
      when uid = any (c.completed_by) then 'finished'
      when exists (select 1 from public.reflections r where r.checkin_id = c.id and r.author_id = uid) then 'in_progress'
      else 'not_started' end,
    'partnerFinished', exists (
      select 1 from public.couples co, unnest(co.member_ids) m
      where co.id = c.couple_id and m <> uid and m = any (c.completed_by)),
    'coupleActive', (select status = 'active' from public.couples where id = c.couple_id)
  )
$$;

-- Profiles -----------------------------------------------------------------

create or replace function public.get_my_profile() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  return (select jsonb_build_object('id', id, 'displayName', display_name, 'email', email)
          from public.profiles where id = uid);
end $$;

-- Consents (FR-2) ----------------------------------------------------------

create or replace function public.get_consents() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'userId', user_id, 'purpose', purpose, 'version', version,
                                        'givenAt', given_at, 'withdrawnAt', withdrawn_at))
    from public.consents where user_id = uid and withdrawn_at is null), '[]');
end $$;

create or replace function public.set_consent(p_purpose text, p_given boolean, p_version int) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  cur public.consents;
begin
  select * into cur from public.consents where user_id = uid and purpose = p_purpose and withdrawn_at is null;
  if p_given and cur.version = p_version then return; end if;
  if not p_given and cur.id is null then return; end if;
  if cur.id is not null then update public.consents set withdrawn_at = private.app_now() where id = cur.id; end if;
  if p_given then
    insert into public.consents (user_id, purpose, version, given_at) values (uid, p_purpose, p_version, private.app_now());
  end if;
  if not p_given and p_purpose = 'store_reflections' then
    perform private.cancel_pending_involving(array[uid]);
  end if;
end $$;

-- Pairing (FR-3, FR-4) -----------------------------------------------------

create or replace function public.request_pair(p_email text) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  target text := lower(trim(p_email));
  partner uuid;
begin
  perform private.tidy();
  perform private.require_store_consent(uid);
  if target !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform private.fail('Enter a valid email address'); end if;
  if target = (select email from public.profiles where id = uid) then perform private.fail('Cannot pair with yourself'); end if;
  if (private.active_couple(uid)).id is not null then perform private.fail('Already in an active couple'); end if;
  if exists (select 1 from public.pair_requests where from_id = uid and status = 'pending') then
    perform private.fail('You already have a pending request');
  end if;
  -- Deliberately no error if the target has an account or a couple: that would reveal it (AC-3.4).
  insert into public.pair_requests (from_id, to_email, created_at, expires_at)
  values (uid, target, private.app_now(), private.app_now() + interval '7 days');
end $$;

create or replace function public.list_pair_requests() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  my_email text := (select email from public.profiles where id = uid);
begin
  perform private.tidy();
  return coalesce((
    select jsonb_agg(v order by v ->> 'createdAt') from (
      select jsonb_build_object('id', r.id, 'direction', 'outgoing', 'otherName', r.to_email, 'createdAt', r.created_at) v
      from public.pair_requests r where r.status = 'pending' and r.from_id = uid
      union all
      select jsonb_build_object('id', r.id, 'direction', 'incoming', 'otherName', p.display_name, 'createdAt', r.created_at)
      from public.pair_requests r join public.profiles p on p.id = r.from_id
      where r.status = 'pending' and r.to_email = my_email
    ) s), '[]');
end $$;

create or replace function public.respond_to_pair(p_request uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  r public.pair_requests;
begin
  perform private.tidy();
  select * into r from public.pair_requests where id = p_request;
  if r.id is null or r.to_email <> (select email from public.profiles where id = uid) then
    perform private.fail('Not your request');
  end if;
  if r.status <> 'pending' then perform private.fail('Request is no longer open'); end if;
  if not p_accept then
    update public.pair_requests set status = 'declined', resolved_at = private.app_now() where id = r.id;
    return;
  end if;
  perform private.require_store_consent(uid);
  if (private.active_couple(uid)).id is not null or (private.active_couple(r.from_id)).id is not null then
    perform private.fail('Already in an active couple');
  end if;
  update public.pair_requests set status = 'accepted', resolved_at = private.app_now() where id = r.id;
  insert into public.couples (member_ids, created_at) values (array[r.from_id, uid], private.app_now());
  perform private.cancel_pending_involving(array[r.from_id, uid], r.id);
end $$;

create or replace function public.cancel_pair_request(p_request uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  if not exists (select 1 from public.pair_requests where id = p_request and from_id = uid) then
    perform private.fail('Not your request');
  end if;
  update public.pair_requests set status = 'cancelled', resolved_at = private.app_now()
  where id = p_request and status = 'pending';
end $$;

-- Couples (FR-25) ----------------------------------------------------------

create or replace function public.get_active_couple() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  c public.couples := private.active_couple(uid);
  partner uuid;
begin
  if c.id is null then return null; end if;
  select m into partner from unnest(c.member_ids) m where m <> uid;
  return jsonb_build_object(
    'id', c.id,
    'partner', jsonb_build_object('id', partner, 'displayName', (select display_name from public.profiles where id = partner)),
    'since', c.created_at);
end $$;

create or replace function public.end_couple() returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  c public.couples := private.active_couple(uid);
begin
  if c.id is null then perform private.fail('No active couple'); end if;
  update public.couples
  set status = 'ended', ended_at = private.app_now(), ended_by = uid, end_notice_seen_by = array[uid]
  where id = c.id;
end $$;

create or replace function public.has_unseen_end_notice() returns boolean
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  return exists (select 1 from public.couples
                 where status = 'ended' and uid = any (member_ids) and not uid = any (end_notice_seen_by));
end $$;

create or replace function public.dismiss_end_notice() returns void
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  update public.couples set end_notice_seen_by = array_append(end_notice_seen_by, uid)
  where status = 'ended' and uid = any (member_ids) and not uid = any (end_notice_seen_by);
end $$;

-- Assessment (FR-5..7) -----------------------------------------------------

create or replace function public.has_completed_assessment() returns boolean
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  return exists (select 1 from public.assessments where user_id = uid);
end $$;

-- ECR-RS partner: items 1–4 reverse-scored; avoidance = mean(1–6), anxiety = mean(7–9).
create or replace function public.save_assessment(p_answers numeric[]) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  scored numeric[];
begin
  perform private.require_store_consent(uid);
  if p_answers is null or cardinality(p_answers) <> 9
     or exists (select 1 from unnest(p_answers) a where a is null or a < 1 or a > 7 or a <> trunc(a)) then
    perform private.fail('Expected 9 answers from 1 to 7');
  end if;
  select array_agg(case when i <= 4 then 8 - p_answers[i] else p_answers[i] end order by i)
  into scored from generate_series(1, 9) i;
  insert into public.assessments (user_id, instrument, version, answers, avoidance, anxiety, completed_at)
  values (uid, 'ECR-RS-partner', 1, p_answers,
          (select avg(x) from unnest(scored[1:6]) x), (select avg(x) from unnest(scored[7:9]) x), private.app_now())
  on conflict (user_id) do update
  set answers = excluded.answers, avoidance = excluded.avoidance, anxiety = excluded.anxiety,
      completed_at = excluded.completed_at;
end $$;

-- Check-ins (FR-8..13) -----------------------------------------------------

create or replace function public.set_checkin_weekday(p_weekday int) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  c public.couples := private.active_couple(uid);
begin
  if c.id is null then perform private.fail('No active couple'); end if;
  if p_weekday is null or p_weekday < 0 or p_weekday > 6 then perform private.fail('Invalid weekday'); end if;
  update public.couples set checkin_weekday = p_weekday where id = c.id;
end $$;

create or replace function public.get_checkin_status(p_tz text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  c public.couples;
  tz text := coalesce(nullif(p_tz, ''), 'UTC');
  local_now timestamp;
  last_scheduled timestamptz;
  open_checkin public.checkins;
begin
  perform private.tidy();
  c := private.active_couple(uid);
  if c.id is null then return null; end if;
  begin
    local_now := private.app_now() at time zone tz;
  exception when others then
    tz := 'UTC';
    local_now := private.app_now() at time zone tz;
  end;
  last_scheduled := (date_trunc('day', local_now)
                     - ((extract(dow from local_now)::int - c.checkin_weekday + 7) % 7) * interval '1 day')
                    at time zone tz;
  select * into open_checkin from public.checkins where couple_id = c.id and closed_at is null limit 1;
  return jsonb_build_object(
    'due', open_checkin.id is null
           and not exists (select 1 from public.checkins where couple_id = c.id and created_at >= last_scheduled),
    'nextDate', last_scheduled + interval '7 days',
    'weekday', c.checkin_weekday,
    'open', case when open_checkin.id is null then null else private.checkin_view(uid, open_checkin) end);
end $$;

create or replace function public.start_checkin() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  c public.couples;
  ch public.checkins;
begin
  perform private.tidy();
  perform private.require_store_consent(uid);
  c := private.active_couple(uid);
  if c.id is null then perform private.fail('Pair with your partner first'); end if;
  perform private.require_assessment(uid);
  select * into ch from public.checkins where couple_id = c.id and closed_at is null limit 1;
  if ch.id is null then
    insert into public.checkins (couple_id, created_at) values (c.id, private.app_now()) returning * into ch;
  end if;
  return private.checkin_view(uid, ch);
end $$;

create or replace function public.get_checkin(p_checkin uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  perform private.tidy();
  return private.checkin_view(uid, private.checkin_for(uid, p_checkin));
end $$;

create or replace function public.list_checkins() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  perform private.tidy();
  return coalesce((
    select jsonb_agg(private.checkin_view(uid, ch) order by ch.created_at desc)
    from public.checkins ch join public.couples co on co.id = ch.couple_id
    where uid = any (co.member_ids)), '[]');
end $$;

-- One reflection per prompt; saving again replaces it, empty text removes it (AC-2.6).
create or replace function public.save_reflection(p_checkin uuid, p_prompt text, p_body text) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  ch public.checkins;
  txt text := trim(coalesce(p_body, ''));
begin
  perform private.tidy();
  perform private.require_store_consent(uid);
  perform private.require_assessment(uid);
  ch := private.checkin_for(uid, p_checkin);
  perform private.require_writable(uid, ch);
  if txt = '' then
    delete from public.reflections where checkin_id = ch.id and author_id = uid and prompt = p_prompt;
  else
    insert into public.reflections (checkin_id, author_id, prompt, body, created_at)
    values (ch.id, uid, p_prompt, txt, private.app_now())
    on conflict (checkin_id, author_id, prompt) do update set body = excluded.body;
  end if;
end $$;

create or replace function public.list_my_reflections(p_checkin uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'checkinId', checkin_id, 'authorId', author_id, 'prompt', prompt,
                                        'body', body, 'createdAt', created_at))
    from public.reflections where checkin_id = p_checkin and author_id = uid), '[]');
end $$;

-- Shares the chosen items and marks the viewer finished. A failure rolls everything back (AC-2.8).
create or replace function public.finish_checkin(p_checkin uuid, p_shares jsonb) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  ch public.checkins;
  item jsonb;
  refl public.reflections;
begin
  perform private.tidy();
  ch := private.checkin_for(uid, p_checkin);
  perform private.require_writable(uid, ch);
  if not exists (select 1 from public.reflections where checkin_id = ch.id and author_id = uid) then
    perform private.fail('Write at least one answer first');
  end if;
  for item in select * from jsonb_array_elements(coalesce(p_shares, '[]')) loop
    select * into refl from public.reflections
    where checkin_id = ch.id and author_id = uid and prompt = item ->> 'prompt';
    if refl.id is null or trim(coalesce(item ->> 'body', '')) = '' then
      perform private.fail('Can only share an answer you wrote');
    end if;
    insert into public.shares (reflection_id, prompt, checkin_id, couple_id, author_id, body, shared_at)
    values (refl.id, refl.prompt, ch.id, ch.couple_id, uid, trim(item ->> 'body'), private.app_now());
  end loop;
  update public.checkins set completed_by = array_append(completed_by, uid) where id = ch.id returning * into ch;
  if (select bool_and(m = any (ch.completed_by)) from public.couples co, unnest(co.member_ids) m where co.id = ch.couple_id) then
    update public.checkins set closed_at = private.app_now() where id = ch.id;
  end if;
end $$;

create or replace function public.withdraw_share(p_share uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  if not exists (select 1 from public.shares where id = p_share and author_id = uid) then
    perform private.fail('Not your share');
  end if;
  update public.shares set withdrawn_at = coalesce(withdrawn_at, private.app_now()) where id = p_share;
end $$;

-- Own shares always (including taken back); partner's only after the viewer finished,
-- while not withdrawn and the couple is active (AC-2.10, AC-1.12).
create or replace function public.list_shares(p_checkin uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  ch public.checkins := private.checkin_for(uid, p_checkin);
  active boolean := (select status = 'active' from public.couples where id = ch.couple_id);
  finished boolean := uid = any (ch.completed_by);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'reflectionId', reflection_id, 'prompt', prompt, 'checkinId', checkin_id,
                                        'coupleId', couple_id, 'authorId', author_id, 'body', body,
                                        'sharedAt', shared_at, 'withdrawnAt', withdrawn_at) order by shared_at)
    from public.shares
    where checkin_id = ch.id and (author_id = uid or (active and finished and withdrawn_at is null))), '[]');
end $$;

-- Only signed-in users may call the API; helpers are never callable.
revoke all on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
