import { API_BASE_URL } from './base-url'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
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

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(response.status, body?.message ?? response.statusText)
  }

  return (await response.json()) as T
}
