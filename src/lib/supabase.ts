import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from './env'

let client: SupabaseClient | null = null

/**
 * Returns the Supabase client, or null when the project keys are not set.
 *
 * Callers must handle null rather than assuming a client exists — that is what
 * lets the app run locally before the backend is wired up.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}
