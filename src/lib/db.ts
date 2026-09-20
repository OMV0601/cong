import { getSupabase } from './supabase'
import {
  baseMimeType,
  extensionFor,
  posterFromBlob,
  type RecordedClip,
} from './recorder'
import type {
  AccessGrant,
  AccessLogEntry,
  AskRequest,
  BodyRegion,
  FlaccCategory,
  Person,
  Signal,
  Urgency,
} from './types'

export const SIGNALS_BUCKET = 'signals'

function client() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend not configured. See .env.local.')
  return supabase
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function listPeople(): Promise<Person[]> {
  const { data, error } = await client()
    .from('people')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getPerson(id: string): Promise<Person | null> {
  const { data, error } = await client()
    .from('people')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Creates a person and adds the creator to their circle.
 *
 * One RPC rather than two inserts. Doing it client-side meant the person row
 * had to be read back (INSERT ... RETURNING) before the circle membership
 * existed — and the SELECT policy keys on circle membership, so the row could
 * not see itself. The function does both writes in one transaction instead.
 */
export async function createPerson(displayName: string): Promise<Person> {
  const { data, error } = await client().rpc('create_person', {
    p_display_name: displayName.trim(),
  })
  if (error) {
    console.error('createPerson failed', error)
    throw error
  }
  return data as Person
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export async function listSignals(personId: string): Promise<Signal[]> {
  const { data, error } = await client()
    .from('signals')
    .select('*')
    .eq('person_id', personId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface NewSignalInput {
  personId: string
  label: string
  meaning: string
  bodyRegion: BodyRegion
  isSound: boolean
  urgency: Urgency
  flaccCategory: FlaccCategory | null
  clip: RecordedClip
}

/**
 * Uploads a clip and writes its dictionary entry.
 *
 * Storage first, row second: an orphaned object costs a few hundred kilobytes,
 * whereas a row pointing at a clip that was never uploaded shows a stranger a
 * broken tile at the exact moment they need an answer.
 */
export async function createSignal(input: NewSignalInput): Promise<Signal> {
  const supabase = client()
  const id = crypto.randomUUID()
  const ext = extensionFor(input.clip.mimeType)
  const videoPath = `${input.personId}/${id}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(SIGNALS_BUCKET)
    .upload(videoPath, input.clip.blob, {
      contentType: baseMimeType(input.clip.mimeType),
      upsert: false,
    })
  if (uploadError) {
    console.error('createSignal: clip upload failed', uploadError)
    throw uploadError
  }

  let posterPath: string | null = null
  const poster = await posterFromBlob(input.clip.blob)
  if (poster) {
    const candidate = `${input.personId}/${id}.jpg`
    const { error } = await supabase.storage
      .from(SIGNALS_BUCKET)
      .upload(candidate, poster, { contentType: 'image/jpeg', upsert: false })
    // A missing poster is cosmetic. Never fail the save over it.
    if (!error) posterPath = candidate
  }

  const { count } = await supabase
    .from('signals')
    .select('id', { count: 'exact', head: true })
    .eq('person_id', input.personId)

  const { data, error } = await supabase
    .from('signals')
    .insert({
      id,
      person_id: input.personId,
      label: input.label.trim(),
      meaning: input.meaning.trim(),
      body_region: input.bodyRegion,
      is_sound: input.isSound,
      urgency: input.urgency,
      flacc_category: input.flaccCategory,
      video_path: videoPath,
      poster_path: posterPath,
      mime_type: input.clip.mimeType,
      duration_ms: input.clip.durationMs,
      sort_order: count ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('createSignal: signals insert failed', error)
    // Roll back the uploads so a failed save leaves nothing behind.
    await supabase.storage
      .from(SIGNALS_BUCKET)
      .remove(posterPath ? [videoPath, posterPath] : [videoPath])
    throw error
  }

  return data
}

export async function deleteSignal(signal: Signal): Promise<void> {
  const supabase = client()
  const { error } = await supabase.from('signals').delete().eq('id', signal.id)
  if (error) throw error

  const paths = [signal.video_path]
  if (signal.poster_path) paths.push(signal.poster_path)
  await supabase.storage.from(SIGNALS_BUCKET).remove(paths)
}

// ---------------------------------------------------------------------------
// Storage URLs
// ---------------------------------------------------------------------------

/**
 * Retries a failing call a few times with growing gaps.
 *
 * Only for reads that are safe to repeat. Hospital wifi drops a request now
 * and then, and one dropped request here costs a grid of blank tiles at the
 * exact moment someone needed to look something up.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 300 * 2 ** attempt)
        )
      }
    }
  }
  throw lastError
}

/**
 * Signed URLs for a batch of paths, keyed by path.
 *
 * The bucket is private, so nothing renders without these. One call for the
 * whole grid rather than one per tile — Layer 1 shows every clip at once and
 * a request per tile would be visibly slow on hospital wifi.
 *
 * Retried, because this one call is load-bearing for the entire screen: if it
 * fails there is no grid at all, just squares. Signing is a read and creates
 * nothing, so repeating it is free.
 */
export async function signPaths(
  paths: string[],
  expiresInSeconds = 3600
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return map

  const data = await withRetry(async () => {
    const res = await client()
      .storage.from(SIGNALS_BUCKET)
      .createSignedUrls(unique, expiresInSeconds)
    if (res.error) throw res.error
    return res.data
  })

  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl)
  }
  return map
}

// ---------------------------------------------------------------------------
// Access grants — the scannable code
// ---------------------------------------------------------------------------

export async function listGrants(personId: string): Promise<AccessGrant[]> {
  const { data, error } = await client()
    .from('access_grants')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createGrant(
  personId: string,
  label: string,
  hours: number
): Promise<AccessGrant> {
  const { data, error } = await client().rpc('create_grant', {
    p_person_id: personId,
    p_label: label,
    p_hours: hours,
  })
  if (error) {
    console.error('createGrant failed', error)
    throw error
  }
  return data as AccessGrant
}

export async function revokeGrant(grantId: string): Promise<void> {
  const { error } = await client().rpc('revoke_grant', { p_grant_id: grantId })
  if (error) throw error
}

export function isGrantLive(grant: AccessGrant): boolean {
  return !grant.revoked_at && new Date(grant.expires_at) > new Date()
}

// ---------------------------------------------------------------------------
// The stranger's side
// ---------------------------------------------------------------------------

export interface ClaimedGrant {
  personId: string
  personName: string
  expiresAt: string
  isDemo: boolean
}

/**
 * Exchanges a scanned token for a session.
 *
 * Requires an authenticated caller, so the stranger is signed in anonymously
 * first. That gives them a real auth.uid(), which is what lets Storage and
 * Realtime treat them like any other user instead of needing a token threaded
 * through every request.
 */
export async function claimGrant(token: string): Promise<ClaimedGrant> {
  const { data, error } = await client().rpc('claim_grant', { p_token: token })
  if (error) {
    console.error('claimGrant failed', error)
    throw error
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('This code is not valid.')
  return {
    personId: row.person_id,
    personName: row.person_name,
    expiresAt: row.expires_at,
    // Explicit === true, because a deployment still on 0009 returns no such
    // column. Falling back to "not a demo" is the right direction to be wrong
    // in: a missing banner over sample data is a small embarrassment, whereas
    // a "this is demo data" banner over a real child's signals invites a nurse
    // to discount information she should be acting on.
    isDemo: row.is_demo === true,
  }
}

/** Signals visible to whoever is asking — a circle member or a grant holder. */
export async function signalsForPerson(personId: string): Promise<Signal[]> {
  const { data, error } = await client().rpc('signals_for_person', {
    p_person_id: personId,
  })
  if (error) throw error
  return (data ?? []) as Signal[]
}

/**
 * Full-text search, ranked, for either kind of reader.
 *
 * Postgres does the matching rather than the browser because it stems: someone
 * typing "rocking" should find a signal labelled "rocks when anxious". The
 * caller still filters locally while this is in flight — see localSearch() in
 * filter.ts — so a slow connection never makes the box feel broken.
 */
export async function searchSignals(
  personId: string,
  query: string
): Promise<Signal[]> {
  const { data, error } = await client().rpc('search_signals_for_person', {
    p_person_id: personId,
    p_query: query,
  })
  if (error) throw error
  return (data ?? []) as Signal[]
}

// ---------------------------------------------------------------------------
// Layer 3 — Ask
// ---------------------------------------------------------------------------

/**
 * Sends a stranger's "what is this?" to the people who can read it.
 *
 * The clip goes under `<person_id>/asks/`, which is the only folder a grant
 * holder is allowed to write to.
 */
export async function createAsk(
  personId: string,
  clip: RecordedClip,
  note: string
): Promise<AskRequest> {
  const supabase = client()
  const id = crypto.randomUUID()
  const clipPath = `${personId}/asks/${id}.${extensionFor(clip.mimeType)}`

  const { error: uploadError } = await supabase.storage
    .from(SIGNALS_BUCKET)
    .upload(clipPath, clip.blob, {
      contentType: baseMimeType(clip.mimeType),
      upsert: false,
    })
  if (uploadError) {
    console.error('createAsk: upload failed', uploadError)
    throw uploadError
  }

  const { data, error } = await supabase.rpc('create_ask', {
    p_person_id: personId,
    p_clip_path: clipPath,
    p_note: note,
  })
  if (error) {
    console.error('createAsk: rpc failed', error)
    await supabase.storage.from(SIGNALS_BUCKET).remove([clipPath])
    throw error
  }

  const ask = data as AskRequest

  // Wake the family's phones. Deliberately not awaited for its result and
  // deliberately unable to fail the Ask: Realtime is the path that actually
  // delivers the answer, and push is what makes someone look at it. A notifier
  // that is misconfigured, rate-limited or simply down must never turn a
  // working Ask into an error on a nurse's screen.
  try {
    void supabase.functions
      .invoke('notify-ask', { body: { askId: ask.id } })
      .catch((err) => console.error('notify-ask failed', err))
  } catch (err) {
    console.error('notify-ask could not be invoked', err)
  }

  return ask
}

/**
 * Watches one Ask for its answer.
 *
 * Realtime rather than polling: the nurse should not have to touch the screen
 * again, and an answer arriving thirty seconds late is an answer that arrived
 * after she gave up.
 */
export function watchAsk(
  askId: string,
  onUpdate: (ask: AskRequest) => void
): () => void {
  const supabase = client()
  const channel = supabase
    .channel(`ask:${askId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ask_requests',
        filter: `id=eq.${askId}`,
      },
      (payload) => onUpdate(payload.new as AskRequest)
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

/** Fallback for when a Realtime message is missed. */
export async function getAsk(askId: string): Promise<AskRequest | null> {
  const { data, error } = await client()
    .from('ask_requests')
    .select('*')
    .eq('id', askId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function asksForPerson(personId: string): Promise<AskRequest[]> {
  const { data, error } = await client().rpc('asks_for_person', {
    p_person_id: personId,
  })
  if (error) throw error
  return (data ?? []) as AskRequest[]
}

export async function answerAsk(
  askId: string,
  text: string,
  signalId: string | null
): Promise<AskRequest> {
  const { data, error } = await client().rpc('answer_ask', {
    p_ask_id: askId,
    p_text: text,
    p_signal_id: signalId,
  })
  if (error) throw error
  return data as AskRequest
}

export async function markAskNoMatch(askId: string): Promise<AskRequest> {
  const { data, error } = await client().rpc('mark_ask_no_match', {
    p_ask_id: askId,
  })
  if (error) throw error
  return data as AskRequest
}

/** Records that a human compared two clips and decided. */
export async function confirmMatch(
  signalId: string,
  confirmed: boolean
): Promise<void> {
  const { error } = await client().rpc('confirm_match', {
    p_signal_id: signalId,
    p_confirmed: confirmed,
  })
  if (error) console.error('confirmMatch failed', error)
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

/**
 * Who looked, and what they did with it.
 *
 * The other half of being able to revoke a code: a family can see what was
 * done while it was live. Nobody should have to take a sharing feature on
 * faith.
 */
export async function accessLogForPerson(
  personId: string,
  limit = 200
): Promise<AccessLogEntry[]> {
  const { data, error } = await client().rpc('access_log_for_person', {
    p_person_id: personId,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as AccessLogEntry[]
}

/** Turns an answered Ask into a permanent entry in the lexicon. */
export async function promoteAskToSignal(
  askId: string,
  label: string,
  meaning: string,
  bodyRegion: BodyRegion,
  isSound: boolean,
  urgency: Urgency
): Promise<Signal> {
  const { data, error } = await client().rpc('promote_ask_to_signal', {
    p_ask_id: askId,
    p_label: label,
    p_meaning: meaning,
    p_body_region: bodyRegion,
    p_is_sound: isSound,
    p_urgency: urgency,
  })
  if (error) throw error
  return data as Signal
}
