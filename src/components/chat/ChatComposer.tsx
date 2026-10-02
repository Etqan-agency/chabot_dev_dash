import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Mic, Send, Smile } from 'lucide-react'
import { cn } from '@/lib/cn'

export function ChatComposer({
  onSend,
  disabled,
  locked,
  placeholder = 'Type a message',
}: {
  onSend: (text: string) => void
  disabled?: boolean
  /** No typing at all (e.g. the guided-questions mode); `disabled` only blocks sending. */
  locked?: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-grow the textarea up to a max height.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [value])

  function submit() {
    const text = value.trim()
    if (!text || disabled || locked) return
    onSend(text)
    setValue('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const canSend = value.trim().length > 0 && !disabled && !locked

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-2.5 sm:px-4">
      {/* Input pill */}
      <div className="flex flex-1 items-end gap-1.5 rounded-3xl bg-surface px-3 py-1.5 shadow-sm">
        <Smile className="mb-1.5 size-5 shrink-0 text-faint" />
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={locked}
          dir="auto"
          className="max-h-30 flex-1 resize-none bg-transparent disabled:cursor-not-allowed py-1.5 text-[15px] text-fg placeholder:text-faint focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Round send / mic button */}
      <button
        type="submit"
        disabled={disabled || locked}
        aria-label={canSend ? 'Send' : 'Voice message'}
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full text-navy-900 transition-all active:scale-95 disabled:opacity-60',
          'bg-gradient-to-br from-brand-300 to-brand-500 hover:from-brand-200 hover:to-brand-400',
          canSend
            ? 'shadow-[0_0_18px_-2px_rgba(229,162,60,0.7)] ring-2 ring-brand-300/60'
            : 'shadow-md',
        )}
      >
        {canSend ? (
          <Send className="size-5 -translate-x-px translate-y-px" />
        ) : (
          <Mic className="size-5" />
        )}
      </button>
    </form>
  )
}
