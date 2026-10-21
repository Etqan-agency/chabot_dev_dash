import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Gauge, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { QuotaBar } from '@/components/QuotaBar'
import { analyticsApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { compactNumber, fullNumber, ms, percent, usd } from '@/lib/format'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/hooks/useAuth'
import type { UsageTotals } from '@/types/api'

export default function AnalyticsPage() {
  const { t } = useI18n()
  const { isAdmin } = useAuth()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['usage'],
    queryFn: analyticsApi.usage,
  })

  const metrics: { label: string; fmt: (u: UsageTotals) => string }[] = [
    { label: t('analytics.metric.requests'), fmt: (u) => fullNumber(u.requests) },
    { label: t('analytics.metric.tokensIn'), fmt: (u) => compactNumber(u.tokens_in) },
    { label: t('analytics.metric.tokensOut'), fmt: (u) => compactNumber(u.tokens_out) },
    { label: t('analytics.metric.totalTokens'), fmt: (u) => compactNumber(u.total_tokens) },
    { label: t('analytics.metric.cost'), fmt: (u) => usd(u.cost_usd) },
    { label: t('analytics.metric.avgResponse'), fmt: (u) => (u.requests ? ms(u.avg_response_ms) : '—') },
    { label: t('analytics.metric.confident'), fmt: (u) => (u.requests ? percent(u.confident_rate) : '—') },
  ]

  return (
    <div>
      <PageHeader
        title={t('page.analytics.title')}
        description={t('analytics.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            <RefreshCw className="size-4" /> {t('common.refresh')}
          </Button>
        }
      />

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-7" />
        </div>
      )}

      {isError && (
        <Card>
          <CardBody className="flex items-center gap-3 text-sm text-danger">
            <AlertTriangle className="size-5 shrink-0" />
            <div>
              <p className="font-medium">{t('dashboard.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {data && (
        <div className="space-y-6">
          {data.quota.is_suspended && (
            <div className="flex items-center gap-3 rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertTriangle className="size-5" />
              {t('dashboard.suspended')}
            </div>
          )}

          {/* Usage breakdown by period (admins only) */}
          {isAdmin && (
            <Card className="overflow-hidden">
              <CardHeader
                title={t('analytics.section.usage')}
                description={t('analytics.section.usageDesc')}
              />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-y border-border text-xs uppercase tracking-wide text-muted">
                      <th className="px-5 py-3 text-start font-semibold">{t('analytics.col.metric')}</th>
                      <th className="px-5 py-3 text-end font-semibold">{t('analytics.period.allTime')}</th>
                      <th className="px-5 py-3 text-end font-semibold">
                        {t('analytics.period.thisMonth')}
                      </th>
                      <th className="px-5 py-3 text-end font-semibold">{t('analytics.period.today')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => (
                      <tr key={m.label} className="border-b border-border/60 last:border-0">
                        <td className="px-5 py-3 font-medium text-fg">{m.label}</td>
                        <td className="px-5 py-3 text-end tabular-nums text-muted">{m.fmt(data.totals)}</td>
                        <td className="px-5 py-3 text-end tabular-nums text-muted">
                          {m.fmt(data.this_month)}
                        </td>
                        <td className="px-5 py-3 text-end tabular-nums text-muted">{m.fmt(data.today)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Quota & limits */}
          <Card>
            <CardHeader
              title={t('dashboard.quota.title')}
              description={t('dashboard.quota.subtitle')}
            />
            <CardBody className="space-y-5">
              <QuotaBar
                label={t('dashboard.quota.documents')}
                used={data.quota.documents_used}
                max={data.quota.max_documents}
                unlimitedLabel={t('dashboard.quota.unlimited')}
              />
              <QuotaBar
                label={t('dashboard.quota.storage')}
                used={data.quota.storage_mb_used}
                max={data.quota.max_total_mb}
                unit=" MB"
                unlimitedLabel={t('dashboard.quota.unlimited')}
                formatValue={(n) => n.toFixed(1)}
              />
              <QuotaBar
                label={t('dashboard.quota.tokens')}
                used={data.quota.tokens_this_month}
                max={data.quota.monthly_token_cap}
                unlimitedLabel={t('dashboard.quota.unlimited')}
                formatValue={compactNumber}
              />
              <div className="flex items-center gap-2 rounded-lg bg-surface2 px-3 py-2 text-sm text-muted">
                <Gauge className="size-4 text-steel-500" />
                {t('dashboard.quota.rate', { n: data.quota.max_requests_per_min })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
