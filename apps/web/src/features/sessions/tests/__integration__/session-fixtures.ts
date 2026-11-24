import type { FitScoreDocumentResponse, SessionDetail, SessionMessage, SessionSummary } from '@quarry/contracts'
import type { UIMessageChunk } from 'ai'
import { http, HttpResponse } from 'msw'
import { apiUrl } from '@/test/integration/handlers'
import { server } from '@/test/integration/server'

export const SESSION_ID = 'session-abc'
export const FIT_ID = 'fit-1'
export const JOB_URL = 'https://jobs.ashbyhq.com/halden/123'

export function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: SESSION_ID,
    title: 'Senior Product Engineer',
    company: 'Halden',
    source: 'ashby',
    fitScore: 86,
    fitLabel: 'strong-fit',
    status: 'ready',
    archivedAt: null,
    createdAt: '2026-11-22T10:00:00.000Z',
    ...overrides,
  }
}

export function userMessage(id: string, text: string): SessionMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] }
}

const FIT_METADATA = { icon: 'gauge', active: 'Scoring your fit', done: 'Scored your fit', failed: "Couldn't score your fit" }
const FETCH_METADATA = { icon: 'globe', active: 'Reading the job post', done: 'Read the job post', failed: "Couldn't read the job post" }

export function fitDocument(id = FIT_ID, score = 86, name = 'Halden fit') {
  return { kind: 'fit-score', id, name, score, label: score >= 80 ? 'strong-fit' : 'good-fit' } as const
}

// A stored reply: the job fetch, the fit score and a line of text.
export function fitReplyMessage(id = 'msg-reply', document = fitDocument()): SessionMessage {
  return {
    id,
    role: 'assistant',
    parts: [
      { type: 'step-start' },
      {
        type: 'tool-get_job_description',
        toolCallId: `${id}-fetch`,
        state: 'output-available',
        input: { url: JOB_URL },
        output: { ok: true, source: 'ashby', note: 'Ashby' },
        toolMetadata: FETCH_METADATA,
      },
      {
        type: 'tool-save_fit_score',
        toolCallId: `${id}-fit`,
        state: 'output-available',
        input: {},
        output: { document, note: `${document.score}%` },
        toolMetadata: FIT_METADATA,
      },
      { type: 'step-start' },
      { type: 'text', text: 'You line up well. Go is the main gap.', state: 'done' },
    ],
  }
}

export function detail(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: SESSION_ID,
    title: 'Senior Product Engineer',
    company: 'Halden',
    job: { url: JOB_URL, source: 'ashby', location: 'Remote' },
    status: 'ready',
    archivedAt: null,
    userMessageCount: 1,
    messageLimit: 40,
    messages: [userMessage('msg-1', `Score my fit for this job: ${JOB_URL}`), fitReplyMessage()],
    ...overrides,
  }
}

export function fitReport(overrides: Partial<FitScoreDocumentResponse> = {}): FitScoreDocumentResponse {
  return {
    id: FIT_ID,
    kind: 'fit-score',
    name: 'Halden fit',
    role: 'Senior Product Engineer',
    company: 'Halden',
    overall: 86,
    label: 'strong-fit',
    dimensions: {
      requirements: { score: 79, detail: '5 of 7 met, 1 partial' },
      skills: { score: 89, detail: '8 of 9 listed skills' },
      seniority: { score: 85, detail: 'About 4 years, asks 5+' },
      domain: { score: 100, detail: 'AI products, agents' },
    },
    strengths: ['Agent tooling shipped to production'],
    gaps: ['No production Go'],
    createdAt: '2026-11-22T10:01:00.000Z',
    ...overrides,
  }
}

// The chunks a first turn streams: the job fetch, the fit score, then a line of text.
export function fitTurnChunks(document = fitDocument(), messageId = 'msg-streamed'): UIMessageChunk[] {
  return [
    { type: 'start', messageId },
    { type: 'start-step' },
    { type: 'tool-input-available', toolCallId: 'call-fetch', toolName: 'get_job_description', input: { url: JOB_URL }, toolMetadata: FETCH_METADATA },
    { type: 'tool-output-available', toolCallId: 'call-fetch', output: { ok: true, source: 'ashby', note: 'Ashby' } },
    { type: 'tool-input-available', toolCallId: 'call-fit', toolName: 'save_fit_score', input: {}, toolMetadata: FIT_METADATA },
    { type: 'tool-output-available', toolCallId: 'call-fit', output: { document, note: `${document.score}%` } },
    { type: 'finish-step' },
    { type: 'start-step' },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: 'You line up well. Go is the main gap.' },
    { type: 'text-end', id: 'text-1' },
    { type: 'finish-step' },
    { type: 'finish' },
  ]
}

// An AI SDK UI message stream, as the turns endpoint sends it.
export function uiStream(chunks: UIMessageChunk[]) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new HttpResponse(body, {
    headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
  })
}

// `documentReads` holds the id of every document fetched, in order.
type Recorded = { turns: unknown[]; patches: unknown[]; sessionReads: number; documentReads: string[] }

// A session API backed by one in-memory session. A turn appends the streamed reply, as the server saves it.
export function serveSession(initial: SessionDetail, turnChunks: UIMessageChunk[] = fitTurnChunks()): Recorded {
  let session = initial
  const recorded: Recorded = { turns: [], patches: [], sessionReads: 0, documentReads: [] }

  server.use(
    http.get(apiUrl(`/api/sessions/${SESSION_ID}`), () => {
      recorded.sessionReads += 1
      return HttpResponse.json(session)
    }),
    http.get(apiUrl('/api/sessions'), ({ request }) => {
      const archived = new URL(request.url).searchParams.get('archived') === 'true'
      const items = Boolean(session.archivedAt) === archived
        ? [summary({ title: session.title, archivedAt: session.archivedAt, status: session.status })]
        : []
      return HttpResponse.json({ items, nextCursor: null })
    }),
    http.patch(apiUrl(`/api/sessions/${SESSION_ID}`), async ({ request }) => {
      const body = (await request.json()) as { archived: boolean }
      recorded.patches.push(body)
      session = { ...session, archivedAt: body.archived ? '2026-11-24T10:00:00.000Z' : null }
      return HttpResponse.json(summary({ archivedAt: session.archivedAt }))
    }),
    http.post(apiUrl(`/api/sessions/${SESSION_ID}/turns`), async ({ request }) => {
      const body = (await request.json()) as { message?: { id: string; text: string } }
      recorded.turns.push(body)
      const sent = body.message ? [userMessage(body.message.id, body.message.text)] : []
      // Saved as streamed: same id, same document.
      const start = turnChunks.find((chunk) => chunk.type === 'start')
      const output = turnChunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: 'tool-output-available' }> =>
          chunk.type === 'tool-output-available' && typeof chunk.output === 'object' && chunk.output !== null && 'document' in chunk.output,
      )
      const document = (output?.output as { document: ReturnType<typeof fitDocument> } | undefined)?.document
      const reply = fitReplyMessage(start?.messageId ?? `reply-${recorded.turns.length}`, document)
      session = {
        ...session,
        userMessageCount: session.userMessageCount + sent.length,
        messages: [...session.messages, ...sent, reply],
      }
      return uiStream(turnChunks)
    }),
    http.get(apiUrl(`/api/sessions/${SESSION_ID}/documents/fit-score/:documentId`), ({ params }) => {
      recorded.documentReads.push(String(params.documentId))
      return HttpResponse.json(fitReport({ id: String(params.documentId) }))
    }),
  )

  return recorded
}
