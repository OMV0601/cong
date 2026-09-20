import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClipRecorder } from '@/components/ClipRecorder'
import { confirmMatch } from '@/lib/db'
import type { RecordedClip } from '@/lib/recorder'
import type { Signal } from '@/lib/types'

const COMPARE_CLIP_MS = 4_000

/**
 * Side-by-side confirmation.
 *
 * The stranger thinks they have found a match. They film what they are
 * actually looking at, and the two clips play next to each other so a person
 * can judge it.
 *
 * Deliberately not automatic. Lexicon never decides what a signal means — a
 * wrong pain reading is more dangerous than no reading, and the refusal to
 * guess is what makes the rest of this trustworthy. What gets recorded is what
 * a human concluded, not what a model thought.
 */
export function ConfirmPanel({
  signal,
  signalVideoUrl,
  onDone,
}: {
  signal: Signal
  signalVideoUrl?: string
  onDone: (confirmed: boolean | null) => void
}) {
  const [clip, setClip] = useState<RecordedClip | null>(null)

  // Derived during render rather than in an effect, so the preview and the
  // clip can never disagree for a frame.
  const mineUrl = useMemo(
    () => (clip ? URL.createObjectURL(clip.blob) : null),
    [clip]
  )

  // Revoking is the side effect, so it is the only thing in an effect.
  useEffect(() => {
    if (!mineUrl) return
    return () => URL.revokeObjectURL(mineUrl)
  }, [mineUrl])

  async function decide(confirmed: boolean) {
    await confirmMatch(signal.id, confirmed)
    onDone(confirmed)
  }

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Is this the same thing?</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Film what you are seeing and compare it yourself.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDone(null)}
          className="rounded-full p-2 text-fg-muted hover:bg-surface-2"
        >
          <X className="size-5" aria-hidden />
          <span className="sr-only">Cancel</span>
        </button>
      </div>

      {mineUrl ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <figure>
              <video
                src={signalVideoUrl}
                muted
                loop
                autoPlay
                playsInline
                className="aspect-square w-full rounded-[var(--radius)] object-cover"
              />
              <figcaption className="mt-1.5 text-xs font-medium">
                {signal.label}
                <span className="block font-normal text-fg-muted">
                  Recorded by their family
                </span>
              </figcaption>
            </figure>

            <figure>
              <video
                src={mineUrl}
                muted
                loop
                autoPlay
                playsInline
                className="aspect-square w-full rounded-[var(--radius)] object-cover"
              />
              <figcaption className="mt-1.5 text-xs font-medium">
                What you just filmed
                <span className="block font-normal text-fg-muted">
                  Not saved unless you send it
                </span>
              </figcaption>
            </figure>
          </div>

          {signal.meaning && (
            <p className="mt-4 rounded-[var(--radius)] bg-accent-soft px-3 py-2.5 text-sm">
              {signal.meaning}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => void decide(true)}
            >
              <Check aria-hidden /> Yes, that&rsquo;s it
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => void decide(false)}
            >
              Not the same
            </Button>
          </div>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => setClip(null)}
          >
            Film it again
          </Button>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <figure>
              <video
                src={signalVideoUrl}
                muted
                loop
                autoPlay
                playsInline
                className="aspect-square w-full rounded-[var(--radius)] object-cover"
              />
              <figcaption className="mt-1.5 text-xs font-medium">
                {signal.label}
              </figcaption>
            </figure>
            <div className="grid aspect-square place-items-center rounded-[var(--radius)] border border-dashed border-border px-2 text-center text-xs text-fg-muted">
              Yours will appear here
            </div>
          </div>
          <ClipRecorder
            className="mt-4"
            maxMs={COMPARE_CLIP_MS}
            onClip={setClip}
          />
        </>
      )}
    </section>
  )
}
