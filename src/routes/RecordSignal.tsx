import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Circle, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/alert'
import { createSignal } from '@/lib/db'
import {
  canRecord,
  MAX_CLIP_MS,
  recordClip,
  type RecordedClip,
} from '@/lib/recorder'
import {
  BODY_REGIONS,
  BODY_REGION_LABELS,
  FLACC_CATEGORIES,
  FLACC_LABELS,
  type BodyRegion,
  type FlaccCategory,
  type Urgency,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'

type Stage = 'ready' | 'recording' | 'review'

export default function RecordSignal() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const [stage, setStage] = useState<Stage>('ready')
  const [clip, setClip] = useState<RecordedClip | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(() =>
    canRecord() ? null : 'This browser cannot record video. Try Chrome or Safari.'
  )
  const [saving, setSaving] = useState(false)

  const [label, setLabel] = useState('')
  const [meaning, setMeaning] = useState('')
  const [bodyRegion, setBodyRegion] = useState<BodyRegion>('whole_body')
  const [isSound, setIsSound] = useState(false)
  const [urgency, setUrgency] = useState<Urgency>('routine')
  const [flacc, setFlacc] = useState<FlaccCategory | null>(null)

  // One camera permission prompt for the whole session. A parent capturing a
  // dozen signals should not be re-prompted on every take.
  useEffect(() => {
    if (!canRecord()) return
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: true,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() =>
        setError('Camera access was blocked. Allow it and reload the page.')
      )

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl]
  )

  // srcObject always wins over src, so the live stream has to be detached
  // before the recorded clip will play back — and reattached on retake.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (stage === 'review') {
      video.srcObject = null
    } else if (streamRef.current) {
      video.srcObject = streamRef.current
      video.src = ''
    }
  }, [stage])

  const start = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    setError(null)
    setElapsed(0)
    setStage('recording')

    const startedAt = performance.now()
    const tick = setInterval(
      () => setElapsed(performance.now() - startedAt),
      100
    )

    try {
      const { stop, done } = recordClip(stream)
      stopRef.current = stop
      void done
        .then((recorded) => {
          clearInterval(tick)
          setClip(recorded)
          setPreviewUrl(URL.createObjectURL(recorded.blob))
          setStage('review')
        })
        .catch(() => {
          clearInterval(tick)
          setError('Recording failed. Try again.')
          setStage('ready')
        })
    } catch {
      clearInterval(tick)
      setError('This browser cannot record video.')
      setStage('ready')
    }
  }, [])

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setClip(null)
    setStage('ready')
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }

  async function save() {
    if (!clip) return
    setSaving(true)
    setError(null)
    try {
      await createSignal({
        personId: id,
        label,
        meaning,
        bodyRegion,
        isSound,
        urgency,
        flaccCategory: flacc,
        clip,
      })
      navigate(`/person/${id}`)
    } catch (e) {
      setError(errorMessage(e, 'Could not save.'))
      setSaving(false)
    }
  }

  const progress = Math.min(elapsed / MAX_CLIP_MS, 1)

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <Link
        to={`/person/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Record a signal
      </h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        Up to {MAX_CLIP_MS / 1000} seconds. Short is better — someone will scan
        a whole wall of these looking for a match.
      </p>

      <div className="relative mt-6 aspect-square w-full overflow-hidden rounded-[var(--radius)] bg-surface-2">
        <video
          ref={videoRef}
          src={stage === 'review' ? (previewUrl ?? undefined) : undefined}
          autoPlay
          muted={stage !== 'review'}
          loop={stage === 'review'}
          playsInline
          controls={false}
          className="size-full object-cover"
        />
        {stage === 'recording' && (
          <>
            <div
              className="absolute inset-x-0 bottom-0 h-1.5 bg-urgent transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
              aria-hidden
            />
            <p className="absolute top-3 left-3 rounded-full bg-urgent px-2.5 py-1 text-xs font-medium text-urgent-fg">
              Recording {(elapsed / 1000).toFixed(1)}s
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {stage === 'ready' && (
          <Button size="lg" className="flex-1" onClick={start}>
            <Circle aria-hidden /> Record
          </Button>
        )}
        {stage === 'recording' && (
          <Button
            size="lg"
            variant="urgent"
            className="flex-1"
            onClick={() => stopRef.current?.()}
          >
            <Square aria-hidden /> Stop
          </Button>
        )}
        {stage === 'review' && (
          <Button size="lg" variant="outline" onClick={retake}>
            <RotateCcw aria-hidden /> Retake
          </Button>
        )}
      </div>

      {stage === 'review' && (
        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Field
            label="What do you call this?"
            hint="A short name you'd recognise. 'Pain hum', 'Hand flick'."
          >
            {(p) => (
              <Input
                {...p}
                required
                maxLength={60}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            )}
          </Field>

          <Field
            label="What does it mean?"
            hint="Write it for someone who has never met them. What should they do?"
          >
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="Not the same as his anxious hum. Check stomach and ears first."
              />
            )}
          </Field>

          <fieldset>
            <legend className="text-sm font-medium">
              Where does it happen?
            </legend>
            <p className="mt-0.5 text-xs text-fg-muted">
              This is how a stranger narrows things down when they can&rsquo;t
              describe what they&rsquo;re seeing.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BODY_REGIONS.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => setBodyRegion(region)}
                  aria-pressed={bodyRegion === region}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-sm',
                    bodyRegion === region
                      ? 'border-accent bg-accent-soft text-fg'
                      : 'border-border bg-surface hover:bg-surface-2'
                  )}
                >
                  {BODY_REGION_LABELS[region]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={isSound}
              onChange={(e) => setIsSound(e.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              <span className="block text-sm font-medium">
                This is a sound
              </span>
              <span className="block text-xs text-fg-muted">
                Tick this as well as a body region — someone can hum while
                rocking.
              </span>
            </span>
          </label>

          <fieldset>
            <legend className="text-sm font-medium">How urgent is it?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['routine', 'attention', 'urgent'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  aria-pressed={urgency === level}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-sm capitalize',
                    urgency === level
                      ? level === 'urgent'
                        ? 'border-urgent bg-urgent-soft text-urgent'
                        : 'border-accent bg-accent-soft text-fg'
                      : 'border-border bg-surface hover:bg-surface-2'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </fieldset>

          <Field
            label="Pain scale category (optional)"
            hint="FLACC is the scale clinicians already use for people who can't self-report. Tagging here means a nurse sees it in words they know."
          >
            {(p) => (
              <select
                {...p}
                value={flacc ?? ''}
                onChange={(e) =>
                  setFlacc((e.target.value || null) as FlaccCategory | null)
                }
                className="h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-3 text-fg"
              >
                <option value="">Not a pain signal</option>
                {FLACC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {FLACC_LABELS[c]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={saving || !label.trim()}
          >
            {saving ? 'Saving…' : 'Save signal'}
          </Button>
        </form>
      )}
    </main>
  )
}
