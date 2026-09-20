/**
 * Environment access with a deliberate "not configured yet" state.
 *
 * Phase 0 runs before the Supabase keys land, so the app must boot and render
 * without them rather than white-screening. Anything that needs the backend
 * checks `isSupabaseConfigured` first and shows a setup notice instead.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  vapidPublicKey: (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ?? '',
}
