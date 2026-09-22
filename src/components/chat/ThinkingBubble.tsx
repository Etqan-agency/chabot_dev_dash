import { VideoAvatar } from './VideoAvatar'
import { useI18n } from '@/hooks/useI18n'

/** Lively "AI is thinking" bubble shown while the answer loads. */
export function ThinkingBubble() {
  const { t } = useI18n()
  return (
    <div className="flex animate-msg-in items-end gap-2">
      <VideoAvatar className="size-9" glow />
      <div className="relative">
        <span
          className="absolute -start-1.5 top-0 size-3 bg-surface/80"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
        />
        <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-surface/70 px-4 py-3 shadow-sm backdrop-blur">
          <span className="animate-shimmer text-xs font-semibold">{t('chat.thinking')}</span>
          <span className="flex items-center gap-1">
            <Dot delay="0ms" />
            <Dot delay="150ms" />
            <Dot delay="300ms" />
          </span>
        </div>
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span className="animate-dot size-2 rounded-full bg-brand-500" style={{ animationDelay: delay }} />
  )
}
