import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Check,
  Hand,
  HelpCircle,
  Loader2,
  Smile,
  Footprints,
  User,
  Volume2,
  X,
} from 'lucide-react'
import { AskPanel } from '@/components/AskPanel'
import { DemoBanner } from '@/components/DemoBanner'
import { ConfirmPanel } from '@/components/ConfirmPanel'
import { Button } from '@/components/ui/button'
import { SignalTile } from '@/components/SignalTile'
import { SearchBox } from '@/components/SearchBox'
import { ErrorNote } from '@/components/ui/alert'
import { TileGridSkeleton } from '@/components/ui/skeleton'
import { getSupabase } from '@/lib/supabase'
import { claimGrant, signalsForPerson, signPaths } from '@/lib/db'
import { availableRegions, filterSignals, orderForDisplay } from '@/lib/filter'
import { useSignalSearch } from '@/lib/use-signal-search'
import { useDocumentTitle } from '@/lib/use-document-title'
import { errorMessage } from '@/lib/errors'
import { BODY_REGION_LABELS, type BodyRegion, type Signal } from '@/lib/types'
import { cn } from '@/lib/utils'

const REGION_ICONS: Record<BodyRegion, typeof Hand> = {
  hands: Hand,
  face: Smile,
  legs: Footprints,
  whole_body: User,
  other: User,
}

/**
 * What a stranger sees after scanning the code.
 *
 * Layer 1 is the whole grid, looping. Layer 2 narrows by where it is
 * happening, because the premise of this screen is that the person using it
 * cannot describe what they are looking at — they can only point.
 */
