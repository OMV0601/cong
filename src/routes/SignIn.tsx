import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth-context'
import { useDocumentTitle } from '@/lib/use-document-title'
import { errorMessage } from '@/lib/errors'

export default function SignIn() {
  const { signInWithPassword, signUp, signInAsGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  useDocumentTitle('Sign in · Lexicon')

  // Where they were headed before the session ran out, so a bookmarked person
  // page survives signing back in.
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/app'
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'in') {
        await signInWithPassword(email, password)
        navigate(from, { replace: true })
      } else {
        await signUp(email, password)
        setNotice('Account created. Check your email if confirmation is on.')
      }
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 self-start text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> What is this?
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Lexicon</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Every non-speaking person has a vocabulary. It just lives in one
        person&rsquo;s head.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email">
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>

        <Field label="Password" hint="At least 6 characters.">
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete={
                mode === 'in' ? 'current-password' : 'new-password'
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}
        {notice && <p className="text-sm text-accent">{notice}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'in' ? 'up' : 'in')
          setError(null)
          setNotice(null)
        }}
        className="mt-4 text-sm text-fg-muted underline underline-offset-4 hover:text-fg"
      >
        {mode === 'in'
          ? 'No account yet? Create one'
          : 'Already have an account? Sign in'}
      </button>

      <div className="mt-8 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-fg-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="mt-4 w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          setNotice(null)
          try {
            await signInAsGuest()
            navigate(from, { replace: true })
          } catch (err) {
            setError(errorMessage(err, 'Guest sign-in is not enabled.'))
          } finally {
            setBusy(false)
          }
        }}
      >
        Continue as guest
      </Button>
      <p className="mt-2 text-xs text-fg-muted">
        For trying things out. A guest account is real but temporary — clear
        your browser data and it is gone.
      </p>
    </main>
  )
}
