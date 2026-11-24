import type { PrimaryResumeResponse, Resume } from '@quarry/contracts'
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { queryClient } from '../../lib/query-client'
import { routes } from '../../routes'
import { apiUrl } from './handlers'
import { server } from './server'

export type TestUser = typeof TEST_USER

export const TEST_USER = {
  id: 'user-1',
  name: 'Ada Obi',
  email: 'ada@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

export function sessionResponse(user: TestUser = TEST_USER) {
  return {
    session: {
      id: 'session-1',
      userId: user.id,
      token: 'token-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    user,
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

export const TEST_RESUME: Resume = {
  name: 'Ada Obi',
  contact: {
    email: 'ada@example.com',
    location: 'Lagos, Nigeria',
    links: [{ label: 'GitHub', url: 'https://github.com/ada' }],
  },
  summary: 'Full-stack engineer.',
  experience: [
    {
      title: 'Lead Engineer',
      company: 'Acme',
      startDate: '2024-01',
      bullets: ['Built the billing service', 'Led a team of four'],
    },
    { title: 'Software Engineer', company: 'Globex', startDate: '2021', endDate: '2023', bullets: ['Shipped search'] },
  ],
  education: [],
  skills: [{ name: 'TypeScript' }, { name: 'React' }],
  projects: [],
  certifications: [],
}

// A parsed primary resume; override any field for the state a test needs.
export function primaryResumeResponse(overrides: Partial<PrimaryResumeResponse> = {}): PrimaryResumeResponse {
  return {
    id: 'resume-1',
    parseStatus: 'parsed',
    parsedAt: '2026-01-02T00:01:00.000Z',
    reviewedAt: '2026-01-02T00:05:00.000Z',
    file: { originalName: 'ada-obi-resume.pdf', mimeType: 'application/pdf', size: 212 * 1024 },
    resume: TEST_RESUME,
    ...overrides,
  }
}

// Signs the visitor in; `profile: false` is a user who hasn't finished onboarding.
// The email defaults to verified and the primary resume to parsed and reviewed, so Home shows no callout.
export function signInAs({
  profile = true,
  resume = primaryResumeResponse(),
  user = TEST_USER,
}: { profile?: boolean; resume?: PrimaryResumeResponse; user?: TestUser } = {}) {
  server.use(
    http.get(apiUrl('/api/auth/get-session'), () => HttpResponse.json(sessionResponse(user))),
    http.get(apiUrl('/api/users/me'), () => HttpResponse.json(user)),
    http.get(apiUrl('/api/profiles/me'), () =>
      profile
        ? HttpResponse.json(TEST_PROFILE)
        : HttpResponse.json({ message: 'Profile not found', statusCode: 404 }, { status: 404 }),
    ),
    http.get(apiUrl('/api/resumes/primary'), () => HttpResponse.json(resume)),
    // No applications yet; tests that need some override these.
    http.get(apiUrl('/api/sessions'), () => HttpResponse.json({ items: [], nextCursor: null })),
    http.get(apiUrl('/api/usage'), () =>
      HttpResponse.json({ sessions: { used: 0, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' } }),
    ),
  )
}

// Renders the app's real route tree at `path`, loaders included.
// `state`: router state the page opens with, as a navigation inside the app would pass it.
export function renderRoute(path: string, state?: unknown) {
  const router = createMemoryRouter(routes, { initialEntries: [{ pathname: path, state }] })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}
