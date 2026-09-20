import { Link } from 'react-router-dom'

/**
 * What a visitor sees when the deployment has no backend keys.
 *
 * Deliberately not the developer checklist: a first-time visitor must never
 * land on one. That lives at /debug for whoever is deploying this, and this
 * page just says plainly that the site is not finished being set up.
 */
export default function NotConfigured() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Lexicon</h1>
      <p className="mt-3 text-sm text-fg-muted">
        This copy of Lexicon isn&rsquo;t connected to a database yet, so there
        is nothing to sign in to. If you were sent a link to look someone up,
        go back and ask for a new one.
      </p>
      <p className="mt-6 text-xs text-fg-muted">
        Deploying this?{' '}
        <Link to="/debug" className="underline underline-offset-4">
          The setup checklist
        </Link>{' '}
        names exactly what is missing.
      </p>
    </main>
  )
}
