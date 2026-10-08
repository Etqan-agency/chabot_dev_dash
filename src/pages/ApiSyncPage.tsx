import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Plug, Power, RefreshCw, RotateCw, Sparkles, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/documents/StatusBadge'
import { documentsApi, syncApi } from '@/lib/endpoints'
import { getApiErrorMessage, getApiErrorStatus, getBillingErrorKey } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useI18n } from '@/hooks/useI18n'
import { isQueuedSync } from '@/types/api'
import type { ApiIngestionRun, Document, SyncApiReport } from '@/types/api'

export default function ApiSyncPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [apiUrl, setApiUrl] = useState('')
  const [docName, setDocName] = useState('API Content')
  const [fullRefresh, setFullRefresh] = useState(false)
  const [toDelete, setToDelete] = useState<Document | null>(null)
  // Set when the import was accepted (202) and is running on a worker.
  const [runId, setRunId] = useState<string | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['documents'] })
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
  }

  const sync = useMutation({
    mutationFn: () =>
      syncApi.run({
        api_url: apiUrl.trim(),
        document_name: docName.trim() || undefined,
        full_refresh: fullRefresh,
      }),
    onSuccess: (res) => {
      // A full import runs one LLM call per record, so the server accepts it
      // (202) and works through it on a worker. Nothing is imported yet -- the
      // run has to be followed to its end before anything can be claimed.
      setRunId(isQueuedSync(res) ? res.run_id : null)
      invalidate()
    },
  })

  const run = useQuery({
    queryKey: ['api-ingestion-run', runId],
    queryFn: () => syncApi.runStatus(runId as string),
    enabled: runId !== null,
    // Poll while it works; stop the moment it reports itself done.
    refetchInterval: (query) => (query.state.data?.done ? false : 2000),
  })

  // The documents list only shows the new source once the import has landed.
  const finished = run.data?.done ?? false
  // True from the moment the form is submitted until the run reports itself
  // done -- a full import takes minutes, so the page has to look busy for all
  // of it, not just for the request that starts it.
  const busy = sync.isPending || (runId !== null && !finished)
  useEffect(() => {
    if (finished) invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  // List of API-sourced documents (filtered client-side; these are typically few).
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['documents', { ordering: '-updated_at', page: 1 }],
    queryFn: () => documentsApi.list({ ordering: '-updated_at', page: 1 }),
    refetchInterval: (query) => {
      const rows = query.state.data?.results ?? []
      const busy = rows.some(
        (d) =>
          d.source_type === 'api' &&
          (d.processing_status === 'pending' || d.processing_status === 'processing'),
      )
      return busy ? 2000 : false
    },
  })
  const apiDocs = (data?.results ?? []).filter((d) => d.source_type === 'api')

  const toggleActive = useMutation({
    mutationFn: (doc: Document) => documentsApi.update(doc.id, { is_active: !doc.is_active }),
    onSuccess: invalidate,
  })
  const reindex = useMutation({
    mutationFn: (id: string) => documentsApi.reindex(id),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      invalidate()
      setToDelete(null)
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (apiUrl.trim()) sync.mutate()
  }

  return (
    <div>
      <PageHeader title={t('api.title')} description={t('api.subtitle')} />

      {busy ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-brand-300/40 bg-brand-50 dark:bg-brand-500/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <Spinner className="size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                {run.data ? t(`api.run.status.${run.data.status}`) : t('api.run.queued')}
              </p>
              <p className="text-xs text-muted">{t('api.run.keepsGoing')}</p>
            </div>
          </div>
          {/* Indeterminate: the server reports a stage, never a percentage. */}
          <div className="h-1 w-full overflow-hidden bg-brand-500/20">
            <div className="h-full w-1/3 animate-indeterminate bg-brand-500" />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Sync tool */}
        <Card className="lg:col-span-3">
          <CardHeader title={t('api.run.title')} description={t('api.run.subtitle')} />
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label={t('api.field.url')}
                type="url"
                placeholder="https://example.com/api/items/"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                disabled={busy}
                required
              />
              <Input
                label={t('api.field.docName')}
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                disabled={busy}
                hint={t('api.field.docNameHint')}
              />

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface2 p-3">
                <input
                  type="checkbox"
                  checked={fullRefresh}
                  onChange={(e) => setFullRefresh(e.target.checked)}
                  disabled={busy}
                  className="mt-0.5 size-4 accent-brand-500"
                />
                <span>
                  <span className="block text-sm font-medium text-fg">{t('api.fullRefresh')}</span>
                  <span className="block text-xs text-muted">{t('api.fullRefreshHint')}</span>
                </span>
              </label>

              {sync.isError &&
                (getApiErrorStatus(sync.error) === 402 ? (
                  // 402: out of points / expired, or API sync isn't on the plan — contact the admin.
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-300/40 bg-brand-50 px-3 py-2.5 dark:bg-brand-500/10">
                    <p className="text-sm text-brand-700 dark:text-brand-300">
                      {t(getBillingErrorKey(sync.error) ?? 'api.paidOnly')}
                    </p>
                    <Link
                      to="/billing"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-navy-900 shadow-sm transition-colors hover:bg-brand-400"
                    >
                      <Sparkles className="size-4" /> {t('points.contactCta')}
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                    {getApiErrorMessage(sync.error)}
                  </div>
                ))}

              <div className="flex justify-end">
                <Button type="submit" loading={busy} disabled={busy || !apiUrl.trim()}>
                  <RefreshCw className="size-4" /> {busy ? t('api.running') : t('api.runSync')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Last result */}
        <Card className="lg:col-span-2">
          <CardHeader title={t('api.result.title')} description={t('api.result.subtitle')} />
          <CardBody>
            {runId ? (
              <RunProgress run={run.data} error={run.error} />
            ) : sync.data && !isQueuedSync(sync.data) ? (
              <SyncResult result={sync.data} />
            ) : (
              <p className="py-6 text-center text-sm text-muted">{t('api.result.empty')}</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Synced sources */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('api.sources.title')}
        </h2>
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="size-7" />
            </div>
          ) : isError ? (
            <div className="flex items-center gap-3 p-6 text-sm text-danger">
              <AlertTriangle className="size-5 shrink-0" />
              <div>
                <p className="font-medium">{t('api.sources.loadError')}</p>
                <p className="text-muted">{getApiErrorMessage(error)}</p>
              </div>
            </div>
          ) : apiDocs.length === 0 ? (
            <EmptyState
              icon={Plug}
              title={t('api.sources.empty.title')}
              description={t('api.sources.empty.desc')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 text-start font-semibold">{t('api.col.source')}</th>
                    <th className="px-5 py-3 text-start font-semibold">{t('api.col.status')}</th>
                    <th className="px-5 py-3 text-start font-semibold">{t('api.col.chunks')}</th>
                    <th className="px-5 py-3 text-start font-semibold">{t('api.col.updated')}</th>
                    <th className="px-5 py-3 text-end font-semibold">{t('api.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {apiDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-faint">
                            <Plug className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-fg">{doc.filename}</p>
                            {doc.api_url && (
                              <p className="truncate text-xs text-muted" title={doc.api_url}>
                                {doc.api_url}
                              </p>
                            )}
                            {doc.processing_status === 'failed' && doc.error_message && (
                              <p
                                className="mt-1 truncate text-xs text-danger"
                                title={doc.error_message}
                              >
                                {doc.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={doc.processing_status} />
                      </td>
                      <td className="px-5 py-3 tabular-nums text-muted">{doc.chunk_count}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-muted">
                        {formatDate(doc.updated_at)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconAction
                            label={
                              doc.is_active
                                ? t('documents.action.deactivate')
                                : t('documents.action.activate')
                            }
                            onClick={() => toggleActive.mutate(doc)}
                            busy={toggleActive.isPending && toggleActive.variables?.id === doc.id}
                            className={doc.is_active ? 'text-success' : 'text-faint'}
                          >
                            <Power className="size-4" />
                          </IconAction>
                          <IconAction
                            label={t('documents.action.reindex')}
                            onClick={() => reindex.mutate(doc.id)}
                            busy={reindex.isPending && reindex.variables === doc.id}
                          >
                            <RotateCw className="size-4" />
                          </IconAction>
                          <IconAction
                            label={t('documents.action.delete')}
                            onClick={() => setToDelete(doc)}
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
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title={t('api.delete.title')}
        message={t('documents.delete.message', {
          name: toDelete?.filename ?? '',
          n: toDelete?.chunk_count ?? 0,
        })}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

/**
 * A running import, followed to its end. The POST only means the server
 * accepted the work, so nothing here claims success until the run says `done`
 * — and a run that ended `blocked` or `failed` says so instead of showing a
 * grid of zeros (FRONTEND_API.md §5a).
 */
function RunProgress({ run, error }: { run?: ApiIngestionRun; error: unknown }) {
  const { t } = useI18n()

  if (error) {
    return (
      <div className="flex items-start gap-2 text-sm text-danger">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <p>{getApiErrorMessage(error)}</p>
      </div>
    )
  }
  if (!run) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
        <Spinner className="size-4" /> {t('api.run.queued')}
      </div>
    )
  }
  if (run.status === 'completed' && run.result) return <SyncResult result={run.result} />
  if (run.done) {
    // blocked = quality control refused it and existing knowledge is untouched;
    // failed = it did not finish. Either way, say which and why.
    return (
      <div className="flex items-start gap-2 text-sm text-danger">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">{t(`api.run.status.${run.status}`)}</p>
          {run.detail ? <p className="mt-0.5 text-muted">{run.detail}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-fg">
        <Spinner className="size-4" /> {t(`api.run.status.${run.status}`)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('api.run.pages')} value={run.pages_fetched} />
        <Stat label={t('api.run.records')} value={run.records_processed} />
      </div>
      <p className="mt-3 text-xs text-muted">{t('api.run.keepsGoing')}</p>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value?: number; tone?: 'danger' }) {
  return (
    <div className="rounded-lg border border-border bg-surface2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'danger' ? 'text-danger' : 'text-fg',
        )}
      >
        {/* A number the server did not send is unknown, not zero. */}
        {typeof value === 'number' ? value.toLocaleString('en') : '—'}
      </p>
    </div>
  )
}

function SyncResult({ result }: { result: SyncApiReport }) {
  const { t } = useI18n()
  const stats: { label: string; value?: number; tone?: 'danger' }[] = [
    { label: t('api.result.processed'), value: result.processed },
    { label: t('api.result.chunks'), value: result.chunks_created },
    { label: t('api.result.new'), value: result.items_new },
    { label: t('api.result.updated'), value: result.items_updated },
    { label: t('api.result.unchanged'), value: result.items_unchanged },
    { label: t('api.result.removed'), value: result.items_removed },
    {
      label: t('api.result.errors'),
      value: result.errors,
      tone: result.errors ? 'danger' : undefined,
    },
  ]
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-success">
        <CheckCircle2 className="size-5" /> {t('api.result.complete')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} tone={s.tone} />
        ))}
      </div>
      {result.truncated ? (
        <p className="mt-3 text-xs text-muted">{t('api.result.truncated')}</p>
      ) : null}
    </div>
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
