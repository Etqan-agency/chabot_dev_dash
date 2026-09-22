import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { chatApi, configApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import type { ChatTurn, FeedbackRating } from '@/components/chat/types'
import type { ChatMessage } from '@/types/api'

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e6)}`
}

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Chat state + actions shared by the full chat page and the floating widget:
 * message list, send (with last-4-pairs history), feedback, typewriter done,
 * clear, and the assistant identity from /chatbot-config/.
 */
export function useChatSession() {
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [loading, setLoading] = useState(false)

  const { data: config } = useQuery({
    queryKey: ['chatbot-config'],
    queryFn: configApi.get,
    staleTime: 5 * 60_000,
  })
  const assistantName = config?.assistant_name?.trim() || 'Assistant'
  const company = config?.company_name?.trim()

  async function send(text: string) {
    if (loading) return
    const question = text.trim()
    if (!question) return

    // History = the last 4 question/answer pairs (8 messages), excluding errors.
    const history: ChatMessage[] = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-8)

    setMessages((m) => [...m, { id: newId(), role: 'user', content: question, time: nowTime() }])
    setLoading(true)

    try {
      const res = await chatApi.send({ question, history })
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          role: 'assistant',
          content: res.answer,
          question,
          sources: res.sources,
          confident: res.confident,
          responseMs: res.response_time_ms,
          feedback: null,
          time: nowTime(),
          animate: true,
        },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: newId(), role: 'assistant', content: getApiErrorMessage(err), error: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleFeedback(turn: ChatTurn, rating: FeedbackRating) {
    const next = turn.feedback === rating ? null : rating
    setMessages((m) => m.map((t) => (t.id === turn.id ? { ...t, feedback: next } : t)))
    if (!next) return
    void chatApi
      .feedback({
        question: turn.question ?? '',
        answer: turn.content,
        source: 'rag',
        source_id: '',
        rating,
      })
      .catch(() => {
        /* non-blocking */
      })
  }

  function handleTyped(turn: ChatTurn) {
    setMessages((m) => m.map((t) => (t.id === turn.id ? { ...t, animate: false } : t)))
  }

  function clear() {
    setMessages([])
  }

  return {
    messages,
    loading,
    send,
    handleFeedback,
    handleTyped,
    clear,
    assistantName,
    company,
  }
}
