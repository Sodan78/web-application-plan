import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from './session'

export function RequireAuth() {
  const { profile, loading } = useSession()
  const location = useLocation()

  if (loading) return null
  if (!profile) return <Navigate to="/sign-in" replace state={{ from: location }} />
  return <Outlet />
}
