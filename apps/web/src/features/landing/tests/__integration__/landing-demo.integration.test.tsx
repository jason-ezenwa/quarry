import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_USER } from '@/features/landing/demo/demo.constants'
import { currentUserQueryOptions } from '@/hooks/use-current-user'
import { PATHS } from '@/lib/auth/auth.constants'
import { queryClient } from '@/lib/query-client'
import { renderRoute, signInAs, TEST_USER } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'
import { setViewport } from '@/test/integration/viewport'

describe('Landing demo (integration)', () => {
  const requests: string[] = []
  const record = ({ request }: { request: Request }) => requests.push(request.url)

  beforeEach(() => {
    setViewport('desktop')
    server.events.on('request:start', record)
  })
  afterEach(() => {
    server.events.removeListener('request:start', record)
    requests.length = 0
  })

  it('plays the real session screen on made-up data without asking the API', async () => {
    const router = renderRoute(PATHS.landingDemo)

    expect(await screen.findByRole('heading', { level: 1, name: 'Senior Product Engineer' })).toBeInTheDocument()
    expect(screen.getByText(DEMO_USER.name)).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Recent' })).getByRole('link', { name: /Halden/ })).toHaveAttribute('aria-current', 'page')
    expect(router.state.location.pathname).toBe(PATHS.landingDemo)
    expect(requests).toEqual([])
  })

  it('leaves the app\'s own cache alone, so a signed-in user sees their own data', async () => {
    renderRoute(PATHS.landingDemo)
    await screen.findByText(DEMO_USER.name)

    expect(queryClient.getQueryData(currentUserQueryOptions.queryKey)).toBeUndefined()
    cleanup()

    signInAs()
    renderRoute(PATHS.home)

    expect(await screen.findByText(TEST_USER.name)).toBeInTheDocument()
    expect(screen.queryByText(DEMO_USER.name)).not.toBeInTheDocument()
  })
})
