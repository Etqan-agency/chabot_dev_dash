import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BadgeCheck, Check, Coins, Plus, RotateCcw, X } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { plansApi, subscriptionsApi, usersApi } from '@/lib/endpoints'
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api'
import { formatDate, fullNumber, pointsNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useI18n } from '@/hooks/useI18n'
import type { Subscription } from '@/types/api'

export default function SubscriptionsPage() {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [assignOpen, setAssignOpen] = useState(false)
  const [pointsOpen, setPointsOpen] = useState(false)
  const [toRenew, setToRenew] = useState<Subscription | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['subscriptions', { page }],
    queryFn: () => subscriptionsApi.list({ page }),
    placeholderData: keepPreviousData,
  })

  const subs = data?.results ?? []

  function planName(s: Subscription) {
    return s.plan?.name ?? s.plan_name ?? '—'
  }

  return (
    <div>
      <PageHeader
        title={t('admin.subs.title')}
        description={t('admin.subs.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={() => setPointsOpen(true)}>
              <Coins className="size-4" /> {t('admin.subs.addPoints')}
            </Button>
            <Button onClick={() => setAssignOpen(true)}>
              <Plus className="size-4" /> {t('admin.subs.assign')}
            </Button>
          </>
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
              <p className="font-medium">{t('admin.subs.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </div>
        ) : subs.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title={t('admin.subs.empty.title')}
            description={t('admin.subs.empty.desc')}
            action={
              <Button onClick={() => setAssignOpen(true)}>
                <Plus className="size-4" /> {t('admin.subs.assign')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.subs.col.user')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.subs.col.plan')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.subs.col.status')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.subs.col.points')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.subs.col.period')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.subs.col.renew')}</th>
                  <th className="px-5 py-3 text-end font-semibold">{t('admin.subs.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                  >
                    <td className="px-5 py-3 font-medium text-fg">{s.username ?? '—'}</td>
                    <td className="px-5 py-3 text-muted">{planName(s)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={s.is_current ? 'success' : 'neutral'} dot>
                          {s.status ?? (s.is_current ? t('common.active') : t('common.inactive'))}
                        </Badge>
                        {s.renewal_reason && <ReasonBadge reason={s.renewal_reason} />}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <PointsCell
                        balance={s.points_balance}
                        allowance={s.points_allowance ?? s.plan?.points}
                      />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {s.current_period_end ? formatDate(s.current_period_end) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {s.auto_renew ? (
                        <Check className="size-4 text-success" />
                      ) : (
                        <X className="size-4 text-faint" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-end">
                      {/* Renewable only once expired or out of points (the API 409s otherwise). */}
                      {s.can_renew && (
                        <Button size="sm" onClick={() => setToRenew(s)}>
                          <RotateCcw className="size-4" /> {t('admin.subs.renew')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && subs.length > 0 && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 text-sm text-muted">
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

      <AssignDialog open={assignOpen} onClose={() => setAssignOpen(false)} />
      <AddPointsDialog open={pointsOpen} onClose={() => setPointsOpen(false)} />
      <RenewDialog subscription={toRenew} onClose={() => setToRenew(null)} />
    </div>
  )
}

/** Why the subscription needs renewing: expired / out of points. */
function ReasonBadge({ reason }: { reason: 'expired' | 'points_exhausted' }) {
  const { t } = useI18n()
  return (
    <Badge tone={reason === 'expired' ? 'warning' : 'danger'}>
      {t(`admin.subs.reason.${reason}`)}
    </Badge>
  )
}

/** Points balance vs the plan's allowance, with a small bar. */
function PointsCell({ balance, allowance }: { balance?: number; allowance?: number }) {
  if (balance == null) return <span className="text-faint">—</span>
  const max = allowance ?? 0
  const ratio = max > 0 ? Math.min(Math.max(balance / max, 0), 1) : 0
  return (
    <div className="min-w-[140px]">
      <p className="whitespace-nowrap tabular-nums text-fg">
        {pointsNumber(balance)}
        {max > 0 && <span className="text-muted"> / {fullNumber(max)}</span>}
      </p>
      {max > 0 && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
          <div
            className={cn(
              'h-full rounded-full',
              ratio <= 0.1 ? 'bg-danger' : ratio <= 0.3 ? 'bg-brand-500' : 'bg-success',
            )}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

/** Admin renewal: restarts the period now and resets points to the plan's allowance. */
function RenewDialog({
  subscription,
  onClose,
}: {
  subscription: Subscription | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [duration, setDuration] = useState('')

  const renew = useMutation({
    mutationFn: (id: string) => {
      const days = Math.round(Number(duration))
      return subscriptionsApi.renew(id, days > 0 ? { duration_days: days } : {})
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      void queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      handleClose()
    },
  })

  function handleClose() {
    setDuration('')
    renew.reset()
    onClose()
  }

  const s = subscription
  const allowance = s?.points_allowance ?? s?.plan?.points ?? 0

  return (
    <Modal
      open={!!s}
      onClose={handleClose}
      title={t('admin.subs.renew.title')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={renew.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => s && renew.mutate(s.id)}
            disabled={duration.trim() !== '' && !(Math.round(Number(duration)) > 0)}
            loading={renew.isPending}
          >
            <RotateCcw className="size-4" /> {t('admin.subs.renew')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {s?.renewal_reason && (
          <div>
            <ReasonBadge reason={s.renewal_reason} />
          </div>
        )}
        <p className="text-sm text-muted">
          {t('admin.subs.renew.message', {
            plan: s?.plan?.name ?? s?.plan_name ?? '—',
            user: s?.username ?? '—',
            n: fullNumber(allowance),
          })}
        </p>
        <Input
          label={t('admin.subs.renew.duration')}
          type="number"
          min={1}
          step={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          hint={t('admin.subs.renew.durationHint')}
        />
        {renew.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorStatus(renew.error) === 409
              ? t('admin.subs.renew.notRenewable')
              : getApiErrorMessage(renew.error)}
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Manual points correction: adds whole points to a tenant's current balance. */
function AddPointsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('100')

  const { data: users } = useQuery({
    queryKey: ['users', { page: 1, ordering: 'username' }],
    queryFn: () => usersApi.list({ page: 1, ordering: 'username' }),
    enabled: open,
  })

  const add = useMutation({
    mutationFn: () =>
      subscriptionsApi.addPoints({ user: userId, amount: Math.round(Number(amount)) || 0 }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      void queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      handleClose()
    },
  })

  function handleClose() {
    setUserId('')
    setAmount('100')
    add.reset()
    onClose()
  }

  const userOptions = [
    { value: '', label: t('admin.subs.selectUser') },
    ...(users?.results ?? []).map((u) => ({ value: u.id, label: `${u.username} · ${u.email}` })),
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('admin.subs.addPoints.title')}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={add.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => add.mutate()}
            disabled={!userId || !(Math.round(Number(amount)) > 0)}
            loading={add.isPending}
          >
            {t('admin.subs.addPoints.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t('admin.subs.assign.user')}>
          <Select options={userOptions} value={userId} onChange={(e) => setUserId(e.target.value)} />
        </Field>
        <Input
          label={t('admin.subs.addPoints.amount')}
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          hint={t('admin.subs.addPoints.hint')}
        />
        {add.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(add.error)}
          </div>
        )}
      </div>
    </Modal>
  )
}

function AssignDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [planId, setPlanId] = useState('')
  const [duration, setDuration] = useState('30')
  const [autoRenew, setAutoRenew] = useState(true)

  const { data: users } = useQuery({
    queryKey: ['users', { page: 1, ordering: 'username' }],
    queryFn: () => usersApi.list({ page: 1, ordering: 'username' }),
    enabled: open,
  })
  const { data: plans } = useQuery({
    queryKey: ['plans', { ordering: 'sort_order' }],
    queryFn: () => plansApi.list({ ordering: 'sort_order' }),
    enabled: open,
  })

  const assign = useMutation({
    mutationFn: () =>
      subscriptionsApi.assign({
        user: userId,
        plan: planId,
        duration_days: Number(duration) || 30,
        auto_renew: autoRenew,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      handleClose()
    },
  })

  function handleClose() {
    setUserId('')
    setPlanId('')
    setDuration('30')
    setAutoRenew(true)
    assign.reset()
    onClose()
  }

  const userOptions = [
    { value: '', label: t('admin.subs.selectUser') },
    ...(users?.results ?? []).map((u) => ({ value: u.id, label: `${u.username} · ${u.email}` })),
  ]
  const planOptions = [
    { value: '', label: t('admin.subs.selectPlan') },
    ...(plans?.results ?? []).map((p) => ({ value: p.id, label: `${p.name} · ${p.price_usd}` })),
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('admin.subs.assign.title')}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={assign.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => assign.mutate()}
            disabled={!userId || !planId}
            loading={assign.isPending}
          >
            {t('admin.subs.assign.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t('admin.subs.assign.user')}>
          <Select options={userOptions} value={userId} onChange={(e) => setUserId(e.target.value)} />
        </Field>
        <Field label={t('admin.subs.assign.plan')}>
          <Select options={planOptions} value={planId} onChange={(e) => setPlanId(e.target.value)} />
        </Field>
        <Input
          label={t('admin.subs.assign.duration')}
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.target.checked)}
            className="size-4 accent-brand-500"
          />
          <span className="text-sm font-medium text-fg">{t('admin.subs.assign.autoRenew')}</span>
        </label>

        {assign.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(assign.error)}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-fg">{label}</label>
      {children}
    </div>
  )
}
