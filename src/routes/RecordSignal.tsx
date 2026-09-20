import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Circle, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/ui/alert'
import { SignalFields } from '@/components/SignalFields'
import {
  EMPTY_SIGNAL_FIELDS,
  type SignalFieldValues,
} from '@/lib/signal-fields'
import { createSignal } from '@/lib/db'
import {
  cameraErrorMessage,
  canRecord,
  MAX_CLIP_MS,
  openCamera,
  recordClip,
  type RecordedClip,
} from '@/lib/recorder'
import { useDocumentTitle } from '@/lib/use-document-title'
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
  const [noAudio, setNoAudio] = useState(false)
  // A Record button that is tappable before a camera exists does nothing at
  // all when tapped, which reads as the app being broken rather than as the
  // camera being unavailable — and the error above it then looks stale.
  const [cameraReady, setCameraReady] = useState(false)

  const [fields, setFields] = useState<SignalFieldValues>(EMPTY_SIGNAL_FIELDS)

  useDocumentTitle('Record a signal · Lexicon')

  // One camera permission prompt for the whole session. A parent capturing a
  // dozen signals should not be re-prompted on every take.
  useEffect(() => {
    if (!canRecord()) return
    let cancelled = false

    openCamera()
      .then(({ stream, hasAudio }) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setNoAudio(!hasAudio)
        setCameraReady(true)
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch((err) => {
        console.error('openCamera failed', err)
        if (!cancelled) setError(cameraErrorMessage(err))
      })

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
        label: fields.label,
        meaning: fields.meaning,
        bodyRegion: fields.bodyRegion,
        isSound: fields.isSound,
        urgency: fields.urgency,
        flaccCategory: fields.flaccCategory,
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

      {noAudio && !error && (
        <p className="mt-4 rounded-[var(--radius)] bg-surface-2 px-3 py-2.5 text-sm text-fg-muted">
          No microphone available, so this clip will have no sound. Fine for a
          movement — not for a signal that is a sound.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        {stage === 'ready' && (
          <Button
            size="lg"
            className="flex-1"
            disabled={!cameraReady}
            onClick={start}
          >
            <Circle aria-hidden />{' '}
            {cameraReady ? 'Record' : 'Waiting for the camera…'}
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
          <SignalFields value={fields} onChange={setFields} showFlacc />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={saving || !fields.label.trim()}
          >
            {saving ? 'Saving…' : 'Save signal'}
          </Button>
        </form>
      )}
    </main>
  )
}
