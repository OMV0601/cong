import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, History, Inbox, QrCode, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/confirm'
import { SignalTile } from '@/components/SignalTile'
import { SearchBox } from '@/components/SearchBox'
import { DemoBanner } from '@/components/DemoBanner'
import { TileGridSkeleton } from '@/components/ui/skeleton'
import {
  asksForPerson,
  deleteSignal,
  getPerson,
  listSignals,
  signPaths,
} from '@/lib/db'
import { orderForDisplay } from '@/lib/filter'
import { useSignalSearch } from '@/lib/use-signal-search'
import { useDocumentTitle } from '@/lib/use-document-title'
import type { Person, Signal } from '@/lib/types'
import { errorMessage } from '@/lib/errors'

export default function PersonPage() {
  const { id = '' } = useParams()
  const [person, setPerson] = useState<Person | null>(null)
  const [signals, setSignals] = useState<Signal[] | null>(null)
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  // Only one tile may have sound on. A grid of clips all talking at once is
  // not something anyone can read.
  const [audioOnId, setAudioOnId] = useState<string | null>(null)
  const [pendingAsks, setPendingAsks] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<Signal | null>(null)
  const [deleting, setDeleting] = useState(false)

  useDocumentTitle(person ? `${person.display_name} · Lexicon` : 'Lexicon')

  const load = useCallback(
    async (isStale: () => boolean) => {
      try {
        const [p, s, asks] = await Promise.all([
          getPerson(id),
          listSignals(id),
          asksForPerson(id).catch(() => []),
        ])
        if (isStale()) return
        setPerson(p)
        setSignals(s)
        setPendingAsks(asks.filter((a) => a.status === 'pending').length)

        // One signing call for the whole grid rather than one per tile.
        const paths = s.flatMap((sig) =>
          sig.poster_path ? [sig.video_path, sig.poster_path] : [sig.video_path]
        )
        const signed = await signPaths(paths)
        if (isStale()) return
        setUrls(signed)
      } catch (e) {
        if (isStale()) return
        setError(errorMessage(e, 'Could not load.'))
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

  const all = signals ?? []
  const { query, setQuery, results, searching, active } = useSignalSearch(
    id,
    all
  )

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setError(null)
    try {
      await deleteSignal(pendingDelete)
      setSignals((prev) =>
        (prev ?? []).filter((s) => s.id !== pendingDelete.id)
      )
      setPendingDelete(null)
    } catch (e) {
      setError(errorMessage(e, 'Could not delete that signal.'))
    } finally {
      setDeleting(false)
    }
  }

  const shown = orderForDisplay(results)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        to="/app"
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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant={pendingAsks > 0 ? 'urgent' : 'outline'}>
            <Link to={`/person/${id}/inbox`}>
              <Inbox aria-hidden />
              {pendingAsks > 0 ? `${pendingAsks} waiting` : 'Questions'}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/person/${id}/activity`}>
              <History aria-hidden /> Activity
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/person/${id}/share`}>
              <QrCode aria-hidden /> Share
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/person/${id}/record`}>
              <Video aria-hidden /> Record a signal
            </Link>
          </Button>
        </div>
      </div>

      {person?.is_demo && (
        <div className="mt-6">
          <DemoBanner name={person.display_name} />
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {/* Search stays below the fold of the actions and above the grid: useful
          once a lexicon is large, never the first thing anyone reaches for. */}
      {all.length > 4 && (
        <div className="mt-6">
          <SearchBox value={query} onChange={setQuery} searching={searching} />
        </div>
      )}

      {signals === null && <TileGridSkeleton className="mt-8" />}

      {signals !== null && signals.length === 0 && !error && (
        <div className="mt-8 rounded-[var(--radius)] border border-border bg-surface p-6">
          <h2 className="font-medium">No signals yet</h2>
          <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
            Record short clips of what {person?.display_name ?? 'they'} actually
            does — a sound, a movement, a face — and write down what each one
            means. Do it when things are calm. That&rsquo;s the whole point:
            later, someone who has never met them can look it up.
          </p>
          <Button asChild className="mt-4">
            <Link to={`/person/${id}/record`}>
              <Video aria-hidden /> Record the first one
            </Link>
          </Button>
        </div>
      )}

      {signals !== null && signals.length > 0 && shown.length === 0 && (
        <div className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-6">
          <h2 className="font-medium">Nothing matches “{query.trim()}”</h2>
          <p className="mt-1.5 text-sm text-fg-muted">
            Search looks at the name and the meaning you wrote. Clear it to see
            all {signals.length} signals.
          </p>
        </div>
      )}

      {shown.length > 0 && (
        <>
          {active && (
            <p className="mt-4 text-xs text-fg-muted" aria-live="polite">
              {shown.length} of {all.length} shown
            </p>
          )}
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((signal) => (
              <li key={signal.id}>
                <SignalTile
                  signal={signal}
                  videoUrl={urls.get(signal.video_path)}
                  posterUrl={
                    signal.poster_path
                      ? urls.get(signal.poster_path)
                      : undefined
                  }
                  audioOn={audioOnId === signal.id}
                  onToggleAudio={(s) =>
                    setAudioOnId((current) => (current === s.id ? null : s.id))
                  }
                  onDelete={setPendingDelete}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete “${pendingDelete?.label ?? ''}”?`}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        body={
          <>
            <p>
              This removes the clip as well as the entry. It cannot be undone,
              and anyone currently holding a code will stop seeing it.
            </p>
            <p className="mt-2">
              You would have to film {person?.display_name ?? 'them'} doing it
              again to get it back.
            </p>
          </>
        }
      />
    </main>
  )
}
