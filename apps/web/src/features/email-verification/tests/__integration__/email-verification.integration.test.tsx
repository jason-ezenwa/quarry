import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, signInAs } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

// Reaches the check-your-email page the way sign-up does, carrying the address.
async function arriveFromSignUp() {
  server.use(
    http.post(apiUrl('/api/auth/sign-up/email'), () => HttpResponse.json({ token: null, user: null })),
  )
  const router = renderRoute('/sign-up')
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Name'), 'Ada Obi')
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'correct-horse')
  await user.type(screen.getByLabelText('Confirm password'), 'correct-horse')
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  await screen.findByRole('heading', { name: 'Check your email' })
  return router
}

describe('Email verification (integration)', () => {
  describe('check your email', () => {
    it('sends a new link', async () => {
      let body: unknown
      server.use(
        http.post(apiUrl('/api/auth/send-verification-email'), async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ status: true })
        }),
      )
      await arriveFromSignUp()

      await userEvent.click(screen.getByRole('button', { name: 'Send a new link' }))

      expect(await screen.findByText('We sent a new link to ada@example.com.')).toBeInTheDocument()
      expect(body).toEqual({ email: 'ada@example.com' })
    })

    it('says so when too many links were asked for', async () => {
      server.use(
        http.post(apiUrl('/api/auth/send-verification-email'), () =>
          HttpResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 }),
        ),
      )
      await arriveFromSignUp()

      await userEvent.click(screen.getByRole('button', { name: 'Send a new link' }))

      expect(
        await screen.findByText("You've asked for a few links already. Try again in a few minutes."),
      ).toBeInTheDocument()
    })

    it('points to sign-in when opened without an address', async () => {
      renderRoute('/verify-email')

      expect(await screen.findByText('Sign in to send yourself a new link.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Send a new link' })).not.toBeInTheDocument()
    })
  })

  describe('landing from the email link', () => {
    it('takes the newly signed-in user on to onboarding', async () => {
      signInAs({ profile: false })
      const router = renderRoute('/email-verified')

      expect(await screen.findByRole('heading', { name: 'Set up your profile' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/onboarding')
    })

    it('confirms the email is verified and links to sign-in', async () => {
      const router = renderRoute('/email-verified')

      expect(await screen.findByRole('heading', { name: 'Your email is verified' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('link', { name: 'Sign in' }))

      expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/sign-in')
    })

    it('explains a link that did not work', async () => {
      renderRoute('/email-verified?error=TOKEN_EXPIRED')

      expect(await screen.findByRole('heading', { name: "This link didn't work" })).toBeInTheDocument()
    })
  })
})
