import { useEffect, useRef } from 'react'
import { Sparkles, Trash2 } from 'lucide-react'
import { VideoAvatar } from '@/components/chat/VideoAvatar'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ThinkingBubble } from '@/components/chat/ThinkingBubble'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { useI18n } from '@/hooks/useI18n'
import { useChatSession } from '@/hooks/useChatSession'

export default function ChatPage() {
  const { t } = useI18n()
  const { messages, loading, send, handleFeedback, handleTyped, clear, assistantName, company } =
    useChatSession()
  const scrollRef = useRef<HTMLDivElement>(null)
  const suggestions = [t('chat.suggest.1'), t('chat.suggest.2'), t('chat.suggest.3')]

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
  }

  useEffect(() => {
    scrollToBottom('smooth')
  }, [messages, loading])

  const isEmpty = messages.length === 0

  return (
    <div className="relative flex h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-card border border-border bg-bg/40 shadow-sm">
      {/* Animated AI-vibe background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="animate-blob absolute -start-12 -top-16 size-64 rounded-full bg-brand-300/30 blur-3xl" />
        <div
          className="animate-blob absolute end-0 top-1/3 size-72 rounded-full bg-steel-400/25 blur-3xl"
          style={{ animationDelay: '-5s' }}
        />
        <div
          className="animate-blob absolute bottom-0 start-1/3 size-72 rounded-full bg-brand-200/30 blur-3xl"
          style={{ animationDelay: '-9s' }}
        />
        <div
          className="animate-spin-slow absolute -top-1/3 start-1/2 size-[120%] -translate-x-1/2 opacity-[0.07]"
          style={{
            background:
              'conic-gradient(from 0deg, transparent, #e5a23c, transparent, #3e7cb1, transparent)',
            animationDuration: '30s',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            color: 'var(--app-fg)',
          }}
        />
        <span className="animate-particle absolute left-[12%] top-[28%] size-1.5 rounded-full bg-brand-400/50" />
        <span
          className="animate-particle absolute left-[78%] top-[20%] size-2 rounded-full bg-steel-400/40"
          style={{ animationDelay: '-2s' }}
        />
        <span
          className="animate-particle absolute left-[60%] top-[70%] size-1.5 rounded-full bg-brand-300/50"
          style={{ animationDelay: '-4s' }}
        />
        <span
          className="animate-particle absolute left-[30%] top-[80%] size-1 rounded-full bg-steel-300/50"
          style={{ animationDelay: '-1s' }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative">
            <VideoAvatar className="size-10" glow={loading} />
            <span className="absolute -bottom-0.5 -end-0.5 z-20 size-3 rounded-full border-2 border-surface bg-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">{assistantName}</p>
            {loading ? (
              <p className="text-xs font-medium text-success">{t('chat.typing')}</p>
            ) : (
              <p className="text-xs text-muted">
                {company ? `${company} · ` : ''}
                {t('chat.online')}
              </p>
            )}
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface2 hover:text-fg"
          >
            <Trash2 className="size-3.5" /> {t('chat.clear')}
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 space-y-4 overflow-y-auto px-3 py-5 sm:px-5"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="animate-float-y">
              <VideoAvatar className="size-24" glow />
            </div>
            <h2 className="mt-5 bg-gradient-to-r from-brand-600 via-steel-500 to-brand-500 bg-clip-text text-2xl font-bold text-transparent dark:from-brand-400 dark:via-steel-300 dark:to-brand-300">
              {t('chat.empty.title', { name: assistantName })}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted">{t('chat.empty.subtitle')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  dir="auto"
                  onClick={() => send(s)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-sm text-fg shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-400"
                >
                  <Sparkles className="size-3.5 text-brand-500" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <span className="rounded-md bg-surface/80 px-3 py-1 text-[11px] font-medium text-muted shadow-sm backdrop-blur">
                {t('chat.today')}
              </span>
            </div>
            {messages.map((turn) => (
              <MessageBubble
                key={turn.id}
                turn={turn}
                onFeedback={handleFeedback}
                onType={() => scrollToBottom('auto')}
                onTyped={handleTyped}
              />
            ))}
            {loading && <ThinkingBubble />}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="relative z-10 border-t border-border bg-surface/80 backdrop-blur">
        <ChatComposer onSend={send} disabled={loading} placeholder={t('chat.placeholder')} />
      </div>
    </div>
  )
}
