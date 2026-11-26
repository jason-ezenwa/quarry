import type { ApplicationInterview, SessionDetail, SessionSummary } from '@quarry/contracts'
import { INTERVIEW_FIRST_MESSAGE } from '@quarry/contracts'
import { detail, SESSION_ID, summary, userMessage } from '@/features/sessions/tests/__integration__/session-fixtures'

export const INTERVIEW_ID = 'interview-1'

// An interview row on the Interviews page, started from the default application.
export function interviewSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return summary({
    id: INTERVIEW_ID,
    kind: 'interview',
    title: 'Technical round',
    source: null,
    fitScore: null,
    fitLabel: null,
    createdAt: '2026-11-24T10:00:00.000Z',
    parentSession: { id: SESSION_ID, title: 'Senior Product Engineer', company: 'Halden' },
    interview: { questionCount: 3, totalQuestions: 6 },
    ...overrides,
  })
}

// An application's interview, as its Interviews tab lists it.
export function applicationInterview(overrides: Partial<ApplicationInterview> = {}): ApplicationInterview {
  return { id: INTERVIEW_ID, title: 'Technical round', createdAt: '2026-11-24T10:00:00.000Z', endedAt: null, ...overrides }
}

// An interview whose greeting is already answered, so opening it starts no turn.
export function interviewDetail(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return detail({
    id: INTERVIEW_ID,
    kind: 'interview',
    title: 'New interview',
    parentSession: { id: SESSION_ID, title: 'Senior Product Engineer', company: 'Halden' },
    interview: { questionCount: 0 },
    messages: [
      userMessage('interview-msg-1', INTERVIEW_FIRST_MESSAGE),
      { id: 'interview-msg-2', role: 'assistant', parts: [{ type: 'text', text: 'Hi Ada. What kind of interview is this?', state: 'done' }] },
    ],
    ...overrides,
  })
}
