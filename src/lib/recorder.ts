/**
 * MediaRecorder wrapper.
 *
 * The messy part of recording in a browser is that different engines produce
 * different containers: Chrome gives webm/vp9 or vp8, Safari gives mp4/h264.
 * A clip recorded on a parent's iPhone has to play back on an ER tablet, so we
 * pick the best supported type at record time and store what we actually got
 * rather than assuming.
 */

/** Ordered best-first. vp9 is smaller; mp4 is what Safari will give us. */
const CANDIDATE_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=h264,aac',
  'video/mp4',
] as const

/** Clips are short by design — long enough to show a signal, short enough to scan. */
export const MAX_CLIP_MS = 5_000

export interface RecordedClip {
  blob: Blob
  /** What the browser actually produced, e.g. 'video/webm;codecs=vp9,opus'. */
  mimeType: string
  durationMs: number
}

export class UnsupportedBrowserError extends Error {
  constructor() {
    super('This browser cannot record video.')
    this.name = 'UnsupportedBrowserError'
  }
}

/**
 * The first container this browser can actually record, or null if none.
 * Exported for the setup checks and for tests.
 */
export function pickMimeType(
  isSupported: (type: string) => boolean = (t) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)
): string | null {
  for (const type of CANDIDATE_TYPES) {
    if (isSupported(type)) return type
  }
  return null
}

export function canRecord(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    pickMimeType() !== null
  )
}

/**
 * Strips codec details: 'video/webm;codecs=vp9,opus' -> 'video/webm'.
 * Supabase Storage wants a plain content type, but we keep the full string on
 * the row so playback knows exactly what it has.
 */
export function baseMimeType(mimeType: string): string {
  return mimeType.split(';')[0].trim()
}

/** File extension matching a recorded mime type, for the storage path. */
export function extensionFor(mimeType: string): string {
  return baseMimeType(mimeType) === 'video/mp4' ? 'mp4' : 'webm'
}

/**
 * Records from an already-open stream and resolves when stopped or when
 * MAX_CLIP_MS elapses, whichever comes first.
 *
 * The caller owns the stream: the recording screen keeps one live preview for
 * the whole session rather than re-prompting for camera permission on each
 * take, which would be miserable when a parent is capturing a dozen signals.
 */
export function recordClip(
  stream: MediaStream,
  options: { maxMs?: number } = {}
): { stop: () => void; done: Promise<RecordedClip> } {
  const mimeType = pickMimeType()
  if (!mimeType) throw new UnsupportedBrowserError()

  const maxMs = options.maxMs ?? MAX_CLIP_MS
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: BlobPart[] = []
  const startedAt = performance.now()
  let timer: ReturnType<typeof setTimeout> | undefined

  const done = new Promise<RecordedClip>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.onstop = () => {
      if (timer) clearTimeout(timer)
      resolve({
        blob: new Blob(chunks, { type: baseMimeType(mimeType) }),
        mimeType,
        // Wall-clock rather than the blob's metadata: webm produced by
        // MediaRecorder often carries no duration header at all.
        durationMs: Math.min(Math.round(performance.now() - startedAt), maxMs),
      })
    }

    recorder.onerror = () => {
      if (timer) clearTimeout(timer)
      reject(new Error('Recording failed.'))
    }
  })

  recorder.start()
  timer = setTimeout(() => {
    if (recorder.state !== 'inactive') recorder.stop()
  }, maxMs)

  return {
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop()
    },
    done,
  }
}

/**
 * Grabs a still from a clip for use as a poster.
 *
 * Layer 1 shows every clip at once. Without posters the grid is blank until
 * each video has buffered, which is exactly the wrong first impression for
 * someone who needs an answer in four seconds.
 */
export async function posterFromBlob(blob: Blob): Promise<Blob | null> {
  const url = URL.createObjectURL(blob)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.src = url

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('Could not read clip.'))
    })

    // A frame slightly in, since frame zero is often mid-exposure.
    video.currentTime = Math.min(0.3, (video.duration || 1) / 2)
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
    })

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx || !canvas.width) return null
    ctx.drawImage(video, 0, 0)

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.75)
    )
  } catch {
    // A missing poster degrades the grid; it should never block saving a clip.
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ---------------------------------------------------------------------------
// Opening the camera
// ---------------------------------------------------------------------------

export interface OpenCameraResult {
  stream: MediaStream
  /** False when we had to fall back to video-only. Sound signals need this. */
  hasAudio: boolean
}

/**
 * Opens a camera, degrading rather than failing outright.
 *
 * Two things bite here. `facingMode: 'environment'` asks for a rear camera,
 * which a laptop does not have. And `audio: true` makes the whole request fail
 * if the microphone alone is unavailable — so a working camera plus a busy mic
 * yields no camera at all.
 *
 * So: try the ideal setup, then a plain one, then drop audio. Only the last
 * failure is reported, and the caller is told whether sound was lost, because
 * a hum recorded silently is a useless dictionary entry.
 */
export async function openCamera(): Promise<OpenCameraResult> {
  const attempts: Array<{ constraints: MediaStreamConstraints; audio: boolean }> = [
    {
      constraints: {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: true,
      },
      audio: true,
    },
    { constraints: { video: true, audio: true }, audio: true },
    { constraints: { video: true, audio: false }, audio: false },
  ]

  let lastError: unknown
  for (const attempt of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(attempt.constraints)
      return { stream, hasAudio: attempt.audio }
    } catch (err) {
      lastError = err
      // A denied permission will not be granted by asking again with looser
      // constraints, so stop rather than triggering three prompts.
      if (err instanceof DOMException && err.name === 'NotAllowedError') break
    }
  }
  throw lastError
}

/** Turns a getUserMedia failure into something the user can act on. */
export function cameraErrorMessage(err: unknown): string {
  if (!(err instanceof DOMException)) {
    return err instanceof Error && err.message
      ? `Could not open the camera: ${err.message}`
      : 'Could not open the camera.'
  }
  switch (err.name) {
    case 'NotAllowedError':
      return 'Camera permission is blocked. Click the camera icon in the address bar, allow it, then reload.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera found on this device.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is in use by another app. Close Zoom, Teams, or any other tab using it, then reload.'
    case 'OverconstrainedError':
      return 'This camera does not support the requested settings.'
    case 'SecurityError':
      return 'The camera needs a secure connection (https).'
    default:
      return `Could not open the camera (${err.name}).`
  }
}
