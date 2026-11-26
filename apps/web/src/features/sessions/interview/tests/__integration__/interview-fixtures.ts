import { INTERVIEW_FIRST_MESSAGE, type InterviewFeedback, type InterviewState, type SessionDetail, type SessionMessage } from '@quarry/contracts'
import type { UIMessageChunk } from 'ai'
import { http, HttpResponse, type JsonBodyType } from 'msw'
import { apiUrl } from '@/test/integration/handlers'
import { server } from '@/test/integration/server'
import { JOB_URL, SESSION_ID, summary, uiStream, userMessage } from '../../../tests/__integration__/session-fixtures'

export const INTERVIEW_ID = 'interview-1'
export const APPLICATION_ID = SESSION_ID
export const INTERVIEW_PATH = `/interviews/${INTERVIEW_ID}`

const SETUP_METADATA = { icon: 'play', active: 'Kicking off interview', done: 'Kicked off interview', failed: "Couldn't kick off the interview" }
const ASK_METADATA = { icon: 'list', active: 'Asking a question', done: 'Asked a question', failed: "Couldn't ask the question" }
const END_METADATA = { icon: 'flag', active: 'Ending interview and writing feedback', done: 'Ended interview and wrote feedback', failed: "Couldn't end the interview" }

export const QUESTIONS = [
  'Walk me through the browser agent you built.',
  'Tell me about a time you cut scope to ship.',
  'How would you design rate limits for an AI feature?',
] as const

export const FEEDBACK: InterviewFeedback = {
  wentWell: ['Clear story behind the browser agent', 'Numbers in almost every answer'],
  toImprove: ['System design answers ran long', 'Name the trade-off before the solution'],
  strongerAnswers: [
    {
      question: QUESTIONS[1],
      said: 'We had a launch date, so I dropped some features.',
      stronger: 'Two weeks out, I cut voice input and kept batch tool calling, because it carried the core flow.',
    },
    {
      question: QUESTIONS[0],
      said: 'I built it on Playwright.',
      stronger: 'I built it on Playwright with batch tool calling, which cut round trips five to ten times.',
    },
  ],
  additionalNotes: 'You asked whether your rate limit answer was right: token buckets per user were the right call.',
}

export function endedState(overrides: Partial<InterviewState> = {}): InterviewState {
  return { totalQuestions: 4, questionCount: 2, endedAt: '2026-11-21T10:30:00.000Z', feedback: FEEDBACK, ...overrides }
}

// A stored reply that sets the interview up and asks its first question.
export function setupReply(id = 'reply-setup'): SessionMessage {
  return {
    id,
    role: 'assistant',
    parts: [
      { type: 'step-start' },
      { type: 'tool-setup_interview', toolCallId: `${id}-setup`, state: 'output-available', input: { title: 'Technical round', totalQuestions: 4 }, output: { ok: true }, toolMetadata: SETUP_METADATA },
      { type: 'tool-ask_interview_question', toolCallId: `${id}-q1`, state: 'output-available', input: { question: QUESTIONS[0] }, output: { ok: true, number: 1, totalQuestions: 4 }, toolMetadata: ASK_METADATA },
    ],
  }
}

// A stored reply that asks question `number`.
export function questionReply(id: string, number: number): SessionMessage {
  return {
    id,
    role: 'assistant',
    parts: [
      { type: 'step-start' },
      { type: 'text', text: 'Thanks, that helps.', state: 'done' },
      { type: 'tool-ask_interview_question', toolCallId: `${id}-q`, state: 'output-available', input: { question: QUESTIONS[number - 1] }, output: { ok: true, number, totalQuestions: 4 }, toolMetadata: ASK_METADATA },
    ],
  }
}

