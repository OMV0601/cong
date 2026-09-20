import { useEffect, useMemo, useRef, useState } from 'react'
import { searchSignals } from './db'
import { localSearch } from './filter'
import type { Signal } from './types'

/** Long enough not to fire on every keystroke, short enough to feel live. */
const DEBOUNCE_MS = 200

interface ServerResult {
  /** The trimmed query these hits answer, so a stale result never renders. */
  query: string
  hits: Signal[]
}

/**
 * Search in two layers, for the same reason the whole app has layers: the fast
 * answer arrives immediately and the better one replaces it.
 *
 * Layer one is a substring filter over the signals already in memory, which is
 * instant and keeps working when the network does not. Layer two is Postgres
 * full-text search, which stems and ranks — it finds "rocks when anxious" from
 * "rocking", which no substring match ever will.
 *
 * If the server call fails we keep the local result rather than showing an
 * error. A degraded search is still a search; an error banner over a grid the
 * user can already see is just noise.
 */
export function useSignalSearch(personId: string, signals: readonly Signal[]) {
  const [query, setQuery] = useState('')
  const [server, setServer] = useState<ServerResult | null>(null)
  const [inFlight, setInFlight] = useState(false)
  // Identifies the newest request, so a slow early response cannot overwrite a
  // fast later one and show results for a query nobody is looking at.
  const latest = useRef(0)

  const trimmed = query.trim()
  const active = trimmed.length > 0

  useEffect(() => {
    if (!trimmed || !personId) return

    const ticket = ++latest.current
    const timer = setTimeout(() => {
      setInFlight(true)
      searchSignals(personId, trimmed)
        .then((hits) => {
          if (ticket === latest.current) setServer({ query: trimmed, hits })
        })
        .catch(() => {
          // Local results stand. See the note above.
          if (ticket === latest.current) setServer(null)
        })
        .finally(() => {
          if (ticket === latest.current) setInFlight(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [personId, trimmed])

  const results = useMemo(() => {
    if (!trimmed) return [...signals]

    const local = localSearch(signals, trimmed)
    // Holding the query alongside the hits is what lets this be derived rather
    // than cleared from an effect: results for an older query simply stop
    // matching and are ignored.
    if (!server || server.query !== trimmed) return local

    // The server knows about stemming; the local pass knows about the word
    // being half-typed. Union, server's ranking first, so neither layer can
    // hide a signal the other found.
    const byId = new Map(signals.map((s) => [s.id, s]))
    const merged: Signal[] = []
    const seen = new Set<string>()
    for (const hit of server.hits) {
      const full = byId.get(hit.id) ?? hit
      if (!seen.has(full.id)) {
        seen.add(full.id)
        merged.push(full)
      }
    }
    for (const s of local) {
      if (!seen.has(s.id)) {
        seen.add(s.id)
        merged.push(s)
      }
    }
    return merged
  }, [trimmed, signals, server])

  return {
    query,
    setQuery,
    results,
    searching: active && inFlight,
    active,
  }
}
