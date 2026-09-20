import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BODY_REGION_LABELS, type Signal } from '@/lib/types'

/**
 * One dictionary entry in the grid.
 *
 * The clip is the product — the chrome around it stays quiet. Every tile
 * autoplays muted and looping so a stranger scanning the grid sees movement
 * rather than a wall of play buttons they have to tap one at a time. Browsers
 * only permit autoplay while muted, so audio is opt-in per tile.
 *
 * Whether this tile is the one with sound on is owned by the parent, so that
 * unmuting one mutes the rest. Thirty clips talking at once is not a grid
 * anyone can read.
 */
export function SignalTile({
  signal,
  videoUrl,
  posterUrl,
  onSelect,
  selected = false,
  audioOn = false,
  onToggleAudio,
}: {
  signal: Signal
  videoUrl?: string
  posterUrl?: string
  onSelect?: (signal: Signal) => void
  selected?: boolean
  audioOn?: boolean
  onToggleAudio?: (signal: Signal) => void
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius)] border bg-surface',
        selected ? 'border-accent ring-2 ring-accent' : 'border-border',
        onSelect && 'hover:border-accent'
      )}
    >
      <div className="relative aspect-square w-full bg-surface-2">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={posterUrl}
            // All three are required for the grid to animate on mobile.
            // Without playsInline, iOS takes every tile fullscreen on play.
            muted={!audioOn}
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

        {onToggleAudio && videoUrl && (
          <button
            type="button"
            onClick={() => onToggleAudio(signal)}
            aria-pressed={audioOn}
            className={cn(
              'absolute right-2 bottom-2 z-20 grid size-11 place-items-center rounded-full',
              audioOn
                ? 'bg-accent text-accent-fg'
                : 'bg-surface/90 text-fg hover:bg-surface'
            )}
          >
            {audioOn ? (
              <Volume2 className="size-5" aria-hidden />
            ) : (
              <VolumeX className="size-5" aria-hidden />
            )}
            <span className="sr-only">
              {audioOn
                ? `Mute ${signal.label}`
                : `Play sound for ${signal.label}`}
            </span>
          </button>
        )}
      </div>

      <div className="space-y-0.5 px-3 py-2.5">
        <p className="font-medium">{signal.label}</p>
        {signal.meaning && (
          <p className="line-clamp-2 text-sm text-fg-muted">{signal.meaning}</p>
        )}
        <p className="text-xs text-fg-muted">
          {signal.is_sound && 'Sound · '}
          {BODY_REGION_LABELS[signal.body_region]}
        </p>
      </div>

      {/* Sibling of the audio button rather than its parent — a button inside
          a button is invalid and breaks keyboard navigation. */}
      {onSelect && (
        <button
          type="button"
          onClick={() => onSelect(signal)}
          aria-pressed={selected}
          className="absolute inset-0 z-10"
        >
          <span className="sr-only">{signal.label}</span>
        </button>
      )}

    </div>
  )
}
