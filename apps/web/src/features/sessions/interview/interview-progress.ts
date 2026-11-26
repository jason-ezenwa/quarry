import type { InterviewState } from '@quarry/contracts'
import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import { isRecord, questionFrom } from '../session-parts'
import { INTERVIEW_TOOLS } from '../sessions.constants'
import type { InterviewProgressState } from './interview.types'

// From the messages, so a streaming setup or question shows before the refetch; from the stored
// state when the messages hold no numbers.
export function interviewProgress(messages: UIMessage[], interview: InterviewState | undefined): InterviewProgressState {
  let title: string | null = null
  let total: number | null = null
  let asked = 0
  let currentQuestionId: string | null = null

  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue

      const output: unknown = part.state === 'output-available' ? part.output : undefined
      const input: unknown = part.input

      if (getToolName(part) === INTERVIEW_TOOLS.setup && isRecord(output) && output.ok !== false && isRecord(input)) {
        if (typeof input.title === 'string') title = input.title
        if (typeof input.totalQuestions === 'number') total = input.totalQuestions
        continue
      }

      const question = questionFrom(part)
      if (!question?.question.trim()) continue
      currentQuestionId = part.toolCallId
      if (question.number !== null) asked = Math.max(asked, question.number)
      if (isRecord(output) && typeof output.totalQuestions === 'number') total = output.totalQuestions
    }
  }

  return {
    title,
    total: interview?.totalQuestions ?? total,
    asked: Math.max(asked, interview?.questionCount ?? 0),
    currentQuestionId,
  }
}
