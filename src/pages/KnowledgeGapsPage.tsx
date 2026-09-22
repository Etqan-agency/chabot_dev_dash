import { useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleSlash,
  HelpCircle,
  RefreshCw,
  Repeat,
  Search,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { unansweredApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/hooks/useI18n'
import type { ListParams, UnansweredQuestion, UnansweredStatus } from '@/types/api'

const STATUS_TONES: Record<UnansweredStatus, BadgeTone> = {
  new: 'brand',
  reviewed: 'steel',
  answered: 'success',
  dismissed: 'neutral',
}

export default function KnowledgeGapsPage() {
  const { t, dir } = useI18n()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [ordering, setOrdering] = useState('-occurrences')
  const [toResolve, setToResolve] = useState<UnansweredQuestion | null>(null)
  const [toDelete, setToDelete] = useState<UnansweredQuestion | null>(null)
  const debouncedSearch = useDebounce(search)

  const statusOptions = [
    { value: '', label: t('gaps.status.all') },
    { value: 'new', label: t('gaps.status.new') },
    { value: 'reviewed', label: t('gaps.status.reviewed') },
    { value: 'answered', label: t('gaps.status.answered') },
    { value: 'dismissed', label: t('gaps.status.dismissed') },
  ]
  const orderingOptions = [
    { value: '-occurrences', label: t('gaps.order.mostAsked') },
    { value: '-last_asked_at', label: t('gaps.order.recent') },
    { value: '-created_at', label: t('gaps.order.newest') },
  ]

  const params: ListParams = {
    page,
    ordering,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
  }

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['unanswered', params],
    queryFn: () => unansweredApi.list(params),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['unanswered'] })

  const dismiss = useMutation({
    mutationFn: (id: string) => unansweredApi.dismiss(id),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => unansweredApi.remove(id),
    onSuccess: () => {
      void invalidate()
      setToDelete(null)
    },
  })

  const rows = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))
  const hasFilters = !!debouncedSearch || !!status
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div>
      <PageHeader title={t('gaps.title')} description={t('gaps.subtitle')} />

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            placeholder={t('gaps.search')}
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

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="size-7" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-6 text-sm text-danger">
            <AlertTriangle className="size-5 shrink-0" />
            <div>
              <p className="font-medium">{t('gaps.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title={hasFilters ? t('gaps.emptyFiltered.title') : t('gaps.empty.title')}
            description={hasFilters ? t('gaps.emptyFiltered.desc') : t('gaps.empty.desc')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 text-start font-semibold">{t('gaps.col.question')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('gaps.col.asked')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('gaps.col.status')}</th>
                  <th className="px-5 py-3 text-end font-semibold">{t('gaps.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <p className="font-medium text-fg" dir="auto">
                          {q.question}
                        </p>
                        <Badge tone="neutral" className="mt-0.5 shrink-0 uppercase">
                          {q.language}
                        </Badge>
                      </div>
                      {q.reason && (
                        <p className="mt-0.5 text-xs text-muted" dir="auto">
                          {q.reason}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top whitespace-nowrap text-muted">
                      <span className="flex items-center gap-1.5 font-medium text-fg">
                        <Repeat className="size-3.5 text-faint" />
                        {t('gaps.occurrences', { n: q.occurrences })}
                      </span>
                      {q.last_asked_at && (
                        <span className="text-xs text-faint">
                          {t('gaps.lastAsked', { date: formatDate(q.last_asked_at) })}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top">
                      <Badge tone={STATUS_TONES[q.status]} dot>
                        {t(`gaps.status.${q.status}`)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <IconAction
                          label={t('gaps.action.resolve')}
                          onClick={() => setToResolve(q)}
                          className="text-success hover:bg-success/10"
                          disabled={q.status === 'answered'}
                        >
                          <CircleCheck className="size-4" />
                        </IconAction>
                        <IconAction
                          label={t('gaps.action.dismiss')}
                          onClick={() => dismiss.mutate(q.id)}
                          busy={dismiss.isPending && dismiss.variables === q.id}
                          disabled={q.status === 'dismissed'}
                        >
                          <CircleSlash className="size-4" />
                        </IconAction>
                        <IconAction
                          label={t('gaps.action.delete')}
                          onClick={() => setToDelete(q)}
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

        {!isLoading && !isError && rows.length > 0 && (
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

      <ResolveDialog
        question={toResolve}
        onClose={() => setToResolve(null)}
        onResolved={invalidate}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={t('gaps.delete.title')}
        message={t('gaps.delete.message')}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

function ResolveDialog({
  question,
  onClose,
  onResolved,
}: {
  question: UnansweredQuestion | null
  onClose: () => void
  onResolved: () => void
}) {
  const { t } = useI18n()
  const [answer, setAnswer] = useState('')

  const resolve = useMutation({
    mutationFn: () => unansweredApi.resolve(question!.id, answer),
    onSuccess: () => {
      onResolved()
      handleClose()
    },
  })

  function handleClose() {
    setAnswer('')
    resolve.reset()
    onClose()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    resolve.mutate()
  }

  return (
    <Modal
      open={!!question}
      onClose={handleClose}
      title={t('gaps.resolve.title')}
      description={t('gaps.resolve.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={resolve.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="resolve-form" loading={resolve.isPending}>
            <CircleCheck className="size-4" /> {t('gaps.resolve.submit')}
          </Button>
        </>
      }
    >
      <form id="resolve-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
            {t('gaps.resolve.question')}
          </p>
          <p className="rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-fg" dir="auto">
            {question?.question}
          </p>
        </div>
        <Textarea
          label={t('gaps.resolve.answer')}
          hint={t('gaps.resolve.answerHint')}
          rows={5}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          autoFocus
        />
        {resolve.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(resolve.error)}
          </div>
        )}
      </form>
    </Modal>
  )
}

function IconAction({
  label,
  onClick,
  busy,
  disabled,
  className,
  children,
}: {
  label: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        'rounded-lg p-2 text-muted transition-colors hover:bg-surface2 disabled:opacity-40',
        className,
      )}
    >
      {busy ? <RefreshCw className="size-4 animate-spin" /> : children}
    </button>
  )
}
