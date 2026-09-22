import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Gauge, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { analyticsApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { compactNumber, fullNumber, percent, usd } from '@/lib/format'
import { useI18n } from '@/hooks/useI18n'

export default function TenantsPage() {
  const { t } = useI18n()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['analytics', 'all'],
    queryFn: analyticsApi.usageAll,
  })

  const tenants = data?.tenants ?? []

  return (
    <div>
      <PageHeader
        title={t('admin.tenants.title')}
        description={t('admin.tenants.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            <RefreshCw className="size-4" /> {t('common.refresh')}
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="size-7" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-6 text-sm text-danger">
            <AlertTriangle className="size-5 shrink-0" />
            <div>
              <p className="font-medium">{t('admin.tenants.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </div>
        ) : tenants.length === 0 ? (
          <EmptyState
            icon={Gauge}
            title={t('admin.tenants.empty.title')}
            description={t('admin.tenants.empty.desc')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.tenants.col.tenant')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.tenants.col.requests')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.tenants.col.tokens')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.tenants.col.cost')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.tenants.col.confident')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.tenants.col.docs')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((row) => (
                  <tr
                    key={row.tenant.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-fg">{row.tenant.username}</span>
                        {row.quota.is_suspended && (
                          <Badge tone="danger">{t('admin.tenants.suspended')}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">
                      {fullNumber(row.totals.requests)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">
                      {compactNumber(row.totals.total_tokens)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">{usd(row.totals.cost_usd)}</td>
                    <td className="px-5 py-3 tabular-nums text-muted">
                      {percent(row.totals.confident_rate)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">
                      {row.quota.documents_used} / {row.quota.max_documents}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
