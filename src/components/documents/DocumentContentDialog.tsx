import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Copy, Download, FileText, Globe, Plug } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/documents/StatusBadge'
import { documentsApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { fullNumber } from '@/lib/format'
import { useClipboard } from '@/hooks/useClipboard'
import { useI18n } from '@/hooks/useI18n'

/**
 * Read-only viewer for a document's full reconstructed text
 * (GET /documents/{id}/content/ — all chunks joined as one block). Editing
 * still happens per chunk on the Knowledge Content page.
 */
export function DocumentContentDialog({
  documentId,
  onClose,
}: {
  documentId: string | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const { copied, copy } = useClipboard()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['document-content', documentId],
    queryFn: () => documentsApi.content(documentId!),
    enabled: !!documentId,
    staleTime: 60_000,
  })

  function download() {
    if (!data) return
    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.filename.replace(/\.[^.]+$/, '') || 'document'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SourceIcon =
    data?.source_type === 'website' ? Globe : data?.source_type === 'api' ? Plug : FileText

  return (
    <Modal
      open={!!documentId}
      onClose={onClose}
      title={t('documents.content.title')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button variant="outline" onClick={() => data && void copy(data.content)} disabled={!data}>
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
          <Button onClick={download} disabled={!data}>
            <Download className="size-4" /> {t('documents.content.download')}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertTriangle className="size-4 shrink-0" />
          {getApiErrorMessage(error)}
        </div>
      ) : data ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <SourceIcon className="size-4 text-brand-500" />
            <bdi dir="ltr" className="font-medium text-fg">
              {data.filename}
            </bdi>
            <StatusBadge status={data.processing_status} />
            <Badge tone="neutral">{t('documents.content.chunks', { n: fullNumber(data.chunk_count) })}</Badge>
            <Badge tone="neutral">{t('chunks.chars', { n: fullNumber(data.char_count) })}</Badge>
          </div>

          <div
            dir="auto"
            className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-surface2/60 px-4 py-3 text-sm leading-relaxed text-fg"
          >
            {data.content || <span className="text-faint">{t('documents.content.empty')}</span>}
          </div>

          <p className="text-xs text-faint">{t('documents.content.note')}</p>
        </div>
      ) : null}
    </Modal>
  )
}
