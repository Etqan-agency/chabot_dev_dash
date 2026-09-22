import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useClipboard } from '@/hooks/useClipboard'

/** A monospace value with a copy button. Used for API keys. */
export function CopyField({ value, className }: { value: string; className?: string }) {
  const { copied, copy } = useClipboard()
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-surface2 px-2.5 py-1.5',
        className,
      )}
    >
      <code className="flex-1 truncate font-mono text-xs text-fg" dir="ltr">
        {value}
      </code>
      <button
        type="button"
        onClick={() => void copy(value)}
        className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-fg"
        aria-label="Copy"
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </button>
    </div>
  )
}

/** Inline copy icon-button for tight table cells. */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { copied, copy } = useClipboard()
  return (
    <button
      type="button"
      onClick={() => void copy(value)}
      title={label ?? 'Copy'}
      aria-label={label ?? 'Copy'}
      className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-fg"
    >
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
    </button>
  )
}
