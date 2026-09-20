-- Search, the activity log, and one bug that only shows up after a promotion.
--
-- Three of the four things wired up here already existed in the database and
-- had no way to reach them from the app. The fourth is a hole this migration
-- opens by accident the moment promote_ask_to_signal() is actually used, so it
-- is fixed in the same file rather than discovered on stage.

-- ---------------------------------------------------------------------------
-- A promoted Ask keeps its original clip path, which lives under
-- `<person_id>/asks/`. Migration 0007 deliberately hides that folder from
-- grant holders: a stranger's recording of someone else's child is nobody
-- else's to browse.
--
-- But promotion changes what the clip IS. Once the family has answered the
-- question and chosen to keep the clip as a dictionary entry, it is no longer
-- one stranger's private recording — it is part of the lexicon, and the next
-- stranger has to be able to see it or the tile renders blank at exactly the
-- wrong moment.
--
-- So: a grant holder may read an object under asks/ if, and only if, a signals
-- row points at it. Publication is the family's explicit act, and the policy
-- keys on that act rather than on the folder name.
-- ---------------------------------------------------------------------------

create index if not exists signals_video_path_idx on signals (video_path);

drop policy if exists signals_objects_select on storage.objects;

create policy signals_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'signals'
    and (
      public.is_circle_member(public.storage_person_id(name))
      or (
        public.has_grant_for(public.storage_person_id(name))
        and (
          coalesce((storage.foldername(name))[2], '') <> 'asks'
          or exists (
            select 1 from public.signals s
            where s.video_path = storage.objects.name
              and s.person_id = public.storage_person_id(name)
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- promote_ask_to_signal, corrected.
--
-- The 0007 version hardcoded mime_type = 'video/webm'. Safari records mp4, so
-- a clip filmed on an iPhone was stored under a container it is not in. The
-- path extension is what the upload actually produced, so derive it from there
-- rather than assuming the majority browser.
--
-- Also sets poster_path to null explicitly: an Ask clip never had a poster
-- extracted, and a signal claiming one that does not exist is a broken image.
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
  v_mime   text;
begin
  select * into v_ask from ask_requests where id = p_ask_id;
  if v_ask.id is null or not is_circle_member(v_ask.person_id) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  -- Promoting the same Ask twice would put two identical tiles in the grid,
  -- which is confusing in exactly the place confusion is expensive.
  if exists (select 1 from signals where source_ask_id = p_ask_id) then
    raise exception 'already_promoted' using errcode = '23505';
  end if;

  if nullif(trim(coalesce(p_label, '')), '') is null then
    raise exception 'label_required' using errcode = '22023';
  end if;

  v_mime := case
    when v_ask.clip_path like '%.mp4' then 'video/mp4'
    else 'video/webm'
  end;

  select coalesce(max(sort_order) + 1, 0) into v_next
  from signals where person_id = v_ask.person_id;

  insert into signals (
    person_id, label, meaning, body_region, is_sound, urgency,
    video_path, poster_path, mime_type, sort_order, source_ask_id
  )
  values (
    v_ask.person_id, trim(p_label), coalesce(trim(p_meaning), ''),
    p_body_region, p_is_sound, p_urgency,
    v_ask.clip_path, null, v_mime, v_next, v_ask.id
  )
  returning * into v_signal;

  return v_signal;
end;
$$;

grant execute on function promote_ask_to_signal(
  uuid, text, text, body_region, boolean, urgency
) to authenticated;

-- ---------------------------------------------------------------------------
-- Search.
--
-- Secondary to looking and pointing — a stranger who could describe what they
-- are seeing would not need this app. It earns its place once a lexicon gets
-- large enough that Layer 1 stops being scannable, and for the circle member
-- who knows the word they are looking for.
--
-- One function serves both readers. The stranger cannot SELECT signals at all,
-- so their search has to be security definer; running the family's search
-- through the same function means there is one access check to get right
-- rather than two that can drift apart.
-- ---------------------------------------------------------------------------

create or replace function search_signals_for_person(
  p_person_id uuid,
  p_query     text
)
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
declare
  v_query text := coalesce(trim(p_query), '');
  v_ts    tsquery;
  v_like  text;
begin
  if not (has_grant_for(p_person_id) or is_circle_member(p_person_id)) then
    raise exception 'no_access' using errcode = '42501';
  end if;

  if v_query = '' then
    return query
      select s.id, s.label, s.meaning, s.body_region, s.is_sound, s.urgency,
             s.flacc_category, s.video_path, s.poster_path, s.mime_type,
             s.duration_ms, s.sort_order
      from signals s
      where s.person_id = p_person_id
      order by s.sort_order, s.created_at;
    return;
  end if;

  -- websearch_to_tsquery rather than to_tsquery: it never raises on arbitrary
  -- input, and a search box receives arbitrary input by definition. to_tsquery
  -- throws a syntax error on a stray quote and takes the screen down with it.
  v_ts := websearch_to_tsquery('english', v_query);

  -- The tsvector matches whole stemmed words, so "rock" finds "rocking" but
  -- "roc" finds nothing. Someone typing into a box mid-sentence needs the
  -- prefix to match too, hence the ILIKE. The wildcards a user typed are
  -- escaped so a lone "%" does not quietly match the entire lexicon.
  v_like := '%' ||
    replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
    select s.id, s.label, s.meaning, s.body_region, s.is_sound, s.urgency,
           s.flacc_category, s.video_path, s.poster_path, s.mime_type,
           s.duration_ms, s.sort_order
    from signals s
    where s.person_id = p_person_id
      and (s.search @@ v_ts or s.label ilike v_like or s.meaning ilike v_like)
    order by ts_rank(s.search, v_ts) desc, s.sort_order, s.created_at;
end;
$$;

grant execute on function search_signals_for_person(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The activity log.
--
-- The family can already revoke a code. This is the other half of that
-- promise: being able to see what was done with it while it was live. A
-- sharing feature that cannot be audited is a sharing feature you have to take
-- on faith, and nobody should have to take this one on faith.
--
-- Returns labels rather than ids, because the caller cannot join to
-- access_grants for a grant that has since been deleted, and because the point
-- of the screen is to read like a sentence.
-- ---------------------------------------------------------------------------

create or replace function access_log_for_person(
  p_person_id uuid,
  p_limit     integer default 200
)
returns table (
  id           uuid,
  action       text,
  created_at   timestamptz,
  grant_label  text,
  signal_label text
)
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
    select l.id,
           l.action,
           l.created_at,
           nullif(trim(coalesce(g.label, '')), ''),
           s.label
    from access_log l
    left join access_grants g on g.id = l.grant_id
    left join signals s on s.id = l.signal_id
    where l.person_id = p_person_id
    order by l.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

grant execute on function access_log_for_person(uuid, integer) to authenticated;
