import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth-context'

export default function SignIn() {
  const { signInWithPassword, signUp } = useAuth()
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
      } else {
        await signUp(email, password)
        setNotice('Account created. Check your email if confirmation is on.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Lexicon</h1>
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
    </main>
  )
}
