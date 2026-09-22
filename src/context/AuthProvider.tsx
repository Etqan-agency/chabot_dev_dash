import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@/types/api'
import { authApi, usersApi } from '@/lib/endpoints'
import { emitForceLogout, onForceLogout, tokenStore } from '@/lib/tokens'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await usersApi.me()
    setUser(me)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const { access, refresh, user: loggedIn } = await authApi.login(username, password)
    tokenStore.set(access, refresh)
    setUser(loggedIn)
  }, [])

  // Restore a session on first load if we have a stored token.
  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (!tokenStore.getAccess()) {
        setInitializing(false)
        return
      }
      try {
        const me = await usersApi.me()
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) {
          tokenStore.clear()
          setUser(null)
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  // The API layer emits this when token refresh fails mid-session.
  useEffect(() => onForceLogout(() => setUser(null)), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      login,
      logout: () => {
        logout()
        // keep any other tabs/components in sync
        emitForceLogout()
      },
      refreshUser,
    }),
    [user, initializing, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
