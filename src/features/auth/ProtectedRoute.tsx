import { useState, useEffect } from 'react'
import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { UserRole } from '../../lib/types'

interface ProtectedRouteProps {
  roles?: UserRole[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [tookTooLong, setTookTooLong] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setTookTooLong(true)
    }, 4000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-bg-main p-4 text-center">
        <div className="size-9 animate-spin rounded-full border-4 border-border border-t-brand-600 mb-4" />
        <p className="text-sm font-medium text-text">Loading ClassBank...</p>
        {tookTooLong && (
          <div className="mt-4 animate-in fade-in space-y-2">
            <p className="text-xs text-muted">Connecting to your account is taking longer than usual.</p>
            <Link
              to="/login"
              className="inline-block px-4 py-2 rounded-btn bg-brand-600 text-white text-xs font-semibold shadow-sm hover:bg-brand-700 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        )}
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
