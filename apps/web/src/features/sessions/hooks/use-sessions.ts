import type { CreateSessionRequest, SessionDetail } from '@quarry/contracts'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSession,
  sessionListQueryOptions,
  sessionQueryOptions,
  setSessionArchived,
  usageQueryOptions,
} from '../sessions-api'
import { SESSION_QUERY_KEYS } from '../sessions.constants'

export function useSessionList(archived: boolean) {
  return useInfiniteQuery(sessionListQueryOptions(archived))
}

export function useUsage() {
  return useQuery(usageQueryOptions)
}

export function useSession(sessionId: string, pollWhileDrafting = false) {
  return useQuery(sessionQueryOptions(sessionId, pollWhileDrafting))
}

// Lists, recents and the usage meter all read from these, so a change asks for them again.
export function useRefreshSessionLists() {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.lists }),
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.usage }),
    ])
}

export function useCreateSession() {
  const refreshLists = useRefreshSessionLists()

  return useMutation({
    mutationFn: (request: CreateSessionRequest) => createSession(request),
    onSettled: refreshLists,
  })
}

export function useSetArchived(sessionId: string) {
  const queryClient = useQueryClient()
  const refreshLists = useRefreshSessionLists()

  return useMutation({
    mutationFn: (archived: boolean) => setSessionArchived(sessionId, archived),
    onSuccess: (summary) => {
      queryClient.setQueryData<SessionDetail>(SESSION_QUERY_KEYS.detail(sessionId), (detail) =>
        detail ? { ...detail, archivedAt: summary.archivedAt, status: summary.status } : detail,
      )
    },
    onSettled: refreshLists,
  })
}
