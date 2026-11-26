import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { detail, serveSession, SESSION_ID, summary } from '@/features/sessions/tests/__integration__/session-fixtures'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, signInAs } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'
import { setViewport } from '@/test/integration/viewport'
import { applicationInterview, INTERVIEW_ID, interviewDetail, interviewSummary } from './interview-fixtures'

// Applications by default, interviews for `kind=interview`, as the server lists them.
function serveLists(interviewPages: Array<ReturnType<typeof interviewSummary>[]>) {
  server.use(
    http.get(apiUrl('/api/sessions'), ({ request }) => {
      const params = new URL(request.url).searchParams
      if (params.get('kind') !== 'interview') return HttpResponse.json({ items: [summary()], nextCursor: null })

      const page = Number(params.get('cursor') ?? 0)
      return HttpResponse.json({ items: interviewPages[page] ?? [], nextCursor: page + 1 < interviewPages.length ? String(page + 1) : null })
    }),
  )
}

describe('Interviews page (integration)', () => {
  it('lists each interview with its application, date, status and question count, and opens it', async () => {
    setViewport('desktop')
    signInAs()
    serveLists([
      [
        interviewSummary(),
        interviewSummary({
          id: 'interview-2',
          title: 'Hiring manager screen',
          createdAt: '2026-11-20T10:00:00.000Z',
          parentSession: { id: 'other-app', title: 'Founding Engineer', company: 'Northmoor' },
          interview: { questionCount: 5, totalQuestions: 5, endedAt: '2026-11-20T11:00:00.000Z' },
        }),
      ],
    ])
    server.use(http.get(apiUrl(`/api/sessions/${INTERVIEW_ID}`), () => HttpResponse.json(interviewDetail())))
    const router = renderRoute('/interviews')

    const live = (await screen.findByRole('link', { name: /Technical round/ })).closest('li')
    expect(live).not.toBeNull()
    const liveRow = within(live as HTMLElement)
    expect(liveRow.getByText('Senior Product Engineer · Halden')).toBeInTheDocument()
    expect(liveRow.getByText('Nov 24')).toBeInTheDocument()
    expect(liveRow.getByText('In progress')).toBeInTheDocument()
    expect(liveRow.getByText('3 of 6 questions')).toBeInTheDocument()

    const ended = within(screen.getByRole('link', { name: /Hiring manager screen/ }))
    expect(ended.getByText('Founding Engineer · Northmoor')).toBeInTheDocument()
    expect(ended.getByText('Ended')).toBeInTheDocument()
    expect(ended.getByText('5 of 5 questions')).toBeInTheDocument()

    // Interviews only end: nothing to archive.
    expect(screen.queryByRole('tab', { name: 'Archived' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: /Technical round/ }))
    expect(router.state.location.pathname).toBe(`/interviews/${INTERVIEW_ID}`)
  })

  it('shows more interviews a page at a time', async () => {
    signInAs()
    serveLists([[interviewSummary()], [interviewSummary({ id: 'interview-2', title: 'Hiring manager screen' })]])
    renderRoute('/interviews')

    expect(await screen.findByRole('link', { name: /Technical round/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show more' }))

    expect(await screen.findByRole('link', { name: /Hiring manager screen/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })

  it('points to the applications when there are no interviews yet', async () => {
    signInAs()
    serveLists([[]])
    renderRoute('/interviews')

    expect(await screen.findByText(/No interviews yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open an application' })).toHaveAttribute('href', '/applications')
  })
})

describe('Sidebar (integration)', () => {
  it('opens Interviews from the nav and keeps Recent to applications', async () => {
    setViewport('desktop')
    signInAs()
    serveLists([[interviewSummary()]])
    const router = renderRoute('/')

    const recent = await screen.findByRole('navigation', { name: 'Recent' })
    expect(await within(recent).findByRole('link', { name: /Halden/ })).toHaveAttribute('href', '/applications/session-abc')
    expect(within(recent).queryByRole('link', { name: /Technical round/ })).not.toBeInTheDocument()

    await userEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Interviews' }))

    expect(await screen.findByRole('heading', { name: 'Interviews', level: 1 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/interviews')
    expect(await screen.findByRole('link', { name: /Technical round/ })).toBeInTheDocument()
  })

  it("meters this month's interviews out of 10, with the reset date once they run out", async () => {
    setViewport('desktop')
    signInAs()
    server.use(
      http.get(apiUrl('/api/usage'), () =>
        HttpResponse.json({
          sessions: { used: 4, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' },
          interviews: { used: 10, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' },
        }),
      ),
    )
    renderRoute('/')

    const interviews = within(await screen.findByRole('group', { name: 'Interviews' }))
    expect(interviews.getByRole('meter', { name: 'Interviews' })).toHaveAttribute('value', '10')
    expect(interviews.getByRole('meter', { name: 'Interviews' })).toHaveAttribute('max', '10')
    expect(interviews.getByText('10 of 10')).toBeInTheDocument()
    expect(interviews.getByText('More on December 1')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Applications' })).toHaveAttribute('value', '4')
  })
})

const APPLICATION_PATH = `/applications/${SESSION_ID}`

// The start route answering with `response`; records each call.
function serveStart(response: () => Response) {
  const starts: string[] = []

  server.use(
    http.post(apiUrl(`/api/sessions/${SESSION_ID}/interviews`), ({ request }) => {
      starts.push(request.url)
      return response()
    }),
    http.get(apiUrl(`/api/sessions/${INTERVIEW_ID}`), () => HttpResponse.json(interviewDetail())),
  )

  return starts
}

function startError(status: number, body: Record<string, unknown>) {
  return () => HttpResponse.json({ statusCode: status, message: 'Refused', ...body }, { status })
}

describe('Mock interview button (integration)', () => {
  it('starts or resumes an interview from the application and opens it', async () => {
    setViewport('desktop')
    signInAs()
    serveSession(detail())
    const starts = serveStart(() => HttpResponse.json(interviewSummary({ title: 'New interview', interview: { questionCount: 0 } }), { status: 201 }))
    const router = renderRoute(APPLICATION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Mock interview' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/interviews/${INTERVIEW_ID}`))
    expect(starts).toHaveLength(1)
  })

  it('is disabled on an archived application', async () => {
    signInAs()
    serveSession(detail({ archivedAt: '2026-11-24T10:00:00.000Z' }))
    renderRoute(APPLICATION_PATH)

    expect(await screen.findByRole('button', { name: 'Mock interview' })).toBeDisabled()
  })

  it('is disabled on an application with no job description', async () => {
    signInAs()
    serveSession(detail({ job: { url: null, source: null, location: null, hasDescription: false } }))
    renderRoute(APPLICATION_PATH)

    expect(await screen.findByRole('button', { name: 'Mock interview' })).toBeDisabled()
  })

  it("says when this month's interviews have run out, and stays on the application", async () => {
    signInAs()
    serveSession(detail())
    serveStart(
      startError(429, { code: 'monthly-interview-limit', used: 10, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' }),
    )
    const router = renderRoute(APPLICATION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Mock interview' }))

    expect(await screen.findByText("You've used all 10 interviews this month. More on December 1.")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(APPLICATION_PATH)
  })

  it('says when the server finds no job description, and stops offering it', async () => {
    signInAs()
    serveSession(detail())
    serveStart(startError(409, { code: 'job-description-missing' }))
    renderRoute(APPLICATION_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Mock interview' }))

    expect(await screen.findByText('This application has no job description to interview you on.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mock interview' })).toBeDisabled()
  })
})

describe("Application's Interviews tab (integration)", () => {
  function serveApplicationInterviews(interviews: ReturnType<typeof applicationInterview>[]) {
    server.use(
      http.get(apiUrl(`/api/sessions/${SESSION_ID}/interviews`), () => HttpResponse.json(interviews)),
      http.get(apiUrl(`/api/sessions/${INTERVIEW_ID}`), () => HttpResponse.json(interviewDetail())),
    )
  }

  it("lists the application's interviews with their date and status, and opens one", async () => {
    setViewport('desktop')
    signInAs()
    serveSession(detail())
    serveApplicationInterviews([
      applicationInterview(),
      applicationInterview({ id: 'interview-0', title: 'Hiring manager screen', createdAt: '2026-11-20T10:00:00.000Z', endedAt: '2026-11-20T11:00:00.000Z' }),
    ])
    const router = renderRoute(APPLICATION_PATH)

    const panel = within(await screen.findByRole('complementary', { name: 'Output' }))
    await userEvent.click(panel.getByRole('tab', { name: 'Interviews' }))

    const live = within(await panel.findByRole('link', { name: /Technical round/ }))
    expect(live.getByText('Nov 24')).toBeInTheDocument()
    expect(live.getByText('In progress')).toBeInTheDocument()
    const finished = within(panel.getByRole('link', { name: /Hiring manager screen/ }))
    expect(finished.getByText('Nov 20')).toBeInTheDocument()
    expect(finished.getByText('Finished')).toBeInTheDocument()

    await userEvent.click(panel.getByRole('link', { name: /Technical round/ }))
    expect(router.state.location.pathname).toBe(`/interviews/${INTERVIEW_ID}`)
  })

  it('says how to start one when the application has no interviews', async () => {
    setViewport('desktop')
    signInAs()
    serveSession(detail())
    serveApplicationInterviews([])
    renderRoute(APPLICATION_PATH)

    const panel = within(await screen.findByRole('complementary', { name: 'Output' }))
    await userEvent.click(panel.getByRole('tab', { name: 'Interviews' }))

    expect(await panel.findByText('Start a mock interview and it shows here.')).toBeInTheDocument()
  })
})

describe('Application route (integration)', () => {
  it('opens an interview at its own page when reached by an application link', async () => {
    signInAs()
    server.use(http.get(apiUrl(`/api/sessions/${INTERVIEW_ID}`), () => HttpResponse.json(interviewDetail())))
    const router = renderRoute(`/applications/${INTERVIEW_ID}`)

    await waitFor(() => expect(router.state.location.pathname).toBe(`/interviews/${INTERVIEW_ID}`))
  })
})
