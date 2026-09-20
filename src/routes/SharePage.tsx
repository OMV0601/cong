import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { ArrowLeft, Check, Copy, QrCode as QrIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/alert'
import {
  createGrant,
  getPerson,
  isGrantLive,
  listGrants,
  revokeGrant,
} from '@/lib/db'
import { errorMessage } from '@/lib/errors'
import type { AccessGrant, Person } from '@/lib/types'

const DURATIONS = [
  { hours: 8, label: 'One shift (8h)' },
  { hours: 24, label: 'A day' },
  { hours: 168, label: 'A week' },
]

function grantUrl(token: string) {
  return `${window.location.origin}/c/${token}`
}

export default function SharePage() {
  const { id = '' } = useParams()
  const [person, setPerson] = useState<Person | null>(null)
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [hours, setHours] = useState(24)
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState<{ token: string; dataUrl: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([getPerson(id), listGrants(id)])
      setPerson(p)
      setGrants(g)
    } catch (e) {
      setError(errorMessage(e, 'Could not load.'))
    }
  }, [id])

  useEffect(() => {
    // Every setState inside load() happens after an await — a fetch-on-mount,
    // not a synchronous render cascade.
    // oxlint-disable-next-line set-state-in-effect
    void load()
  }, [load])

  async function showQr(token: string) {
    const dataUrl = await QRCode.toDataURL(grantUrl(token), {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
    setQr({ token, dataUrl })
  }

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const grant = await createGrant(id, label, hours)
      setGrants((prev) => [grant, ...prev])
      setLabel('')
      await showQr(grant.token)
    } catch (e) {
      setError(errorMessage(e, 'Could not create a code.'))
    } finally {
      setBusy(false)
    }
  }

  async function revoke(grant: AccessGrant) {
    try {
      await revokeGrant(grant.id)
      if (qr?.token === grant.token) setQr(null)
      await load()
    } catch (e) {
      setError(errorMessage(e, 'Could not revoke.'))
    }
  }

  const live = grants.filter(isGrantLive)

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        to={`/person/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Share {person?.display_name ?? ''}&rsquo;s lexicon
      </h1>
      <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
        A code lets someone read the signals without an account. It expires on
        its own, and you can revoke it at any moment.
      </p>

      {error && (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-8 space-y-4 rounded-[var(--radius)] border border-border bg-surface p-4">
        <Field
          label="Who is this for?"
          hint="Just so you recognise it later. 'Overlake ER', 'Ms. Diaz'."
        >
          {(p) => (
            <Input
              {...p}
              maxLength={60}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          )}
        </Field>

        <fieldset>
          <legend className="text-sm font-medium">How long should it last?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.hours}
                type="button"
                onClick={() => setHours(d.hours)}
                aria-pressed={hours === d.hours}
                className={
                  hours === d.hours
                    ? 'rounded-full border border-accent bg-accent-soft px-3.5 py-2 text-sm'
                    : 'rounded-full border border-border bg-surface px-3.5 py-2 text-sm hover:bg-surface-2'
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>

        <Button onClick={() => void create()} disabled={busy}>
          <QrIcon aria-hidden /> {busy ? 'Creating…' : 'Create a code'}
        </Button>
      </div>

      {qr && (
        <div className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-4 text-center">
          <img
            src={qr.dataUrl}
            alt="QR code linking to this person's signals"
            className="mx-auto size-64 rounded-[var(--radius)] bg-white p-2"
          />
          <p className="mt-3 font-mono text-xs break-all text-fg-muted">
            {grantUrl(qr.token)}
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={async () => {
              await navigator.clipboard.writeText(grantUrl(qr.token))
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      )}

      <h2 className="mt-10 text-sm font-medium">
        Active codes {live.length > 0 && `(${live.length})`}
      </h2>
      {live.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">
          None right now. Nobody outside the circle can see anything.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
          {live.map((grant) => (
            <li
              key={grant.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {grant.label || 'Untitled code'}
                </span>
                <span className="block text-xs text-fg-muted">
                  Expires {new Date(grant.expires_at).toLocaleString()}
                </span>
              </span>
              <span className="flex gap-2">
                <Button variant="ghost" onClick={() => void showQr(grant.token)}>
                  Show
                </Button>
                <Button variant="outline" onClick={() => void revoke(grant)}>
                  Revoke
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