// The chunks of a reply that sets the interview up and asks its first question.
export function setupChunks(messageId = 'reply-setup'): UIMessageChunk[] {
  return [
    { type: 'start', messageId },
    { type: 'start-step' },
    { type: 'tool-input-available', toolCallId: `${messageId}-setup`, toolName: 'setup_interview', input: { title: 'Technical round', totalQuestions: 4 }, toolMetadata: SETUP_METADATA },
    { type: 'tool-output-available', toolCallId: `${messageId}-setup`, output: { ok: true } },
    { type: 'tool-input-available', toolCallId: `${messageId}-q1`, toolName: 'ask_interview_question', input: { question: QUESTIONS[0] }, toolMetadata: ASK_METADATA },
    { type: 'tool-output-available', toolCallId: `${messageId}-q1`, output: { ok: true, number: 1, totalQuestions: 4 } },
    { type: 'finish-step' },
    { type: 'finish' },
  ]
}

// The chunks of a reply that asks question `number`.
export function questionChunks(messageId: string, number: number): UIMessageChunk[] {
  return [
    { type: 'start', messageId },
    { type: 'start-step' },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: 'Thanks, that helps.' },
    { type: 'text-end', id: 'text-1' },
    { type: 'tool-input-available', toolCallId: `${messageId}-q`, toolName: 'ask_interview_question', input: { question: QUESTIONS[number - 1] }, toolMetadata: ASK_METADATA },
    { type: 'tool-output-available', toolCallId: `${messageId}-q`, output: { ok: true, number, totalQuestions: 4 } },
    { type: 'finish-step' },
    { type: 'finish' },
  ]
}

// The chunks of a reply in which Wren ends the interview.
export function endChunks(messageId = 'reply-end'): UIMessageChunk[] {
  return [
    { type: 'start', messageId },
    { type: 'start-step' },
    { type: 'tool-input-available', toolCallId: `${messageId}-end`, toolName: 'end_interview', input: {}, toolMetadata: END_METADATA },
    { type: 'tool-output-available', toolCallId: `${messageId}-end`, output: { ok: true } },
    { type: 'finish-step' },
    { type: 'finish' },
  ]
}

function storedFrom(chunks: UIMessageChunk[]): SessionMessage {
  const start = chunks.find((chunk) => chunk.type === 'start')
  const parts: object[] = []

  for (const chunk of chunks) {
    if (chunk.type === 'text-delta') parts.push({ type: 'text', text: chunk.delta, state: 'done' })

    if (chunk.type === 'tool-input-available') {
      const output = chunks.find((other) => other.type === 'tool-output-available' && other.toolCallId === chunk.toolCallId)

      parts.push({
        type: `tool-${chunk.toolName}`,
        toolCallId: chunk.toolCallId,
        state: 'output-available',
        input: chunk.input,
        output: output?.type === 'tool-output-available' ? output.output : undefined,
        toolMetadata: chunk.toolMetadata,
      })
    }
  }

  return { id: start?.type === 'start' ? (start.messageId ?? 'reply') : 'reply', role: 'assistant', parts }
}

// An interview right after it was started: the first message, not answered yet.
export function interviewDetail(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: INTERVIEW_ID,
    kind: 'interview',
    title: 'New interview',
    company: 'Halden',
    job: { url: JOB_URL, source: 'ashby', location: 'Remote', hasDescription: true },
    status: 'ready',
    archivedAt: null,
    userMessageCount: 1,
    messageLimit: 40,
    messages: [userMessage('msg-first', INTERVIEW_FIRST_MESSAGE)],
    parentSession: { id: APPLICATION_ID, title: 'Senior Product Engineer', company: 'Halden' },
    interview: { questionCount: 0 },
    ...overrides,
  }
}

// Two questions asked and the first answered.
export function midInterview(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return interviewDetail({
    title: 'Technical round',
    userMessageCount: 2,
    messages: [
      userMessage('msg-first', INTERVIEW_FIRST_MESSAGE),
      setupReply(),
      userMessage('msg-a1', 'I built it on Playwright.'),
      questionReply('reply-q2', 2),
    ],
    interview: { totalQuestions: 4, questionCount: 2 },
    ...overrides,
  })
}

