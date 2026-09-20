import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/alert'
import { createPerson, listPeople } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import type { Person } from '@/lib/types'

export default function People() {
  const { signOut } = useAuth()
  const [people, setPeople] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not load.')
        setPeople([])
      })
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const person = await createPerson(name)
      setPeople((prev) => [...(prev ?? []), person])
      setName('')
      setAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Lexicon</h1>
        <button
          onClick={() => void signOut()}
          className="text-sm text-fg-muted underline underline-offset-4 hover:text-fg"
        >
          Sign out
        </button>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {people === null ? (
        <p className="mt-10 text-sm text-fg-muted">Loading…</p>
      ) : people.length === 0 && !adding ? (
        <div className="mt-10 rounded-[var(--radius)] border border-border bg-surface p-6">
          <h2 className="font-medium">Start a lexicon</h2>
          <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
            Add the person whose signals you want to record. You&rsquo;ll film
            short clips of what they do and write down what each one means.
          </p>
          <Button className="mt-4" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add a person
          </Button>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                to={`/person/${person.id}`}
                className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-surface-2"
              >
                <span className="font-medium">{person.display_name}</span>
                <ChevronRight className="size-5 text-fg-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form
          onSubmit={add}
          className="mt-6 space-y-4 rounded-[var(--radius)] border border-border bg-surface p-4"
        >
          <Field
            label="Their name"
            hint="However you'd refer to them. First name is fine."
          >
            {(p) => (
              <Input
                {...p}
                required
                maxLength={80}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? 'Adding…' : 'Add'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAdding(false)
                setName('')
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        people !== null &&
        people.length > 0 && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setAdding(true)}
          >
            <Plus aria-hidden /> Add another
          </Button>
        )
      )}
    </main>
  )
}
