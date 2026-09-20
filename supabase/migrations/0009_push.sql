-- Web Push: recording where a circle member's browser can be reached.
--
-- The table and its policies already exist (0001, 0002). What was missing is a
-- safe way to write a row, and the reason is subtle enough to be worth stating.
--
-- A push endpoint identifies a BROWSER INSTALL, not an account. The column is
-- globally unique, which is correct — one browser, one endpoint. But two
-- different people legitimately sign in on the same phone: a parent, then a
-- guest account during a demo, then the parent again. The second one's insert
-- hits the unique constraint on a row that belongs to the first, and there is
-- no UPDATE policy on the table and no DELETE policy that reaches another
-- user's row. So the write simply cannot succeed, and the symptom is a
-- "Get notified" toggle that appears to work and silently never delivers.
--
-- Widening the policies would mean letting any authenticated user rewrite any
-- subscription row, which is a worse trade. Instead this function owns the
-- write: it always claims the endpoint for the caller, because the browser
-- really has changed hands, and it can never be used to touch anyone else's
-- endpoint since the caller does not choose which row is matched — the
-- endpoint they just subscribed to does.

create or replace function save_push_subscription(
  p_endpoint   text,
  p_p256dh     text,
  p_auth       text,
  p_user_agent text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_endpoint, '')), '') is null
     or nullif(trim(coalesce(p_p256dh, '')), '') is null
     or nullif(trim(coalesce(p_auth, '')), '') is null then
    raise exception 'incomplete_subscription' using errcode = '22023';
  end if;

  insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id    = excluded.user_id,
        p256dh     = excluded.p256dh,
        auth       = excluded.auth,
        user_agent = excluded.user_agent;
end;
$$;

grant execute on function save_push_subscription(text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- What the Edge Function needs to know about an Ask before it may send for it.
--
-- The function runs with the service role, which bypasses RLS entirely, so it
-- must not be handed an ask id and simply trusted. This returns the one fact
-- it needs to check — who created the Ask — alongside the person's name for
-- the notification body, and nothing else.
--
-- Kept in SQL rather than assembled from three service-role queries so that
-- the authorisation question has exactly one answer in exactly one place.
-- ---------------------------------------------------------------------------

create or replace function ask_notification_target(p_ask_id uuid)
returns table (
  asker_user_id uuid,
  person_id     uuid,
  person_name   text,
  note          text,
  already_answered boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.asker_user_id,
         a.person_id,
         p.display_name,
         a.note,
         a.status <> 'pending'
  from ask_requests a
  join people p on p.id = a.person_id
  where a.id = p_ask_id;
$$;

-- Deliberately not reachable from a browser: it exposes the asker's user id,
-- and no client has any business reading that. The service role is granted
-- explicitly rather than left to inherit, because revoking from PUBLIC removes
-- the default grant it would otherwise have been relying on.
revoke all on function ask_notification_target(uuid) from public, anon, authenticated;
grant execute on function ask_notification_target(uuid) to service_role;
