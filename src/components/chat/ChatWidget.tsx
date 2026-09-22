import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Maximize2, Sparkles, Trash2, X } from 'lucide-react'
import { VideoAvatar } from './VideoAvatar'
import { MessageBubble } from './MessageBubble'
import { ThinkingBubble } from './ThinkingBubble'
import { ChatComposer } from './ChatComposer'
import { useI18n } from '@/hooks/useI18n'
import { useChatSession } from '@/hooks/useChatSession'

/**
 * Floating chat widget (dashboard) — a launcher button that opens a compact
 * popup chat, separate from the full /chat page. Uses the animated bot icon.
 */
export function ChatWidget() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { messages, loading, send, handleFeedback, handleTyped, clear, assistantName, company } =
    useChatSession()
  const scrollRef = useRef<HTMLDivElement>(null)
  const suggestions = [t('chat.suggest.1'), t('chat.suggest.2'), t('chat.suggest.3')]

  function toBottom(behavior: ScrollBehavior = 'smooth') {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
  }
  useEffect(() => {
    if (open) toBottom('smooth')
  }, [messages, loading, open])

  const isEmpty = messages.length === 0

  return (
    <div className="fixed bottom-5 end-5 z-40 flex flex-col items-end gap-3 sm:bottom-7 sm:end-7">
      {open && (
        <div className="animate-msg-in flex h-[min(600px,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-navy-900/25">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-navy-800 px-4 py-3 text-cream-50">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative">
                <VideoAvatar className="size-9" glow={loading} />
                <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-navy-800 bg-success" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{assistantName}</p>
                <p className="truncate text-[11px] text-cream-200/70">
                  {loading ? t('chat.typing') : company ? `${company} · ${t('chat.online')}` : t('chat.online')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {!isEmpty && (
                <IconBtn label={t('chat.clear')} onClick={clear}>
                  <Trash2 className="size-4" />
                </IconBtn>
              )}
              <IconBtn label={t('chat.expand')} onClick={() => navigate('/chat')}>
                <Maximize2 className="size-4" />
              </IconBtn>
              <IconBtn label={t('chat.close')} onClick={() => setOpen(false)}>
                <X className="size-5" />
              </IconBtn>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-bg/40 px-3 py-4">
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                <div className="animate-float-y">
                  <VideoAvatar className="size-16" glow />
                </div>
                <h3 className="mt-3 text-base font-semibold text-fg">
                  {t('chat.empty.title', { name: assistantName })}
                </h3>
                <p className="mt-1 text-xs text-muted">{t('chat.empty.subtitle')}</p>
                <div className="mt-4 flex w-full flex-col gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      dir="auto"
                      onClick={() => send(s)}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-start text-xs text-fg transition-colors hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-400"
                    >
                      <Sparkles className="size-3.5 shrink-0 text-brand-500" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((turn) => (
                  <MessageBubble
                    key={turn.id}
                    turn={turn}
                    onFeedback={handleFeedback}
                    onType={() => toBottom('auto')}
                    onTyped={handleTyped}
                  />
                ))}
                {loading && <ThinkingBubble />}
              </>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-surface">
            <ChatComposer onSend={send} disabled={loading} placeholder={t('chat.placeholder')} />
          </div>
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('chat.launcher')}
        className="group relative flex items-center"
      >
        {!open && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand-400/40" />}
        <span className="block size-16 overflow-hidden rounded-full border-2 border-white bg-navy-800 shadow-xl shadow-navy-900/25 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
          {open ? (
            <span className="flex size-full items-center justify-center bg-navy-800 text-cream-50">
              <X className="size-6" />
            </span>
          ) : (
            <video
              src="/Chatbot-anime.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="size-full object-cover"
            />
          )}
        </span>
      </button>
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-lg p-1.5 text-cream-200 transition-colors hover:bg-white/10 hover:text-cream-50"
    >
      {children}
    </button>
  )
}
