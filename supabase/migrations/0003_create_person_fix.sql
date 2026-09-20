-- Fix: a person could never be created.
--
-- createPerson() ran two statements: insert the person, then insert the
-- creator's circle membership. The first was `insert ... returning *`, and
-- Postgres applies the SELECT policy to a RETURNING row. That policy is
-- is_circle_member(id), which was still false because the membership row was
-- the *next* statement. So the insert succeeded and then failed to read itself
-- back, surfacing as "new row violates row-level security policy".
--
-- Two fixes, both worth having:
--   1. create_person() does both writes in one transaction, so there is no
--      window where a person exists without a circle.
--   2. The SELECT policy also admits the creator directly. A person's creator
--      losing sight of them because a membership row went missing is not a
--      state worth preserving.

-- ---------------------------------------------------------------------------
-- 1. Creator can always see what they created.
-- ---------------------------------------------------------------------------

drop policy if exists people_select on people;

create policy people_select on people
  for select to authenticated
  using (created_by = auth.uid() or is_circle_member(id));

-- ---------------------------------------------------------------------------
-- 2. Create a person and their circle atomically.
--
-- security definer so the two writes are not subject to the ordering problem
-- above. It is safe because created_by is forced to auth.uid() — a caller
-- cannot create a person owned by anyone else — and an unauthenticated caller
-- is rejected outright.
-- ---------------------------------------------------------------------------

create or replace function create_person(p_display_name text)
returns people
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_person  people;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if trim(coalesce(p_display_name, '')) = '' then
    raise exception 'name_required' using errcode = '22023';
  end if;

  insert into people (display_name, created_by)
  values (trim(p_display_name), v_user_id)
  returning * into v_person;

  insert into circle_members (person_id, user_id, role, can_answer)
  values (v_person.id, v_user_id, 'family', true);

  return v_person;
end;
$$;

revoke all on function create_person(text) from public, anon;
grant execute on function create_person(text) to authenticated;
