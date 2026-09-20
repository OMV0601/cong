import { useCallback, useEffect, useRef, useState } from 'react'
import { Circle, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/ui/alert'
import {
  cameraErrorMessage,
  canRecord,
  openCamera,
  recordClip,
  type RecordedClip,
} from '@/lib/recorder'

/**
 * Camera preview plus record / stop / retake.
 *
 * Shared by the family's signal recorder and the stranger's Ask, because they
 * are the same act: point a camera at someone and capture a few seconds. The
 * caller decides what the clip is *for*.
 */
export function ClipRecorder({
  maxMs,
  onClip,
  className,
}: {
  maxMs: number
  onClip: (clip: RecordedClip | null) => void
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const [stage, setStage] = useState<'ready' | 'recording' | 'review'>('ready')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(() =>
    canRecord() ? null : 'This browser cannot record video.'
  )

  useEffect(() => {
    if (!canRecord()) return
    let cancelled = false

    openCamera()
      .then(({ stream }) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
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

  // srcObject always wins over src, so the live stream must be detached before
  // the recorded clip will play back — and reattached on retake.
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
      const { stop, done } = recordClip(stream, { maxMs })
      stopRef.current = stop
      void done
        .then((recorded) => {
          clearInterval(tick)
          setPreviewUrl(URL.createObjectURL(recorded.blob))
          setStage('review')
          onClip(recorded)
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
  }, [maxMs, onClip])

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setStage('ready')
    onClip(null)
  }

  const progress = Math.min(elapsed / maxMs, 1)

  return (
    <div className={className}>
      <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius)] bg-surface-2">
        <video
          ref={videoRef}
          src={stage === 'review' ? (previewUrl ?? undefined) : undefined}
          autoPlay
          muted={stage !== 'review'}
          loop={stage === 'review'}
          playsInline
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
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-3">
        {stage === 'ready' && (
          <Button size="lg" className="w-full" onClick={start} disabled={!!error}>
            <Circle aria-hidden /> Record
          </Button>
        )}
        {stage === 'recording' && (
          <Button
            size="lg"
            variant="urgent"
            className="w-full"
            onClick={() => stopRef.current?.()}
          >
            <Square aria-hidden /> Stop
          </Button>
        )}
        {stage === 'review' && (
          <Button size="lg" variant="outline" className="w-full" onClick={retake}>
            <RotateCcw aria-hidden /> Retake
          </Button>
        )}
      </div>
    </div>
  )
}
