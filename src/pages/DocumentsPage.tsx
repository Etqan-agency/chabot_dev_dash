import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Power,
  RefreshCw,
  RotateCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { QuotaBar } from '@/components/QuotaBar'
import { StatusBadge } from '@/components/documents/StatusBadge'
import { UploadDialog } from '@/components/documents/UploadDialog'
import { DocumentContentDialog } from '@/components/documents/DocumentContentDialog'
import { documentsApi, subscriptionsApi } from '@/lib/endpoints'
import { getApiErrorMessage, resolveFileUrl } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/hooks/useI18n'
import type { Document, ListParams, SubscriptionUsage } from '@/types/api'

export default function DocumentsPage() {
  const { t, dir } = useI18n()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [ordering, setOrdering] = useState('-created_at')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Document | null>(null)
  const [contentDoc, setContentDoc] = useState<Document | null>(null)

  const debouncedSearch = useDebounce(search)

  const statusOptions = [
    { value: '', label: t('documents.status.all') },
    { value: 'completed', label: t('documents.status.completed') },
    { value: 'processing', label: t('documents.status.processing') },
    { value: 'pending', label: t('documents.status.pending') },
    { value: 'failed', label: t('documents.status.failed') },
  ]
  const orderingOptions = [
    { value: '-created_at', label: t('documents.order.newest') },
    { value: 'created_at', label: t('documents.order.oldest') },
    { value: '-file_size', label: t('documents.order.largest') },
    { value: 'file_size', label: t('documents.order.smallest') },
    { value: '-updated_at', label: t('documents.order.updated') },
  ]

  const params: ListParams = {
    page,
    ordering,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { processing_status: status } : {}),
  }

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['documents', params],
    queryFn: () => documentsApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const rows = query.state.data?.results ?? []
      const busy = rows.some(
        (d) => d.processing_status === 'pending' || d.processing_status === 'processing',
      )
      return busy ? 2000 : false
    },
  })

  // Upload headroom (documents / storage) for the current plan. Optional —
  // hidden if the backend doesn't expose /my-subscription/ yet.
  const { data: sub } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsApi.mine,
    retry: false,
    staleTime: 60_000,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['documents'] })
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
    void queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
  }

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

  const docs = data?.results ?? []
  const total = data?.count ?? 0
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = !!debouncedSearch || !!status
  const actionError =
    (toggleActive.isError && getApiErrorMessage(toggleActive.error)) ||
    (reindex.isError && getApiErrorMessage(reindex.error)) ||
    null

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div>
      <PageHeader
        title={t('documents.title')}
        description={t('documents.subtitle')}
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" /> {t('common.upload')}
          </Button>
        }
      />

      {sub?.usage && <UploadLimits usage={sub.usage} />}

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            placeholder={t('documents.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="ps-9"
          />
        </div>
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="sm:w-44"
        />
        <Select
          options={orderingOptions}
          value={ordering}
          onChange={(e) => {
            setOrdering(e.target.value)
            setPage(1)
          }}
          className="sm:w-48"
        />
      </div>

      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertTriangle className="size-4" /> {actionError}
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="size-7" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-6 text-sm text-danger">
            <AlertTriangle className="size-5 shrink-0" />
            <div>
              <p className="font-medium">{t('documents.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={hasFilters ? t('documents.emptyFiltered.title') : t('documents.empty.title')}
            description={hasFilters ? t('documents.emptyFiltered.desc') : t('documents.empty.desc')}
            action={
              !hasFilters && (
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="size-4" /> {t('documents.empty.cta')}
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 text-start font-semibold">{t('documents.col.document')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('documents.col.status')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('documents.col.chunks')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('documents.col.size')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('documents.col.added')}</th>
                  <th className="px-5 py-3 text-end font-semibold">{t('documents.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-faint">
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{doc.filename}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <Badge tone={doc.source_type === 'api' ? 'steel' : 'neutral'}>
                              {doc.source_type === 'api'
                                ? t('documents.badge.api')
                                : t('documents.badge.file')}
                            </Badge>
                            {!doc.is_active && (
                              <Badge tone="neutral">{t('documents.badge.inactive')}</Badge>
                            )}
                          </div>
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
                    <td className="px-5 py-3 tabular-nums">
                      <Link
                        to={`/knowledge/chunks?document=${doc.id}`}
                        title={t('documents.action.viewChunks')}
                        className="rounded-md px-1.5 py-0.5 font-medium text-steel-600 hover:bg-steel-500/10 hover:underline dark:text-steel-300"
                      >
                        {doc.chunk_count}
                      </Link>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">
                      {doc.file_size_mb.toFixed(2)} MB
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconAction
                          label={t('documents.action.fullText')}
                          onClick={() => setContentDoc(doc)}
                          className="text-steel-500 hover:bg-steel-500/10"
                        >
                          <BookOpenText className="size-4" />
                        </IconAction>
                        {doc.file && (
                          <a
                            href={resolveFileUrl(doc.file)}
                            target="_blank"
                            rel="noreferrer"
                            download
                            title={t('documents.action.download')}
                            aria-label={t('documents.action.download')}
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface2"
                          >
                            <Download className="size-4" />
                          </a>
                        )}
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

        {/* Footer / pagination */}
        {!isLoading && !isError && docs.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
            <span className="flex items-center gap-2">
              {t(total === 1 ? 'documents.count_one' : 'documents.count', { n: total })}
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
                aria-label="Previous page"
              >
                <PrevIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.next}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <NextIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <DocumentContentDialog documentId={contentDoc?.id ?? null} onClose={() => setContentDoc(null)} />
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ConfirmDialog
        open={!!toDelete}
        title={t('documents.delete.title')}
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

/** Documents + storage headroom for the tenant's plan. */
function UploadLimits({ usage }: { usage: SubscriptionUsage }) {
  const { t } = useI18n()
  const unlimited = t('documents.limits.unlimited')

  const docsUsed = usage.documents_used ?? 0
  const docsMax = usage.documents_limit ?? 0
  const mbUsed = usage.storage_mb_used ?? 0
  const mbMax = usage.storage_mb_limit ?? 0

  const docsLeft = docsMax > 0 ? Math.max(docsMax - docsUsed, 0) : null
  const mbLeft = mbMax > 0 ? Math.max(mbMax - mbUsed, 0) : null

  return (
    <Card className="mb-4 p-4">
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <div>
          <QuotaBar
            label={t('documents.limits.documents')}
            used={docsUsed}
            max={docsMax}
            unlimitedLabel={unlimited}
          />
          {docsLeft != null && (
            <p className="mt-1 text-xs text-muted">
              {t('documents.limits.remaining', { n: docsLeft })}
            </p>
          )}
        </div>
        <div>
          <QuotaBar
            label={t('documents.limits.storage')}
            used={mbUsed}
            max={mbMax}
            unit=" MB"
            unlimitedLabel={unlimited}
            formatValue={(n) => n.toFixed(1)}
          />
          {mbLeft != null && (
            <p className="mt-1 text-xs text-muted">
              {t('documents.limits.remaining', { n: `${mbLeft.toFixed(1)} MB` })}
            </p>
          )}
        </div>
      </div>
    </Card>
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
