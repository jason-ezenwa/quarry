import { isOneOf, SESSION_ERROR_CODES, SESSION_LIMITS, type InterviewSummary, type MonthlyInterviewLimitError } from '@quarry/contracts'
import { ApiError } from '@/lib/api/api-fetch'
import { formatResetDate } from '../session-format'
import { START_INTERVIEW_ERRORS, START_INTERVIEW_FAILED } from './interviews.constants'

// "3 of 6 questions", once the interview is set up and has a total.
export function questionProgress({ questionCount, totalQuestions }: InterviewSummary): string | null {
  return totalQuestions === undefined ? null : `${questionCount} of ${totalQuestions} questions`
}

// What to tell the user when starting or resuming an interview failed.
export function startInterviewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError) || !isOneOf(SESSION_ERROR_CODES, error.code)) return START_INTERVIEW_FAILED

  if (error.code === 'monthly-interview-limit') {
    const body: Partial<Record<keyof MonthlyInterviewLimitError, unknown>> = error.body ?? {}
    const limit = typeof body.limit === 'number' ? body.limit : SESSION_LIMITS.interviewsPerMonth
    const more = typeof body.resetsAt === 'string' ? ` More on ${formatResetDate(body.resetsAt)}.` : ''
    return `You've used all ${limit} interviews this month.${more}`
  }

  return START_INTERVIEW_ERRORS[error.code] ?? START_INTERVIEW_FAILED
}
