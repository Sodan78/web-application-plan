import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from './session'

export function RequireAuth() {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) return null
  if (!session) return <Navigate to="/welcome" replace state={{ from: location }} />
  return <Outlet />
}
