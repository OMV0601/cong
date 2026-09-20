import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, HelpCircle, Loader2, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/alert'
import { ClipRecorder } from '@/components/ClipRecorder'
import { createAsk, getAsk, watchAsk } from '@/lib/db'
import { errorMessage } from '@/lib/errors'
import type { RecordedClip } from '@/lib/recorder'
import type { AskRequest } from '@/lib/types'

const ASK_CLIP_MS = 5_000

/**
 * Layer 3.
 *
 * The grid did not answer it, so the stranger films what they are actually
 * looking at and sends it to the one person who can read it. The answer comes
 * back without them touching the screen again.
 */
export function AskPanel({
  personId,
  personName,
  onClose,
}: {
  personId: string
  personName: string
  onClose: () => void
}) {
  const [clip, setClip] = useState<RecordedClip | null>(null)
  const [note, setNote] = useState('')
  const [ask, setAsk] = useState<AskRequest | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unwatch = useRef<(() => void) | null>(null)

  // Realtime can drop a message. Poll slowly alongside it so an answer is
  // never stranded — a nurse who gave up is the same as no answer at all.
  useEffect(() => {
    if (!ask || ask.status !== 'pending') return
    const timer = setInterval(async () => {
      try {
        const fresh = await getAsk(ask.id)
        if (fresh && fresh.status !== 'pending') setAsk(fresh)
      } catch {
        // Transient. The Realtime subscription is the primary path.
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [ask])

  useEffect(() => () => unwatch.current?.(), [])

  async function send() {
    if (!clip) return
    setSending(true)
    setError(null)
    try {
      const created = await createAsk(personId, clip, note)
      setAsk(created)
      unwatch.current = watchAsk(created.id, (updated) => setAsk(updated))
    } catch (e) {
      setError(errorMessage(e, 'Could not send.'))
    } finally {
      setSending(false)
    }
  }

  // --- Answered -----------------------------------------------------------
  if (ask && ask.status !== 'pending') {
    const noMatch = ask.status === 'no_match'
    return (
      <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-medium">
          {noMatch ? (
            <HelpCircle className="size-5 text-fg-muted" aria-hidden />
          ) : (
            <CheckCircle2 className="size-5 text-accent" aria-hidden />
          )}
          {noMatch ? 'They don’t recognise it either' : 'Answer'}
        </h2>
        <p className="mt-3 text-lg">{ask.answer_text}</p>
        <p className="mt-3 text-xs text-fg-muted">
          From someone in {personName}&rsquo;s circle
          {ask.answered_at &&
            ` · ${new Date(ask.answered_at).toLocaleTimeString()}`}
        </p>
        <Button variant="outline" className="mt-5 w-full" onClick={onClose}>
          Back to the signals
        </Button>
      </section>
    )
  }

  // --- Waiting ------------------------------------------------------------
  if (ask) {
    return (
      <section
        className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center"
        aria-live="polite"
      >
        <Loader2
          className="mx-auto size-6 animate-spin text-accent"
          aria-hidden
        />
        <h2 className="mt-3 font-medium">Sent</h2>
        <p className="mt-1.5 text-sm text-fg-muted">
          {personName}&rsquo;s people have been notified. The answer will appear
          here on its own — you can keep working.
        </p>
        <Button variant="ghost" className="mt-4" onClick={onClose}>
          Back to the signals
        </Button>
      </section>
    )
  }

  // --- Composing ----------------------------------------------------------
  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Ask the people who know them</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Film what you are seeing. You don&rsquo;t have to describe it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-fg-muted hover:bg-surface-2"
        >
          <X className="size-5" aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      </div>

      <ClipRecorder className="mt-4" maxMs={ASK_CLIP_MS} onClip={setClip} />

      <div className="mt-4">
        <Field label="Anything to add? (optional)">
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Started about ten minutes ago."
            />
          )}
        </Field>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={!clip || sending}
        onClick={() => void send()}
      >
        <Send aria-hidden /> {sending ? 'Sending…' : 'Send'}
      </Button>
    </section>
  )
}