type Turn = {
  chunks: UIMessageChunk[]
  // Applied to the session once the reply is saved, as the server's tools would.
  after?: (session: SessionDetail) => Partial<SessionDetail>
}

type EndResponse = { status: number; body: JsonBodyType }

type Recorded = { turns: unknown[]; ends: number; starts: number }

// One in-memory interview, its turns answered in order. `end` is what the End endpoint answers;
// by default it saves the feedback.
export function serveInterview(initial: SessionDetail, { turns = [], end }: { turns?: Turn[]; end?: EndResponse } = {}): Recorded {
  let session = initial
  const recorded: Recorded = { turns: [], ends: 0, starts: 0 }

  server.use(
    http.get(apiUrl(`/api/sessions/${INTERVIEW_ID}`), () => HttpResponse.json(session)),
    http.get(apiUrl('/api/sessions'), () => HttpResponse.json({ items: [], nextCursor: null })),
    http.get(apiUrl('/api/usage'), () =>
      HttpResponse.json({
        sessions: { used: 1, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' },
        interviews: { used: 1, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' },
      }),
    ),
    http.post(apiUrl(`/api/sessions/${INTERVIEW_ID}/turns`), async ({ request }) => {
      const body = (await request.json()) as { message?: { id: string; text: string } }
      recorded.turns.push(body)
      const turn = turns[recorded.turns.length - 1]
      if (!turn) return HttpResponse.json({ statusCode: 500, message: 'No turn' }, { status: 500 })

      const sent = body.message ? [userMessage(body.message.id, body.message.text)] : []

      session = {
        ...session,
        userMessageCount: session.userMessageCount + sent.length,
        messages: [...session.messages, ...sent, storedFrom(turn.chunks)],
      }

      session = { ...session, ...turn.after?.(session) }
      return uiStream(turn.chunks)
    }),
    http.post(apiUrl(`/api/sessions/${INTERVIEW_ID}/interview/end`), () => {
      recorded.ends += 1
      if (end) return HttpResponse.json(end.body, { status: end.status })

      const interview = endedState({ questionCount: session.interview?.questionCount ?? 0 })
      session = { ...session, interview }
      return HttpResponse.json(interview)
    }),
    http.post(apiUrl(`/api/sessions/${APPLICATION_ID}/interviews`), () => {
      recorded.starts += 1
      return HttpResponse.json(summary({ id: 'interview-2', kind: 'interview', title: 'New interview' }), { status: 201 })
    }),
  )

  return recorded
}

// The interview Practice again opens: its first message is answered with a setup.
export function serveNextInterview(detail: SessionDetail): { turns: unknown[] } {
  const recorded = { turns: [] as unknown[] }
  let session = detail

  server.use(
    http.get(apiUrl(`/api/sessions/${detail.id}`), () => HttpResponse.json(session)),
    http.post(apiUrl(`/api/sessions/${detail.id}/turns`), async ({ request }) => {
      recorded.turns.push(await request.json())
      const chunks = setupChunks('reply-next')
      session = { ...session, messages: [...session.messages, storedFrom(chunks)] }
      return uiStream(chunks)
    }),
  )

  return recorded
}

// Starting an interview from the application is refused with this response.
export function refuseStart(status: number, body: JsonBodyType) {
  server.use(http.post(apiUrl(`/api/sessions/${APPLICATION_ID}/interviews`), () => HttpResponse.json(body, { status })))
}

// Turns are refused because the interview ended elsewhere.
export function refuseTurn() {
  server.use(
    http.post(apiUrl(`/api/sessions/${INTERVIEW_ID}/turns`), () =>
      HttpResponse.json({ statusCode: 409, code: 'interview-ended', message: 'Interview ended' }, { status: 409 }),
    ),
  )
}
