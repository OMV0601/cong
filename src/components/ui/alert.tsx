import { AlertCircle } from 'lucide-react'

/** Errors the user needs to act on. Uses the urgent token — the only place outside genuine clinical urgency that does. */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-[var(--radius)] bg-urgent-soft px-3 py-2.5 text-sm text-urgent"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
