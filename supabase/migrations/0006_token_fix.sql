-- Fix: create_grant() could not generate a token.
--
-- It called gen_random_bytes(), which lives in pgcrypto. Supabase installs
-- pgcrypto into the `extensions` schema, and the function pins
-- `search_path = public, pg_temp` — deliberately, so a security definer
-- function cannot be hijacked by objects on a caller's path. The extension was
-- installed and simply not visible, giving
-- "function gen_random_bytes(integer) does not exist".
--
-- Widening the search path would work and would weaken the thing the narrow
-- path is there for. gen_random_uuid() is built into Postgres core instead, so
-- this drops the extension dependency altogether. Two uuids stripped of their
-- hyphens give a 64-character token with ~244 bits of entropy, comfortably
-- more than the 128 bits the original produced.

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
