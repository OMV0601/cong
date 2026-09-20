import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './supabase'
import { AuthContext, type AuthValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  // With no backend there is no session to wait for, so start settled rather
  // than flipping the flag from inside an effect.
  const [loading, setLoading] = useState(() => getSupabase() !== null)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signInWithPassword(email, password) {
        const supabase = getSupabase()
        if (!supabase) throw new Error('Backend not configured.')
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      },
      async signUp(email, password) {
        const supabase = getSupabase()
        if (!supabase) throw new Error('Backend not configured.')
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      },
      async signInAsGuest() {
        const supabase = getSupabase()
        if (!supabase) throw new Error('Backend not configured.')
        const { error } = await supabase.auth.signInAnonymously()
        if (error) throw error
      },
      async signOut() {
        await getSupabase()?.auth.signOut()
      },
    }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
