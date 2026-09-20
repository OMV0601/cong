/**
 * Extracts a readable message from anything a catch block might see.
 *
 * `err instanceof Error` alone is not safe to gate on: Supabase's
 * PostgrestError does extend Error, but a value can still arrive here that
 * isn't an Error instance (a rejected promise with a plain object, a string
 * throw, a value that crossed a bundling/realm boundary). Every catch block
 * in this app goes through this function instead of checking `instanceof`
 * directly, so a real backend error is never silently replaced by a generic
 * fallback — the whole point of a fallback string is for the truly unknown
 * case, not for us swallowing detail we actually have.
 *
 * Prefers `hint` when present: for RLS/permission errors (Postgres 42501),
 * Postgrest puts the actionable fix there, not in `message`.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const withHint = err as Error & { hint?: string; details?: string }
    if (withHint.hint) return `${err.message} — ${withHint.hint}`
    return err.message || fallback
  }
  if (typeof err === 'string' && err) return err
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>
    const msg = obj.message ?? obj.error_description ?? obj.hint
    if (typeof msg === 'string' && msg) return msg
  }
  return fallback
}
