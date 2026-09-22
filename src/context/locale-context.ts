import { createContext } from 'react'
import type { Lang } from '@/i18n/translations'

export type Dir = 'ltr' | 'rtl'

export interface LocaleContextValue {
  lang: Lang
  dir: Dir
  setLang: (lang: Lang) => void
  /** Translate a dotted key, interpolating {vars}. Falls back to the key. */
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)
