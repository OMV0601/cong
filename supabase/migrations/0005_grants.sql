-- Phase 2: the scannable code and the stranger's session.
--
-- A stranger has no account and will never make one. They hold a token from a
-- QR code. Migration 0002 gave them read access to signal *rows* through
-- signals_for_token(), but the clips themselves live in a private Storage
-- bucket, and Storage policies cannot see a token in a URL.
--
-- So: when a stranger opens a valid code, the client signs them in
-- anonymously and calls claim_grant(). That records a short-lived session
-- binding their anonymous auth.uid() to one person. Storage then has
-- something it can check, using exactly the same mechanism as everything else
-- — a row, not a secret in a query string.
--
-- This also sets up Phase 3: an Ask needs a real auth.uid() so the answer can
-- come back to that one stranger over Realtime.

-- ---------------------------------------------------------------------------
-- grant_sessions — one row per stranger who opened a valid code.
-- ---------------------------------------------------------------------------

create table grant_sessions (
  id         uuid primary key default gen_random_uuid(),
  grant_id   uuid not null references access_grants (id) on delete cascade,
  person_id  uuid not null references people (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (grant_id, user_id)
);

create index grant_sessions_lookup_idx
  on grant_sessions (user_id, person_id, expires_at);

alter table grant_sessions enable row level security;

-- A stranger may see their own session and nothing else. The family sees every
-- session opened against their person, which is how "who looked" stays honest.
create policy grant_sessions_select_own on grant_sessions
  for select to authenticated
  using (user_id = auth.uid());

create policy grant_sessions_select_circle on grant_sessions
  for select to authenticated
  using (is_circle_member(person_id));

-- No insert policy: rows are written only by claim_grant() below, so a session
-- cannot be forged by anyone holding a bare anon key.

-- ---------------------------------------------------------------------------
-- Does the caller currently hold a live grant for this person?
-- ---------------------------------------------------------------------------

create or replace function has_grant_for(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from grant_sessions gs
    join access_grants g on g.id = gs.grant_id
    where gs.person_id = p_person_id
      and gs.user_id = auth.uid()
      and gs.expires_at > now()
      and g.revoked_at is null
      and g.expires_at > now()
  );
$$;

-- ---------------------------------------------------------------------------
-- claim_grant — exchange a token for a session.
--
-- Called once when the stranger opens the link. Revoking the grant kills every
-- session derived from it immediately, because has_grant_for() re-checks the
-- parent grant rather than trusting the session row alone.
-- ---------------------------------------------------------------------------

create or replace function claim_grant(p_token text)
returns table (person_id uuid, person_name text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant access_grants;
  v_user  uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_grant
  from access_grants g
  where g.token = p_token
    and g.revoked_at is null
    and g.expires_at > now();

  if v_grant.id is null then
    raise exception 'invalid_or_expired_grant' using errcode = '42501';
  end if;

  insert into grant_sessions (grant_id, person_id, user_id, expires_at)
  values (v_grant.id, v_grant.person_id, v_user, v_grant.expires_at)
  on conflict (grant_id, user_id)
    do update set expires_at = excluded.expires_at;

  insert into access_log (person_id, grant_id, action)
  values (v_grant.person_id, v_grant.id, 'opened');

  return query
    select v_grant.person_id, p.display_name, v_grant.expires_at
    from people p
    where p.id = v_grant.person_id;
end;
$$;

grant execute on function claim_grant(text) to authenticated;
grant execute on function has_grant_for(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The stranger's signal list, now keyed on their session rather than a token.
--
-- Replaces the 0002 version. Reading no longer requires passing the token back
-- on every call, so the token stops travelling in request bodies once claimed.
-- ---------------------------------------------------------------------------

create or replace function signals_for_person(p_person_id uuid)
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
  sort_order     integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (has_grant_for(p_person_id) or is_circle_member(p_person_id)) then
    raise exception 'no_access' using errcode = '42501';
  end if;

  return query
    select s.id, s.label, s.meaning, s.body_region, s.is_sound, s.urgency,
           s.flacc_category, s.video_path, s.poster_path, s.mime_type,
           s.duration_ms, s.sort_order
    from signals s
    where s.person_id = p_person_id
    order by s.sort_order, s.created_at;
end;
$$;

grant execute on function signals_for_person(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_grant / revoke_grant
-- ---------------------------------------------------------------------------

create or replace function create_grant(
  p_person_id uuid,
  p_label     text default '',
  p_hours     integer default 24
)
returns access_grants
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant access_grants;
begin
  if not is_circle_member(p_person_id) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  -- Clamp rather than reject: a code that never expires is the one failure
  -- mode this design exists to avoid.
  if p_hours is null or p_hours < 1 then p_hours := 1; end if;
  if p_hours > 720 then p_hours := 720; end if;

  insert into access_grants (person_id, token, label, expires_at, created_by)
  values (
    p_person_id,
    -- gen_random_uuid() is Postgres core. gen_random_bytes() would mean
    -- pgcrypto, which Supabase installs into the `extensions` schema and this
    -- function's deliberately narrow search_path cannot see.
    replace(gen_random_uuid()::text, '-', '')
      || replace(gen_random_uuid()::text, '-', ''),
    coalesce(left(trim(p_label), 60), ''),
    now() + make_interval(hours => p_hours),
    auth.uid()
  )
  returning * into v_grant;

  return v_grant;
end;
$$;

grant execute on function create_grant(uuid, text, integer) to authenticated;

create or replace function revoke_grant(p_grant_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_person_id uuid;
begin
  select person_id into v_person_id from access_grants where id = p_grant_id;
  if v_person_id is null or not is_circle_member(v_person_id) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  update access_grants set revoked_at = now()
  where id = p_grant_id and revoked_at is null;
end;
$$;

grant execute on function revoke_grant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: a grant holder may read clips, and only read them.
-- ---------------------------------------------------------------------------

drop policy if exists signals_objects_select on storage.objects;

create policy signals_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'signals'
    and (
      public.is_circle_member(public.storage_person_id(name))
      or public.has_grant_for(public.storage_person_id(name))
    )
  );
