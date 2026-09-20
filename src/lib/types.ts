/**
 * Lexicon domain types. These mirror the Postgres schema in
 * supabase/migrations/ one-for-one — if you change one, change both.
 */

/**
 * Layer 2 ("Point") exists because a stranger often cannot describe what they
 * are seeing. They can always point at WHERE it is happening. These are the
 * only choices they ever have to make.
 */
export const BODY_REGIONS = [
  'hands',
  'face',
  'legs',
  'whole_body',
  'other',
] as const
export type BodyRegion = (typeof BODY_REGIONS)[number]

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  hands: 'Hands or arms',
  face: 'Face or head',
  legs: 'Legs or feet',
  whole_body: 'Whole body',
  other: 'Something else',
}

/**
 * The five FLACC categories (Face, Legs, Activity, Cry, Consolability).
 * FLACC is a validated observational pain scale for people who cannot
 * self-report — reliability ICC 0.87 in children with cognitive impairment.
 *
 * We tag clips against it so a signal's meaning is anchored to a published
 * instrument rather than resting on one family member's wording. Lexicon does
 * not SCORE anyone; it just speaks the same vocabulary a clinician already uses.
 */
export const FLACC_CATEGORIES = [
  'face',
  'legs',
  'activity',
  'cry',
  'consolability',
] as const
export type FlaccCategory = (typeof FLACC_CATEGORIES)[number]

export const FLACC_LABELS: Record<FlaccCategory, string> = {
  face: 'Face — expression, grimace, jaw',
  legs: 'Legs — tension, drawing up, kicking',
  activity: 'Activity — squirming, rocking, rigidity',
  cry: 'Cry — vocalising, moaning, humming',
  consolability: 'Consolability — response to comfort',
}

export type Urgency = 'routine' | 'attention' | 'urgent'

export interface Person {
  id: string
  display_name: string
  avatar_url: string | null
  created_by: string
  created_at: string
}

export interface Signal {
  id: string
  person_id: string
  label: string
  meaning: string
  body_region: BodyRegion
  is_sound: boolean
  urgency: Urgency
  flacc_category: FlaccCategory | null
  video_path: string
  poster_path: string | null
  mime_type: string
  duration_ms: number
  sort_order: number
  /** Set when this signal was promoted from an answered Ask. */
  source_ask_id: string | null
  created_at: string
}

export type CircleRole = 'family' | 'caregiver' | 'clinician'

export interface CircleMember {
  id: string
  person_id: string
  user_id: string
  role: CircleRole
  can_answer: boolean
  created_at: string
}

export interface AccessGrant {
  id: string
  person_id: string
  token: string
  label: string
  expires_at: string
  created_by: string
  revoked_at: string | null
  created_at: string
}

export type AskStatus = 'pending' | 'answered' | 'no_match' | 'expired'

export interface AskRequest {
  id: string
  person_id: string
  grant_id: string | null
  clip_path: string
  note: string | null
  status: AskStatus
  answered_by: string | null
  answer_text: string | null
  answer_signal_id: string | null
  created_at: string
  answered_at: string | null
}

/**
 * One line of the activity log, already resolved to the words a family reads
 * rather than the ids the database stores.
 *
 * `grant_label` is null for an action taken by a circle member rather than a
 * code holder, and for a code that was created without a label.
 */
export interface AccessLogEntry {
  id: string
  action: string
  created_at: string
  grant_label: string | null
  signal_label: string | null
}

/** Actions the log can contain today. Anything else renders as raw text. */
export const ACCESS_ACTIONS = [
  'opened',
  'asked',
  'confirmed_match',
  'rejected_match',
] as const
export type AccessAction = (typeof ACCESS_ACTIONS)[number]
