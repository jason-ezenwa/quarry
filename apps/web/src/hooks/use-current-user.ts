import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/api-fetch'
import type { CurrentUser } from './use-current-user.types'

export const currentUserQueryOptions = queryOptions({
  queryKey: ['users', 'me'] as const,
  queryFn: () => apiFetch<CurrentUser>('/api/users/me'),
  // Long enough that a page mounting right after its loader prefetched doesn't fetch again.
  staleTime: 30_000,
})

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions)
}
