import { FlaskConical } from 'lucide-react'

/**
 * Says, plainly, that none of this is real.
 *
 * A demo lexicon nobody can tell apart from a real one is not a demo. The clips
 * are abstract animations drawn by a canvas, the meanings are written to be
 * plausible, and the person does not exist — and someone evaluating this
 * deserves to know all of that before they form an opinion about what they are
 * looking at.
 *
 * Shown on the stranger's side as well as the family's, because the stranger's
 * side is the screen a first-time visitor actually spends time on.
 */
export function DemoBanner({ name }: { name?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-border bg-surface-2 px-3.5 py-3 text-sm">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
      <p className="text-fg-muted">
        <strong className="font-medium text-fg">Sample data.</strong>{' '}
        {name ?? 'This person'} is not a real person, and the clips are abstract
        animations — a real lexicon holds video of someone&rsquo;s actual
        signals.
      </p>
    </div>
  )
}
