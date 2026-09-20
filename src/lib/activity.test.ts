import { describe, expect, it } from 'vitest'
import { dayHeading, describeAccessEntry, groupByDay } from './activity'
import type { AccessLogEntry } from './types'

function entry(partial: Partial<AccessLogEntry> = {}): AccessLogEntry {
  return {
    id: crypto.randomUUID(),
    action: 'opened',
    created_at: '2026-03-10T09:00:00.000Z',
    grant_label: 'Overlake ER',
    signal_label: null,
    ...partial,
  }
}

describe('describeAccessEntry', () => {
  it('names the code so the family knows who it was', () => {
    expect(describeAccessEntry(entry())).toBe('Overlake ER opened the lexicon')
  })

  it('falls back when a code was created without a label', () => {
    expect(describeAccessEntry(entry({ grant_label: null }))).toBe(
      'Someone with a code opened the lexicon'
    )
  })

  it('reads a confirmation as a sentence', () => {
    expect(
      describeAccessEntry(
        entry({ action: 'confirmed_match', signal_label: 'Pain hum' })
      )
    ).toBe('Overlake ER confirmed Pain hum')
  })

  it('distinguishes ruling a signal out from confirming it', () => {
    expect(
      describeAccessEntry(
        entry({ action: 'rejected_match', signal_label: 'Pain hum' })
      )
    ).toBe('Overlake ER ruled out Pain hum')
  })

  it('survives a confirmation whose signal has since been deleted', () => {
    expect(
      describeAccessEntry(
        entry({ action: 'confirmed_match', signal_label: null })
      )
    ).toBe('Overlake ER confirmed a match')
  })

  it('shows an unrecognised action rather than dropping the row', () => {
    // A log whose job is completeness must never silently omit a line.
    expect(describeAccessEntry(entry({ action: 'exported' }))).toBe(
      'Overlake ER — exported'
    )
  })
})

describe('dayHeading', () => {
  const now = new Date(2026, 2, 10, 15, 0, 0)

  it('says Today for the same calendar day', () => {
    expect(dayHeading(new Date(2026, 2, 10, 1, 0, 0).toISOString(), now)).toBe(
      'Today'
    )
  })

  it('says Yesterday for the day before', () => {
    expect(dayHeading(new Date(2026, 2, 9, 23, 0, 0).toISOString(), now)).toBe(
      'Yesterday'
    )
  })

  it('uses an absolute date further back, so it can be cross-referenced', () => {
    const heading = dayHeading(new Date(2026, 1, 24, 9, 0, 0).toISOString(), now)
    expect(heading).not.toBe('Today')
    expect(heading).not.toBe('Yesterday')
    expect(heading).toContain('24')
  })

  it('does not throw on a malformed timestamp', () => {
    expect(dayHeading('not-a-date', now)).toBe('Unknown date')
  })
})

describe('groupByDay', () => {
  const now = new Date(2026, 2, 10, 15, 0, 0)

  it('groups consecutive entries from the same day together', () => {
    const days = groupByDay(
      [
        entry({ created_at: new Date(2026, 2, 10, 12).toISOString() }),
        entry({ created_at: new Date(2026, 2, 10, 9).toISOString() }),
        entry({ created_at: new Date(2026, 2, 9, 20).toISOString() }),
      ],
      now
    )
    expect(days.map((d) => d.heading)).toEqual(['Today', 'Yesterday'])
    expect(days[0].entries).toHaveLength(2)
    expect(days[1].entries).toHaveLength(1)
  })

  it('returns nothing for an empty log', () => {
    expect(groupByDay([], now)).toEqual([])
  })
})
