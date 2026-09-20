import { getSupabase } from './supabase'
import { env } from './env'

/**
 * Web Push subscription management.
 *
 * Realtime already delivers an answer to a stranger whose tab is open. Push
 * exists for the other end of the conversation: the parent, whose phone is in
 * their pocket with the browser closed, and who has no idea a nurse is standing
 * over their child right now trying to work out what a sound means.
 *
 * Realtime stays the primary path — it is what makes the answer land without a
 * refresh. Push is the accelerator that gets someone to look. So every failure
 * in this file is non-fatal by design: an Ask that sends without a notification
 * is a degraded Ask, but an Ask that fails to send because a notification
 * failed is a broken product.
 */

export type PushState =
  | 'unsupported'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed'

export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Decodes a base64url VAPID key into the bytes PushManager wants.
 *
 * This conversion is a famous source of silent failures. The Push API demands
 * raw bytes, VAPID keys are distributed as base64url, and the two differ in
 * three ways at once: base64url swaps `-` for `+` and `_` for `/`, and drops
 * the `=` padding that atob() requires. Get any of them wrong and subscribe()
 * either throws InvalidCharacterError or — worse — succeeds against a key the
 * server cannot sign for, so notifications simply never arrive and nothing
 * anywhere reports an error.
 *
 * Hence the unit tests in push.test.ts: a correct P-256 public key decodes to
 * exactly 65 bytes beginning with 0x04, which is cheap to assert and catches
 * every one of those mistakes.
 */
export function urlBase64ToUint8Array(
  base64url: string
): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Backed by an explicit ArrayBuffer rather than the default: PushManager
  // wants a BufferSource, and a Uint8Array whose buffer could in principle be
  // a SharedArrayBuffer does not satisfy that.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/** Registers the service worker, reusing an existing registration. */
async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.getRegistration('/')
    const sub = await reg?.pushManager.getSubscription()
    return sub ? 'subscribed' : 'unsubscribed'
  } catch {
    return 'unsubscribed'
  }
}

/**
 * Asks for permission, subscribes, and records where this browser can be
 * reached.
 *
 * The row is written through an RPC rather than an upsert, because a push
 * endpoint belongs to a browser install, not to an account. When a parent and
 * then a guest sign in on the same phone, the second one hits a unique
 * constraint on a row they have no policy to touch. The endpoint really has
 * changed hands, so the function lets it.
 */
export async function subscribeToPush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  if (!env.vapidPublicKey) {
    throw new Error(
      'No VAPID public key is configured, so this browser cannot be reached. Set VITE_VAPID_PUBLIC_KEY and rebuild.'
    )
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'unsubscribed'

  const reg = await registration()
  // Reuse an existing subscription rather than creating a second one for the
  // same browser, which would have the parent notified twice per Ask.
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      // Required by Chrome: every push must result in something the user can
      // see. That happens to be exactly what this feature is for.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey),
    }))

  const json = sub.toJSON()
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend not configured.')

  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_user_agent: navigator.userAgent.slice(0, 300),
  })
  if (error) {
    // Leaving a live browser subscription with no row to match it would mean
    // silently never being notified, so undo it and report honestly.
    await sub.unsubscribe().catch(() => {})
    throw error
  }

  return 'subscribed'
}

export async function unsubscribeFromPush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'

  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return 'unsubscribed'

  const endpoint = sub.endpoint
  await sub.unsubscribe()

  const supabase = getSupabase()
  if (supabase) {
    // Best effort. The browser subscription is already gone, so the worst case
    // is a dead row that the Edge Function prunes the next time it tries it.
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
    if (error) console.error('unsubscribeFromPush: row not removed', error)
  }

  return 'unsubscribed'
}
