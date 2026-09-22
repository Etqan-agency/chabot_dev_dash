import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { FullPageSpinner } from '@/components/ui/Spinner'

/** Gate for authenticated routes. Optionally restrict to admins. */
export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <FullPageSpinner />

  if (!isAuthenticated) {
    // Fresh visitors landing on the site root see the marketing page; deep
    // links go to login so they return to their target after signing in.
    if (location.pathname === '/') return <Navigate to="/home" replace />
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
