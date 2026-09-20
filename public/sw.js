/**
 * Lexicon service worker.
 *
 * Hand-written rather than generated, because its only real job is the push
 * path and that path is the product: when a stranger cannot read someone, this
 * is what wakes the one person who can.
 *
 * Deliberately NOT a caching service worker. Lexicon shows medical meaning —
 * a stale clip or an out-of-date label is worse than a spinner.
 */

self.addEventListener('install', () => {
  // Take over immediately so a newly-subscribed device can receive a push
  // without the parent having to close and reopen the tab first.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'Someone needs help reading a signal'
  const options = {
    body: data.body || 'Tap to see the clip.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    // Collapse repeats for the same Ask rather than stacking notifications.
    tag: data.askId ? `ask-${data.askId}` : 'lexicon-ask',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/app' },
    actions: [{ action: 'open', title: 'Open' }],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/app', self.location.origin)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Reuse an open tab if we have one; a parent woken at 3am should not end
      // up with six tabs.
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(target.href)
          return client.focus()
        }
      }
      return self.clients.openWindow(target.href)
    })
  )
})
