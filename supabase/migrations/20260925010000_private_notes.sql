-- Private notes: answers to the deeper questions after a check-in (SPEC FR-39..42).
-- Author only, never shared, never used for couple suggestions.

create table public.private_notes (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  question_key text not null check (length(question_key) between 1 and 64),
  body text not null,
  updated_at timestamptz not null,
  unique (checkin_id, author_id, question_key)
);

alter table public.private_notes enable row level security;
revoke all on public.private_notes from public, anon, authenticated;

-- Saving needs store consent and membership of the check-in's couple (active or not: notes stay yours).
-- Empty text removes the note.
create or replace function public.save_private_note(p_checkin uuid, p_question text, p_body text) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := private.require_uid();
  ch public.checkins;
  txt text := trim(coalesce(p_body, ''));
begin
  perform private.require_store_consent(uid);
  ch := private.checkin_for(uid, p_checkin);
  if p_question is null or length(p_question) not between 1 and 64 then perform private.fail('Invalid question'); end if;
  if txt = '' then
    delete from public.private_notes where checkin_id = ch.id and author_id = uid and question_key = p_question;
  else
    insert into public.private_notes (checkin_id, author_id, question_key, body, updated_at)
    values (ch.id, uid, p_question, txt, private.app_now())
    on conflict (checkin_id, author_id, question_key) do update set body = excluded.body, updated_at = excluded.updated_at;
  end if;
end $$;

create or replace function public.list_private_notes(p_checkin uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare uid uuid := private.require_uid();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('questionKey', question_key, 'body', body, 'updatedAt', updated_at)
                     order by question_key)
    from public.private_notes where checkin_id = p_checkin and author_id = uid), '[]');
end $$;

revoke all on function public.save_private_note(uuid, text, text) from public, anon;
revoke all on function public.list_private_notes(uuid) from public, anon;
grant execute on function public.save_private_note(uuid, text, text) to authenticated;
grant execute on function public.list_private_notes(uuid) to authenticated;
