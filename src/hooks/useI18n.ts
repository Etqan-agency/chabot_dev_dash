import { useContext } from 'react'
import { LocaleContext } from '@/context/locale-context'

export function useI18n() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useI18n must be used within a LocaleProvider')
  return ctx
}
