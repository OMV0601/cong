import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/ui/alert'
import { SignalTile } from '@/components/SignalTile'
import { getPerson, listSignals, signPaths } from '@/lib/db'
import { orderForDisplay } from '@/lib/filter'
import type { Person, Signal } from '@/lib/types'

export default function PersonPage() {
  const { id = '' } = useParams()
  const [person, setPerson] = useState<Person | null>(null)
  const [signals, setSignals] = useState<Signal[] | null>(null)
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (isStale: () => boolean) => {
      try {
        const [p, s] = await Promise.all([getPerson(id), listSignals(id)])
        if (isStale()) return
        setPerson(p)
        setSignals(s)

        // One signing call for the whole grid rather than one per tile.
        const paths = s.flatMap((sig) =>
          sig.poster_path ? [sig.video_path, sig.poster_path] : [sig.video_path]
        )
        const signed = await signPaths(paths)
        if (isStale()) return
        setUrls(signed)
      } catch (e) {
        if (isStale()) return
        setError(e instanceof Error ? e.message : 'Could not load.')
        setSignals([])
      }
    },
    [id]
  )

  useEffect(() => {
    // Guarded so navigating between people mid-request cannot land an older
    // person's clips on the newer page.
    let cancelled = false
    // Every setState inside load() happens after an await, so this is an
    // ordinary fetch-on-mount rather than a synchronous render cascade.
    // oxlint-disable-next-line set-state-in-effect
    void load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [load])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> All people
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {person?.display_name ?? '…'}
          </h1>
          <p className="text-sm text-fg-muted">
            {signals === null
              ? 'Loading…'
              : `${signals.length} ${signals.length === 1 ? 'signal' : 'signals'}`}
          </p>
        </div>
        <Button asChild>
          <Link to={`/person/${id}/record`}>
            <Video aria-hidden /> Record a signal
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {signals !== null && signals.length === 0 && !error && (
        <div className="mt-8 rounded-[var(--radius)] border border-border bg-surface p-6">
          <h2 className="font-medium">No signals yet</h2>
          <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
            Record short clips of what {person?.display_name ?? 'they'} actually
            does — a sound, a movement, a face — and write down what each one
            means. Do it when things are calm. That&rsquo;s the whole point:
            later, someone who has never met them can look it up.
          </p>
        </div>
      )}

      {signals && signals.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {orderForDisplay(signals).map((signal) => (
            <li key={signal.id}>
              <SignalTile
                signal={signal}
                videoUrl={urls.get(signal.video_path)}
                posterUrl={
                  signal.poster_path
                    ? urls.get(signal.poster_path)
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
