import type {
  CreateSessionRequest,
  CreateSessionResponse,
  FitScoreDocumentResponse,
  SessionDetail,
  SessionPage,
  SessionSummary,
  UsageResponse,
} from '@quarry/contracts'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/api-fetch'
import { API_BASE_URL } from '@/lib/api/base-url'
import { SESSION_QUERY_KEYS, TURN_POLL_INTERVAL_MS } from './sessions.constants'

function sessionUrl(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}`
}

// Absolute: the chat transport calls fetch itself, without apiFetch's base URL.
export function turnsUrl(sessionId: string): string {
  return `${API_BASE_URL}${sessionUrl(sessionId)}/turns`
}

// Newest first, a page at a time; `nextCursor` is null on the last page.
export function sessionListQueryOptions(archived: boolean) {
  return infiniteQueryOptions({
    queryKey: SESSION_QUERY_KEYS.list(archived),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ archived: String(archived) })
      if (pageParam) params.set('cursor', pageParam)
      return apiFetch<SessionPage>(`/api/sessions?${params.toString()}`)
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

// `pollWhileDrafting` keeps asking while a turn started elsewhere runs, so the reply shows once it lands.
export function sessionQueryOptions(sessionId: string, pollWhileDrafting = false) {
  return queryOptions({
    queryKey: SESSION_QUERY_KEYS.detail(sessionId),
    queryFn: () => apiFetch<SessionDetail>(sessionUrl(sessionId)),
    refetchInterval: (query) =>
      pollWhileDrafting && query.state.data?.status === 'drafting' ? TURN_POLL_INTERVAL_MS : false,
  })
}

export const usageQueryOptions = queryOptions({
  queryKey: SESSION_QUERY_KEYS.usage,
  queryFn: () => apiFetch<UsageResponse>('/api/usage'),
})

// A saved document never changes, so it is fetched once.
export function fitScoreQueryOptions(sessionId: string, documentId: string) {
  return queryOptions({
    queryKey: SESSION_QUERY_KEYS.document(sessionId, 'fit-score', documentId),
    queryFn: () =>
      apiFetch<FitScoreDocumentResponse>(
        `${sessionUrl(sessionId)}/documents/fit-score/${encodeURIComponent(documentId)}`,
      ),
    staleTime: Infinity,
  })
}

export function createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
  return apiFetch<CreateSessionResponse>('/api/sessions', { method: 'POST', body: JSON.stringify(request) })
}

export function setSessionArchived(sessionId: string, archived: boolean): Promise<SessionSummary> {
  return apiFetch<SessionSummary>(sessionUrl(sessionId), { method: 'PATCH', body: JSON.stringify({ archived }) })
}

// Stops the turn answering `messageId`. Resolves once the server has dropped its reply and released the session.
export function stopTurn(sessionId: string, messageId: string): Promise<void> {
  return apiFetch<void>(`${sessionUrl(sessionId)}/turns/stop`, { method: 'POST', body: JSON.stringify({ messageId }) })
}
