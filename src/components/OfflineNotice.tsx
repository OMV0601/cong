import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Says so when the network is gone.
 *
 * Lexicon gets used in hospitals, where wifi drops in exactly the corridors
 * you need it in. Without this, a dead connection looks identical to a slow
 * one: tiles stay grey, an Ask spins, and the person holding the phone decides
 * the app is broken. Naming it costs one line and changes what they do next.
 *
 * navigator.onLine only knows whether there is *a* network, not whether
 * anything is reachable through it — a captive portal still reads as online.
 * So this is a hint, not a diagnosis, and the wording stays hedged.
 */
export function OfflineNotice() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false
  )

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-urgent px-4 py-2 text-sm text-urgent-fg"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>
        No connection. Clips already on screen will keep playing; nothing new
        will load.
      </span>
    </div>
  )
}
