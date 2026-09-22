import { useEffect, useRef, useState } from 'react'
import { Markdown } from './Markdown'

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Reveals a Markdown answer progressively, ChatGPT-style. The API returns the
 * full answer at once (no streaming), so we animate the reveal client-side.
 * `onType` fires each tick (used to keep the view scrolled to the bottom).
 */
export function TypewriterMarkdown({
  text,
  onType,
  onDone,
}: {
  text: string
  onType?: () => void
  onDone?: () => void
}) {
  const [count, setCount] = useState(prefersReduced ? text.length : 0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (count >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true
        onDone?.()
      }
      return
    }
    // Reveal a few characters per tick; longer answers reveal faster so they
    // don't drag on. ~caps total animation around a couple of seconds.
    const step = Math.max(2, Math.round(text.length / 140))
    const id = window.setTimeout(() => {
      setCount((c) => Math.min(text.length, c + step))
      onType?.()
    }, 16)
    return () => window.clearTimeout(id)
  }, [count, text, onType, onDone])

  const typing = count < text.length
  // Append a caret glyph inline so it sits at the end of the streamed text.
  const shown = text.slice(0, count) + (typing ? ' ▌' : '')

  return <Markdown>{shown}</Markdown>
}
