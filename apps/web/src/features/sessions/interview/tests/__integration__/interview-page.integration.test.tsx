import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute, signInAs } from '@/test/integration/render-route'
import { setViewport } from '@/test/integration/viewport'
import {
  endChunks,
  endedState,
  FEEDBACK,
  INTERVIEW_PATH,
  interviewDetail,
  midInterview,
  QUESTIONS,
  questionChunks,
  refuseStart,
  refuseTurn,
  serveInterview,
  serveNextInterview,
  setupChunks,
} from './interview-fixtures'

const progressBar = () => screen.getByRole('progressbar', { name: 'Interview progress' })

describe('Interview page (integration)', () => {
  it('answers the first message when just started and shows the setup, the numbered question and progress from the stream', async () => {
    setViewport('desktop')
    signInAs()
    const recorded = serveInterview(interviewDetail(), { turns: [{ chunks: setupChunks() }] })

    renderRoute(INTERVIEW_PATH, { startTurn: true })

    const question = await screen.findByRole('article', { name: 'Question 1' })
    expect(question).toHaveTextContent(QUESTIONS[0])
    expect(screen.getByText('Kicked off interview')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Technical round' })).toBeInTheDocument()
    expect(screen.getByText('1 of 4')).toBeInTheDocument()
    expect(progressBar()).toHaveAttribute('aria-valuetext', 'Question 1 of 4')
    // The stored first message is answered once, with no message resent.
    expect(recorded.turns).toEqual([{}])
  })

  it('shows the questions, answers and progress again on reload, with the newest question current', async () => {
    setViewport('desktop')
    signInAs()
    const recorded = serveInterview(midInterview())

    renderRoute(INTERVIEW_PATH)

    expect(await screen.findByRole('article', { name: 'Question 2' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('article', { name: 'Question 1' })).not.toHaveAttribute('aria-current')
    expect(screen.getByText('I built it on Playwright.')).toBeInTheDocument()
    expect(screen.getByText('2 of 4')).toBeInTheDocument()
    expect(progressBar()).toHaveAttribute('aria-valuetext', 'Question 2 of 4')
    expect(recorded.turns).toEqual([])
  })

  it('links back to its application in the breadcrumb', async () => {
    setViewport('desktop')
    signInAs()
    serveInterview(midInterview())

    renderRoute(INTERVIEW_PATH)

    const crumb = await screen.findByRole('link', { name: 'Senior Product Engineer' })
    expect(crumb.closest('nav')).toHaveAccessibleName('Breadcrumb')
    expect(crumb).toHaveAttribute('href', '/applications/session-abc')
  })

  it('sends an answer and shows the next question', async () => {
    setViewport('desktop')
    signInAs()
    const recorded = serveInterview(midInterview(), { turns: [{ chunks: questionChunks('reply-q3', 3) }] })

    renderRoute(INTERVIEW_PATH)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Your answer' }), 'I cut voice input.{Enter}')

    expect(await screen.findByRole('article', { name: 'Question 3' })).toHaveTextContent(QUESTIONS[2])
    expect(recorded.turns).toEqual([{ message: { id: expect.any(String), text: 'I cut voice input.' } }])
    expect(screen.getByText('3 of 4')).toBeInTheDocument()
  })

  it('ends the interview from the header, then shows the feedback and closes the composer', async () => {
    setViewport('desktop')
    signInAs()
    const recorded = serveInterview(midInterview())

    renderRoute(INTERVIEW_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'End interview' }))

    const panel = await screen.findByRole('complementary', { name: 'Output' })
    expect(within(panel).getByRole('tab', { name: 'Feedback' })).toHaveAttribute('aria-selected', 'true')
    expect(within(panel).getByText(FEEDBACK.wentWell[0])).toBeInTheDocument()
    expect(recorded.ends).toBe(1)
    expect(screen.queryByRole('button', { name: 'End interview' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Practice again' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeDisabled()
    expect(screen.getByText(/This interview has ended/)).toBeInTheDocument()
  })

  it('keeps the interview open and says why when ending is refused before any answer', async () => {
    setViewport('desktop')
    signInAs()

    const recorded = serveInterview(midInterview(), {
      end: { status: 409, body: { statusCode: 409, code: 'nothing-to-review', message: 'Nothing to review' } },
    })

    renderRoute(INTERVIEW_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'End interview' }))

    expect(await screen.findByText('Answer at least one question before ending the interview.')).toBeInTheDocument()
    expect(recorded.ends).toBe(1)
    expect(screen.getByRole('button', { name: 'End interview' })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeEnabled()

    await userEvent.type(screen.getByRole('textbox', { name: 'Your answer' }), 'I cut voice input.{Enter}')

    await waitFor(() =>
      expect(screen.queryByText('Answer at least one question before ending the interview.')).not.toBeInTheDocument(),
    )
  })

  it('says to try again when the feedback could not be written', async () => {
    setViewport('desktop')
    signInAs()

    serveInterview(midInterview(), {
      end: { status: 502, body: { statusCode: 502, code: 'feedback-failed', message: 'Feedback failed' } },
    })

    renderRoute(INTERVIEW_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'End interview' }))

    expect(await screen.findByText("Couldn't write the feedback, try ending again.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End interview' })).toBeEnabled()
  })

  it('opens the feedback when Wren ends the interview in a reply', async () => {
    setViewport('desktop')
    signInAs()

    serveInterview(midInterview(), {
      turns: [{ chunks: endChunks(), after: () => ({ interview: endedState() }) }],
    })

    renderRoute(INTERVIEW_PATH)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Your answer' }), "Let's stop here.{Enter}")

    const panel = await screen.findByRole('complementary', { name: 'Output' })
    expect(await within(panel).findByText(FEEDBACK.toImprove[0])).toBeInTheDocument()
    expect(screen.getByText('Ended interview and wrote feedback')).toBeInTheDocument()
  })

  it('draws the feedback from the session on reload: went well, to improve, stronger answers and notes', async () => {
    setViewport('desktop')
    signInAs()
    serveInterview(midInterview({ interview: endedState() }))

    renderRoute(INTERVIEW_PATH)

    const panel = await screen.findByRole('complementary', { name: 'Output' })
    const wentWell = within(panel).getByRole('region', { name: 'Went well' })
    expect(within(wentWell).getAllByRole('listitem').map((item) => item.textContent)).toEqual(FEEDBACK.wentWell)
    const toImprove = within(panel).getByRole('region', { name: 'To improve' })
    expect(within(toImprove).getAllByRole('listitem').map((item) => item.textContent)).toEqual(FEEDBACK.toImprove)

    // The first stronger answer is open; opening another closes it.
    const stronger = within(panel).getByRole('region', { name: 'Stronger answers' })
    const [first, second] = FEEDBACK.strongerAnswers
    expect(within(stronger).getByText(first!.stronger)).toBeInTheDocument()
    expect(within(stronger).queryByText(second!.stronger)).not.toBeInTheDocument()
    await userEvent.click(within(stronger).getByRole('button', { name: second!.question }))
    expect(within(stronger).getByText(second!.said)).toBeInTheDocument()
    expect(within(stronger).getByText(second!.stronger)).toBeInTheDocument()
    expect(within(stronger).queryByText(first!.stronger)).not.toBeInTheDocument()

    expect(within(panel).getByRole('region', { name: 'Additional notes' })).toHaveTextContent(FEEDBACK.additionalNotes)
    expect(screen.queryByRole('button', { name: 'End interview' })).not.toBeInTheDocument()
  })

  it('leaves out empty additional notes', async () => {
    setViewport('desktop')
    signInAs()
    serveInterview(midInterview({ interview: endedState({ feedback: { ...FEEDBACK, additionalNotes: '' } }) }))

    renderRoute(INTERVIEW_PATH)

    const panel = await screen.findByRole('complementary', { name: 'Output' })
    expect(within(panel).getByRole('region', { name: 'Went well' })).toBeInTheDocument()
    expect(within(panel).queryByRole('region', { name: 'Additional notes' })).not.toBeInTheDocument()
  })

  it('starts a new interview for the same application from Practice again, and answers its first message', async () => {
    setViewport('desktop')
    signInAs()
    const recorded = serveInterview(midInterview({ interview: endedState() }))
    const nextRecorded = serveNextInterview(interviewDetail({ id: 'interview-2' }))

    const router = renderRoute(INTERVIEW_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Practice again' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/interviews/interview-2'))
    expect(recorded.starts).toBe(1)
    await waitFor(() => expect(nextRecorded.turns).toEqual([{}]))
    // The earlier interview is left as it was.
    expect(recorded.turns).toEqual([])
  })

  it('shows the monthly interview limit when Practice again is refused', async () => {
    setViewport('desktop')
    signInAs()
    serveInterview(midInterview({ interview: endedState() }))
    refuseStart(429, {
      statusCode: 429,
      code: 'monthly-interview-limit',
      message: 'Limit',
      used: 10,
      limit: 10,
      resetsAt: '2026-12-01T00:00:00.000Z',
    })

    renderRoute(INTERVIEW_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Practice again' }))

    expect(await screen.findByText("You've used all 10 interviews this month. More on December 1.")).toBeInTheDocument()
  })

  it('keeps the feedback panel closed while the interview runs, with a note in it once opened', async () => {
    setViewport('desktop')
    signInAs()
    serveInterview(midInterview())

    renderRoute(INTERVIEW_PATH)

    await screen.findByRole('article', { name: 'Question 2' })
    expect(screen.queryByRole('complementary', { name: 'Output' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open panel' }))
    const panel = screen.getByRole('complementary', { name: 'Output' })
    expect(within(panel).getByText('Your feedback appears here once the interview ends.')).toBeInTheDocument()
  })

  it('shows the feedback in a sheet on a phone', async () => {
    setViewport('phone')
    signInAs()
    serveInterview(midInterview({ interview: endedState() }))

    renderRoute(INTERVIEW_PATH)

    await userEvent.click(await screen.findByRole('button', { name: 'Open panel' }))
    const dialog = await screen.findByRole('dialog', { name: 'Feedback' })
    expect(within(dialog).getByText(FEEDBACK.wentWell[0])).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Practice again' })).not.toBeInTheDocument()
  })

  it('puts back an answer the server refused because the interview had already ended', async () => {
    setViewport('desktop')
    signInAs()
    serveInterview(midInterview())
    refuseTurn()

    renderRoute(INTERVIEW_PATH)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Your answer' }), 'Late answer{Enter}')

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveValue('Late answer'))
    await waitFor(() => expect(screen.queryByText('Late answer', { selector: '[data-slot="user-message"]' })).not.toBeInTheDocument())
  })
})
