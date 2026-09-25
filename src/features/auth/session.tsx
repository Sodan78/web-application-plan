import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { repo, type Profile } from '@/lib/data'
import { supabase } from '@/lib/supabase'

type SessionState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** True after arriving from a password reset link, until the new password is saved. */
  recovering: boolean
  clearRecovering: () => void
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(next)
      setAuthLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => repo.getMyProfile(userId ?? ''),
    enabled: Boolean(userId),
  })

  const value: SessionState = {
    session,
    profile: profile.data ?? null,
    loading: authLoading || (Boolean(userId) && profile.isPending),
    recovering,
    clearRecovering: () => setRecovering(false),
    signOut: async () => {
      await supabase.auth.signOut()
      queryClient.clear()
    },
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
