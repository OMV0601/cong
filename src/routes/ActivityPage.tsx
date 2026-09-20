import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Eye,
  HelpCircle,
  History,
  X,
} from 'lucide-react'
import { ErrorNote } from '@/components/ui/alert'
import { ListSkeleton } from '@/components/ui/skeleton'
import { accessLogForPerson, getPerson } from '@/lib/db'
import { describeAccessEntry, groupByDay } from '@/lib/activity'
import { useDocumentTitle } from '@/lib/use-document-title'
import { errorMessage } from '@/lib/errors'
import type { AccessLogEntry, Person } from '@/lib/types'

const ICONS: Record<string, typeof Eye> = {
  opened: Eye,
  asked: HelpCircle,
  confirmed_match: Check,
  rejected_match: X,
}

/**
 * Who looked, and what they did with it.
 *
 * A family can already revoke a code. This is the other half of that promise —
 * being able to see what happened while it was live. Sharing something this
 * personal and then having to take on faith that it was used properly is not a
 * trade anyone should be asked to make, so the log is complete and the family
 * can read all of it.
 *
 * It is also the answer to the obvious question about the whole product: what
 * stops a code being passed around? Nothing stops it. But the family sees it.
 */
export default function ActivityPage() {
  const { id = '' } = useParams()
  const [person, setPerson] = useState<Person | null>(null)
  const [entries, setEntries] = useState<AccessLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle(
    person ? `Activity · ${person.display_name} · Lexicon` : 'Activity · Lexicon'
  )

  const load = useCallback(
    async (isStale: () => boolean) => {
      try {
        const [p, log] = await Promise.all([
          getPerson(id),
          accessLogForPerson(id),
        ])
        if (isStale()) return
        setPerson(p)
        setEntries(log)
      } catch (e) {
        if (isStale()) return
        setError(errorMessage(e, 'Could not load the activity log.'))
        setEntries([])
      }
    },
    [id]
  )

  useEffect(() => {
    let cancelled = false
    // oxlint-disable-next-line set-state-in-effect
    void load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [load])

  const days = groupByDay(entries ?? [])

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        to={`/person/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Activity{person ? ` for ${person.display_name}` : ''}
      </h1>
      <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
        Every time someone opens a code, asks a question, or decides a clip
        matches, it is recorded here. Nobody can turn this off — not the person
        holding the code, and not us.
      </p>

      {error && (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {entries === null && <ListSkeleton className="mt-8" rows={4} />}

      {entries !== null && entries.length === 0 && !error && (
        <div className="mt-8 rounded-[var(--radius)] border border-border bg-surface p-6">
          <History className="size-6 text-fg-muted" aria-hidden />
          <h2 className="mt-2 font-medium">Nothing yet</h2>
          <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
            Nobody has opened a code for {person?.display_name ?? 'them'}. When
            someone does, you will see exactly who and when.
          </p>
          <Link
            to={`/person/${id}/share`}
            className="mt-3 inline-flex items-center text-sm text-accent underline underline-offset-4"
          >
            Create a code
          </Link>
        </div>
      )}

      {days.map((day) => (
        <section key={day.heading} className="mt-8">
          <h2 className="text-sm font-medium text-fg-muted">{day.heading}</h2>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
            {day.entries.map((entry) => {
              const Icon = ICONS[entry.action] ?? History
              return (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <Icon
                    className="mt-0.5 size-4 shrink-0 text-fg-muted"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm">{describeAccessEntry(entry)}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {new Date(entry.created_at).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}
