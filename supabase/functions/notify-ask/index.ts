// Wakes the people who can read a signal, when a stranger cannot.
//
// Realtime already delivers the answer back to the nurse without her touching
// the screen. This is the other direction and the harder one: the parent's
// phone is in their pocket, the browser is closed, and nothing short of a
// system notification is going to reach them. That notification is the whole
// difference between "the family answered in forty seconds" and "nobody
// answered, and the shift carried on guessing".
//
// Deploy:
//   supabase functions deploy notify-ask
//   supabase secrets set VAPID_PRIVATE_KEY="$(cat .vapid-private.local)"
//   supabase secrets set VAPID_PUBLIC_KEY=<the same key as VITE_VAPID_PUBLIC_KEY>
//   supabase secrets set VAPID_SUBJECT=mailto:you@example.com
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically. Never
// pass the service role key in by hand and never let it reach the browser.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:lexicon@example.com'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PushRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * A push endpoint that answers 404 or 410 is permanently gone — the browser
 * was uninstalled, the user cleared site data, or the push service retired it.
 * Anything else (a timeout, a 429, a 500) might work next time.
 *
 * Keeping dead rows is not harmless: every future Ask pays the latency of
 * writing to an endpoint that will never answer, and the family's device count
 * slowly becomes a lie.
 */
function isGone(status: number): boolean {
  return status === 404 || status === 410
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('notify-ask: VAPID keys are not configured')
    // 200 on purpose: see the note at the bottom. A misconfigured notifier
    // must not surface as a failed Ask.
    return json({ sent: 0, reason: 'vapid_not_configured' })
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('notify-ask: service role env is missing')
    return json({ sent: 0, reason: 'service_role_not_configured' })
  }

  let askId: string
  try {
    const body = await req.json()
    askId = String(body?.askId ?? '')
    if (!askId) return json({ error: 'ask_id_required' }, 400)
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  // --- Who is calling? ------------------------------------------------------
  // The body alone is never trusted. Anyone can POST an ask id; only the
  // stranger who actually created that Ask may cause a family's phones to ring.
  // Without this check the endpoint is a way to make someone else's device
  // buzz on demand, which is both a nuisance and a way to learn that a given
  // ask id exists.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'unauthenticated' }, 401)
  }

  const asCaller = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await asCaller.auth.getUser(
    authHeader.slice('Bearer '.length)
  )
  if (userError || !userData?.user) {
    return json({ error: 'unauthenticated' }, 401)
  }
  const callerId = userData.user.id

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: targets, error: targetError } = await admin.rpc(
    'ask_notification_target',
    { p_ask_id: askId }
  )
  if (targetError) {
    console.error('notify-ask: could not load the ask', targetError)
    return json({ sent: 0, reason: 'ask_lookup_failed' })
  }

  const target = Array.isArray(targets) ? targets[0] : targets
  if (!target) return json({ error: 'unknown_ask' }, 404)

  if (target.asker_user_id !== callerId) {
    // Same shape of answer as an unknown ask, so this cannot be used to probe
    // which ask ids exist.
    return json({ error: 'unknown_ask' }, 404)
  }

  if (target.already_answered) {
    return json({ sent: 0, reason: 'already_answered' })
  }

  // --- Who should hear about it? -------------------------------------------
  // Only circle members flagged can_answer. A clinician added read-only should
  // not have their phone go off at 3am about a question they cannot answer.
  const { data: members, error: memberError } = await admin
    .from('circle_members')
    .select('user_id')
    .eq('person_id', target.person_id)
    .eq('can_answer', true)
  if (memberError) {
    console.error('notify-ask: could not load the circle', memberError)
    return json({ sent: 0, reason: 'circle_lookup_failed' })
  }

  const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
  if (userIds.length === 0) return json({ sent: 0, reason: 'no_answerers' })

  const { data: subs, error: subError } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  if (subError) {
    console.error('notify-ask: could not load subscriptions', subError)
    return json({ sent: 0, reason: 'subscription_lookup_failed' })
  }

  const rows = (subs ?? []) as PushRow[]
  if (rows.length === 0) return json({ sent: 0, reason: 'no_subscriptions' })

  const payload = JSON.stringify({
    title: `Someone needs help reading ${target.person_name}`,
    body: target.note
      ? `“${String(target.note).slice(0, 120)}”`
      : 'They filmed what they are seeing. Tap to watch it.',
    askId,
    url: `/person/${target.person_id}/inbox`,
  })

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  // web-push does the parts that are genuinely hard to get right — the VAPID
  // JWT and the RFC 8291 payload encryption — but its own transport is built
  // on node:https, which is not the thing to rely on in this runtime. So we
  // take the encrypted body and signed headers from it and post them with
  // fetch, which is native here.
  const results = await Promise.all(
    rows.map(async (row) => {
      try {
        const details = webpush.generateRequestDetails(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          { TTL: 60 * 60 }
        )

        const res = await fetch(details.endpoint, {
          method: 'POST',
          headers: details.headers as Record<string, string>,
          body: details.body as BodyInit,
        })

        if (res.ok) return { ok: true as const, id: row.id }
        if (isGone(res.status)) return { ok: false as const, id: row.id, gone: true }

        console.error(
          `notify-ask: push failed for ${row.id} with ${res.status}`,
          await res.text().catch(() => '')
        )
        return { ok: false as const, id: row.id, gone: false }
      } catch (err) {
        console.error(`notify-ask: push threw for ${row.id}`, err)
        return { ok: false as const, id: row.id, gone: false }
      }
    })
  )

  const dead = results.filter((r) => !r.ok && r.gone).map((r) => r.id)
  if (dead.length > 0) {
    const { error } = await admin
      .from('push_subscriptions')
      .delete()
      .in('id', dead)
    if (error) console.error('notify-ask: could not prune dead rows', error)
  }

  const sent = results.filter((r) => r.ok).length

  // Always 200, even when every send failed.
  //
  // The caller invokes this immediately after create_ask succeeds. The Ask is
  // already saved and Realtime is already going to deliver the answer. If this
  // returned an error the client would have to decide what a failed
  // notification means for an Ask that plainly worked, and the honest answer
  // is "nothing". Failures are logged here, where someone can act on them,
  // rather than shown to a nurse who cannot.
  return json({ sent, attempted: rows.length, pruned: dead.length })
})
