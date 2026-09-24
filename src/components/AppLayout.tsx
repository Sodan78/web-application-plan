import { Link, Outlet } from 'react-router-dom'
import { ButtonLink } from '@/components/ButtonLink'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { useHasConsent } from '@/features/couple/hooks'

export function AppLayout() {
  const { profile, signOut } = useSession()
  const { data: hasConsent } = useHasConsent('store_reflections')

  return (
    <div className="mx-auto grid max-w-2xl gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="text-xl font-semibold">
          Couples Unite
        </Link>
        <nav className="flex items-center gap-2" aria-label="Account">
          <span className="text-sm text-muted-foreground">{profile?.displayName}</span>
          {hasConsent && (
            <ButtonLink variant="ghost" size="sm" to="/settings">
              Settings
            </ButtonLink>
          )}
          <Button variant="outline" size="sm" onClick={signOut}>
            Switch profile
          </Button>
        </nav>
      </header>
      <main className="grid gap-6">
        <Outlet />
      </main>
    </div>
  )
}
