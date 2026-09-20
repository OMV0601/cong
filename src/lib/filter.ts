import type { BodyRegion, Signal } from './types'

/**
 * Layer 2 ("Point") narrowing.
 *
 * The only input is what the stranger can point at, because the premise of the
 * whole layer is that they cannot describe what they are seeing.
 */
export interface SignalFilter {
  region: BodyRegion | null
  soundOnly: boolean
}

export const EMPTY_FILTER: SignalFilter = { region: null, soundOnly: false }

/**
 * A sound and a body region are independent axes, not alternatives: a person
 * can hum while rocking. "It's a sound" therefore narrows within a chosen
 * region rather than replacing it.
 */
export function filterSignals(
  signals: readonly Signal[],
  filter: SignalFilter
): Signal[] {
  return signals.filter((s) => {
    if (filter.soundOnly && !s.is_sound) return false
    if (filter.region && s.body_region !== filter.region) return false
    return true
  })
}

/**
 * Regions that would actually return something, so the UI never offers a
 * filter that leads to an empty screen. A dead end costs a stranger seconds
 * they do not have.
 */
export function availableRegions(
  signals: readonly Signal[],
  soundOnly = false
): BodyRegion[] {
  const pool = soundOnly ? signals.filter((s) => s.is_sound) : signals
  return [...new Set(pool.map((s) => s.body_region))]
}

/** Urgent signals sort first; everything else keeps the family's ordering. */
export function orderForDisplay(signals: readonly Signal[]): Signal[] {
  const rank = { urgent: 0, attention: 1, routine: 2 } as const
  return [...signals].sort(
    (a, b) => rank[a.urgency] - rank[b.urgency] || a.sort_order - b.sort_order
  )
}

/**
 * The instant half of search.
 *
 * Postgres does the real matching — it stems, so "rocking" finds "rocks when
 * anxious" — but a round trip on hospital wifi is long enough that a search box
 * relying on it alone feels broken while you type. So the already-loaded
 * signals are filtered here on every keystroke, and the server's better answer
 * replaces this one when it lands.
 *
 * Deliberately dumb: case-insensitive substring over the words a family wrote.
 * Anything cleverer would disagree with the server in ways a user would read as
 * flicker.
 */
export function localSearch(
  signals: readonly Signal[],
  query: string
): Signal[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...signals]
  return signals.filter(
    (s) =>
      s.label.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q)
  )
}
