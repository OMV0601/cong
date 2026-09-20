-- Storage policies for the `signals` bucket.
--
-- Table RLS and Storage RLS are separate systems. Migration 0002 secured the
-- tables but said nothing about storage.objects, so every clip upload was
-- denied — the row was fine, the file had nowhere to go.
--
-- Clips are written at `<person_id>/<signal_id>.<ext>`, so the first path
-- segment identifies the person and circle membership decides access, exactly
-- as it does for the signals table itself.

-- ---------------------------------------------------------------------------
-- Which person does an object path belong to?
--
-- Returns null for anything that is not `<uuid>/...`, so a malformed path
-- fails the membership check instead of raising on a bad cast.
-- ---------------------------------------------------------------------------

create or replace function storage_person_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(object_name))[1]
         ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
    else null
  end;
$$;

grant execute on function storage_person_id(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Circle members manage their own person's clips.
--
-- There is no policy for anon here. A stranger holding a grant token never
-- touches storage directly — Phase 2 hands them signed URLs minted server
-- side, so the bucket stays private to the circle.
-- ---------------------------------------------------------------------------

drop policy if exists signals_objects_select on storage.objects;
drop policy if exists signals_objects_insert on storage.objects;
drop policy if exists signals_objects_update on storage.objects;
drop policy if exists signals_objects_delete on storage.objects;

-- Needed both to read clips back and to mint signed URLs for the grid.
create policy signals_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'signals'
    and public.is_circle_member(public.storage_person_id(name))
  );

create policy signals_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'signals'
    and public.is_circle_member(public.storage_person_id(name))
  );

create policy signals_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'signals'
    and public.is_circle_member(public.storage_person_id(name))
  )
  with check (
    bucket_id = 'signals'
    and public.is_circle_member(public.storage_person_id(name))
  );

-- Deleting a signal removes its clip and poster, and createSignal() cleans up
-- its own uploads when the row insert fails.
create policy signals_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'signals'
    and public.is_circle_member(public.storage_person_id(name))
  );
