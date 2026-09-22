import type { ChatSource } from '@/types/api'

export type FeedbackRating = 'up' | 'down'

export interface ChatTurn {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Local send/receive time, formatted HH:MM for the bubble. */
  time?: string
  /** When true the answer reveals with a typewriter animation. */
  animate?: boolean
  /** The user question this answer responds to (used for feedback). */
  question?: string
  sources?: ChatSource[]
  confident?: boolean
  responseMs?: number
  /** True when this assistant turn represents a failed request. */
  error?: boolean
  feedback?: FeedbackRating | null
}
