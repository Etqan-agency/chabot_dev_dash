import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { plansApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { fullNumber } from '@/lib/format'
import { useI18n } from '@/hooks/useI18n'
import type { Plan, PlanInput } from '@/types/api'

// 25% of the price covers OpenAI cost and 1 point = $0.001 → price × 250 points.
const POINTS_PER_USD = 250

function suggestedPoints(price: string): number {
  const usd = Number(price)
  return Number.isFinite(usd) && usd > 0 ? Math.round(usd * POINTS_PER_USD) : 0
}

// Editable fields only. Billing is manual, so the Paddle price id isn't edited here.
function toForm(plan?: Plan | null): Record<string, string> {
  return {
    name: plan?.name ?? '',
    price_usd: plan?.price_usd ?? '0.00',
    points: String(plan?.points ?? 0),
    max_documents: String(plan?.max_documents ?? 25),
    max_total_mb: String(plan?.max_total_mb ?? 50),
    is_active: plan?.is_active === false ? '' : 'on',
    allow_api_sync: plan?.allow_api_sync ? 'on' : '',
  }
}

/** Create or edit a plan. Pass `plan` to edit, omit (or null) to create. */
export function PlanFormDialog({
  open,
  plan,
  onClose,
}: {
  open: boolean
  plan?: Plan | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Record<string, string>>(() => toForm(plan))
  // On a new plan, points follow the price suggestion until the admin edits them.
  const [pointsTouched, setPointsTouched] = useState(!!plan)

  useEffect(() => {
    if (!open) return
    setForm(toForm(plan))
    setPointsTouched(!!plan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan?.id])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setPrice(value: string) {
    setForm((f) => ({
      ...f,
      price_usd: value,
      ...(pointsTouched ? {} : { points: String(suggestedPoints(value)) }),
    }))
  }

  const suggested = suggestedPoints(form.price_usd)

  const save = useMutation({
    mutationFn: () => {
      const body: PlanInput = {
        name: form.name.trim(),
        price_usd: form.price_usd.trim() || '0.00',
        points: Math.max(0, Math.round(Number(form.points) || 0)),
        max_documents: Number(form.max_documents) || 0,
        max_total_mb: Number(form.max_total_mb) || 0,
        is_active: form.is_active === 'on',
        allow_api_sync: form.allow_api_sync === 'on',
      }
      return plan ? plansApi.update(plan.id, body) : plansApi.create(body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plans'] })
      onClose()
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? t('admin.plans.edit.title') : t('admin.plans.create.title')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="plan-form" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('admin.plans.f.name')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            autoFocus
          />
          <Input
            label={t('admin.plans.f.price')}
            value={form.price_usd}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Input
            label={t('admin.plans.f.points')}
            type="number"
            min={0}
            step={1}
            value={form.points}
            onChange={(e) => {
              setPointsTouched(true)
              set('points', e.target.value)
            }}
            hint={t('admin.plans.f.pointsHint', { n: fullNumber(suggested) })}
          />
          {suggested > 0 && String(suggested) !== form.points && (
            <button
              type="button"
              onClick={() => set('points', String(suggested))}
              className="self-start text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              {t('admin.plans.f.useSuggested')} · {fullNumber(suggested)}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('admin.plans.f.maxDocuments')}
            type="number"
            min={0}
            value={form.max_documents}
            onChange={(e) => set('max_documents', e.target.value)}
          />
          <Input
            label={t('admin.plans.f.maxTotalMb')}
            type="number"
            min={0}
            value={form.max_total_mb}
            onChange={(e) => set('max_total_mb', e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.is_active === 'on'}
              onChange={(e) => set('is_active', e.target.checked ? 'on' : '')}
              className="size-4 accent-brand-500"
            />
            <span className="text-sm font-medium text-fg">{t('admin.plans.f.isActive')}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.allow_api_sync === 'on'}
              onChange={(e) => set('allow_api_sync', e.target.checked ? 'on' : '')}
              className="size-4 accent-brand-500"
            />
            <span className="text-sm font-medium text-fg">{t('admin.plans.f.allowApiSync')}</span>
          </label>
        </div>

        {save.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(save.error)}
          </div>
        )}
      </form>
    </Modal>
  )
}
