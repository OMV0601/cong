-- Marking a person as demo data.
--
-- A judge, a teacher or a parent trying Lexicon for the first time is looking
-- at a lexicon for someone who does not exist, with clips that are abstract
-- animations rather than footage of anybody. They must never be in any doubt
-- about that. The alternative — a convincing demo that is quietly synthetic —
-- is the kind of thing that turns a strong submission into a dishonest one.
--
-- So the flag lives on the person, and both sides of the app surface it: the
-- family's grid and, more importantly, the stranger's view, which is the
-- screen someone evaluating this will actually spend time on.

alter table people
  add column if not exists is_demo boolean not null default false;

-- ---------------------------------------------------------------------------
-- claim_grant has to return it too, or the stranger's side has no way to know.
--
-- Dropped and recreated rather than replaced: the return type is changing, and
-- CREATE OR REPLACE cannot do that. Behaviour is otherwise identical to 0005.
-- ---------------------------------------------------------------------------

drop function if exists claim_grant(text);

create function claim_grant(p_token text)
returns table (
  person_id   uuid,
  person_name text,
  expires_at  timestamptz,
  is_demo     boolean
)
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
    select v_grant.person_id, p.display_name, v_grant.expires_at, p.is_demo
    from people p
    where p.id = v_grant.person_id;
end;
$$;

grant execute on function claim_grant(text) to authenticated;
