import { screen, waitFor, within } from '@testing-library/react'
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

  it('shows who is signed in, in the account menu', async () => {
    signInAs()

    renderRoute('/')
    await screen.findByText('Ada Obi')
    await userEvent.click(screen.getByRole('button', { name: 'Account' }))

    const menu = within(await screen.findByRole('menu'))
    expect(menu.getByText('Ada Obi')).toBeInTheDocument()
    expect(menu.getByText('ada@example.com')).toBeInTheDocument()
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

    await userEvent.click(await screen.findByRole('button', { name: 'Account' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('opens the menu from the page header and closes it on navigation', async () => {
    signInAs()
    const router = renderRoute('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Open menu' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Menu' })).getByRole('link', { name: 'Profile' }))

    expect(await screen.findByRole('heading', { name: 'Profile', level: 1 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/profile')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument())
  })

  describe('review resume callout', () => {
    it('says the resume is being read while it parses', async () => {
      signInAs({ resume: primaryResumeResponse({ parseStatus: 'parsing', parsedAt: null, reviewedAt: null, resume: null }) })

      renderRoute('/')

      expect(await screen.findByText('Reading your resume')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Review' })).not.toBeInTheDocument()
    })

    it('links to the resume page once parsed', async () => {
      signInAs({ resume: primaryResumeResponse({ reviewedAt: null }) })
      const router = renderRoute('/')

      await userEvent.click(await screen.findByRole('link', { name: 'Review' }))

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

      await screen.findByText('Ada Obi')
      await waitFor(() => expect(answered).toBe(true))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.queryByText('Your resume is ready')).not.toBeInTheDocument()
    })
  })
})
