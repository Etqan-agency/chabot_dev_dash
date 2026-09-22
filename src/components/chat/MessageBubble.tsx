import { useState } from 'react'
import { AlertTriangle, CheckCheck, FileText, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Markdown } from './Markdown'
import { TypewriterMarkdown } from './TypewriterMarkdown'
import { VideoAvatar } from './VideoAvatar'
import { cn } from '@/lib/cn'
import { ms } from '@/lib/format'
import { useI18n } from '@/hooks/useI18n'
import type { ChatTurn, FeedbackRating } from './types'

export function MessageBubble({
  turn,
  onFeedback,
  onType,
  onTyped,
}: {
  turn: ChatTurn
  onFeedback?: (turn: ChatTurn, rating: FeedbackRating) => void
  /** Fired on each typewriter tick (to keep scrolled to bottom). */
  onType?: () => void
  /** Fired once the typewriter finishes. */
  onTyped?: (turn: ChatTurn) => void
}) {
  const { t } = useI18n()
  const isUser = turn.role === 'user'
  const [showSources, setShowSources] = useState(false)

  if (isUser) {
    return (
      <div className="flex animate-msg-in justify-end">
        <div className="relative max-w-[78%]">
          {/* tail */}
          <span
            className="absolute -end-1.5 top-0 size-3 bg-brand-200"
            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
          />
          <div
            dir="auto"
            className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-brand-200 to-brand-300 px-2.5 py-1.5 text-[15px] leading-relaxed text-navy-900 shadow-sm"
          >
            <span className="whitespace-pre-wrap">{turn.content}</span>
            <span className="float-end ms-2 mt-1.5 flex translate-y-0.5 items-center gap-0.5 text-[10px] text-navy-600/70">
              {turn.time}
              <CheckCheck className="size-3.5 text-steel-500" />
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex animate-msg-in items-end gap-2">
      <VideoAvatar className="size-9" glow={turn.animate} />
      <div className="max-w-[82%]">
        <div className="relative">
          {/* tail */}
          {!turn.error && (
            <span
              className="absolute -start-1.5 top-0 size-3 bg-surface"
              style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
            />
          )}
          <div
            dir="auto"
            className={cn(
              'rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm ring-1 transition-shadow',
              turn.error
                ? 'border border-danger/30 bg-danger/5 text-danger ring-transparent'
                : 'bg-surface text-fg ring-black/5 dark:ring-white/10',
              turn.animate && 'shadow-[0_0_22px_-4px_rgba(229,162,60,0.45)] ring-brand-300/50',
            )}
          >
            {turn.error ? (
              <p className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                {turn.content}
              </p>
            ) : (
              <>
                {turn.animate ? (
                  <TypewriterMarkdown
                    text={turn.content}
                    onType={onType}
                    onDone={() => onTyped?.(turn)}
                  />
                ) : (
                  <Markdown>{turn.content}</Markdown>
                )}
                {turn.confident === false && (
                  <p className="mt-2 border-t border-border pt-2 text-xs text-muted">
                    {t('chat.notSure')}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted">
                  {typeof turn.responseMs === 'number' && <span>{ms(turn.responseMs)}</span>}
                  {turn.time && <span>· {turn.time}</span>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sources + feedback */}
        {!turn.error && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 ps-1">
            {turn.sources && turn.sources.length > 0 && (
              <button
                onClick={() => setShowSources((v) => !v)}
                className="text-xs font-medium text-steel-600 hover:text-steel-500 dark:text-steel-300"
              >
                {t(showSources ? 'chat.sources.hide' : 'chat.sources.show', {
                  n: turn.sources.length,
                })}
              </button>
            )}
            {onFeedback && (
              <span className="flex items-center gap-1">
                <FeedbackButton
                  active={turn.feedback === 'up'}
                  onClick={() => onFeedback(turn, 'up')}
                  aria-label={t('chat.feedback.up')}
                >
                  <ThumbsUp className="size-3.5" />
                </FeedbackButton>
                <FeedbackButton
                  active={turn.feedback === 'down'}
                  onClick={() => onFeedback(turn, 'down')}
                  aria-label={t('chat.feedback.down')}
                >
                  <ThumbsDown className="size-3.5" />
                </FeedbackButton>
              </span>
            )}
          </div>
        )}

        {showSources && turn.sources && (
          <div className="mt-2 flex flex-col gap-1.5">
            {turn.sources.map((s) => (
              <div
                key={s.chunk_id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface/70 px-3 py-1.5 text-xs text-muted"
              >
                <FileText className="size-3.5 shrink-0 text-faint" />
                <span className="truncate font-medium">{s.filename}</span>
                <span className="ms-auto shrink-0 tabular-nums text-faint">
                  {(s.score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FeedbackButton({
  active,
  children,
  ...props
}: {
  active?: boolean
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'rounded-md p-1 transition-colors',
        active
          ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
          : 'text-faint hover:bg-surface2 hover:text-fg',
      )}
      {...props}
    >
      {children}
    </button>
  )
}
