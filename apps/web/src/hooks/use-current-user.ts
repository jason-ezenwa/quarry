import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/api-fetch'
import type { CurrentUser } from './use-current-user.types'

export const currentUserQueryOptions = queryOptions({
  queryKey: ['users', 'me'] as const,
  queryFn: () => apiFetch<CurrentUser>('/api/users/me'),
})

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions)
}
