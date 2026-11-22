import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, signInAs } from '@/test/integration/render-route'
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
})
