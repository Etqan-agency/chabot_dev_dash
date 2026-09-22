import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, UploadCloud, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { documentsApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useI18n } from '@/hooks/useI18n'

const ACCEPTED = ['.docx', '.txt', '.md']
const MAX_MB = 20

function isAccepted(file: File): boolean {
  const name = file.name.toLowerCase()
  return ACCEPTED.some((ext) => name.endsWith(ext))
}

export function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: (f: File) => documentsApi.upload(f),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
      handleClose()
    },
  })

  function selectFile(f: File | undefined | null) {
    setLocalError(null)
    if (!f) return
    if (!isAccepted(f)) {
      setLocalError(t('documents.upload.unsupported', { types: ACCEPTED.join(', ') }))
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setLocalError(t('documents.upload.tooLarge', { mb: MAX_MB }))
      return
    }
    setFile(f)
  }

  function handleClose() {
    setFile(null)
    setLocalError(null)
    upload.reset()
    onClose()
  }

  const error = localError ?? (upload.isError ? getApiErrorMessage(upload.error) : null)

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('documents.upload.title')}
      description={t('documents.upload.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={upload.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => file && upload.mutate(file)}
            disabled={!file}
            loading={upload.isPending}
          >
            {t('common.upload')}
          </Button>
        </>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={(e) => selectFile(e.target.files?.[0])}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface2 p-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            onClick={() => setFile(null)}
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-fg"
            aria-label={t('documents.upload.remove')}
            disabled={upload.isPending}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            selectFile(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragging
              ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10'
              : 'border-border bg-surface2 hover:border-brand-300',
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <UploadCloud className="size-6" />
          </span>
          <span className="text-sm font-medium text-fg">{t('documents.upload.drop')}</span>
          <span className="text-xs text-muted">
            {t('documents.upload.hint', { types: ACCEPTED.join(', '), mb: MAX_MB })}
          </span>
        </button>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
    </Modal>
  )
}
