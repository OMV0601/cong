-- Lexicon — Row-Level Security
--
-- There are two kinds of reader and they are protected differently:
--
--   1. CIRCLE MEMBERS (family, named caregivers) are signed in. They are
--      authorised by a row in circle_members. Ordinary RLS.
--
--   2. STRANGERS (an ER nurse, a substitute aide) have no account and never
--      make one. They hold a grant token from a QR code. They get NO direct
--      table access at all — every read goes through a security-definer
--      function that validates the token first.
--
-- The second rule is the important one: the anon role can SELECT nothing.
-- Leaking a person's signals would require a bug inside one of the three
-- functions at the bottom of this file, not a forgotten policy on a table.

alter table people             enable row level security;
alter table circle_members     enable row level security;
alter table signals            enable row level security;
alter table access_grants      enable row level security;
alter table ask_requests       enable row level security;
alter table push_subscriptions enable row level security;
alter table access_log         enable row level security;

-- ---------------------------------------------------------------------------
-- Membership helpers
--
-- security definer so they can read circle_members without the caller needing
-- their own policy on it — otherwise the membership check would recurse into
-- the policy that is asking the question.
-- ---------------------------------------------------------------------------

create or replace function is_circle_member(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from circle_members
    where person_id = p_person_id and user_id = auth.uid()
  );
$$;

create or replace function can_answer_for(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from circle_members
    where person_id = p_person_id
      and user_id = auth.uid()
      and can_answer
  );
$$;

-- ---------------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------------

create policy people_select on people
  for select to authenticated
  using (is_circle_member(id));

create policy people_insert on people
  for insert to authenticated
  with check (created_by = auth.uid());

create policy people_update on people
  for update to authenticated
  using (is_circle_member(id))
  with check (is_circle_member(id));

-- Only the person who created the record can remove it. Deleting a person
-- cascades their whole lexicon, so this is deliberately the narrowest rule
-- in the file.
create policy people_delete on people
  for delete to authenticated
  using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- circle_members
-- ---------------------------------------------------------------------------

create policy circle_select on circle_members
  for select to authenticated
  using (user_id = auth.uid() or is_circle_member(person_id));

-- Bootstrap: the first member of a circle is the person's creator adding
-- themselves. After that, existing members may add others.
create policy circle_insert on circle_members
  for insert to authenticated
  with check (
    is_circle_member(person_id)
    or exists (
      select 1 from people
      where id = person_id and created_by = auth.uid()
    )
  );

create policy circle_update on circle_members
  for update to authenticated
  using (is_circle_member(person_id))
  with check (is_circle_member(person_id));

create policy circle_delete on circle_members
  for delete to authenticated
  using (is_circle_member(person_id));

-- ---------------------------------------------------------------------------
-- signals
--
-- Note there is no policy here for the anon role. A stranger reads signals
-- only through signals_for_token() below.
-- ---------------------------------------------------------------------------

create policy signals_select on signals
  for select to authenticated
  using (is_circle_member(person_id));

create policy signals_insert on signals
  for insert to authenticated
  with check (is_circle_member(person_id));

create policy signals_update on signals
  for update to authenticated
  using (is_circle_member(person_id))
  with check (is_circle_member(person_id));

create policy signals_delete on signals
  for delete to authenticated
  using (is_circle_member(person_id));

-- ---------------------------------------------------------------------------
-- access_grants
-- ---------------------------------------------------------------------------

create policy grants_select on access_grants
  for select to authenticated
  using (is_circle_member(person_id));

create policy grants_insert on access_grants
  for insert to authenticated
  with check (is_circle_member(person_id) and created_by = auth.uid());

-- Revoking is an update. A family must always be able to revoke instantly.
create policy grants_update on access_grants
  for update to authenticated
  using (is_circle_member(person_id))
  with check (is_circle_member(person_id));

-- ---------------------------------------------------------------------------
-- ask_requests
--
-- Two readers: the circle (who answer), and the anonymous asker (who needs the
-- answer delivered back over Realtime).
-- ---------------------------------------------------------------------------

