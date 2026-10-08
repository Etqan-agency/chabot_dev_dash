import { lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Coins, RefreshCw, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { QuotaBar } from '@/components/QuotaBar'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
// Lazy — pulls in the markdown renderer only when the dashboard loads it.
const ChatWidget = lazy(() =>
  import('@/components/chat/ChatWidget').then((m) => ({ default: m.ChatWidget })),
)
import { analyticsApi, subscriptionsApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { fullNumber, pointsNumber } from '@/lib/format'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['usage'],
    queryFn: analyticsApi.usage,
  })

  const greeting = user?.first_name
    ? t('dashboard.welcomeName', { name: user.first_name })
    : t('dashboard.welcome')

  return (
    <div>
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle', { greeting })}
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            <RefreshCw className="size-4" /> {t('common.refresh')}
          </Button>
        }
      />

      <PointsCard />

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

          {/* Quota consumption */}
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
            </CardBody>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <QuickAction
              to="/chat"
              title={t('dashboard.action.chat.title')}
              description={t('dashboard.action.chat.desc')}
            />
            <QuickAction
              to="/documents"
              title={t('dashboard.action.docs.title')}
              description={t('dashboard.action.docs.desc')}
            />
            <QuickAction
              to="/config"
              title={t('dashboard.action.config.title')}
              description={t('dashboard.action.config.desc')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Points balance vs the plan's allowance for the tenant (hidden if unavailable). */
function PointsCard() {
  const { t } = useI18n()
  const { data } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsApi.mine,
    retry: false,
    staleTime: 60_000,
  })
  if (!data?.points) return null
  const p = data.points
  const planName = data.on_free_tier
    ? t('points.freeTier')
    : (data.subscription?.plan?.name ?? t('points.freeTier'))
  // Exempt (admin/staff) accounts are never charged points.
  const unlimited = p.exempt
  // Stopped until the admin renews: period over, or fewer than 1 point left.
  const stopped = !unlimited && (p.exhausted || data.renewal_reason != null)
  const low = !unlimited && !stopped && p.allowance > 0 && p.balance / p.allowance <= 0.1
  const ratio = p.allowance > 0 ? Math.min(Math.max(p.balance / p.allowance, 0), 1) : 0

  return (
    <Card className="mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Coins className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted">
              {t('points.title')} · {planName}
            </p>
            <p className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">
              {unlimited
                ? t('points.unlimited')
                : t('points.ofAllowance', {
                    n: pointsNumber(p.balance),
                    total: fullNumber(p.allowance),
                  })}
            </p>
            {unlimited ? (
              <p className="text-xs text-muted">{t('points.exemptNote')}</p>
            ) : (
              <>
                <div className="mt-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-surface2">
                  <div
                    className={
                      stopped || low
                        ? 'h-full rounded-full bg-danger'
                        : 'h-full rounded-full bg-success'
                    }
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {t('points.used', { n: pointsNumber(p.used) })}
                </p>
              </>
            )}
          </div>
        </div>
        {!unlimited && (
        <div className="flex flex-wrap items-center gap-3">
          {(stopped || low) && (
            <p
              className={
                stopped
                  ? 'flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger'
                  : 'flex items-center gap-2 rounded-lg border border-brand-300/40 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
              }
            >
              {stopped ? (
                <AlertTriangle className="size-4 shrink-0" />
              ) : (
                <Sparkles className="size-4 shrink-0" />
              )}
              {stopped
                ? t(data.renewal_reason === 'expired' ? 'points.expired' : 'points.exhausted')
                : t('points.lowHint')}
            </p>
          )}
          <Link
            to="/billing"
            className={
              stopped || low
                ? 'inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-navy-900 shadow-sm transition-colors hover:bg-brand-400'
                : 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg transition-colors hover:bg-surface2'
            }
          >
            <Sparkles className="size-4" /> {t('points.contactCta')}
          </Link>
        </div>
        )}
      </div>
    </Card>
  )
}

function QuickAction({
  to,
  title,
  description,
}: {
  to: string
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group rounded-card border border-border bg-surface p-5 shadow-sm shadow-navy-900/5 transition-colors hover:border-brand-300"
    >
      <p className="font-medium text-fg group-hover:text-brand-700 dark:group-hover:text-brand-400">
        {title}
      </p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </Link>
  )
}
