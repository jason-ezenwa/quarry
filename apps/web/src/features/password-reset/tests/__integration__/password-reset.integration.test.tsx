import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

async function setNewPassword(password: string, confirmPassword = password) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('New password'), password)
  await user.type(screen.getByLabelText('Confirm new password'), confirmPassword)
  await user.click(screen.getByRole('button', { name: 'Reset password' }))
}

describe('Password reset (integration)', () => {
  describe('forgot password', () => {
    it('is reached from sign-in', async () => {
      const router = renderRoute('/sign-in')

      await userEvent.setup().click(await screen.findByRole('link', { name: 'Forgot password?' }))

      expect(await screen.findByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/forgot-password')
    })

    it('asks for a link and says where it went', async () => {
      let body: unknown
      server.use(
        http.post(apiUrl('/api/auth/request-password-reset'), async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ status: true })
        }),
      )
      renderRoute('/forgot-password')
      const user = userEvent.setup()

      await user.type(await screen.findByLabelText('Email'), 'Ada@Example.com')
      await user.click(screen.getByRole('button', { name: 'Send link' }))

      expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
      expect(screen.getByText(/If there's a Quarry account for ada@example\.com/)).toBeInTheDocument()
      expect(body).toMatchObject({ email: 'ada@example.com' })
    })

    it('explains when there were too many attempts', async () => {
      server.use(
        http.post(apiUrl('/api/auth/request-password-reset'), () =>
          HttpResponse.json({ message: 'Too many requests.' }, { status: 429 }),
        ),
      )
      renderRoute('/forgot-password')
      const user = userEvent.setup()

      await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
      await user.click(screen.getByRole('button', { name: 'Send link' }))

      expect(await screen.findByText('Too many attempts. Try again in a few minutes.')).toBeInTheDocument()
    })
  })

  describe('reset password', () => {
    it('sets the new password with the token from the link', async () => {
      let body: unknown
      server.use(
        http.post(apiUrl('/api/auth/reset-password'), async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ status: true })
        }),
      )
      renderRoute('/reset-password?token=token-1')

      await setNewPassword('a-brand-new-password')

      expect(await screen.findByRole('heading', { name: 'Your password is reset' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
      expect(body).toEqual({ newPassword: 'a-brand-new-password', token: 'token-1' })
    })

    it('offers a new link when the server rejected the link', async () => {
      renderRoute('/reset-password?error=INVALID_TOKEN')

      expect(await screen.findByRole('heading', { name: "This link didn't work" })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password')
    })

    it('offers a new link when the token expires before submitting', async () => {
      server.use(
        http.post(apiUrl('/api/auth/reset-password'), () =>
          HttpResponse.json({ code: 'INVALID_TOKEN', message: 'Invalid token' }, { status: 400 }),
        ),
      )
      renderRoute('/reset-password?token=token-1')

      await setNewPassword('a-brand-new-password')

      expect(await screen.findByRole('heading', { name: "This link didn't work" })).toBeInTheDocument()
    })

    it('flags mismatched passwords', async () => {
      renderRoute('/reset-password?token=token-1')

      await setNewPassword('a-brand-new-password', 'something-else')

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    })
  })
})
