import { cn } from '@/lib/utils'

/**
 * A placeholder shaped like the thing that is coming.
 *
 * "Loading…" tells you to wait. A skeleton tells you what you are waiting for,
 * and stops the page jumping when it arrives. On a slow hospital connection
 * that difference is most of the perceived speed of the app.
 *
 * Marked aria-hidden and paired with a live region by the caller: a screen
 * reader should hear "loading signals", not a description of grey boxes.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius)] bg-surface-2', className)}
      aria-hidden
    />
  )
}

/** The signal grid, mid-flight. Matches the real tile's square-plus-caption. */
export function TileGridSkeleton({
  count = 6,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={className}>
      <p className="sr-only" role="status">
        Loading signals…
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li
            key={i}
            className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 px-3 py-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A list of rows, mid-flight. */
export function ListSkeleton({
  rows = 3,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface',
        className
      )}
    >
      <p className="sr-only" role="status">
        Loading…
      </p>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-2 px-4 py-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}
