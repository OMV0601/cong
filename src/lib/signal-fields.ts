import type { BodyRegion, FlaccCategory, Urgency } from './types'

/**
 * Everything that describes a signal except the clip itself.
 *
 * Lives beside the types rather than in the component that renders it, because
 * two screens produce one of these — filming a new signal, and keeping an
 * answered Ask — and neither should have to import the other's UI to do it.
 */
export interface SignalFieldValues {
  label: string
  meaning: string
  bodyRegion: BodyRegion
  isSound: boolean
  urgency: Urgency
  flaccCategory: FlaccCategory | null
}

export const EMPTY_SIGNAL_FIELDS: SignalFieldValues = {
  label: '',
  meaning: '',
  bodyRegion: 'whole_body',
  isSound: false,
  urgency: 'routine',
  flaccCategory: null,
}
