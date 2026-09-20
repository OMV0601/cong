import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './button'

/**
 * A confirmation step for things that cannot be undone.
 *
 * Built on the native <dialog> element rather than a modal library. The
 * platform already does the hard parts — focus is trapped inside while it is
 * open, Escape closes it, the rest of the page is inert, and it announces
 * itself as a modal without a single aria attribute from us.
 *
 * That matters more than it sounds: the library version of this same component
 * cost 343 kB raw, about 95 kB gzipped, which is roughly a third of the whole
 * app's download for one delete confirmation. On hospital wifi that is not a
 * trade worth making for a fancier animation.
 *
 * Not window.confirm, though: that cannot be styled, reads badly on a phone,
 * and blocks the whole tab.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: ReactNode
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  // Synchronising a React prop with a DOM element that owns its own open
  // state. showModal() is imperative by design and has no declarative
  // equivalent, so this is exactly the case effects exist for.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      // Fires for Escape and for close() alike, so cancelling by any route
      // lands in one place and the parent's state cannot drift out of sync
      // with what is actually on screen.
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        // The backdrop is part of the dialog element, so a click that lands on
        // the element itself rather than its contents is a backdrop click.
        // Dismissing is the safe outcome here — it cancels a deletion.
        if (e.target === ref.current && !busy) onOpenChange(false)
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-[var(--radius)] border border-border bg-surface p-5 text-fg backdrop:bg-black/50"
    >
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 text-sm text-fg-muted">{body}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button variant="urgent" disabled={busy} onClick={onConfirm}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
