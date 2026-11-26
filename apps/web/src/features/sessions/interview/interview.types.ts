import type { ComposerStatus } from '@/components/session/session.types'

// `title` and `total` come from setup, and are null until it has run.
// `currentQuestionId`: the tool call of the newest question, the one being answered.
export type InterviewProgressState = {
  title: string | null
  total: number | null
  asked: number
  currentQuestionId: string | null
}

// The composer's state, with why it is closed: the interview ended, or used its messages.
export type InterviewComposerState = Exclude<ComposerStatus, 'closed'> | 'ended' | 'limit'
