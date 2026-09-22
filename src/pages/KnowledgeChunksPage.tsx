import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Globe,
  Layers,
  Pencil,
  Plug,
  RefreshCw,
  Save,
  Undo2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { chunksApi, documentsApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { fullNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useClipboard } from '@/hooks/useClipboard'
import { useI18n } from '@/hooks/useI18n'
import type { BulkKnowledgeStatus, FullKnowledge, FullKnowledgeDocument } from '@/types/api'

/** Server rejects content over ~1,000,000 chars (400). */
const MAX_CHARS = 1_000_000
/** Bulk PATCH accepts at most 25 documents per request. */
const BULK_BATCH = 25

type DocStatus = { kind: 'ok' | 'err'; message: string }

/**
 * Knowledge content (FRONTEND_API.md §4): the tenant's entire knowledge base
 * from GET /knowledge-chunks/full/ — one full text per document — with inline
 * editing. Save one source (PUT /documents/{id}/content/) or every edited
 * source at once (PATCH /knowledge-chunks/full/, ≤25 per request); each save
 * re-chunks + re-embeds so the bot's knowledge updates immediately.
 */
export default function KnowledgeChunksPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const documentFilter = searchParams.get('document') ?? ''

  // Unsaved edits per document id (absent = not editing).
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [statuses, setStatuses] = useState<Record<string, DocStatus>>({})
  const [bulkSummary, setBulkSummary] = useState<{ updated: number; total: number } | null>(null)

  const docs = useQuery({
    queryKey: ['documents', { page: 1, ordering: '-created_at', forChunkFilter: true }],
    queryFn: () => documentsApi.list({ page: 1, ordering: '-created_at' }),
    staleTime: 60_000,
  })
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['knowledge-full', documentFilter],
    queryFn: () => chunksApi.full(documentFilter || undefined),
    staleTime: 60_000,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['knowledge-full'] })
    void queryClient.invalidateQueries({ queryKey: ['documents'] })
    void queryClient.invalidateQueries({ queryKey: ['document-content'] })
  }

  function setDraft(id: string, text: string | undefined) {
    setDrafts((d) => {
      const next = { ...d }
      if (text === undefined) delete next[id]
      else next[id] = text
      return next
    })
    setStatuses((s) => {
      if (!(id in s)) return s
      const next = { ...s }
      delete next[id]
      return next
    })
  }

  function statusLabel(status: BulkKnowledgeStatus): string {
    return t(`chunks.full.status.${status}`)
  }

  // Save one source — PUT re-chunks + re-embeds; returns the new payload + chunks_created.
  const saveOne = useMutation({
    mutationFn: (id: string) => documentsApi.setContent(id, drafts[id].trim()),
    onSuccess: (res, id) => {
      setDraft(id, undefined)
      setStatuses((s) => ({
        ...s,
        [id]: {
          kind: 'ok',
          message: t('chunks.full.saved', { n: fullNumber(res.chunks_created ?? res.chunk_count) }),
        },
      }))
      invalidate()
    },
    onError: (err, id) => {
      setStatuses((s) => ({ ...s, [id]: { kind: 'err', message: getApiErrorMessage(err) } }))
    },
  })

  // Save every edited source — batches of ≤25, per-document results.
  const saveAll = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(drafts)
        .map(([id, content]) => ({ id, content: content.trim() }))
        .filter((e) => e.content.length > 0 && e.content.length <= MAX_CHARS)
      let updated = 0
      const total = entries.length
      const failed: Record<string, DocStatus> = {}
      const ok: Record<string, DocStatus> = {}
      for (let i = 0; i < entries.length; i += BULK_BATCH) {
        const res = await chunksApi.bulkUpdate(entries.slice(i, i + BULK_BATCH))
        for (const r of res.results) {
          if (r.status === 'updated') {
            updated += 1
            ok[r.id] = {
              kind: 'ok',
              message: t('chunks.full.saved', { n: fullNumber(r.chunk_count ?? 0) }),
            }
          } else {
            failed[r.id] = { kind: 'err', message: statusLabel(r.status) }
          }
        }
      }
      return { updated, total, ok, failed }
    },
    onSuccess: ({ updated, total, ok, failed }) => {
      setDrafts((d) => {
        const next = { ...d }
        for (const id of Object.keys(ok)) delete next[id]
        return next
      })
      setStatuses((s) => ({ ...s, ...ok, ...failed }))
      setBulkSummary({ updated, total })
      invalidate()
    },
  })

  function setDocumentFilter(id: string) {
    setSearchParams(id ? { document: id } : {}, { replace: true })
  }

  const docOptions = [
    { value: '', label: t('chunks.filter.allDocs') },
    ...(docs.data?.results ?? []).map((d) => ({ value: d.id, label: d.filename })),
  ]
  if (documentFilter && !docOptions.some((o) => o.value === documentFilter)) {
    const name = data?.documents[0]?.filename ?? documentFilter.slice(0, 8)
    docOptions.push({ value: documentFilter, label: name })
  }

  function downloadAll(k: FullKnowledge) {
    const text = k.documents
      .map((d) => `===== ${d.filename} =====\n\n${d.content}`)
      .join('\n\n\n')
    downloadText('knowledge.txt', text)
  }

  const dirtyIds = Object.keys(drafts).filter((id) => {
    const original = data?.documents.find((d) => d.id === id)?.content ?? ''
    return drafts[id].trim() !== original.trim()
  })
  const savingAll = saveAll.isPending

  return (
    <div>
      <PageHeader
        title={t('chunks.title')}
        description={t('chunks.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            <RefreshCw className="size-4" /> {t('common.refresh')}
          </Button>
        }
      />

      {/* Document filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full md:w-72">
          <Select
            options={docOptions}
            value={documentFilter}
            onChange={(e) => setDocumentFilter(e.target.value)}
          />
        </div>
        {documentFilter && (
          <button
            onClick={() => setDocumentFilter('')}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted hover:bg-surface2 hover:text-fg"
          >
            <X className="size-3" /> {t('chunks.clearFilter')}
          </button>
        )}
      </div>

      {/* Sticky "save all" bar while there are unsaved edits */}
      {dirtyIds.length > 0 && (
        <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-300/50 bg-brand-50/95 px-4 py-2.5 shadow-sm backdrop-blur dark:bg-brand-500/15">
          <Pencil className="size-4 text-brand-600 dark:text-brand-300" />
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {t('chunks.full.unsaved', { n: dirtyIds.length })}
          </span>
          <div className="ms-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDrafts({})}
              disabled={savingAll}
            >
              <Undo2 className="size-4" /> {t('chunks.full.discardAll')}
            </Button>
            <Button size="sm" onClick={() => saveAll.mutate()} loading={savingAll}>
              <Save className="size-4" /> {t('chunks.full.saveAll', { n: dirtyIds.length })}
            </Button>
          </div>
        </div>
      )}
      {saveAll.isError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          <AlertTriangle className="size-4 shrink-0" /> {getApiErrorMessage(saveAll.error)}
        </div>
      )}
      {bulkSummary && dirtyIds.length === 0 && (
        <div
          className={cn(
            'mb-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm',
            bulkSummary.updated === bulkSummary.total
              ? 'border-success/30 bg-success/5 text-success'
              : 'border-brand-300/50 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
          )}
        >
          <CheckCircle2 className="size-4 shrink-0" />
          {t('chunks.full.bulkResult', { updated: bulkSummary.updated, total: bulkSummary.total })}
          <button
            onClick={() => setBulkSummary(null)}
            className="ms-auto rounded-md p-1 hover:bg-surface2"
            aria-label={t('common.close')}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {isLoading ? (
        <Card className="flex items-center justify-center py-20">
          <Spinner className="size-7" />
        </Card>
      ) : isError || !data ? (
        <Card className="flex items-center gap-3 p-6 text-sm text-danger">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="font-medium">{t('chunks.loadError')}</p>
            <p className="text-muted">{getApiErrorMessage(error)}</p>
          </div>
        </Card>
      ) : data.documents.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title={t('chunks.empty.title')}
            description={t('chunks.empty.desc')}
            action={
              <Link
                to="/documents"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-navy-900 hover:bg-brand-400"
              >
                <FileText className="size-4" /> {t('nav.documents')}
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <Stat label={t('chunks.full.documents')} value={fullNumber(data.document_count)} />
            <Stat label={t('chunks.full.pieces')} value={fullNumber(data.chunk_count)} />
            <Stat label={t('chunks.full.chars')} value={fullNumber(data.char_count)} />
            {isFetching && <RefreshCw className="size-3.5 animate-spin text-faint" />}
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => downloadAll(data)}>
              <Download className="size-4" /> {t('chunks.full.downloadAll')}
            </Button>
          </Card>
          <p className="text-xs text-faint">{t('chunks.full.note')}</p>

          {data.documents.map((d, i) => (
            <FullDocumentCard
              key={d.id}
              doc={d}
              defaultOpen={i === 0}
              draft={drafts[d.id]}
              status={statuses[d.id]}
              saving={(saveOne.isPending && saveOne.variables === d.id) || (savingAll && d.id in drafts)}
              onDraftChange={(text) => setDraft(d.id, text)}
              onSave={() => saveOne.mutate(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums text-fg">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}

function SourceBadge({ source }: { source: FullKnowledgeDocument['source_type'] }) {
  const { t } = useI18n()
  const Icon = source === 'website' ? Globe : source === 'api' ? Plug : FileText
  const tone = source === 'website' ? 'success' : source === 'api' ? 'brand' : 'neutral'
  return (
    <Badge tone={tone}>
      <Icon className="me-1 size-3" />
      {t(`chunks.source.${source}`)}
    </Badge>
  )
}

function RowAction({
  label,
  onClick,
  className,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md p-1.5 text-muted transition-colors hover:bg-surface2 disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** One source's full text — collapsible, copy/download, and inline editing. */
function FullDocumentCard({
  doc,
  defaultOpen,
  draft,
  status,
  saving,
  onDraftChange,
  onSave,
}: {
  doc: FullKnowledgeDocument
  defaultOpen: boolean
  draft: string | undefined
  status: DocStatus | undefined
  saving: boolean
  onDraftChange: (text: string | undefined) => void
  onSave: () => void
}) {
  const { t } = useI18n()
  const { copied, copy } = useClipboard()
  const [open, setOpen] = useState(defaultOpen)

  const editing = draft !== undefined
  const text = editing ? draft : doc.content
  const trimmed = (draft ?? '').trim()
  const tooLong = trimmed.length > MAX_CHARS
  const empty = editing && trimmed.length === 0
  const dirty = editing && trimmed !== doc.content.trim()
  const canSave = dirty && !empty && !tooLong && !saving

  return (
    <Card className={cn('overflow-hidden', editing && 'border-brand-300/60 ring-1 ring-brand-400/30')}>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-faint transition-transform',
              !open && 'ltr:-rotate-90 rtl:rotate-90',
            )}
          />
          <SourceBadge source={doc.source_type} />
          <bdi dir="ltr" className="truncate text-sm font-semibold text-fg">
            {doc.filename}
          </bdi>
          <span className="hidden text-xs text-muted sm:inline">
            {t('documents.content.chunks', { n: fullNumber(doc.chunk_count) })} ·{' '}
            {t('chunks.chars', { n: fullNumber(doc.char_count) })}
          </span>
          {dirty && <Badge tone="brand">{t('chunks.full.edited')}</Badge>}
        </button>
        <span className="flex shrink-0 items-center gap-0.5">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDraftChange(undefined)}
                disabled={saving}
              >
                <Undo2 className="size-4" /> {t('chunks.full.discard')}
              </Button>
              <Button size="sm" onClick={onSave} loading={saving} disabled={!canSave}>
                <Save className="size-4" /> {t('chunks.full.saveOne')}
              </Button>
            </>
          ) : (
            <>
              <RowAction label={t('common.copy')} onClick={() => void copy(doc.content)}>
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </RowAction>
              <RowAction
                label={t('documents.content.download')}
                onClick={() =>
                  downloadText(
                    `${doc.filename.replace(/\.[^.]+$/, '') || 'document'}.txt`,
                    doc.content,
                  )
                }
              >
                <Download className="size-4" />
              </RowAction>
              <RowAction
                label={t('chunks.full.edit')}
                onClick={() => {
                  onDraftChange(doc.content)
                  setOpen(true)
                }}
                className="text-steel-500 hover:bg-steel-500/10"
              >
                <Pencil className="size-4" />
              </RowAction>
            </>
          )}
        </span>
      </div>

      {status && (
        <div
          className={cn(
            'flex items-center gap-2 border-t border-border px-5 py-2 text-xs',
            status.kind === 'ok' ? 'bg-success/5 text-success' : 'bg-danger/5 text-danger',
          )}
        >
          {status.kind === 'ok' ? (
            <CheckCircle2 className="size-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="size-3.5 shrink-0" />
          )}
          {status.message}
        </div>
      )}

      {open &&
        (editing ? (
          <div className="border-t border-border bg-surface2/40 px-5 py-4">
            <textarea
              dir="auto"
              value={text}
              onChange={(e) => onDraftChange(e.target.value)}
              disabled={saving}
              rows={Math.min(28, Math.max(10, Math.ceil(text.length / 90)))}
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-fg transition-colors focus:border-brand-400 disabled:opacity-60"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={cn('text-faint', (tooLong || empty) && 'text-danger')}>
                {empty
                  ? t('chunks.full.emptyError')
                  : tooLong
                    ? t('chunks.full.tooLong')
                    : t('chunks.full.editing')}
              </span>
              <span className={cn('tabular-nums text-faint', tooLong && 'text-danger')}>
                {t('chunks.chars', { n: fullNumber(trimmed.length) })}
              </span>
            </div>
          </div>
        ) : (
          <div
            dir="auto"
            className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap border-t border-border bg-surface2/40 px-5 py-4 text-sm leading-relaxed text-fg"
          >
            {doc.content || <span className="text-faint">{t('documents.content.empty')}</span>}
          </div>
        ))}
    </Card>
  )
}
