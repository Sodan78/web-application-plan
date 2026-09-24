import { Navigate, Outlet } from 'react-router-dom'
import { useHasConsent } from '@/features/couple/hooks'

/** Every signed-in route except /consent needs consent to store reflections (AC-1.1). */
export function RequireConsent() {
  const { data: hasConsent, isPending } = useHasConsent('store_reflections')
  if (isPending) return null
  if (!hasConsent) return <Navigate to="/consent" replace />
  return <Outlet />
}
