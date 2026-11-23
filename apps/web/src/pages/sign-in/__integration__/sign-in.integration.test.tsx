import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, signInAs, TEST_USER } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('Sign in (integration)', () => {
  it('signs in and lands on home with the account loaded', async () => {
    let body: unknown
    server.use(
      http.post(apiUrl('/api/auth/sign-in/email'), async ({ request }) => {
        body = await request.json()
        signInAs()
        return HttpResponse.json({ redirect: false, token: 'token-1', user: TEST_USER })
      }),
    )
    const router = renderRoute('/sign-in')

    await fillAndSubmit('Ada@Example.com', 'correct-horse')

    expect(await screen.findByText('Ada Obi')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(body).toMatchObject({ email: 'ada@example.com', password: 'correct-horse' })
  })

  it('shows an error for a wrong password and stays on the page', async () => {
    server.use(
      http.post(apiUrl('/api/auth/sign-in/email'), () =>
        HttpResponse.json(
          { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
          { status: 401 },
        ),
      ),
    )
    const router = renderRoute('/sign-in')

    await fillAndSubmit('ada@example.com', 'wrong-password')

    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('validates the form before calling the API', async () => {
    renderRoute('/sign-in')

    await fillAndSubmit('ada', 'x')

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('sends a signed-in visitor home', async () => {
    signInAs()

    const router = renderRoute('/sign-in')

    expect(await screen.findByText('Ada Obi')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})
