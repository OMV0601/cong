import { describe, expect, it } from 'vitest'
import { localSearch } from './filter'
import type { Signal } from './types'

function signal(partial: Partial<Signal> & { label: string }): Signal {
  return {
    id: partial.label,
    person_id: 'p',
    meaning: '',
    body_region: 'other',
    is_sound: false,
    urgency: 'routine',
    flacc_category: null,
    video_path: 'v',
    poster_path: null,
    mime_type: 'video/webm',
    duration_ms: 0,
    sort_order: 0,
    source_ask_id: null,
    created_at: '',
    ...partial,
  }
}

const lexicon = [
  signal({ label: 'Pain hum', meaning: 'Check his ears first.' }),
  signal({ label: 'Anxious hum', meaning: 'Somewhere is too loud.' }),
  signal({ label: 'Hand flick', meaning: 'He is happy about something.' }),
]

describe('localSearch', () => {
  it('returns everything for an empty query', () => {
    expect(localSearch(lexicon, '')).toHaveLength(3)
    expect(localSearch(lexicon, '   ')).toHaveLength(3)
  })

  it('matches on label, case-insensitively', () => {
    expect(localSearch(lexicon, 'PAIN').map((s) => s.label)).toEqual([
      'Pain hum',
    ])
  })

  it('matches on meaning as well as label', () => {
    expect(localSearch(lexicon, 'ears').map((s) => s.label)).toEqual([
      'Pain hum',
    ])
  })

  it('matches partial words, which the tsvector alone cannot', () => {
    // Postgres stems whole words, so "anx" matches nothing server-side. This
    // layer exists precisely to cover what someone has typed so far.
    expect(localSearch(lexicon, 'anx').map((s) => s.label)).toEqual([
      'Anxious hum',
    ])
  })

  it('returns every signal sharing a word', () => {
    expect(localSearch(lexicon, 'hum')).toHaveLength(2)
  })

  it('returns nothing rather than guessing when there is no match', () => {
    expect(localSearch(lexicon, 'seizure')).toEqual([])
  })

  it('does not mutate the input', () => {
    const copy = [...lexicon]
    localSearch(lexicon, 'hum')
    expect(lexicon).toEqual(copy)
  })
})