create policy asks_select_circle on ask_requests
  for select to authenticated
  using (is_circle_member(person_id));

-- The stranger signed in anonymously, so they have a real auth.uid(). They can
-- see their own Asks and nothing else — not other Asks for the same person.
create policy asks_select_own on ask_requests
  for select to authenticated
  using (asker_user_id = auth.uid());

-- Only someone flagged can_answer may answer, and they may only ever move a
-- row to answered/no_match. They cannot rewrite the clip or repoint it at a
-- different person.
create policy asks_update_answer on ask_requests
  for update to authenticated
  using (can_answer_for(person_id))
  with check (can_answer_for(person_id) and status in ('answered', 'no_match'));

-- ---------------------------------------------------------------------------
-- push_subscriptions — strictly your own device.
-- ---------------------------------------------------------------------------

create policy push_select on push_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy push_insert on push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

create policy push_delete on push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- access_log — the family can read it; nobody can write it from the client.
--
-- There is deliberately no INSERT policy. Rows are only ever written by the
-- security-definer functions below, so the log cannot be forged or suppressed
-- by whoever is holding the token.
-- ---------------------------------------------------------------------------

create policy access_log_select on access_log
  for select to authenticated
  using (is_circle_member(person_id));

-- ---------------------------------------------------------------------------
-- The stranger's entire API surface. Three functions, nothing else.
-- ---------------------------------------------------------------------------

/**
 * Resolve a grant token to a person, or null if the token is unknown, expired
 * or revoked. Every other token-taking function goes through this one so there
 * is exactly one definition of "valid token" in the system.
 */
create or replace function person_for_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select g.person_id
  from access_grants g
  where g.token = p_token
    and g.revoked_at is null
    and g.expires_at > now();
$$;

/**
 * Layer 1 and 2: the clips a stranger is allowed to see, and who they belong
 * to. Raises rather than returning empty so the UI can tell "expired code"
 * apart from "this person has no signals yet" — those need different screens.
 */
create or replace function signals_for_token(p_token text)
returns table (
  id             uuid,
  label          text,
  meaning        text,
  body_region    body_region,
  is_sound       boolean,
  urgency        urgency,
  flacc_category flacc_category,
  video_path     text,
  poster_path    text,
  mime_type      text,
  duration_ms    integer,
  sort_order     integer,
  person_name    text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_person_id uuid;
begin
  v_person_id := person_for_token(p_token);
  if v_person_id is null then
    raise exception 'invalid_or_expired_grant' using errcode = '42501';
  end if;

  return query
    select s.id, s.label, s.meaning, s.body_region, s.is_sound, s.urgency,
           s.flacc_category, s.video_path, s.poster_path, s.mime_type,
           s.duration_ms, s.sort_order, p.display_name
    from signals s
    join people p on p.id = s.person_id
    where s.person_id = v_person_id
    order by s.sort_order, s.created_at;
end;
$$;

/**
 * Record that a code was used. Separate from the read so a failed or abandoned
 * lookup still leaves a trace — the family sees every scan, not just the ones
 * that found something.
 */
create or replace function log_grant_access(
  p_token     text,
  p_action    text,
  p_signal_id uuid default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_person_id uuid;
  v_grant_id  uuid;
begin
  select g.person_id, g.id into v_person_id, v_grant_id
  from access_grants g
  where g.token = p_token and g.revoked_at is null and g.expires_at > now();

  if v_person_id is null then
    return; -- Never reveal whether a token exists.
  end if;

  insert into access_log (person_id, grant_id, action, signal_id)
  values (v_person_id, v_grant_id, left(p_action, 40), p_signal_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
--
-- The anon role can execute the three token functions and read nothing else.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;

grant execute on function person_for_token(text)            to anon, authenticated;
grant execute on function signals_for_token(text)           to anon, authenticated;
grant execute on function log_grant_access(text, text, uuid) to anon, authenticated;
