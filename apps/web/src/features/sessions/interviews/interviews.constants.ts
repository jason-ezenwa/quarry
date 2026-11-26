import type { SessionErrorCode } from '@quarry/contracts'
import { ChatsCircleIcon } from '@phosphor-icons/react/dist/csr/ChatsCircle'
import type { BadgeVariant } from '../sessions.types'

export const INTERVIEWS_TAB = 'interviews'

export const INTERVIEWS_ICON = ChatsCircleIcon

// The pill on an interview row: live until its feedback is saved.
export const INTERVIEW_STATUS_DISPLAY = {
  live: { label: 'In progress', variant: 'interview' },
  // On the Interviews page.
  ended: { label: 'Ended', variant: 'neutral' },
  // On an application's Interviews tab.
  finished: { label: 'Finished', variant: 'neutral' },
} as const satisfies Record<string, { label: string; variant: BadgeVariant }>

// Why opening an interview failed. The monthly limit is worded with its numbers.
export const START_INTERVIEW_ERRORS: Partial<Record<SessionErrorCode, string>> = {
  'application-archived': 'This application is archived. Unarchive it to practise an interview.',
  'job-description-missing': 'This application has no job description to interview you on.',
  'primary-resume-not-ready': "Your resume isn't ready yet. Check it on the Resume page, then try again.",
}

export const START_INTERVIEW_FAILED = "We couldn't start the interview. Try again."
