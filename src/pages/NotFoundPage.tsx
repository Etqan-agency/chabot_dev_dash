import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/hooks/useI18n'

export default function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg text-center">
      <p className="text-6xl font-semibold text-brand-500">404</p>
      <h1 className="mt-2 text-xl font-semibold text-fg">{t('notFound.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('notFound.desc')}</p>
      <Link to="/" className="mt-6">
        <Button>{t('notFound.back')}</Button>
      </Link>
    </div>
  )
}
