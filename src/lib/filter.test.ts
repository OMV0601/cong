import { describe, expect, it } from 'vitest'
import {
  availableRegions,
  EMPTY_FILTER,
  filterSignals,
  orderForDisplay,
} from './filter'
import type { Signal } from './types'

function signal(over: Partial<Signal>): Signal {
  return {
    id: crypto.randomUUID(),
    person_id: 'p1',
    label: 'signal',
    meaning: '',
    body_region: 'other',
    is_sound: false,
    urgency: 'routine',
    flacc_category: null,
    video_path: 'v.webm',
    poster_path: null,
    mime_type: 'video/webm',
    duration_ms: 4000,
    sort_order: 0,
    source_ask_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  }
}

const painHum = signal({
  label: 'Pain hum',
  body_region: 'face',
  is_sound: true,
  urgency: 'urgent',
  sort_order: 3,
})
const anxiousHum = signal({
  label: 'Anxious hum',
  body_region: 'face',
  is_sound: true,
  sort_order: 1,
})
const handFlick = signal({
  label: 'Hand flick',
  body_region: 'hands',
  sort_order: 2,
})
const rocking = signal({
  label: 'Rocking',
  body_region: 'whole_body',
  urgency: 'attention',
  sort_order: 0,
})

const all = [painHum, anxiousHum, handFlick, rocking]

describe('filterSignals', () => {
  it('returns everything when nothing is selected', () => {
    expect(filterSignals(all, EMPTY_FILTER)).toHaveLength(4)
  })

  it('narrows to one body region', () => {
    const result = filterSignals(all, { region: 'hands', soundOnly: false })
    expect(result).toEqual([handFlick])
  })

  it('treats sound as a separate axis, not a replacement for region', () => {
    // Someone can hum while rocking, so "it's a sound" must narrow WITHIN the
    // chosen region rather than overriding it.
    const result = filterSignals(all, { region: 'face', soundOnly: true })
    expect(result).toEqual([painHum, anxiousHum])
  })

  it('finds sounds across every region when no region is chosen', () => {
    const result = filterSignals(all, { region: null, soundOnly: true })
    expect(result).toEqual([painHum, anxiousHum])
  })

  it('returns empty rather than falling back when nothing matches', () => {
    // A silent fallback to "here is everything" would be worse than nothing:
    // the stranger would think they had found a match.
    const result = filterSignals(all, { region: 'legs', soundOnly: true })
    expect(result).toEqual([])
  })
})

describe('availableRegions', () => {
  it('only offers regions that would return something', () => {
    expect(availableRegions(all).sort()).toEqual(
      ['face', 'hands', 'whole_body'].sort()
    )
  })

  it('excludes regions that have no sounds once sound is selected', () => {
    // 'hands' has a signal but no sound, so offering it would be a dead end.
    expect(availableRegions(all, true)).toEqual(['face'])
  })

  it('offers nothing for an empty lexicon', () => {
    expect(availableRegions([])).toEqual([])
  })
})

describe('orderForDisplay', () => {
  it('puts urgent first, then keeps the family ordering', () => {
    expect(orderForDisplay(all).map((s) => s.label)).toEqual([
      'Pain hum', // urgent
      'Rocking', // attention
      'Anxious hum', // routine, sort_order 1
      'Hand flick', // routine, sort_order 2
    ])
  })

  it('does not mutate the input', () => {
    const input = [...all]
    orderForDisplay(input)
    expect(input).toEqual(all)
  })
})
