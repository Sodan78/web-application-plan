import { LogOut, Settings } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { ButtonLink } from '@/components/ButtonLink'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { useHasConsent } from '@/features/couple/hooks'

export function AppLayout() {
  const { profile, signOut } = useSession()
  const { data: hasConsent } = useHasConsent('store_reflections')

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-8">
          <Link to="/" aria-label="Couples Unite, home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Account">
            {profile && <span className="mr-2 hidden text-sm text-muted-foreground sm:inline">{profile.displayName}</span>}
            {hasConsent && (
              <ButtonLink variant="ghost" size="sm" to="/settings">
                <Settings aria-hidden="true" />
                Settings
              </ButtonLink>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
