import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PlanFormDialog } from '@/components/admin/PlanFormDialog'
import { plansApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { compactNumber, usd } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useI18n } from '@/hooks/useI18n'
import type { Plan } from '@/types/api'

export default function PlansPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [toDelete, setToDelete] = useState<Plan | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['plans', { ordering: 'sort_order' }],
    queryFn: () => plansApi.list({ ordering: 'sort_order' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => plansApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plans'] })
      setToDelete(null)
    },
  })

  const plans = data?.results ?? []
  const qty = (n: number) => (n === 0 ? t('common.unlimited') : compactNumber(n))

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(plan: Plan) {
    setEditing(plan)
    setFormOpen(true)
  }

  return (
    <div>
      <PageHeader
        title={t('admin.plans.title')}
        description={t('admin.plans.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> {t('admin.plans.create')}
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
              <p className="font-medium">{t('admin.plans.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t('admin.plans.empty.title')}
            description={t('admin.plans.empty.desc')}
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> {t('admin.plans.create')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.plans.col.name')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.plans.col.price')}</th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.plans.col.questions')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.plans.col.limits')}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.plans.col.status')}
                  </th>
                  <th className="px-5 py-3 text-end font-semibold">{t('admin.plans.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-fg">{p.name}</p>
                      {p.description && (
                        <p className="truncate text-xs text-muted">{p.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap font-medium text-fg">
                      {usd(Number(p.price_usd))}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">
                      {qty(p.questions ?? p.monthly_questions ?? 0)}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">
                      {t('admin.plans.docsShort', { n: p.max_documents })} ·{' '}
                      {t('admin.plans.mbShort', { n: p.max_total_mb })}
                      {p.allow_api_sync && <> · {t('admin.plans.f.allowApiSync')}</>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={p.is_active ? 'success' : 'neutral'} dot>
                        {p.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconAction label={t('common.edit')} onClick={() => openEdit(p)}>
                          <Pencil className="size-4" />
                        </IconAction>
                        <IconAction
                          label={t('common.delete')}
                          onClick={() => setToDelete(p)}
                          className="text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="size-4" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PlanFormDialog open={formOpen} plan={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!toDelete}
        title={t('admin.plans.delete.title')}
        message={t('admin.plans.delete.message', { name: toDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

function IconAction({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'rounded-lg p-2 text-muted transition-colors hover:bg-surface2',
        className,
      )}
    >
      {children}
    </button>
  )
}
