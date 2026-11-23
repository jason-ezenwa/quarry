import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { queryClient } from '../../lib/query-client'
import { routes } from '../../routes'
import { apiUrl } from './handlers'
import { server } from './server'

export const TEST_USER = {
  id: 'user-1',
  name: 'Ada Obi',
  email: 'ada@example.com',
  emailVerified: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

export function sessionResponse() {
  return {
    session: {
      id: 'session-1',
      userId: TEST_USER.id,
      token: 'token-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: TEST_USER.createdAt,
      updatedAt: TEST_USER.updatedAt,
    },
    user: TEST_USER,
  }
}

export const TEST_PROFILE = {
  id: 'profile-1',
  targetRoles: ['Senior Product Engineer'],
  yearsOfExperience: 4,
  countryCode: 'NG',
  workSetups: ['remote'],
  salaryFloor: { amount: 60000, currency: 'USD' },
  createdAt: '2026-01-02T00:00:00.000Z',
}

// Signs the visitor in; `profile: false` is a user who hasn't finished onboarding.
export function signInAs({ profile = true }: { profile?: boolean } = {}) {
  server.use(
    http.get(apiUrl('/api/auth/get-session'), () => HttpResponse.json(sessionResponse())),
    http.get(apiUrl('/api/users/me'), () => HttpResponse.json(TEST_USER)),
    http.get(apiUrl('/api/profiles/me'), () =>
      profile
        ? HttpResponse.json(TEST_PROFILE)
        : HttpResponse.json({ message: 'Profile not found', statusCode: 404 }, { status: 404 }),
    ),
  )
}

// Renders the app's real route tree at `path`, loaders included.
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}
