import { createAuthClient } from 'better-auth/react'
import { API_BASE_URL } from './api/base-url'

export const authClient = createAuthClient({
  baseURL: `${API_BASE_URL}/api/auth`,
  // Looks up the global fetch on each call instead of capturing it at import,
  // so test interceptors installed after this module loads still apply.
  fetchOptions: {
    customFetchImpl: (input, init) => fetch(input, init),
  },
})