export default function StrangerView() {
  const { token = '' } = useParams()
  const [personName, setPersonName] = useState<string | null>(null)
  const [signals, setSignals] = useState<Signal[] | null>(null)
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [region, setRegion] = useState<BodyRegion | null>(null)
  const [soundOnly, setSoundOnly] = useState(false)
  const [audioOnId, setAudioOnId] = useState<string | null>(null)
  const [personId, setPersonId] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [confirming, setConfirming] = useState<Signal | null>(null)
  const [asking, setAsking] = useState(false)
  const [confirmed, setConfirmed] = useState<Signal | null>(null)

  const open = useCallback(
    async (isStale: () => boolean) => {
      const supabase = getSupabase()
      if (!supabase) {
        setError('This app is not configured.')
        return
      }

      try {
        // The stranger needs a real auth.uid() before anything else: it is
        // what lets Storage and Realtime treat them like any other user
        // instead of threading a secret through every request.
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          const { error: anonError } = await supabase.auth.signInAnonymously()
          if (anonError) throw anonError
        }

        const claimed = await claimGrant(token)
        if (isStale()) return
        setPersonName(claimed.personName)
        setPersonId(claimed.personId)
        setIsDemo(claimed.isDemo)

        const list = await signalsForPerson(claimed.personId)
        if (isStale()) return
        setSignals(list)

        const paths = list.flatMap((s) =>
          s.poster_path ? [s.video_path, s.poster_path] : [s.video_path]
        )
        const signed = await signPaths(paths)
        if (isStale()) return
        setUrls(signed)
      } catch (e) {
        if (isStale()) return
        console.error('stranger view failed', e)
        setError(
          errorMessage(e, 'This code is not valid, or it has expired.')
        )
        setSignals([])
      }
    },
    [token]
  )

  useEffect(() => {
    let cancelled = false
    // oxlint-disable-next-line set-state-in-effect
    void open(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [open])

  const all = signals ?? []
  const {
    query,
    setQuery,
    results,
    searching,
    active: searchActive,
  } = useSignalSearch(personId ?? '', all)

  const regions = availableRegions(all, soundOnly)
  // Search narrows first, then the Point filters narrow within it, so the two
  // never contradict each other on screen.
  const shown = orderForDisplay(filterSignals(results, { region, soundOnly }))
  const filtering = region !== null || soundOnly || searchActive

  useDocumentTitle(
    personName ? `How ${personName} communicates · Lexicon` : 'Lexicon'
  )

  if (error) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <ErrorNote>{error}</ErrorNote>
        <p className="mt-4 text-sm text-fg-muted">
          Ask whoever gave you this code for a new one.
        </p>
      </main>
    )
  }

  if (signals === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Opening…
        </p>
        <TileGridSkeleton className="mt-6" />
      </main>
    )
  }

  if (confirming) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-6">
        <ConfirmPanel
          signal={confirming}
          signalVideoUrl={urls.get(confirming.video_path)}
          onDone={(result) => {
            if (result === true) setConfirmed(confirming)
            setConfirming(null)
          }}
        />
      </main>
    )
  }

  if (asking && personId) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-6">
        <AskPanel
          personId={personId}
          personName={personName ?? 'their'}
          onClose={() => setAsking(false)}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          How {personName} communicates
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Recorded by the people who know them. Find the one that matches what
          you are seeing.
        </p>
      </header>

      {/* Layer 2: point, don't describe. */}
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Narrow by">
        {regions.map((r) => {
          const Icon = REGION_ICONS[r]
          const active = region === r
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(active ? null : r)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm',
                active
                  ? 'border-accent bg-accent-soft'
                  : 'border-border bg-surface hover:bg-surface-2'
              )}
            >
              <Icon className="size-4" aria-hidden />
              {BODY_REGION_LABELS[r]}
            </button>
          )
        })}

        {all.some((s) => s.is_sound) && (
          <button
            type="button"
            onClick={() => setSoundOnly((v) => !v)}
            aria-pressed={soundOnly}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm',
              soundOnly
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-surface hover:bg-surface-2'
            )}
          >
            <Volume2 className="size-4" aria-hidden />
            It&rsquo;s a sound
          </button>
        )}

        {filtering && (
          <button
            type="button"
            onClick={() => {
              setRegion(null)
              setSoundOnly(false)
              setQuery('')
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm text-fg-muted underline underline-offset-4 hover:text-fg"
          >
            <X className="size-4" aria-hidden /> Show all
          </button>
        )}
      </nav>

      {isDemo && (
        <div className="mt-4">
          <DemoBanner name={personName ?? undefined} />
        </div>
      )}

      {/* Below Look and Point, deliberately. Someone who could name what they
          are seeing would not need this app — but a long lexicon stops being
          scannable, and a returning aide often does know the word. */}
      {all.length > 4 && (
        <div className="mt-4">
          <SearchBox
            value={query}
            onChange={setQuery}
            searching={searching}
            placeholder="Or search a word"
          />
        </div>
      )}

      {confirmed && (
        <p
          className="mt-4 flex items-start gap-2 rounded-[var(--radius)] bg-accent-soft px-3 py-2.5 text-sm"
          aria-live="polite"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            <strong className="font-medium">{confirmed.label}</strong>
            {confirmed.meaning ? ` — ${confirmed.meaning}` : ''}
          </span>
        </p>
      )}

      <p className="mt-3 text-xs text-fg-muted" aria-live="polite">
        {shown.length} of {all.length} shown
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-6">
          <h2 className="text-base font-medium">Nothing recorded like that</h2>
          <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
            {filtering
              ? 'Try clearing the filter and looking through everything. If it really is not here, send them the clip instead — that is what the button below is for.'
              : `Nobody has recorded any signals for ${personName} yet.`}
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((signal) => (
            <li key={signal.id}>
              <SignalTile
                signal={signal}
                videoUrl={urls.get(signal.video_path)}
                posterUrl={
                  signal.poster_path ? urls.get(signal.poster_path) : undefined
                }
                audioOn={audioOnId === signal.id}
                onToggleAudio={(s) =>
                  setAudioOnId((cur) => (cur === s.id ? null : s.id))
                }
                onSelect={setConfirming}
                selected={confirmed?.id === signal.id}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 rounded-[var(--radius)] border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-medium">
          <HelpCircle className="size-4 text-fg-muted" aria-hidden />
          None of these match?
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Film what you are seeing and send it to the people who know them.
          You don&rsquo;t have to describe it.
        </p>
        <Button className="mt-3" onClick={() => setAsking(true)}>
          Ask them
        </Button>
      </div>
    </main>
  )
}
