import type { AccessLogEntry } from './types'

/**
 * Turns a log row into the sentence a family actually reads.
 *
 * The point of this screen is trust, and a table of enum values does not
 * produce trust. "Overlake ER confirmed Pain hum" does. Anything we do not
 * have a phrasing for falls through to the raw action rather than being
 * hidden — an unexplained line is better than a missing one in a log whose
 * whole job is completeness.
 */
export function describeAccessEntry(entry: AccessLogEntry): string {
  const who = entry.grant_label ?? 'Someone with a code'
  const what = entry.signal_label

  switch (entry.action) {
    case 'opened':
      return `${who} opened the lexicon`
    case 'asked':
      return `${who} sent a question`
    case 'confirmed_match':
      return what ? `${who} confirmed ${what}` : `${who} confirmed a match`
    case 'rejected_match':
      return what ? `${who} ruled out ${what}` : `${who} ruled out a match`
    default:
      return `${who} — ${entry.action}`
  }
}

/**
 * The day heading a row belongs under.
 *
 * Relative for the last two days because that is the window in which a family
 * is actually checking who looked; absolute after that, because "14 days ago"
 * is not something anyone can cross-reference against a hospital visit.
 */
export function dayHeading(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown date'

  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export interface ActivityDay {
  heading: string
  entries: AccessLogEntry[]
}

/**
 * Groups entries under day headings, preserving the newest-first order the
 * database already returned rather than re-sorting and risking disagreeing
 * with it.
 */
export function groupByDay(
  entries: readonly AccessLogEntry[],
  now: Date = new Date()
): ActivityDay[] {
  const days: ActivityDay[] = []
  for (const entry of entries) {
    const heading = dayHeading(entry.created_at, now)
    const last = days[days.length - 1]
    if (last && last.heading === heading) last.entries.push(entry)
    else days.push({ heading, entries: [entry] })
  }
  return days
}
