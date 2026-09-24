import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { repo, type Profile } from '@/lib/data'

const KEY = 'couplesunite:session'

type SessionState = {
  profile: Profile | null
  loading: boolean
  signIn: (profileId: string) => void
  signOut: () => void
}

const SessionContext = createContext<SessionState | null>(null)

function readStoredId(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function writeStoredId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(KEY, id)
    else window.localStorage.removeItem(KEY)
  } catch {
    // Session just won't survive a reload.
  }
}

/** Local stand-in for real auth until there is a backend (ADR 0005). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileId] = useState<string | null>(readStoredId)
  const profiles = useQuery({ queryKey: ['profiles'], queryFn: () => repo.listProfiles() })

  const value: SessionState = {
    profile: profiles.data?.find((p) => p.id === profileId) ?? null,
    loading: profiles.isPending,
    signIn: (id) => {
      writeStoredId(id)
      setProfileId(id)
    },
    signOut: () => {
      writeStoredId(null)
      setProfileId(null)
    },
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
