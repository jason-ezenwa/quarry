import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api/api-fetch'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx won't change on retry; only network failures and 5xx are retried.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < MAX_RETRIES,
    },
  },
})
