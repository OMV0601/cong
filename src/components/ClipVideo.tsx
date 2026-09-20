import { useState } from 'react'
import { VideoOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A looping clip that degrades into words when it cannot play.
 *
 * A signed URL can expire mid-session, a codec can be unsupported on a borrowed
 * device, hospital wifi can drop the range request halfway. Any of those
 * normally leaves a black rectangle, which tells a stranger nothing at all.
 *
 * So on failure this falls back to the poster frame, and if there is no poster
 * either, to the label and meaning as text. A signal that cannot be watched can
 * still be read, and reading it is better than staring at a hole in the grid.
 */
export function ClipVideo({
  src,
  poster,
  label,
  meaning,
  muted = true,
  className,
  controls = false,
}: {
  src?: string
  poster?: string
  label: string
  meaning?: string
  muted?: boolean
  className?: string
  controls?: boolean
}) {
  // Remembering WHICH url failed, rather than a bare boolean, means a new
  // signed url is retried automatically: the comparison below stops matching
  // the moment the prop changes. A boolean would need an effect to reset it,
  // and would leave the tile stuck in its fallback for the rest of the session.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc !== null && failedSrc === src

  if (!src) {
    return <div className={cn('animate-pulse bg-surface-2', className)} aria-hidden />
  }

  if (failed) {
    return (
      <div className={cn('relative bg-surface-2', className)}>
        {poster ? (
          <img
            src={poster}
            alt={`Still frame from ${label}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col justify-center gap-1 p-3">
            <VideoOff className="size-4 text-fg-muted" aria-hidden />
            <p className="text-sm font-medium">{label}</p>
            {meaning && (
              <p className="line-clamp-3 text-xs text-fg-muted">{meaning}</p>
            )}
            <p className="text-xs text-fg-muted">Clip would not play.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <video
      src={src}
      poster={poster}
      // All three are required for the grid to animate on mobile. Without
      // playsInline, iOS takes every tile fullscreen on play.
      muted={muted}
      loop
      autoPlay
      playsInline
      controls={controls}
      preload="metadata"
      onError={() => setFailedSrc(src)}
      className={className}
      aria-hidden={!controls}
    />
  )
}
