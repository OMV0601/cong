import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Inbox as InboxIcon, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/alert'
import {
  answerAsk,
  asksForPerson,
  getPerson,
  listSignals,
  markAskNoMatch,
  signPaths,
} from '@/lib/db'
import { errorMessage } from '@/lib/errors'
import type { AskRequest, Person, Signal } from '@/lib/types'

/**
 * Where an Ask gets answered.
 *
 * Answering is two taps and optionally a sentence: pick the signal it matches,
 * or say you don't recognise it. Saying "we don't know" is a real answer here
 * — it beats a guess dressed up as help.
 */
export default function Inbox() {
  const { id = '' } = useParams()
  const [person, setPerson] = useState<Person | null>(null)
  const [asks, setAsks] = useState<AskRequest[] | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [pickedSignal, setPickedSignal] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [p, a, s] = await Promise.all([
        getPerson(id),
        asksForPerson(id),
        listSignals(id),
      ])
      setPerson(p)
      setAsks(a)
      setSignals(s)
      setUrls(await signPaths(a.map((ask) => ask.clip_path)))
    } catch (e) {
      setError(errorMessage(e, 'Could not load.'))
      setAsks([])
    }
  }, [id])

  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect
    void load()
  }, [load])

  async function submit(askId: string) {
    setBusy(true)
    setError(null)
    try {
      await answerAsk(askId, text, pickedSignal)
      setReplyTo(null)
      setText('')
      setPickedSignal(null)
      await load()
    } catch (e) {
      setError(errorMessage(e, 'Could not send.'))
    } finally {
      setBusy(false)
    }
  }

  async function noMatch(askId: string) {
    setBusy(true)
    try {
      await markAskNoMatch(askId)
      setReplyTo(null)
      await load()
    } catch (e) {
      setError(errorMessage(e, 'Could not send.'))
    } finally {
      setBusy(false)
    }
  }

  const pending = (asks ?? []).filter((a) => a.status === 'pending')
  const past = (asks ?? []).filter((a) => a.status !== 'pending')

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        to={`/person/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Questions about {person?.display_name ?? ''}
      </h1>

      {error && (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {asks === null ? (
        <p className="mt-8 text-sm text-fg-muted">Loading…</p>
      ) : pending.length === 0 && past.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius)] border border-border bg-surface p-6">
          <InboxIcon className="size-6 text-fg-muted" aria-hidden />
          <h2 className="mt-2 font-medium">Nothing waiting</h2>
          <p className="mt-1.5 text-sm text-fg-muted">
            When someone with a code can&rsquo;t work out what they&rsquo;re
            seeing, their question lands here.
          </p>
        </div>
      ) : null}

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-urgent">
            Waiting for you ({pending.length})
          </h2>
          <ul className="mt-2 space-y-4">
            {pending.map((ask) => (
              <li
                key={ask.id}
                className="overflow-hidden rounded-[var(--radius)] border border-urgent bg-surface"
              >
                <video
                  src={urls.get(ask.clip_path)}
                  muted
                  loop
                  autoPlay
                  playsInline
                  controls
                  className="aspect-video w-full bg-surface-2 object-contain"
                />
                <div className="p-4">
                  <p className="text-xs text-fg-muted">
                    Sent {new Date(ask.created_at).toLocaleString()}
                  </p>
                  {ask.note && <p className="mt-2 text-sm">“{ask.note}”</p>}

                  {replyTo === ask.id ? (
                    <div className="mt-4 space-y-3">
                      {signals.length > 0 && (
                        <fieldset>
                          <legend className="text-sm font-medium">
                            Is it one of these?
                          </legend>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {signals.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() =>
                                  setPickedSignal(
                                    pickedSignal === s.id ? null : s.id
                                  )
                                }
                                aria-pressed={pickedSignal === s.id}
                                className={
                                  pickedSignal === s.id
                                    ? 'rounded-full border border-accent bg-accent-soft px-3.5 py-2 text-sm'
                                    : 'rounded-full border border-border px-3.5 py-2 text-sm hover:bg-surface-2'
                                }
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      )}

                      <Field label="What should they do?">
                        {(p) => (
                          <Textarea
                            {...p}
                            rows={3}
                            autoFocus
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="That's his pain hum. Check his ears first."
                          />
                        )}
                      </Field>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={busy || (!text.trim() && !pickedSignal)}
                          onClick={() => void submit(ask.id)}
                        >
                          <Send aria-hidden /> {busy ? 'Sending…' : 'Send'}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => void noMatch(ask.id)}
                        >
                          I don&rsquo;t recognise it
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setReplyTo(null)
                            setText('')
                            setPickedSignal(null)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button className="mt-3" onClick={() => setReplyTo(ask.id)}>
                      Answer
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium">Answered</h2>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
            {past.map((ask) => (
              <li key={ask.id} className="px-4 py-3">
                <p className="text-sm">{ask.answer_text}</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {ask.answered_at &&
                    new Date(ask.answered_at).toLocaleString()}
                  {ask.status === 'no_match' && ' · not recognised'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
