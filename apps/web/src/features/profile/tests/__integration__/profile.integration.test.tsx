import type { PrimaryResumeResponse } from '@quarry/contracts'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { primaryResumeResponse, renderRoute, signInAs, TEST_PROFILE, TEST_USER } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

const UPLOAD_KEY = 'V1StGXR8_Z5jdHi6B-myT.pdf'

async function openProfile(resume: PrimaryResumeResponse) {
  signInAs({ resume })
  const router = renderRoute('/profile')
  await screen.findByRole('heading', { name: 'Profile', level: 1 })
  return router
}

function resumeCard() {
  return screen.getByRole('region', { name: 'Resume' })
}

describe('Profile (integration)', () => {
  it('sends a user without a profile to onboarding', async () => {
    signInAs({ profile: false })

    const router = renderRoute('/profile')

    expect(await screen.findByRole('heading', { name: 'Set up your profile' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('shows the account and the onboarding answers, read-only', async () => {
    await openProfile(primaryResumeResponse())

    const account = within(screen.getByRole('region', { name: 'Account' }))
    expect(await account.findByText('Ada Obi')).toBeInTheDocument()
    expect(account.getByText('ada@example.com')).toBeInTheDocument()

    const answers = within(screen.getByRole('region', { name: "What you're looking for" }))
    expect(await answers.findByText('Senior Product Engineer')).toBeInTheDocument()
    expect(answers.getByText('4 years')).toBeInTheDocument()
    expect(answers.getByText('Nigeria')).toBeInTheDocument()
    expect(answers.getByText('Remote')).toBeInTheDocument()
    expect(answers.getByText('$60,000 a year')).toBeInTheDocument()
    expect(answers.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('fetches each endpoint once, reusing the profile the gate loaded', async () => {
    const calls: string[] = []
    signInAs()
    server.use(
      http.get(apiUrl('/api/profiles/me'), () => {
        calls.push('profile')
        return HttpResponse.json(TEST_PROFILE)
      }),
      http.get(apiUrl('/api/users/me'), () => {
        calls.push('user')
        return HttpResponse.json(TEST_USER)
      }),
      http.get(apiUrl('/api/resumes/primary'), () => {
        calls.push('resume')
        return HttpResponse.json(primaryResumeResponse())
      }),
    )

    renderRoute('/profile')
    await screen.findByText('Nigeria')
    await screen.findByText('ada@example.com')
    await screen.findByText(/^Confirmed/)

    expect(calls.sort()).toEqual(['profile', 'resume', 'user'])
  })

  it('is reachable from the sidebar', async () => {
    signInAs()
    const router = renderRoute('/')

    await userEvent.click(await screen.findByRole('link', { name: 'Profile' }))

    expect(await screen.findByRole('heading', { name: 'Profile', level: 1 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/profile')
  })

  it('shows a parsing resume with no actions', async () => {
    await openProfile(primaryResumeResponse({ parseStatus: 'parsing', parsedAt: null, reviewedAt: null, resume: null }))

    expect(await within(resumeCard()).findByText('Reading your resume')).toBeInTheDocument()
    expect(within(resumeCard()).getByText('ada-obi-resume.pdf')).toBeInTheDocument()
    expect(within(resumeCard()).queryByRole('button')).not.toBeInTheDocument()
    expect(within(resumeCard()).queryByRole('link')).not.toBeInTheDocument()
  })

  it('links a parsed, unreviewed resume to the review', async () => {
    const router = await openProfile(primaryResumeResponse({ reviewedAt: null }))

    await userEvent.click(await within(resumeCard()).findByRole('link', { name: 'Review resume' }))

    expect(router.state.location.pathname).toBe('/profile/resume')
  })

  it('shows a reviewed resume as confirmed, with a link to it', async () => {
    const router = await openProfile(primaryResumeResponse())

    expect(await within(resumeCard()).findByText(/^Confirmed/)).toBeInTheDocument()
    await userEvent.click(within(resumeCard()).getByRole('link', { name: 'View resume' }))

    expect(router.state.location.pathname).toBe('/profile/resume')
  })

  it('retries a failed parse, which goes back to reading', async () => {
    const failed = primaryResumeResponse({ parseStatus: 'failed', parsedAt: null, reviewedAt: null, resume: null })
    let retried = false
    await openProfile(failed)
    server.use(
      http.post(apiUrl('/api/resumes/primary/parse'), () => {
        retried = true
        return new HttpResponse(null, { status: 202 })
      }),
      http.get(apiUrl('/api/resumes/primary'), () =>
        HttpResponse.json(retried ? { ...failed, parseStatus: 'parsing' } : failed),
      ),
    )

    expect(await within(resumeCard()).findByText("We couldn't read your resume")).toBeInTheDocument()
    await userEvent.click(within(resumeCard()).getByRole('button', { name: 'Retry' }))

    expect(await within(resumeCard()).findByText('Reading your resume')).toBeInTheDocument()
    expect(retried).toBe(true)
  })

  it('re-uploads a different file after a failed parse', async () => {
    const failed = primaryResumeResponse({ parseStatus: 'failed', parsedAt: null, reviewedAt: null, resume: null })
    const committed: unknown[] = []
    await openProfile(failed)
    server.use(
      http.post(apiUrl('/api/resumes/uploads'), () =>
        HttpResponse.json({ key: UPLOAD_KEY, mimeType: 'application/pdf' }, { status: 201 }),
      ),
      http.put(apiUrl('/api/resumes/primary/file'), async ({ request }) => {
        committed.push(await request.json())
        return HttpResponse.json({
          ...failed,
          parseStatus: 'parsing',
          file: { originalName: 'new-resume.pdf', mimeType: 'application/pdf', size: 1024 },
        })
      }),
    )

    await within(resumeCard()).findByText("We couldn't read your resume")
    await userEvent.upload(screen.getByLabelText('New resume file'), new File(['%PDF'], 'new-resume.pdf', { type: 'application/pdf' }))

    expect(await within(resumeCard()).findByText('Reading your resume')).toBeInTheDocument()
    expect(within(resumeCard()).getByText('new-resume.pdf')).toBeInTheDocument()
    expect(committed).toEqual([{ key: UPLOAD_KEY, mimeType: 'application/pdf' }])
  })

  it('refuses a re-upload that is not a PDF or DOCX, uploading nothing', async () => {
    let uploads = 0
    await openProfile(primaryResumeResponse({ parseStatus: 'failed', parsedAt: null, reviewedAt: null, resume: null }))
    server.use(
      http.post(apiUrl('/api/resumes/uploads'), () => {
        uploads += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    await within(resumeCard()).findByText("We couldn't read your resume")
    await userEvent.upload(screen.getByLabelText('New resume file'), new File(['x'], 'photo.png', { type: 'image/png' }), {
      applyAccept: false,
    })

    expect(await screen.findByText('Use a PDF or DOCX')).toBeInTheDocument()
    expect(uploads).toBe(0)
  })
})
