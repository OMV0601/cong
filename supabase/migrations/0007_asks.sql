-- Phase 3: Ask.
--
-- When the grid does not answer the question, the stranger films a few seconds
-- of what they are actually looking at and sends it to the people who can read
-- it. The answer comes back to that one stranger over Realtime.
--
-- Also here: side-by-side confirmation. When a stranger thinks they have found
-- a match, they record what they are seeing and compare it against the
-- family's clip themselves. Lexicon still never decides — it just puts the two
-- clips next to each other and records what the human concluded.

-- ---------------------------------------------------------------------------
-- Ask clips live under `<person_id>/asks/`.
--
-- That keeps the existing storage_person_id() convention working, and lets a
-- grant holder write into exactly one folder and nowhere else.
-- ---------------------------------------------------------------------------

drop policy if exists signals_objects_insert on storage.objects;

create policy signals_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'signals'
    and (
      public.is_circle_member(public.storage_person_id(name))
      or (
        public.has_grant_for(public.storage_person_id(name))
        and (storage.foldername(name))[2] = 'asks'
      )
    )
  );

-- A grant holder may read the family's clips but NOT other people's Ask
-- clips — those are video of a patient filmed by a stranger, and one
-- stranger's recording is nobody else's to browse. The asker does not need
-- read access: they still hold the blob they just recorded.
drop policy if exists signals_objects_select on storage.objects;

create policy signals_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'signals'
    and (
      public.is_circle_member(public.storage_person_id(name))
      or (
        public.has_grant_for(public.storage_person_id(name))
        and coalesce((storage.foldername(name))[2], '') <> 'asks'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- create_ask — the stranger's question.
-- ---------------------------------------------------------------------------

create or replace function create_ask(
  p_person_id uuid,
  p_clip_path text,
  p_note      text default null
)
returns ask_requests
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_ask   ask_requests;
  v_grant uuid;
begin
  if not has_grant_for(p_person_id) then
    raise exception 'no_access' using errcode = '42501';
  end if;

  select gs.grant_id into v_grant
  from grant_sessions gs
  where gs.person_id = p_person_id and gs.user_id = auth.uid()
  limit 1;

  insert into ask_requests (person_id, grant_id, clip_path, note, asker_user_id)
  values (p_person_id, v_grant, p_clip_path, nullif(trim(p_note), ''), auth.uid())
  returning * into v_ask;

  insert into access_log (person_id, grant_id, action)
  values (p_person_id, v_grant, 'asked');

  return v_ask;
end;
$$;

grant execute on function create_ask(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- answer_ask / mark_no_match
--
-- Only someone flagged can_answer may respond. An answer may point at an
-- existing signal, carry free text, or both.
-- ---------------------------------------------------------------------------

create or replace function answer_ask(
  p_ask_id    uuid,
  p_text      text default null,
  p_signal_id uuid default null
)
returns ask_requests
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_ask ask_requests;
begin
  select * into v_ask from ask_requests where id = p_ask_id;
  if v_ask.id is null or not can_answer_for(v_ask.person_id) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_text, '')), '') is null and p_signal_id is null then
    raise exception 'answer_required' using errcode = '22023';
  end if;

  update ask_requests
  set status           = 'answered',
      answer_text      = nullif(trim(p_text), ''),
      answer_signal_id = p_signal_id,
      answered_by      = auth.uid(),
      answered_at      = now()
  where id = p_ask_id
  returning * into v_ask;

  return v_ask;
end;
$$;

grant execute on function answer_ask(uuid, text, uuid) to authenticated;

/**
 * Layer 4, from the family's side: "we don't know what this is."
 *
 * A real answer. Saying so beats a guess dressed up as help.
 */
create or replace function mark_ask_no_match(p_ask_id uuid)
returns ask_requests
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_ask ask_requests;
begin
  select * into v_ask from ask_requests where id = p_ask_id;
  if v_ask.id is null or not can_answer_for(v_ask.person_id) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  update ask_requests
  set status      = 'no_match',
      answer_text = 'We do not recognise this one.',
      answered_by = auth.uid(),
      answered_at = now()
  where id = p_ask_id
  returning * into v_ask;

  return v_ask;
end;
$$;

grant execute on function mark_ask_no_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- pending_asks — the family's inbox.
-- ---------------------------------------------------------------------------

create or replace function asks_for_person(p_person_id uuid, p_limit integer default 50)
returns setof ask_requests
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_circle_member(p_person_id) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  return query
    select * from ask_requests
    where person_id = p_person_id
    order by (status = 'pending') desc, created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

grant execute on function asks_for_person(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- confirm_match — side-by-side confirmation.
--
-- The stranger compared their own clip against the family's and decided it is
-- the same thing. Lexicon records what a person concluded; it never concludes
-- anything itself.
-- ---------------------------------------------------------------------------

create or replace function confirm_match(p_signal_id uuid, p_confirmed boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_person_id uuid;
  v_grant     uuid;
begin
  select person_id into v_person_id from signals where id = p_signal_id;
  if v_person_id is null then
    raise exception 'unknown_signal' using errcode = '22023';
  end if;

  if not (has_grant_for(v_person_id) or is_circle_member(v_person_id)) then
    raise exception 'no_access' using errcode = '42501';
  end if;

  select gs.grant_id into v_grant
  from grant_sessions gs
  where gs.person_id = v_person_id and gs.user_id = auth.uid()
  limit 1;

  insert into access_log (person_id, grant_id, action, signal_id)
  values (
    v_person_id,
    v_grant,
    case when p_confirmed then 'confirmed_match' else 'rejected_match' end,
    p_signal_id
  );
end;
$$;

grant execute on function confirm_match(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- promote_ask_to_signal — the lexicon grows every time someone is confused.
--
-- An answered Ask becomes a permanent entry, so the next stranger never has to
-- ask the same question. This is the thing a phone call cannot do.
-- ---------------------------------------------------------------------------

create or replace function promote_ask_to_signal(
  p_ask_id      uuid,
  p_label       text,
  p_meaning     text default '',
  p_body_region body_region default 'other',
  p_is_sound    boolean default false,
  p_urgency     urgency default 'routine'
)
returns signals
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_ask    ask_requests;
  v_signal signals;
  v_next   integer;
begin
  select * into v_ask from ask_requests where id = p_ask_id;
  if v_ask.id is null or not is_circle_member(v_ask.person_id) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  select coalesce(max(sort_order) + 1, 0) into v_next
  from signals where person_id = v_ask.person_id;

  insert into signals (
    person_id, label, meaning, body_region, is_sound, urgency,
    video_path, mime_type, sort_order, source_ask_id
  )
  values (
    v_ask.person_id, trim(p_label), coalesce(trim(p_meaning), ''),
    p_body_region, p_is_sound, p_urgency,
    v_ask.clip_path, 'video/webm', v_next, v_ask.id
  )
  returning * into v_signal;

  return v_signal;
end;
$$;

grant execute on function promote_ask_to_signal(
  uuid, text, text, body_region, boolean, urgency
) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: the answer has to reach the stranger without them touching
-- anything. RLS still applies, so each side sees only their own rows.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table ask_requests;
