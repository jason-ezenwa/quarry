import type { ChatErrorCode, TurnErrorCode } from './chat.types'

// Turns the server turned away without storing the message.
export const REFUSED_TURN_CODES: ReadonlySet<TurnErrorCode> = new Set<TurnErrorCode>([
  'primary-resume-not-ready',
  'turn-running',
  'session-archived',
  'session-message-limit',
  'nothing-to-answer',
  'interview-ended',
])

// The only turn errors the chat shows; the composer explains the archived and limit states.
export const CHAT_ERRORS = {
  'not-sent': "Your message wasn't sent. Try sending it again.",
  'resume-not-ready': "Your resume is being read or couldn't be read. Check it on the Resume page, then send your message again.",
  failed: 'Something went wrong. Try again.',
  stopped: 'You stopped this reply.',
  unanswered: "This message hasn't been answered.",
  declined: "Wren couldn't answer that message, so it's back in the box. Try rewording it.",
  'declined-first': "Wren couldn't work on this job. Start a new application and word it differently.",
} as const

// Errors the chat offers a Retry for.
export const RETRYABLE_CHAT_ERRORS: ReadonlySet<ChatErrorCode> = new Set<ChatErrorCode>(['failed', 'stopped', 'unanswered'])
