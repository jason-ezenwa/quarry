import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, TEST_USER } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

async function fillAndSubmit({
  name = 'Ada Obi',
  confirmPassword = 'correct-horse',
}: { name?: string; confirmPassword?: string } = {}) {
  const password = 'correct-horse'
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Name'), name)
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), confirmPassword)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('Sign up (integration)', () => {
  it('creates the account without the confirmation field and asks to check email', async () => {
    let body: unknown
    server.use(
      http.post(apiUrl('/api/auth/sign-up/email'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ token: null, user: { ...TEST_USER, emailVerified: false } })
      }),
    )
    const router = renderRoute('/sign-up')

    await fillAndSubmit()

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText('We sent a link to ada@example.com. Open it to verify your address, then sign in.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/verify-email')
    expect(body).toEqual({
      name: 'Ada Obi',
      email: 'ada@example.com',
      password: 'correct-horse',
    })
  })

  it('explains when there were too many attempts', async () => {
    server.use(
      http.post(apiUrl('/api/auth/sign-up/email'), () =>
        HttpResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 }),
      ),
    )
    renderRoute('/sign-up')

    await fillAndSubmit()

    expect(await screen.findByText('Too many attempts. Try again in a few minutes.')).toBeInTheDocument()
  })

  it('flags mismatched passwords on the confirmation field', async () => {
    renderRoute('/sign-up')

    await fillAndSubmit({ confirmPassword: 'different-one' })

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
  })

  it('refuses a name with a link before sending anything', async () => {
    let called = false
    server.use(
      http.post(apiUrl('/api/auth/sign-up/email'), () => {
        called = true
        return HttpResponse.json({ token: null, user: null })
      }),
    )
    renderRoute('/sign-up')

    await fillAndSubmit({ name: 'Claim https://bit.ly/x' })

    expect(await screen.findByText("Names can't include web addresses.")).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('points an email that is not invited to the waitlist', async () => {
    server.use(
      http.post(apiUrl('/api/auth/sign-up/email'), () =>
        HttpResponse.json({ code: 'NOT_INVITED', message: 'Not invited.' }, { status: 403 }),
      ),
    )
    const router = renderRoute('/sign-up')

    await fillAndSubmit()

    expect(
      await screen.findByText(
        "Quarry is in private beta, and this email isn't on the invite list yet. Join the waitlist and we'll let you know when a spot opens.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Join the waitlist' })).toHaveAttribute(
      'href',
      'https://forms.example.com/quarry-waitlist',
    )
    expect(router.state.location.pathname).toBe('/sign-up')
  })

  it("fills in the invite link's email and name", async () => {
    renderRoute('/sign-up?email=ada%40example.com&name=Ada')

    expect(await screen.findByLabelText('Name')).toHaveValue('Ada')
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com')
  })

  it("shows the server's name check on the name field", async () => {
    server.use(
      http.post(apiUrl('/api/auth/sign-up/email'), () =>
        HttpResponse.json({ code: 'INVALID_NAME', message: 'Enter your name.' }, { status: 400 }),
      ),
    )
    renderRoute('/sign-up')

    await fillAndSubmit()

    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })
})
