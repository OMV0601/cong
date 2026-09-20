import { useId } from 'react'
import { Loader2, Search, X } from 'lucide-react'

/**
 * Secondary to Look and Point, and sized like it.
 *
 * Someone who can name what they are seeing does not need this app. The box is
 * here for the circle member who knows the word, and for a lexicon that has
 * grown past the point where a grid is scannable.
 */
export function SearchBox({
  value,
  onChange,
  searching = false,
  label = 'Search signals',
  placeholder = 'Search by name or meaning',
}: {
  value: string
  onChange: (next: string) => void
  searching?: boolean
  label?: string
  placeholder?: string
}) {
  // Generated rather than hardcoded: two search boxes on one page with the
  // same id would silently break both labels.
  const id = useId()
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-[var(--radius)] border border-border bg-surface pr-20 pl-9 text-base text-fg placeholder:text-fg-muted sm:text-sm"
      />
      {searching && (
        <Loader2
          className="absolute top-1/2 right-12 size-4 -translate-y-1/2 animate-spin text-fg-muted"
          aria-hidden
        />
      )}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  )
}
