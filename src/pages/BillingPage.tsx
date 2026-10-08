import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertTriangle, BadgeCheck, Check, Coins, CreditCard, History, Info } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuotaBar } from '@/components/QuotaBar'
import { plansApi, subscriptionsApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { formatDate, fullNumber, pointsNumber, usd } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useI18n } from '@/hooks/useI18n'

/** Operation kinds a points charge can belong to (filterable in the history). */
const POINT_KINDS = ['chat', 'document', 'knowledge', 'crawl', 'api_sync', 'translation'] as const

/**
 * Billing & plans: current plan + points balance, the active plan catalog
 * and the points history. Billing is manual — the admin assigns and renews
 * plans, so there is no checkout here.
 */
export default function BillingPage() {
  const { t } = useI18n()

  const mySub = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsApi.mine,
    retry: false,
  })
  const plans = useQuery({
    queryKey: ['plans', 'catalog'],
    queryFn: () => plansApi.list({ ordering: 'sort_order' }),
  })

  const sub = mySub.data
  const pts = sub?.points
  const currentPlanId = sub?.subscription?.plan?.id
  const currentPlanName = sub?.subscription?.plan?.name
  const activePlans = (plans.data?.results ?? []).filter((p) => p.is_active)
  // Stopped until the admin renews: period over, or fewer than 1 point left.
  const stopReason =
    sub?.renewal_reason ?? (pts && !pts.exempt && pts.exhausted ? 'points_exhausted' : null)

  return (
    <div>
      <PageHeader title={t('billing.title')} description={t('billing.subtitle')} />

      {mySub.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-7" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {stopReason && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertTriangle className="size-4 shrink-0" />
              {t(stopReason === 'expired' ? 'points.expired' : 'points.exhausted')}
            </div>
          )}

          {/* Current plan + points */}
          {sub && pts && (
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('billing.current.title')}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <BadgeCheck className="size-5 text-brand-500" />
                    <span className="text-xl font-semibold text-fg">
                      {sub.on_free_tier || !sub.subscription
                        ? t('billing.current.freeTier')
                        : sub.subscription.plan.name}
                    </span>
                    {sub.subscription?.status && (
                      <Badge tone={sub.subscription.is_current ? 'success' : 'neutral'} dot>
                        {sub.subscription.status}
                      </Badge>
                    )}
                  </div>
                  {sub.subscription?.current_period_end && (
                    <p className="mt-1 text-sm text-muted">
                      {t(
                        sub.subscription.is_current
                          ? 'billing.current.renews'
                          : 'billing.current.expires',
                        { date: formatDate(sub.subscription.current_period_end) },
                      )}
                    </p>
                  )}
                  {sub.on_free_tier && !pts.exempt && (
                    <p className="mt-1 text-sm text-muted">
                      {t('points.freeTierNote', { n: fullNumber(pts.allowance) })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                    <Coins className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-fg">
                      {pts.exempt
                        ? t('points.unlimited')
                        : t('points.ofAllowance', {
                            n: pointsNumber(pts.balance),
                            total: fullNumber(pts.allowance),
                          })}
                    </p>
                    <p className="text-xs text-muted">
                      {pts.exempt
                        ? t('points.exemptNote')
                        : t('points.used', { n: pointsNumber(pts.used) })}
                    </p>
                  </div>
                </div>
              </div>

              {!pts.exempt && pts.allowance > 0 && (
                <div className="mt-5 border-t border-border pt-5">
                  <QuotaBar
                    label={t('points.title')}
                    used={pts.used}
                    max={pts.allowance}
                    formatValue={pointsNumber}
                    unlimitedLabel={t('points.unlimited')}
                  />
                  <p className="mt-2 text-xs text-muted">{t('points.explainer')}</p>
                </div>
              )}

              {(sub.usage.documents_limit != null || sub.usage.storage_mb_limit != null) && (
                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                  <QuotaBar
                    label={t('billing.usage.documents')}
                    used={sub.usage.documents_used ?? 0}
                    max={sub.usage.documents_limit ?? 0}
                    unlimitedLabel={t('points.unlimited')}
                  />
                  <QuotaBar
                    label={t('billing.usage.storage')}
                    used={sub.usage.storage_mb_used ?? 0}
                    max={sub.usage.storage_mb_limit ?? 0}
                    unit=" MB"
                    unlimitedLabel={t('points.unlimited')}
                  />
                </div>
              )}
            </Card>
          )}
          {mySub.isError && (
            <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertTriangle className="size-4 shrink-0" />
              {t('billing.loadError')}: {getApiErrorMessage(mySub.error)}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-steel-500/30 bg-steel-500/5 px-4 py-3 text-sm text-steel-600 dark:text-steel-300">
            <Info className="mt-0.5 size-4 shrink-0" />
            {t('billing.manualNote')}
          </div>

          {/* Plan catalog */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-fg">{t('billing.plans.title')}</h2>
            {plans.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="size-6" />
              </div>
            ) : plans.isError ? (
              <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                <AlertTriangle className="size-4 shrink-0" />
                {getApiErrorMessage(plans.error)}
              </div>
            ) : activePlans.length === 0 ? (
              <EmptyState icon={CreditCard} title={t('billing.plans.empty')} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {activePlans.map((plan) => {
                  const isCurrent =
                    plan.id === currentPlanId ||
                    (!!currentPlanName && plan.name === currentPlanName)
                  return (
                    <Card
                      key={plan.id}
                      className={cn(
                        'flex flex-col p-6',
                        isCurrent && 'border-brand-400/60 ring-1 ring-brand-400/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-fg">{plan.name}</h3>
                        {isCurrent && (
                          <Badge tone="brand">{t('billing.plans.current')}</Badge>
                        )}
                      </div>
                      <p className="mt-2">
                        <span className="text-3xl font-bold text-fg">
                          {usd(Number(plan.price_usd) || 0)}
                        </span>
                        <span className="text-sm text-muted"> {t('billing.plans.perMonth')}</span>
                      </p>
                      {plan.description && (
                        <p className="mt-2 text-sm text-muted">{plan.description}</p>
                      )}

                      <ul className="mt-4 flex flex-col gap-2 text-sm text-fg">
                        <Feature>
                          {t('billing.plans.points', { n: fullNumber(plan.points ?? 0) })}
                        </Feature>
                        <Feature>
                          {t('billing.plans.documents', {
                            n: plan.max_documents > 0 ? fullNumber(plan.max_documents) : '∞',
                          })}
                        </Feature>
                        <Feature>
                          {t('billing.plans.storage', {
                            n: plan.max_total_mb > 0 ? fullNumber(plan.max_total_mb) : '∞',
                          })}
                        </Feature>
                        {plan.allow_api_sync && <Feature>{t('billing.plans.apiSync')}</Feature>}
                      </ul>

                      <div className="mt-auto pt-5">
                        {isCurrent ? (
                          <Button variant="outline" className="w-full" disabled>
                            <Check className="size-4" /> {t('billing.plans.current')}
                          </Button>
                        ) : (
                          <p className="rounded-lg border border-border bg-surface2 px-3 py-2 text-center text-xs text-muted">
                            {t('billing.plans.contactAdmin')}
                          </p>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          <PointsHistory />
        </div>
      )}
    </div>
  )
}

/** Paged list of points charges (GET /points-history/), newest first. */
function PointsHistory() {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['points-history', { page, kind }],
    queryFn: () => subscriptionsApi.pointsHistory({ page, kind: kind || undefined }),
    placeholderData: keepPreviousData,
  })
  const rows = data?.results ?? []

  const kindLabel = (k: string) => {
    const key = `points.kind.${k}`
    const label = t(key)
    return label === key ? k : label
  }
  const kindOptions = [
    { value: '', label: t('points.history.allKinds') },
    ...POINT_KINDS.map((k) => ({ value: k, label: kindLabel(k) })),
  ]

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
            <History className="size-5 text-muted" /> {t('points.history.title')}
          </h2>
          <p className="text-sm text-muted">{t('points.history.desc')}</p>
        </div>
        <div className="w-52">
          <Select
            options={kindOptions}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value)
              setPage(1)
            }}
            aria-label={t('points.history.col.kind')}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-6 text-sm text-danger">
            <AlertTriangle className="size-5 shrink-0" />
            <div>
              <p className="font-medium">{t('points.history.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title={t('points.history.empty')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('points.history.col.date')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('points.history.col.kind')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('points.history.col.model')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('points.history.col.tokens')}
                  </th>
                  <th className="px-5 py-3 text-end font-semibold">
                    {t('points.history.col.points')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {formatDate(r.created_at)}{' '}
                      <span className="text-faint">
                        {new Date(r.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-fg">{kindLabel(r.kind)}</td>
                    <td className="px-5 py-3 text-muted">
                      <bdi dir="ltr">{r.model || '—'}</bdi>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">
                      <bdi dir="ltr">
                        {fullNumber(r.tokens_in ?? 0)} / {fullNumber(r.tokens_out ?? 0)}
                      </bdi>
                    </td>
                    <td className="px-5 py-3 text-end font-medium tabular-nums text-fg">
                      {pointsNumber(Number(r.points) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 text-sm text-muted">
            <span className="me-auto tabular-nums">
              {t('common.page')} {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.next}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </Button>
          </div>
        )}
      </Card>
    </section>
  )
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-4 shrink-0 text-success" />
      <span>{children}</span>
    </li>
  )
}
