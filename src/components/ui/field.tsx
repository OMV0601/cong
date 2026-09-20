import type { ComponentProps, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-3',
        'text-fg placeholder:text-fg-muted',
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2',
        'text-fg placeholder:text-fg-muted',
        className
      )}
      {...props}
    />
  )
}

/**
 * Label + control + hint, wired together by id.
 *
 * Every input in this app goes through here so nothing can ship with a label
 * that is merely adjacent to its control rather than associated with it.
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: (props: { id: string; 'aria-describedby'?: string }) => ReactNode
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children({ id, 'aria-describedby': hintId })}
      {hint && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
