import { getSupabase } from './supabase'
import {
  baseMimeType,
  extensionFor,
  posterFromBlob,
  type RecordedClip,
} from './recorder'
import type { BodyRegion, FlaccCategory, Person, Signal, Urgency } from './types'

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
  if (uploadError) throw uploadError

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
 * Signed URLs for a batch of paths, keyed by path.
 *
 * The bucket is private, so nothing renders without these. One call for the
 * whole grid rather than one per tile — Layer 1 shows every clip at once and
 * a request per tile would be visibly slow on hospital wifi.
 */
export async function signPaths(
  paths: string[],
  expiresInSeconds = 3600
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return map

  const { data, error } = await client()
    .storage.from(SIGNALS_BUCKET)
    .createSignedUrls(unique, expiresInSeconds)
  if (error) throw error

  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl)
  }
  return map
}
