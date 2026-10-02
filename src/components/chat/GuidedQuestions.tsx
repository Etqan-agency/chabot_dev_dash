import { ChevronRight, Home } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import type { GuidedTreeNode } from '@/types/api'

/** The tappable options under the conversation, styled like the end-user bot. */
export function GuidedOptions({
  options,
  atRoot,
  onPick,
  onHome,
  disabled,
}: {
  options: GuidedTreeNode[]
  atRoot: boolean
  onPick: (node: GuidedTreeNode) => void
  onHome: () => void
  disabled?: boolean
}) {
  const { t } = useI18n()

  return (
    <div className="mx-auto flex w-full max-w-lg animate-msg-in flex-col items-stretch gap-2 pt-2">
      {options.length > 0 && (
        <p className="text-center text-xs font-medium text-muted">{t('chat.guided.choose')}</p>
      )}
      {!atRoot && (
        <button
          onClick={onHome}
          className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Home className="size-4" /> {t('chat.guided.home')}
        </button>
      )}
      {options.map((o, i) => (
        <button
          key={o.id}
          dir="auto"
          disabled={disabled}
          onClick={() => onPick(o)}
          className="flex animate-msg-in items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-center text-sm font-medium text-fg shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-400"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span className="min-w-0">{o.title}</span>
          {o.children.length > 0 && (
            <ChevronRight className="size-3.5 shrink-0 text-faint rtl:rotate-180" />
          )}
        </button>
      ))}
    </div>
  )
}
