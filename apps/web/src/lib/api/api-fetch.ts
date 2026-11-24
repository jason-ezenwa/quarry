import { API_BASE_URL } from './base-url'

export type ApiErrorBody = { message?: string; code?: string } & Record<string, unknown>

export class ApiError extends Error {
  readonly status: number
  // The server's error code, such as `monthly-session-limit`, when it sends one.
  readonly code: string | null
  readonly body: ApiErrorBody | null

  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = typeof body?.code === 'string' ? body.code : null
    this.body = body
  }
}

// The ApiError for a non-2xx response, with the server's message and code when it sent them.
export async function errorFrom(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null
  return new ApiError(response.status, body?.message ?? response.statusText, body)
}

// Every API call sends the session cookie and throws ApiError on a non-2xx.
// A FormData body keeps the multipart content type fetch sets for it.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const contentType = init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...contentType, ...init?.headers },
  })

  if (!response.ok) throw await errorFrom(response)

  // A 202 or 204 can come back with no body at all.
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}
