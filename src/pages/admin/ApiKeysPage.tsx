import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Power,
  RefreshCw,
  RotateCw,
  Search,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { CopyButton } from '@/components/ui/CopyField'
import { apiKeysApi, usersApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/hooks/useI18n'
import type { ApiKey, ListParams } from '@/types/api'

export default function ApiKeysPage() {
  const { t, dir } = useI18n()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [issueOpen, setIssueOpen] = useState(false)
  const [toRegen, setToRegen] = useState<ApiKey | null>(null)
  const [toDelete, setToDelete] = useState<ApiKey | null>(null)
  const debouncedSearch = useDebounce(search)

  const params: ListParams = {
    page,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['api-keys', params],
    queryFn: () => apiKeysApi.list(params),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['api-keys'] })

  const setStatus = useMutation({
    mutationFn: (k: ApiKey) => (k.is_active ? apiKeysApi.revoke(k.id) : apiKeysApi.activate(k.id)),
    onSuccess: invalidate,
  })
  const regenerate = useMutation({
    mutationFn: (id: string) => apiKeysApi.regenerate(id),
    onSuccess: () => {
      void invalidate()
      setToRegen(null)
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => apiKeysApi.remove(id),
    onSuccess: () => {
      void invalidate()
      setToDelete(null)
    },
  })

  const keys = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div>
      <PageHeader
        title={t('admin.keys.title')}
        description={t('admin.keys.subtitle')}
        actions={
          <Button onClick={() => setIssueOpen(true)}>
            <KeyRound className="size-4" /> {t('admin.keys.issue')}
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          placeholder={t('admin.keys.search')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="ps-9"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="size-7" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-6 text-sm text-danger">
            <AlertTriangle className="size-5 shrink-0" />
            <div>
              <p className="font-medium">{t('admin.keys.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title={t('admin.keys.empty.title')}
            description={t('admin.keys.empty.desc')}
            action={
              <Button onClick={() => setIssueOpen(true)}>
                <KeyRound className="size-4" /> {t('admin.keys.issue')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.keys.col.user')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.keys.col.key')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.keys.col.status')}</th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t('admin.keys.col.lastUsed')}
                  </th>
                  <th className="px-5 py-3 text-end font-semibold">{t('admin.keys.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                  >
                    <td className="px-5 py-3 font-medium text-fg">{k.username ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-xs text-muted" dir="ltr">
                          {k.key.slice(0, 12)}…
                        </code>
                        <CopyButton value={k.key} label={t('common.copy')} />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={k.is_active ? 'success' : 'neutral'} dot>
                        {k.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {k.last_used_at ? formatDate(k.last_used_at) : t('common.never')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconAction
                          label={
                            k.is_active
                              ? t('admin.keys.action.revoke')
                              : t('admin.keys.action.activate')
                          }
                          onClick={() => setStatus.mutate(k)}
                          busy={setStatus.isPending && setStatus.variables?.id === k.id}
                          className={k.is_active ? 'text-success' : 'text-faint'}
                        >
                          <Power className="size-4" />
                        </IconAction>
                        <IconAction
                          label={t('admin.keys.action.regenerate')}
                          onClick={() => setToRegen(k)}
                        >
                          <RotateCw className="size-4" />
                        </IconAction>
                        <IconAction
                          label={t('admin.keys.action.delete')}
                          onClick={() => setToDelete(k)}
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

        {!isLoading && !isError && keys.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
            <span className="flex items-center gap-2">
              {total}
              {isFetching && <RefreshCw className="size-3.5 animate-spin text-faint" />}
            </span>
            <div className="flex items-center gap-2">
              <span>
                {t('common.page')} {page} {t('common.of')} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.previous}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <PrevIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.next}
                onClick={() => setPage((p) => p + 1)}
              >
                <NextIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <IssueKeyDialog open={issueOpen} onClose={() => setIssueOpen(false)} onIssued={invalidate} />
      <ConfirmDialog
        open={!!toRegen}
        title={t('admin.keys.regenerate.title')}
        message={t('admin.keys.regenerate.message', { name: toRegen?.username ?? '' })}
        confirmLabel={t('admin.keys.action.regenerate')}
        loading={regenerate.isPending}
        onConfirm={() => toRegen && regenerate.mutate(toRegen.id)}
        onClose={() => setToRegen(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={t('admin.keys.delete.title')}
        message={t('admin.keys.delete.message', { name: toDelete?.username ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

function IssueKeyDialog({
  open,
  onClose,
  onIssued,
}: {
  open: boolean
  onClose: () => void
  onIssued: () => void
}) {
  const { t } = useI18n()
  const [userId, setUserId] = useState('')

  const { data: users } = useQuery({
    queryKey: ['users', { page: 1, ordering: 'username' }],
    queryFn: () => usersApi.list({ page: 1, ordering: 'username' }),
    enabled: open,
  })

  const issue = useMutation({
    mutationFn: () => apiKeysApi.issue(userId),
    onSuccess: () => {
      onIssued()
      handleClose()
    },
  })

  function handleClose() {
    setUserId('')
    issue.reset()
    onClose()
  }

  const options = [
    { value: '', label: t('admin.keys.issue.placeholder') },
    ...(users?.results ?? []).map((u) => ({
      value: u.id,
      label: `${u.username} · ${u.email}`,
    })),
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('admin.keys.issue.title')}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={issue.isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => issue.mutate()} disabled={!userId} loading={issue.isPending}>
            {t('admin.keys.issue')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-fg">{t('admin.keys.issue.user')}</label>
        <Select options={options} value={userId} onChange={(e) => setUserId(e.target.value)} />
      </div>
      {issue.isError && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {getApiErrorMessage(issue.error)}
        </div>
      )}
    </Modal>
  )
}

function IconAction({
  label,
  onClick,
  busy,
  className,
  children,
}: {
  label: string
  onClick: () => void
  busy?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={busy}
      className={cn(
        'rounded-lg p-2 text-muted transition-colors hover:bg-surface2 disabled:opacity-50',
        className,
      )}
    >
      {busy ? <RefreshCw className="size-4 animate-spin" /> : children}
    </button>
  )
}
