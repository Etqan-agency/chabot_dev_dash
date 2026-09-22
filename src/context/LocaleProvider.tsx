import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dictionaries, type Lang } from '@/i18n/translations'
import { LocaleContext, type Dir } from './locale-context'

const STORAGE_KEY = 'cb.lang'
const RTL_LANGS: Lang[] = ['ar']

function getInitialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'ar') return stored
  return navigator.language?.startsWith('ar') ? 'ar' : 'en'
}

function dirFor(lang: Lang): Dir {
  return RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang)
  const dir = dirFor(lang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang, dir])

  const setLang = useCallback((next: Lang) => setLangState(next), [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template = dictionaries[lang][key] ?? dictionaries.en[key] ?? key
      if (!vars) return template
      return template.replace(/\{(\w+)\}/g, (_, name: string) =>
        name in vars ? String(vars[name]) : `{${name}}`,
      )
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, dir, setLang, t }), [lang, dir, setLang, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
