import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Coins,
  CreditCard,
  MessageCircleQuestion,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuotaBar } from '@/components/QuotaBar'
import { plansApi, subscriptionsApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { onPaddleEvent, openPaddleCheckout, paddleConfigured } from '@/lib/paddle'
import { formatDate, fullNumber, usd } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import type { Plan } from '@/types/api'

/**
 * Billing & plans (FRONTEND_API.md §7): current plan + credits, the active
 * plan catalog, and self-serve upgrade via Paddle Checkout. Fulfillment is
 * async (webhook) — after checkout completes we re-fetch /my-subscription/.
 */
export default function BillingPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [checkoutError, setCheckoutError] = useState(false)
  const [fulfilling, setFulfilling] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const mySub = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsApi.mine,
    retry: false,
  })
  const plans = useQuery({
    queryKey: ['plans', 'catalog'],
    queryFn: () => plansApi.list({ ordering: 'sort_order' }),
  })

  // Payment is fulfilled server-side via the Paddle webhook — poll the
  // subscription a couple of times after checkout closes (per the docs).
  useEffect(() => {
    onPaddleEvent((name) => {
      if (name !== 'checkout.completed') return
      setFulfilling(true)
      const refetch = () =>
        void queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      timers.current.push(setTimeout(refetch, 3000))
      timers.current.push(
        setTimeout(() => {
          refetch()
          setFulfilling(false)
        }, 9000),
      )
    })
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [queryClient])

  async function upgrade(plan: Plan) {
    if (!user || !plan.paddle_price_id) return
    setCheckoutError(false)
    try {
      await openPaddleCheckout({
        priceId: plan.paddle_price_id,
        email: user.email,
        userId: user.id,
      })
    } catch {
      setCheckoutError(true)
    }
  }

  const sub = mySub.data
  const currentPlanId = sub?.subscription?.plan?.id
  const currentPlanName = sub?.subscription?.plan?.name
  const activePlans = (plans.data?.results ?? []).filter((p) => p.is_active)

  return (
    <div>
      <PageHeader title={t('billing.title')} description={t('billing.subtitle')} />

      {mySub.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-7" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {fulfilling && (
            <div className="flex items-center gap-2 rounded-xl border border-brand-300/40 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <RefreshCw className="size-4 shrink-0 animate-spin" />
              {t('billing.checkout.processing')}
            </div>
          )}
          {checkoutError && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertTriangle className="size-4 shrink-0" />
              {t('billing.checkout.error')}
            </div>
          )}

          {/* Current plan + credits */}
          {sub && (
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('billing.current.title')}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <BadgeCheck className="size-5 text-brand-500" />
                    <span className="text-xl font-semibold text-fg">
                      {sub.quotas_paused
                        ? t('credits.unlimitedAccess')
                        : sub.on_free_tier || !sub.subscription
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
                </div>
                <div className="flex gap-6">
                  <Stat
                    icon={Coins}
                    label={t('credits.balance', { n: fullNumber(sub.credits.balance) })}
                    sub={t('credits.perQuestion', { n: sub.credits.credits_per_question })}
                  />
                  <Stat
                    icon={MessageCircleQuestion}
                    label={
                      sub.credits.exempt || sub.credits.questions_left == null
                        ? t('credits.unlimited')
                        : t('credits.questionsLeft', {
                            n: fullNumber(sub.credits.questions_left),
                          })
                    }
                    sub={t('credits.title')}
                  />
                </div>
              </div>

              {(sub.usage.documents_limit != null || sub.usage.storage_mb_limit != null) && (
                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                  <QuotaBar
                    label={t('billing.usage.documents')}
                    used={sub.usage.documents_used ?? 0}
                    max={sub.usage.documents_limit ?? 0}
                    unlimitedLabel={t('credits.unlimited')}
                  />
                  <QuotaBar
                    label={t('billing.usage.storage')}
                    used={sub.usage.storage_mb_used ?? 0}
                    max={sub.usage.storage_mb_limit ?? 0}
                    unit=" MB"
                    unlimitedLabel={t('credits.unlimited')}
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
                  const canCheckout = paddleConfigured && !!plan.paddle_price_id
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
                          {t('billing.plans.questions', {
                            n:
                              (plan.questions ?? plan.monthly_questions ?? 0) > 0
                                ? fullNumber(plan.questions ?? plan.monthly_questions ?? 0)
                                : '∞',
                          })}
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
                        ) : canCheckout ? (
                          <Button className="w-full" onClick={() => void upgrade(plan)}>
                            <Sparkles className="size-4" /> {t('billing.plans.upgrade')}
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
        </div>
      )}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  sub,
}: {
  icon: typeof Coins
  label: string
  sub: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-semibold text-fg">{label}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
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
