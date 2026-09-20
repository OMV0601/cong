import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/ui/alert'
import {
  getPushState,
  subscribeToPush,
  unsubscribeFromPush,
  type PushState,
} from '@/lib/push'
import { errorMessage } from '@/lib/errors'

/**
 * Turning on the thing that makes a phone buzz in a pocket.
 *
 * Worth being explicit about what this is for, because "enable notifications"
 * is a phrase people have been trained to dismiss. It is not marketing and it
 * is not a nag: without it, an answer only reaches someone who already has the
 * tab open, which means the one scenario Lexicon was built for — a stranger
 * with a question at 11pm and a parent asleep — quietly does not work.
 *
 * A denied permission gets real instructions rather than a repeat of the same
 * button, because the browser will never show the prompt again and the only
 * fix is in settings the app cannot reach.
 */
export function PushToggle({ personName }: { personName?: string }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setState(await getPushState())
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect
    void refresh()
  }, [refresh])

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      setState(state === 'subscribed' ? await unsubscribeFromPush() : await subscribeToPush())
    } catch (e) {
      setError(errorMessage(e, 'Could not change notification settings.'))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  // Still checking. Rendering nothing beats flashing a control that is about
  // to change its mind about which state it is in.
  if (state === null) return null

  if (state === 'unsupported') {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <BellOff className="size-4 text-fg-muted" aria-hidden />
          This browser cannot send notifications
        </h2>
        <p className="mt-1.5 text-sm text-fg-muted">
          Questions will still appear on this page, and they arrive instantly if
          you leave it open. To be reached with the app closed, open Lexicon in
          Chrome on Android — or on an iPhone, add it to your Home Screen first.
        </p>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <BellOff className="size-4 text-urgent" aria-hidden />
          Notifications are blocked
        </h2>
        <p className="mt-1.5 text-sm text-fg-muted">
          Your browser will not ask again, so this has to be changed in its
          settings: tap the padlock or the sliders icon beside the address bar,
          find Notifications, set it to Allow, then reload this page.
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          Until then, a question only reaches you while this page is open.
        </p>
      </div>
    )
  }

  const on = state === 'subscribed'

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        {on ? (
          <BellRing className="size-4 text-accent" aria-hidden />
        ) : (
          <Bell className="size-4 text-fg-muted" aria-hidden />
        )}
        {on ? 'This device will be notified' : 'Get notified on this device'}
      </h2>
      <p className="mt-1.5 max-w-prose text-sm text-fg-muted">
        {on
          ? `When someone with a code can’t read ${personName ?? 'them'}, this phone buzzes — even with the browser closed. Tapping the notification opens the question.`
          : `Without this, a question only reaches you while this page is open. With it, your phone buzzes the moment someone is stuck, which is usually the moment it matters.`}
      </p>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <Button
        variant={on ? 'outline' : 'primary'}
        className="mt-3"
        disabled={busy}
        onClick={() => void toggle()}
      >
        {on ? <BellOff aria-hidden /> : <Bell aria-hidden />}
        {busy ? 'Working…' : on ? 'Turn off' : 'Turn on'}
      </Button>
    </div>
  )
}
