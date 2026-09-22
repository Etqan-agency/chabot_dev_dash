import { createContext } from 'react'
import type { User } from '@/types/api'

export interface AuthContextValue {
  user: User | null
  /** True while the initial session check (token -> /users/me) is in flight. */
  initializing: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
