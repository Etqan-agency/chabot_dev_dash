import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { useI18n } from '@/hooks/useI18n'
import type { ProcessingStatus } from '@/types/api'

const tones: Record<ProcessingStatus, BadgeTone> = {
  pending: 'neutral',
  processing: 'steel',
  completed: 'success',
  failed: 'danger',
}

const icons: Record<ProcessingStatus, typeof Clock> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
}

export function StatusBadge({ status }: { status: ProcessingStatus }) {
  const { t } = useI18n()
  const Icon = icons[status]
  return (
    <Badge tone={tones[status]}>
      <Icon className={`size-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {t(`documents.status.${status}`)}
    </Badge>
  )
}
