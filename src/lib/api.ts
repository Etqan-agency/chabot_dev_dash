/**
 * Axios client for the ChatBot API.
 *
 * Base URL is RELATIVE ('') in both dev and production so every request is
 * same-origin (/api/v1/...). A proxy then forwards it to the backend:
 * - dev: the Vite proxy (vite.config.ts).
 * - production: the Vercel rewrite (vercel.json).
 * This keeps the browser talking only to our own origin — no CORS, and it
 * bypasses ISPs that block the backend host directly. VITE_API_BASE_URL can
 * override the base if you ever want direct calls.
 *
 * Requests carry `Authorization: Bearer <access>`; a 401 triggers a single
 * refresh against /auth/refresh/ and replays queued requests.
 */
import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiErrorBody, RefreshResponse } from '@/types/api'
import { dictionaries, type Lang } from '@/i18n/translations'
import { emitForceLogout, tokenStore } from './tokens'

/** Current UI language (kept in sync by LocaleProvider via localStorage / <html lang>). */
function currentLang(): Lang {
  try {
    const stored = localStorage.getItem('cb.lang')
    if (stored === 'ar' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return document.documentElement.lang === 'ar' ? 'ar' : 'en'
}

/** Translate an error key in the active language (outside React, so no hook). */
function trError(key: string, vars?: Record<string, string>): string {
  const lang = currentLang()
  const template = dictionaries[lang][key] ?? dictionaries.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, n: string) => vars[n] ?? `{${n}}`)
}

/** Map a backend validation/detail message → a friendly localized key. */
function knownMessageKey(raw: string, field = ''): string | null {
  const m = raw.toLowerCase()
  const f = field.toLowerCase()

  if (m.includes('no active account') || m.includes('invalid credentials'))
    return 'error.invalidCredentials'
  if (m.includes('token') && (m.includes('not valid') || m.includes('invalid') || m.includes('expired')))
    return 'error.sessionExpired'
  if (m.includes('suspend')) return 'error.suspended'

  // Email / username uniqueness
  if (m.includes('already your') || (m.includes('same') && m.includes('email'))) return 'error.sameEmail'
  if (m.includes('already in use') || m.includes('already exists') || m.includes('already taken') || m.includes('is taken')) {
    if (f.includes('email') || m.includes('email')) return 'error.emailInUse'
    if (f.includes('username') || m.includes('username')) return 'error.usernameTaken'
    return 'error.alreadyInUse'
  }

  // Password validation
  if (m.includes('too common') || m.includes('too similar') || m.includes('entirely numeric'))
    return 'error.passwordCommon'
  if (m.includes('too short') || m.includes('at least')) return 'error.passwordShort'
  if (m.includes('not match') || m.includes("didn't match") || m.includes('do not match'))
    return 'error.passwordMismatch'
  if ((f.includes('old') || m.includes('old password') || m.includes('current password')) &&
      (m.includes('incorrect') || m.includes('wrong') || m.includes('not correct')))
    return 'error.wrongPassword'

  // Email verification code
  if ((m.includes('code') || f.includes('code')) && (m.includes('invalid') || m.includes('expired') || m.includes('wrong') || m.includes('incorrect')))
    return 'error.invalidCode'

  if (m.includes('this field is required') || m.includes('required')) return 'error.required'
  return null
}

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || ''

/**
 * Resolve a file/media path from the API into a **same-origin** URL so downloads
 * flow through the proxy too (e.g. "/media/…" → served via /media/* rewrite).
 * Legacy hosts served the API under a "/chatbot-api" prefix; strip it if an
 * absolute URL still carries one (the current host has no path prefix).
 */
export function resolveFileUrl(path?: string | null): string {
  if (!path) return ''
  try {
    const u = new URL(path, window.location.origin)
    return u.pathname.replace(/^\/chatbot-api(?=\/)/, '') + u.search
  } catch {
    return path
  }
}

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

/** Requests that should never carry the Authorization header or trigger refresh. */
const PUBLIC_PATHS = [
  '/api/v1/auth/login/',
  '/api/v1/auth/refresh/',
  '/api/v1/auth/verify-email/',
  '/api/v1/auth/register/',
]

function isPublic(url?: string): boolean {
  if (!url) return false
  return PUBLIC_PATHS.some((p) => url.includes(p))
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!isPublic(config.url)) {
    const access = tokenStore.getAccess()
    if (access) config.headers.set('Authorization', `Bearer ${access}`)
  }
  return config
})

// --- Single-flight refresh handling -------------------------------------------------

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStore.getRefresh()
  if (!refresh) throw new Error('No refresh token')

  // Use a bare axios call so we don't recurse through the interceptors.
  const { data } = await axios.post<RefreshResponse>(
    `${baseURL}/api/v1/auth/refresh/`,
    { refresh },
    { headers: { 'Content-Type': 'application/json' } },
  )
  tokenStore.set(data.access, data.refresh)
  return data.access
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetriableConfig | undefined
    const status = error.response?.status

    if (status === 401 && original && !original._retry && !isPublic(original.url)) {
      original._retry = true
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null
        })
        const newAccess = await refreshPromise
        original.headers.set('Authorization', `Bearer ${newAccess}`)
        return api(original)
      } catch {
        tokenStore.clear()
        emitForceLogout()
      }
    }

    return Promise.reject(error)
  },
)

/** HTTP status of an API error, or undefined (network failure / not an API error). */
export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

/**
 * Turn any API/network error into a friendly, localized message (EN/AR).
 * Maps known backend strings and HTTP statuses to translated phrases; never
 * surfaces raw HTML or untranslated server jargon.
 */
export function getApiErrorMessage(error: unknown, fallbackKey = 'error.generic'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK' || !error.response) return trError('error.network')

    const status = error.response.status
    const data = error.response.data as ApiErrorBody | string | undefined

    // Pull a raw message out of the body (detail, first field error), ignoring HTML pages.
    let raw = ''
    let field = ''
    if (typeof data === 'string') {
      if (!/<\/?(?:html|!doctype|body|h1)/i.test(data)) raw = data.trim()
    } else if (data?.detail) {
      raw = data.detail
    } else if (data && typeof data === 'object') {
      const first = Object.entries(data)[0]
      if (first) {
        field = first[0]
        raw = Array.isArray(first[1]) ? String(first[1][0]) : String(first[1])
      }
    }

    // 1) Known backend phrase → friendly localized message (never raw English).
    if (raw) {
      const key = knownMessageKey(raw, field)
      if (key) return trError(key)
    }

    // 2) Status-based friendly localized fallback.
    const byStatus: Record<number, string> = {
      402: 'error.subscriptionExpired',
      403: 'error.forbidden',
      404: 'error.notFound',
      413: 'error.quota',
      429: 'error.rateLimit',
      500: 'error.serverDown',
      502: 'error.serverDown',
      503: 'error.serverDown',
    }
    if (status in byStatus) return trError(byStatus[status])
    if (status === 401) return trError('error.sessionExpired')

    // 3) Unmapped 400 validation → a localized generic (never surface raw API text).
    if (status === 400) return trError('error.validation')
  }

  return trError(fallbackKey)
}

/** Thin typed helpers over the axios instance. */
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => api.get<T>(url, config).then((r) => r.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.post<T>(url, body, config).then((r) => r.data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.patch<T>(url, body, config).then((r) => r.data),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.put<T>(url, body, config).then((r) => r.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((r) => r.data),
}
