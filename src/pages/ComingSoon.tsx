import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { useI18n } from '@/hooks/useI18n'

/** Placeholder for feature pages built in later passes. */
export function ComingSoon({ title, description }: { title: string; description?: string }) {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Construction className="size-6" />
          </span>
          <p className="text-sm font-medium text-fg">{t('soon.title')}</p>
          <p className="max-w-sm text-sm text-muted">{t('soon.body', { title })}</p>
        </CardBody>
      </Card>
    </div>
  )
}
