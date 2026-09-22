import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { featuresApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useI18n } from '@/hooks/useI18n'
import type { FeatureOverrides, User } from '@/types/api'

type TriState = 'inherit' | 'on' | 'off'

/**
 * Admin: per-user feature switches (§11). Each feature resolves staff →
 * override → plan default; the tri-state control forces on/off or clears the
 * override to inherit the default.
 */
export function UserFeaturesDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Record<string, TriState>>({})
  // Reset the draft whenever the dialog targets a different user.
  const [seedId, setSeedId] = useState<string | null>(null)
  if ((user?.id ?? null) !== seedId) {
    setSeedId(user?.id ?? null)
    setDraft({})
  }

  const catalog = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: featuresApi.catalog,
    staleTime: 5 * 60_000,
    enabled: !!user,
  })
  const current = useQuery({
    queryKey: ['user-features', user?.id],
    queryFn: () => featuresApi.forUser(user!.id),
    enabled: !!user,
  })

  const overridesNow = current.data?.overrides ?? {}
  const stateOf = (key: string): TriState =>
    draft[key] ?? (key in overridesNow ? (overridesNow[key] ? 'on' : 'off') : 'inherit')

  const save = useMutation({
    mutationFn: () => {
      // Send every catalog key: true/false force, null clears (inherit).
      const overrides: FeatureOverrides = {}
      for (const f of catalog.data ?? []) {
        const s = stateOf(f.key)
        overrides[f.key] = s === 'inherit' ? null : s === 'on'
      }
      return featuresApi.setOverrides(user!.id, overrides)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-features', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['my-features'] })
      handleClose()
    },
  })

  function handleClose() {
    setDraft({})
    save.reset()
    onClose()
  }

  const loading = catalog.isLoading || current.isLoading
  const isStaff = user?.role === 'admin'
  const dirty = Object.keys(draft).some((k) => {
    const before: TriState = k in overridesNow ? (overridesNow[k] ? 'on' : 'off') : 'inherit'
    return draft[k] !== before
  })

  return (
    <Modal
      open={!!user}
      onClose={handleClose}
      title={t('features.dialog.title', { name: user?.username ?? '' })}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={save.isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty || loading}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t('features.dialog.desc')}</p>

        {isStaff && (
          <div className="flex items-center gap-2 rounded-lg border border-steel-500/30 bg-steel-500/5 px-3 py-2 text-sm text-steel-600 dark:text-steel-300">
            <ShieldCheck className="size-4 shrink-0" />
            {t('features.staffNote')}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="size-6" />
          </div>
        ) : catalog.isError || current.isError ? (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(catalog.isError ? catalog.error : current.error)}
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {(catalog.data ?? []).map((f) => {
              const resolved = current.data?.features?.[f.key]
              const state = stateOf(f.key)
              const locked = resolved?.source === 'staff'
              return (
                <li
                  key={f.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface2/50 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                      {f.label || f.key}
                      {resolved && (
                        <Badge tone={resolved.enabled ? 'success' : 'neutral'} dot>
                          {resolved.enabled ? t('features.enabledNow') : t('features.disabledNow')}
                        </Badge>
                      )}
                      {resolved && (
                        <span className="text-[11px] font-normal uppercase tracking-wide text-faint">
                          {t(`features.source.${resolved.source}`)}
                        </span>
                      )}
                    </p>
                    {f.description && <p className="mt-0.5 text-xs text-muted">{f.description}</p>}
                  </div>

                  <div
                    className={cn(
                      'inline-flex gap-0.5 rounded-lg border border-border bg-surface p-0.5',
                      locked && 'pointer-events-none opacity-50',
                    )}
                  >
                    {(
                      [
                        ['inherit', 'features.state.inherit'],
                        ['on', 'features.state.on'],
                        ['off', 'features.state.off'],
                      ] as const
                    ).map(([s, key]) => (
                      <button
                        key={s}
                        onClick={() => setDraft((d) => ({ ...d, [f.key]: s }))}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                          state === s
                            ? s === 'on'
                              ? 'bg-success/15 text-success'
                              : s === 'off'
                                ? 'bg-danger/10 text-danger'
                                : 'bg-surface2 text-fg'
                            : 'text-muted hover:text-fg',
                        )}
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {save.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(save.error)}
          </div>
        )}
      </div>
    </Modal>
  )
}
