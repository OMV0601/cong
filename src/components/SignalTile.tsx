import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BODY_REGION_LABELS, type Signal } from '@/lib/types'

/**
 * One dictionary entry in the grid.
 *
 * The clip is the product — the chrome around it stays quiet. Every tile
 * autoplays muted and looping so a stranger scanning the grid sees movement
 * rather than a wall of play buttons they have to tap one at a time.
 */
export function SignalTile({
  signal,
  videoUrl,
  posterUrl,
  onSelect,
  selected = false,
}: {
  signal: Signal
  videoUrl?: string
  posterUrl?: string
  onSelect?: (signal: Signal) => void
  selected?: boolean
}) {
  const interactive = Boolean(onSelect)
  const Tag = interactive ? 'button' : 'div'

  return (
    <Tag
      {...(interactive
        ? { type: 'button' as const, onClick: () => onSelect?.(signal) }
        : {})}
      aria-pressed={interactive ? selected : undefined}
      className={cn(
        'group block w-full overflow-hidden rounded-[var(--radius)] border bg-surface text-left',
        selected ? 'border-accent ring-2 ring-accent' : 'border-border',
        interactive && 'hover:border-accent'
      )}
    >
      <div className="relative aspect-square w-full bg-surface-2">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={posterUrl}
            // All three are required for the grid to animate on mobile.
            // Without playsInline, iOS takes every tile fullscreen on play.
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
            className="size-full object-cover"
            aria-hidden
          />
        ) : (
          <div className="size-full animate-pulse bg-surface-2" aria-hidden />
        )}

        {signal.urgency === 'urgent' && (
          <span className="absolute top-2 left-2 rounded-full bg-urgent px-2 py-0.5 text-xs font-medium text-urgent-fg">
            Urgent
          </span>
        )}
        {signal.is_sound && (
          <span
            className="absolute right-2 bottom-2 rounded-full bg-surface/90 p-1.5"
            title="This is a sound"
          >
            <Volume2 className="size-4" aria-hidden />
            <span className="sr-only">This signal is a sound</span>
          </span>
        )}
      </div>

      <div className="space-y-0.5 px-3 py-2.5">
        <p className="font-medium">{signal.label}</p>
        {signal.meaning && (
          <p className="line-clamp-2 text-sm text-fg-muted">{signal.meaning}</p>
        )}
        <p className="text-xs text-fg-muted">
          {BODY_REGION_LABELS[signal.body_region]}
        </p>
      </div>
    </Tag>
  )
}
