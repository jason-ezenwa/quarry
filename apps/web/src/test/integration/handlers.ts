import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '../../lib/api/base-url'

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

// Baseline API responses every integration test starts from. Override one for
// a single test with `server.use(...)`; the override is reset after each test.
export const handlers = [
  // Signed out unless a test says otherwise.
  http.get(apiUrl('/api/auth/get-session'), () => HttpResponse.json(null)),
  http.get(apiUrl('/api/users/me'), () =>
    HttpResponse.json({ message: 'Unauthorized', statusCode: 401 }, { status: 401 }),
  ),
]
