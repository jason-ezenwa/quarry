import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, signInAs } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'
import { setViewport } from '@/test/integration/viewport'
import {
  detail,
  fitDocument,
  fitTurnChunks,
  JOB_URL,
  openUiStream,
  serveSession,
  SESSION_ID,
  summary,
  uiStream,
  userMessage,
} from './session-fixtures'

const SESSION_PATH = `/applications/${SESSION_ID}`

// A session right after creation: the first message, not answered yet.
function freshSession(text = `Score my fit for this job: ${JOB_URL}`) {
  return detail({ title: 'New application', company: null, messages: [userMessage('msg-1', text)] })
}

describe('Home: new application (integration)', () => {
  it('starts a session from a job link and streams the first turn to a fit report', async () => {
    setViewport('desktop')
    signInAs()
    const created: unknown[] = []
    server.use(
      http.post(apiUrl('/api/sessions'), async ({ request }) => {
        created.push(await request.json())
        return HttpResponse.json({ id: SESSION_ID }, { status: 201 })
      }),
    )
    const recorded = serveSession(freshSession())
    const router = renderRoute('/')

    await userEvent.type(await screen.findByRole('textbox', { name: 'Job link' }), JOB_URL)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(await screen.findByText('You line up well. Go is the main gap.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(SESSION_PATH)
    expect(created).toEqual([{ jobUrl: JOB_URL }])
    // The stored first message is answered once, with no message resent.
    expect(recorded.turns).toEqual([{}])
    expect(screen.getByRole('button', { name: 'Open fit report: Halden fit' })).toBeInTheDocument()
    // The panel is open by default on desktop, on the fit report.
    const panel = screen.getByRole('complementary', { name: 'Output' })
    expect(await within(panel).findByText('86%')).toBeInTheDocument()
    expect(within(panel).getByText('Strong fit')).toBeInTheDocument()
  })

  it('starts a session from a pasted description', async () => {
    signInAs()
    const created: unknown[] = []
    server.use(
      http.post(apiUrl('/api/sessions'), async ({ request }) => {
        created.push(await request.json())
        return HttpResponse.json({ id: SESSION_ID }, { status: 201 })
      }),
    )
    serveSession(freshSession('Score my fit for this job:\n\nWe need a senior engineer.'))
    renderRoute('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Paste a description instead' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Job description' }), 'We need a senior engineer.')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(await screen.findByText('You line up well. Go is the main gap.')).toBeInTheDocument()
    expect(created).toEqual([{ jobDescription: 'We need a senior engineer.' }])
  })

  it('refuses a link that is not http(s) without calling the API', async () => {
    signInAs()
    renderRoute('/')

    await userEvent.type(await screen.findByRole('textbox', { name: 'Job link' }), 'not a link')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(await screen.findByText('Paste a job link that starts with http:// or https://')).toBeInTheDocument()
  })

  it('shows the monthly limit with the reset date', async () => {
    signInAs()
    server.use(
      http.post(apiUrl('/api/sessions'), () =>
        HttpResponse.json(
          {
            statusCode: 429,
            code: 'monthly-session-limit',
            message: 'Monthly limit reached',
            used: 10,
            limit: 10,
            resetsAt: '2026-12-01T00:00:00.000Z',
          },
          { status: 429 },
        ),
      ),
    )
    const router = renderRoute('/')

    await userEvent.type(await screen.findByRole('textbox', { name: 'Job link' }), JOB_URL)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(await screen.findByText(/You've used all 10 applications this month\. More on December 1\./)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('lists recent applications and the month count', async () => {
    setViewport('desktop')
    signInAs()
    server.use(
      http.get(apiUrl('/api/sessions'), () => HttpResponse.json({ items: [summary()], nextCursor: null })),
      http.get(apiUrl('/api/usage'), () =>
        HttpResponse.json({ sessions: { used: 4, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' } }),
      ),
    )
    renderRoute('/')

    const recent = await screen.findByRole('region', { name: 'Recent' })
    expect(await within(recent).findByRole('link', { name: /Senior Product Engineer/ })).toHaveAttribute('href', SESSION_PATH)
    expect(within(recent).getByText('4 of 10 this month')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Applications' })).toHaveAttribute('value', '4')
  })
})

describe('Session page (integration)', () => {
  it('sends only the new message and shows the reply', async () => {
    setViewport('desktop')
    signInAs()
    const recorded = serveSession(detail())
    renderRoute(SESSION_PATH)

    const composer = await screen.findByRole('textbox', { name: 'Message' })
    await waitFor(() => expect(recorded.documentReads).toHaveLength(1))
    const sessionReads = recorded.sessionReads
    await userEvent.type(composer, 'Lead with the agent work{Enter}')

    await waitFor(() => expect(screen.getAllByText('You line up well. Go is the main gap.')).toHaveLength(2))
    expect(recorded.turns).toEqual([{ message: { id: expect.any(String), text: 'Lead with the agent work' } }])
    expect(screen.getByText('Lead with the agent work')).toBeInTheDocument()
    // Refreshing the session after the turn leaves documents already fetched alone.
    await waitFor(() => expect(recorded.sessionReads).toBeGreaterThan(sessionReads))
    await waitFor(() => expect(within(screen.getByRole('complementary', { name: 'Output' })).getByText('86%')).toBeInTheDocument())
    expect(recorded.documentReads).toEqual([...new Set(recorded.documentReads)])
  })

  it('draws the reply Markdown instead of showing its symbols', async () => {
    signInAs()
    const reply = { id: 'reply-md', role: 'assistant' as const, parts: [{ type: 'text', text: '- **Gaps:** Go is missing' }] }
    serveSession(detail({ messages: [userMessage('msg-1', 'Hi'), reply] }))
    renderRoute(SESSION_PATH)

    const item = await screen.findByRole('listitem')
    expect(item).toHaveTextContent('Gaps: Go is missing')
    expect(within(item).getByText('Gaps:').tagName).toBe('STRONG')
  })

  it('does not start a turn when the last message is already answered', async () => {
    signInAs()
    const recorded = serveSession(detail())
    renderRoute(SESSION_PATH)

    expect(await screen.findByText('You line up well. Go is the main gap.')).toBeInTheDocument()
    expect(recorded.turns).toEqual([])
  })

  it('draws tool steps from their metadata, refusals with their failed text, and falls back to the gear without metadata', async () => {
    signInAs()
    const reply = {
      id: 'msg-reply',
      role: 'assistant' as const,
      parts: [
        { type: 'tool-get_job_description', toolCallId: 'a', state: 'output-available', input: {}, output: { note: 'Ashby' }, toolMetadata: { icon: 'globe', active: 'Reading the job post', done: 'Read the job post', failed: "Couldn't read the job post" } },
        { type: 'tool-mystery', toolCallId: 'b', state: 'output-available', input: {}, output: {} },
        { type: 'tool-get_job_description', toolCallId: 'd', state: 'output-available', input: {}, output: { ok: false, note: 'LinkedIn blocks us' }, toolMetadata: { icon: 'globe', active: 'Reading the job post', done: 'Read the job post', failed: "Couldn't read the job post" } },
        { type: 'tool-odd_icon', toolCallId: 'c', state: 'output-available', input: {}, output: {}, toolMetadata: { icon: 'not-an-icon', active: 'Doing', done: 'Did' } },
        { type: 'text', text: 'Done.' },
      ],
    }
    serveSession(detail({ messages: [userMessage('msg-1', 'Hi'), reply] }))
    renderRoute(SESSION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: '4 steps' }))

    expect(screen.getByText('Read the job post')).toBeInTheDocument()
    expect(screen.getByText('Ashby')).toBeInTheDocument()
    expect(screen.getByText("Couldn't read the job post")).toBeInTheDocument()
    expect(screen.getByText('LinkedIn blocks us')).toBeInTheDocument()
    expect(screen.getAllByText('Worked')).toHaveLength(2)
    expect(screen.queryByText('Did')).not.toBeInTheDocument()
  })

  it('keeps the panel on its tab when a new output arrives, and a card opens its own document', async () => {
    setViewport('desktop')
    signInAs()
    serveSession(detail(), fitTurnChunks(fitDocument('fit-2', 72, 'Halden fit, rescored')))
    renderRoute(SESSION_PATH)

    const panel = await screen.findByRole('complementary', { name: 'Output' })
    expect(await within(panel).findByText('86%')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('tab', { name: 'Resume' }))

    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Rescore it{Enter}')
    await screen.findByRole('button', { name: 'Open fit report: Halden fit, rescored' })
    expect(within(panel).getByRole('tab', { name: 'Resume' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Open fit report: Halden fit' }))
    expect(within(panel).getByRole('tab', { name: 'Fit report' })).toHaveAttribute('aria-selected', 'true')
    expect(await within(panel).findByRole('article', { name: 'Fit report: Halden fit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open fit report: Halden fit' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens a document full screen on a phone', async () => {
    setViewport('phone')
    signInAs()
    serveSession(detail())
    renderRoute(SESSION_PATH)

    expect(await screen.findByText('You line up well. Go is the main gap.')).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Output' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open fit report: Halden fit' }))

    const dialog = await screen.findByRole('dialog', { name: 'Halden' })
    expect(await within(dialog).findByText('86%')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('archives into the Archived tab with the composer closed, and unarchives back', async () => {
    signInAs()
    const recorded = serveSession(detail())
    renderRoute(SESSION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'More' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }))

    expect(await screen.findByText(/This application is archived/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled()

    await userEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Applications' }))
    expect(await screen.findByText('No applications yet.', { exact: false })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Archived' }))
    await userEvent.click(await screen.findByRole('link', { name: /Senior Product Engineer/ }))

    await userEvent.click(await screen.findByRole('button', { name: 'More' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Unarchive' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Message' })).toBeEnabled())
    expect(recorded.patches).toEqual([{ archived: true }, { archived: false }])
  })

  it('closes the composer at the message limit', async () => {
    signInAs()
    serveSession(detail({ userMessageCount: 40 }))
    renderRoute(SESSION_PATH)

    expect(await screen.findByText(/has used its 40 messages/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Start a new application' })).toHaveAttribute('href', '/')
  })

  it('shows the working state for a turn running elsewhere, then the reply once it lands', async () => {
    signInAs()
    let polls = 0
    server.use(
      http.get(apiUrl(`/api/sessions/${SESSION_ID}`), () => {
        polls += 1
        return HttpResponse.json(polls === 1 ? detail({ status: 'drafting', messages: [userMessage('msg-1', 'Hi')] }) : detail())
      }),
      http.post(apiUrl(`/api/sessions/${SESSION_ID}/turns`), () => {
        turnsSent += 1
        return HttpResponse.json({ message: 'unexpected' }, { status: 500 })
      }),
    )
    let turnsSent = 0
    renderRoute(SESSION_PATH)

    expect(await screen.findByText('Working')).toBeInTheDocument()
    expect(await screen.findByText('You line up well. Go is the main gap.', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByText('Working')).not.toBeInTheDocument()
    expect(turnsSent).toBe(0)
  })

  it('offers a retry when a turn running elsewhere fails, without starting one itself', async () => {
    signInAs()
    let polls = 0
    let turnsSent = 0
    server.use(
      http.get(apiUrl(`/api/sessions/${SESSION_ID}`), () => {
        polls += 1
        return HttpResponse.json(detail({ status: polls === 1 ? 'drafting' : 'ready', messages: [userMessage('msg-1', 'Hi')] }))
      }),
      http.post(apiUrl(`/api/sessions/${SESSION_ID}/turns`), () => {
        turnsSent += 1
        return HttpResponse.json({ message: 'unexpected' }, { status: 500 })
      }),
    )
    renderRoute(SESSION_PATH)

    expect(await screen.findByRole('button', { name: 'Retry' }, { timeout: 5000 })).toBeInTheDocument()
    expect(turnsSent).toBe(0)
  })

  it('puts a message the server never stored back in the composer when Retry finds nothing to answer', async () => {
    signInAs()
    serveSession(detail())
    const turns: unknown[] = []
    server.use(
      http.post(apiUrl(`/api/sessions/${SESSION_ID}/turns`), async ({ request }) => {
        turns.push(await request.json())
        if (turns.length === 1) return HttpResponse.error()
        return HttpResponse.json({ statusCode: 400, code: 'nothing-to-answer', message: 'Nothing to answer' }, { status: 400 })
      }),
    )
    renderRoute(SESSION_PATH)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Message' }), 'Lead with the agent work{Enter}')
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Lead with the agent work'))
    expect(turns).toEqual([{ message: { id: expect.any(String), text: 'Lead with the agent work' } }, {}])
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it.each([
    ['turn-running', "Your message wasn't sent. Try sending it again."],
    ['primary-resume-not-ready', "Your resume is being read or couldn't be read. Check it on the Resume page, then send your message again."],
  ])('puts a message refused with %s back in the composer and says why', async (code, explanation) => {
    signInAs()
    serveSession(detail())
    server.use(
      http.post(apiUrl(`/api/sessions/${SESSION_ID}/turns`), () =>
        HttpResponse.json({ statusCode: 409, code, message: 'Refused' }, { status: 409 }),
      ),
    )
    renderRoute(SESSION_PATH)

    const composer = await screen.findByRole('textbox', { name: 'Message' })
    await userEvent.type(composer, 'Lead with the agent work{Enter}')

    expect(await screen.findByText(explanation)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Lead with the agent work')
    expect(screen.queryByText('Lead with the agent work', { selector: 'p' })).not.toBeInTheDocument()
  })

  it('offers a retry after a failed turn, which reruns it without resending the message', async () => {
    signInAs()
    let session = freshSession()
    const turns: unknown[] = []
    server.use(
      http.get(apiUrl(`/api/sessions/${SESSION_ID}`), () => HttpResponse.json(session)),
      http.post(apiUrl(`/api/sessions/${SESSION_ID}/turns`), async ({ request }) => {
        turns.push(await request.json())
        if (turns.length === 1) return HttpResponse.json({ message: 'Internal server error' }, { status: 500 })
        session = detail()
        return uiStream(fitTurnChunks())
      }),
    )
    renderRoute(SESSION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('You line up well. Go is the main gap.')).toBeInTheDocument()
    expect(turns).toEqual([{}, {}])
  })
})

describe('Stopping a turn (integration)', () => {
  const TURNS_URL = apiUrl(`/api/sessions/${SESSION_ID}/turns`)
  // The reply has started reading the job post when it is stopped.
  const runningChunks = () => fitTurnChunks().slice(0, 3)

  it('stops a running turn, leaves the composer usable and retries the same message', async () => {
    signInAs()
    let session = freshSession()
    const turns: unknown[] = []
    const stops: unknown[] = []
    server.use(
      http.get(apiUrl(`/api/sessions/${SESSION_ID}`), () => HttpResponse.json(session)),
      http.post(TURNS_URL, async ({ request }) => {
        turns.push(await request.json())
        if (turns.length === 1) return openUiStream(runningChunks())
        session = detail()
        return uiStream(fitTurnChunks())
      }),
      http.post(`${TURNS_URL}/stop`, async ({ request }) => {
        stops.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute(SESSION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }))

    expect(await screen.findByText('You stopped this reply.')).toBeInTheDocument()
    // Names the message the stopped turn answers.
    expect(stops).toEqual([{ messageId: 'msg-1' }])
    // The step list stops where the reply was cut off.
    await userEvent.click(screen.getByRole('button', { name: '1 step' }))
    expect(screen.getByText("Didn't finish")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Hello')
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('You line up well. Go is the main gap.')).toBeInTheDocument()
    expect(turns).toEqual([{}, {}])
    expect(screen.queryByText('You stopped this reply.')).not.toBeInTheDocument()
  })

  it('drops the stopped reply when a new message is sent instead', async () => {
    signInAs()
    // The server stores each sent message, and a reply only when the turn isn't stopped.
    let session = freshSession()
    const turns: unknown[] = []
    server.use(
      http.get(apiUrl(`/api/sessions/${SESSION_ID}`), () => HttpResponse.json(session)),
      http.post(TURNS_URL, async ({ request }) => {
        const body = (await request.json()) as { message?: { id: string; text: string } }
        turns.push(body)
        const sent = body.message ? [userMessage(body.message.id, body.message.text)] : []
        session = { ...session, messages: [...session.messages, ...sent] }
        if (turns.length === 1) return openUiStream(runningChunks())
        session = detail({ messages: session.messages })
        return uiStream(fitTurnChunks())
      }),
      http.post(`${TURNS_URL}/stop`, () => new HttpResponse(null, { status: 204 })),
    )
    renderRoute(SESSION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }))
    await screen.findByText('You stopped this reply.')
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Keep it to one page{Enter}')

    expect(await screen.findByText('You line up well. Go is the main gap.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '1 step' })).not.toBeInTheDocument()
    expect(screen.queryByText('You stopped this reply.')).not.toBeInTheDocument()
    expect(turns).toEqual([{}, { message: { id: expect.any(String), text: 'Keep it to one page' } }])
  })

  it('keeps a reply that was saved before the stop reached the server', async () => {
    signInAs()
    let session = freshSession()
    server.use(
      http.get(apiUrl(`/api/sessions/${SESSION_ID}`), () => HttpResponse.json(session)),
      http.post(TURNS_URL, () => openUiStream(runningChunks())),
      http.post(`${TURNS_URL}/stop`, () => {
        session = detail()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute(SESSION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }))

    expect(await screen.findByText('You line up well. Go is the main gap.')).toBeInTheDocument()
    expect(screen.queryByText('You stopped this reply.')).not.toBeInTheDocument()
  })

  it('offers a retry when the stop ended the turn but its answer was lost', async () => {
    signInAs()
    serveSession(freshSession(), runningChunks())
    server.use(
      http.post(TURNS_URL, () => openUiStream(runningChunks())),
      http.post(`${TURNS_URL}/stop`, () => HttpResponse.error()),
    )
    renderRoute(SESSION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }))

    expect(await screen.findByText('You stopped this reply.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('waits for the reply when the server could not stop the turn', async () => {
    signInAs()
    let session = freshSession()
    let reads = 0
    server.use(
      http.get(apiUrl(`/api/sessions/${SESSION_ID}`), () => {
        reads += 1
        return HttpResponse.json(session)
      }),
      http.post(TURNS_URL, () => openUiStream(runningChunks())),
      http.post(`${TURNS_URL}/stop`, () => {
        // The turn runs on and lands a moment later.
        session = { ...session, status: 'drafting' }
        setTimeout(() => {
          session = detail()
        }, 500)
        return HttpResponse.json({ message: 'Internal server error' }, { status: 500 })
      }),
    )
    renderRoute(SESSION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }))

    expect(await screen.findByText('You line up well. Go is the main gap.', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByText('You stopped this reply.')).not.toBeInTheDocument()
    expect(reads).toBeGreaterThan(1)
  })
})

describe('Applications page (integration)', () => {
  it('shows more applications a page at a time', async () => {
    signInAs()
    server.use(
      http.get(apiUrl('/api/sessions'), ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor')
        return HttpResponse.json(
          cursor
            ? { items: [summary({ id: 'older', title: 'Founding Engineer', company: 'Northmoor' })], nextCursor: null }
            : { items: [summary()], nextCursor: SESSION_ID },
        )
      }),
    )
    renderRoute('/applications')

    const list = await screen.findByRole('tabpanel', { name: 'Active' })
    expect(await within(list).findByRole('link', { name: /Senior Product Engineer/ })).toBeInTheDocument()
    await userEvent.click(within(list).getByRole('button', { name: 'Show more' }))

    expect(await within(list).findByRole('link', { name: /Founding Engineer/ })).toBeInTheDocument()
    expect(within(list).queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })
})
