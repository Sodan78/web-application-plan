import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!session) return <Navigate to="/sign-in" replace state={{ from: location }} />
  return <Outlet />
}
