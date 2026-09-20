import { useEffect, useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { env, isSupabaseConfigured } from '@/lib/env'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'

type CheckState = 'pending' | 'pass' | 'fail'

interface Row {
  name: string
  state: CheckState
  detail: string
}

/**
 * The troubleshooting page, at /debug.
 *
 * It began as Phase 0 scaffolding and earned a permanent place: every failure
 * it reports is one that otherwise shows up as a blank grid or a
 * "code is not valid" message with no way to tell which of six things is
 * wrong. Deploying this involves a database, a storage bucket, two auth
 * settings, an edge function and three environment variables, and the answer
 * to "which one did I miss?" should come from the running app rather than
 * someone's memory.
 *
 * It is deliberately NOT routed at / — a first-time visitor must never land on
 * a developer checklist. See App.tsx.
 */
export default function Setup() {
  const [rows, setRows] = useState<Row[]>([
    { name: 'Supabase keys present', state: 'pending', detail: '' },
    { name: 'Database reachable', state: 'pending', detail: '' },
    { name: 'Schema migrated (0001–0007)', state: 'pending', detail: '' },
    { name: 'Search + activity migrated (0008)', state: 'pending', detail: '' },
    { name: 'Push supported by this browser', state: 'pending', detail: '' },
    { name: 'Service worker registered', state: 'pending', detail: '' },
    { name: 'VAPID public key present', state: 'pending', detail: '' },
  ])

  useEffect(() => {
    let cancelled = false
    const set = (i: number, state: CheckState, detail: string) => {
      if (cancelled) return
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, state, detail } : r))
      )
    }

    async function run() {
      set(
        0,
        isSupabaseConfigured ? 'pass' : 'fail',
        isSupabaseConfigured
          ? new URL(env.supabaseUrl).hostname
          : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
      )

      const supabase = getSupabase()
      if (!supabase) {
        set(1, 'fail', 'No client — keys missing')
        set(2, 'fail', 'No client — keys missing')
      } else {
        // person_for_token is executable by anon and touches no data, so it is
        // a safe round-trip that proves both connectivity and that migration
        // 0002 has been applied.
        const { error } = await supabase.rpc('person_for_token', {
          p_token: '__connectivity_probe__',
        })

        if (!error) {
          set(1, 'pass', 'Connected')
          set(2, 'pass', 'RPC surface present')
        } else if (
          error.message.includes('Could not find the function') ||
          error.code === 'PGRST202'
        ) {
          set(1, 'pass', 'Connected')
          set(2, 'fail', 'Run the SQL in supabase/migrations/')
        } else {
          set(1, 'fail', error.message)
          set(2, 'fail', 'Blocked by the error above')
        }

        // 0008 adds search and the activity log. Calling it as an unauthorised
        // caller is enough to prove it exists: a permission error means the
        // function is there and doing its job, whereas PGRST202 means Postgres
        // has never heard of it and the migration has not been run.
        const probe = await supabase.rpc('search_signals_for_person', {
          p_person_id: '00000000-0000-0000-0000-000000000000',
          p_query: '',
        })
        if (
          probe.error &&
          (probe.error.code === 'PGRST202' ||
            probe.error.message.includes('Could not find the function'))
        ) {
          set(3, 'fail', 'Run supabase/migrations/0008_search_and_activity.sql')
        } else {
          set(3, 'pass', 'search_signals_for_person present')
        }
      }

      const pushOk =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      set(
        4,
        pushOk ? 'pass' : 'fail',
        pushOk ? 'Push API available' : 'This browser cannot receive push'
      )

      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js')
          set(5, 'pass', `Scope ${reg.scope}`)
        } catch (e) {
          set(5, 'fail', errorMessage(e, 'Registration failed'))
        }
      } else {
        set(5, 'fail', 'No service worker support')
      }

      set(
        6,
        env.vapidPublicKey ? 'pass' : 'fail',
        env.vapidPublicKey
          ? `${env.vapidPublicKey.slice(0, 12)}…`
          : 'Run: npm run vapid'
      )
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const allPass = rows.every((r) => r.state === 'pass')

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-12">
      <p className="text-sm font-medium tracking-wide text-accent uppercase">
        Diagnostics
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Lexicon</h1>
      <p className="mt-3 max-w-prose text-fg-muted">
        Checks every piece of plumbing this app needs and names whichever one
        is missing. Nothing here is user-facing — if you arrived by accident,
        the app itself is at <a href="/" className="underline underline-offset-4">the front page</a>.
      </p>

      <ul className="mt-10 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
        {rows.map((row) => (
          <li key={row.name} className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-0.5 shrink-0" aria-hidden>
              {row.state === 'pending' && (
                <Loader2 className="size-5 animate-spin text-fg-muted" />
              )}
              {row.state === 'pass' && <Check className="size-5 text-accent" />}
              {row.state === 'fail' && <X className="size-5 text-urgent" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{row.name}</span>
              {row.detail && (
                <span className="mt-0.5 block truncate font-mono text-xs text-fg-muted">
                  {row.detail}
                </span>
              )}
            </span>
            <span className="sr-only">
              {row.state === 'pass'
                ? 'passing'
                : row.state === 'fail'
                  ? 'failing'
                  : 'checking'}
            </span>
          </li>
        ))}
      </ul>

      <p
        className={cn(
          'mt-6 text-sm',
          allPass ? 'text-accent' : 'text-fg-muted'
        )}
      >
        {allPass
          ? 'Everything is connected.'
          : 'Fix anything marked above, then reload.'}
      </p>
    </main>
  )
}
