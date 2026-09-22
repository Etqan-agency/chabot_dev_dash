/**
 * Token persistence. Access/refresh JWTs are stored in localStorage so a
 * session survives page reloads. A small event bus lets the auth layer react
 * to forced logouts triggered from the axios refresh interceptor.
 */

const ACCESS_KEY = 'cb.access'
const REFRESH_KEY = 'cb.refresh'

export const tokenStore = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

const LOGOUT_EVENT = 'cb:force-logout'

/** Emitted by the API layer when refresh fails and the session is dead. */
export function emitForceLogout(): void {
  window.dispatchEvent(new CustomEvent(LOGOUT_EVENT))
}

export function onForceLogout(handler: () => void): () => void {
  window.addEventListener(LOGOUT_EVENT, handler)
  return () => window.removeEventListener(LOGOUT_EVENT, handler)
}
