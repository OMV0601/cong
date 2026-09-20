import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Hand, Loader2, Smile, Footprints, User, Volume2, X } from 'lucide-react'
import { SignalTile } from '@/components/SignalTile'
import { ErrorNote } from '@/components/ui/alert'
import { getSupabase } from '@/lib/supabase'
import { claimGrant, signalsForPerson, signPaths } from '@/lib/db'
import { availableRegions, filterSignals, orderForDisplay } from '@/lib/filter'
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
  const regions = availableRegions(all, soundOnly)
  const shown = orderForDisplay(filterSignals(all, { region, soundOnly }))
  const filtering = region !== null || soundOnly

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
      <main className="grid min-h-dvh place-items-center px-4">
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Opening…
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
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
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm text-fg-muted underline underline-offset-4 hover:text-fg"
          >
            <X className="size-4" aria-hidden /> Show all
          </button>
        )}
      </nav>

      <p className="mt-3 text-xs text-fg-muted" aria-live="polite">
        {shown.length} of {all.length} shown
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-6">
          <h2 className="font-medium">Nothing recorded like that</h2>
          <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
            {filtering
              ? 'Try clearing the filter and looking through everything.'
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
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
