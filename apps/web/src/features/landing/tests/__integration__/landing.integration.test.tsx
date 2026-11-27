import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { WAITLIST_URL } from '@/features/landing/landing.constants'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, signInAs } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

describe('Landing (integration)', () => {
  it('shows a signed-out visitor the landing page, with the waitlist and sign-in', async () => {
    const router = renderRoute('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'Apply with an agent in your corner.' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    for (const link of screen.getAllByRole('link', { name: 'Join the waitlist' })) {
      expect(link).toHaveAttribute('href', WAITLIST_URL)
    }
    expect(screen.getByRole('link', { name: 'I have an invite' })).toHaveAttribute('href', '/sign-in')
  })

  it('sends a signed-in user on to home', async () => {
    signInAs()
    const router = renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'New application' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('still shows the landing page when the API cannot be reached', async () => {
    server.use(http.get(apiUrl('/api/auth/get-session'), () => HttpResponse.error()))
    const router = renderRoute('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'Apply with an agent in your corner.' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})
