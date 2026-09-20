import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/lib/use-document-title'

/**
 * Honest rather than cute.
 *
 * The likeliest visitor here is someone who mistyped a share code or followed
 * one that has expired, so the copy names that first and tells them the one
 * thing that actually helps: ask for a new code.
 */
export default function NotFound() {
  useDocumentTitle('Not found · Lexicon')
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <p className="text-sm font-medium text-fg-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        There&rsquo;s nothing at this address
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        If you were given a code to look someone up, it may have been mistyped
        or it may have expired. Codes are short-lived on purpose. Ask whoever
        gave it to you for a new one.
      </p>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/">Go to the start</Link>
      </Button>
    </main>
  )
}
