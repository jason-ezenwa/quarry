import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { primaryResumeResponse, renderRoute, signInAs } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

describe('Home (integration)', () => {
  it('sends a signed-out visitor to sign-in', async () => {
    const router = renderRoute('/')

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('shows the signed-in user', async () => {
    signInAs()

    renderRoute('/')

    expect(await screen.findByText('Welcome, Ada Obi')).toBeInTheDocument()
    expect(screen.getByText('Signed in as ada@example.com')).toBeInTheDocument()
  })

  it('signs out and returns to sign-in', async () => {
    signInAs()
    server.use(
      http.post(apiUrl('/api/auth/sign-out'), () => {
        server.use(http.get(apiUrl('/api/auth/get-session'), () => HttpResponse.json(null)))
        return HttpResponse.json({ success: true })
      }),
    )
    const router = renderRoute('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  describe('review resume callout', () => {
    it('says the resume is being read while it parses', async () => {
      signInAs({ resume: primaryResumeResponse({ parseStatus: 'parsing', parsedAt: null, reviewedAt: null, resume: null }) })

      renderRoute('/')

      expect(await screen.findByText('Reading your resume')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Review resume' })).not.toBeInTheDocument()
    })

    it('links to the resume page once parsed', async () => {
      signInAs({ resume: primaryResumeResponse({ reviewedAt: null }) })
      const router = renderRoute('/')

      await userEvent.click(await screen.findByRole('link', { name: 'Review resume' }))

      expect(router.state.location.pathname).toBe('/profile/resume')
    })

    it('points a failed parse to the profile', async () => {
      signInAs({ resume: primaryResumeResponse({ parseStatus: 'failed', parsedAt: null, reviewedAt: null, resume: null }) })
      const router = renderRoute('/')

      await userEvent.click(await screen.findByRole('link', { name: 'Go to profile' }))

      expect(router.state.location.pathname).toBe('/profile')
    })

    it('is gone once the resume is reviewed', async () => {
      let answered = false
      signInAs()
      server.use(
        http.get(apiUrl('/api/resumes/primary'), () => {
          answered = true
          return HttpResponse.json(primaryResumeResponse())
        }),
      )

      renderRoute('/')

      await screen.findByText('Welcome, Ada Obi')
      await waitFor(() => expect(answered).toBe(true))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.queryByText('Review your resume')).not.toBeInTheDocument()
    })
  })
})
