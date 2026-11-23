import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/api-fetch'
import type { CurrentUser } from './use-current-user.types'

export const CURRENT_USER_QUERY_KEY = ['users', 'me'] as const

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiFetch<CurrentUser>('/api/users/me'),
  })
}
