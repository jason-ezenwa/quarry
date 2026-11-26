import type { SessionErrorCode } from '@quarry/contracts'
import { PATHS } from '@/lib/auth/auth.constants'

// Why the End button didn't end the interview. Anything else gets the fallback.
export const END_ERRORS: Partial<Record<SessionErrorCode, string>> = {
  'nothing-to-review': 'Answer at least one question before ending the interview.',
  'feedback-failed': "Couldn't write the feedback, try ending again.",
  'turn-running': 'Wait for Wren to finish its reply, then end the interview.',
}

export const END_FAILED = "We couldn't end the interview. Try again."

export const FEEDBACK_TAB = 'feedback'

export const FEEDBACK_PENDING = 'Your feedback appears here once the interview ends.'

export const INTERVIEW_CRUMBS = [{ label: 'Interviews', to: PATHS.interviews }]
