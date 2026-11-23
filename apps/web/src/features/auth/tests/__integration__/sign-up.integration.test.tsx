import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, signInAs, TEST_USER } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

async function fillAndSubmit({ confirmPassword = 'correct-horse' }: { confirmPassword?: string } = {}) {
  const password = 'correct-horse'
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Name'), 'Ada Obi')
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), confirmPassword)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('Sign up (integration)', () => {
  it('creates the account without the confirmation field and goes to onboarding', async () => {
    let body: unknown
    server.use(
      http.post(apiUrl('/api/auth/sign-up/email'), async ({ request }) => {
        body = await request.json()
        signInAs({ profile: false })
        return HttpResponse.json({ token: 'token-1', user: TEST_USER })
      }),
    )
    const router = renderRoute('/sign-up')

    await fillAndSubmit()

    expect(await screen.findByRole('heading', { name: 'Set up your profile' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding')
    expect(body).toEqual({ name: 'Ada Obi', email: 'ada@example.com', password: 'correct-horse' })
  })

  it('explains when the email already has an account', async () => {
    server.use(
      http.post(apiUrl('/api/auth/sign-up/email'), () =>
        HttpResponse.json({ code: 'USER_ALREADY_EXISTS', message: 'User already exists' }, { status: 422 }),
      ),
    )
    renderRoute('/sign-up')

    await fillAndSubmit()

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument()
  })

  it('flags mismatched passwords on the confirmation field', async () => {
    renderRoute('/sign-up')

    await fillAndSubmit({ confirmPassword: 'different-one' })

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
  })
})
