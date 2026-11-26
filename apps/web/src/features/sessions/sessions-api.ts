import type {
  CreateSessionRequest,
  CreateSessionResponse,
  DocumentKind,
  DocumentResponse,
  ExportableKind,
  ExportFormat,
  ApplicationInterview,
  InterviewState,
  SessionDetail,
  SessionPage,
  SessionSummary,
  UsageResponse,
} from '@quarry/contracts'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { apiFetch, errorFrom } from '@/lib/api/api-fetch'
import { API_BASE_URL } from '@/lib/api/base-url'
import { saveFile } from '@/lib/save-file'
import { attachmentFileName } from './session-format'
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

export const interviewListQueryOptions = infiniteQueryOptions({
  queryKey: SESSION_QUERY_KEYS.interviewList,
  queryFn: ({ pageParam }) => {
    const params = new URLSearchParams({ kind: 'interview' })
    if (pageParam) params.set('cursor', pageParam)
    return apiFetch<SessionPage>(`/api/sessions?${params.toString()}`)
  },
  initialPageParam: null as string | null,
  getNextPageParam: (page) => page.nextCursor,
})

export function applicationInterviewsQueryOptions(applicationId: string) {
  return queryOptions({
    queryKey: SESSION_QUERY_KEYS.applicationInterviews(applicationId),
    queryFn: () => apiFetch<ApplicationInterview[]>(`${sessionUrl(applicationId)}/interviews`),
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

function documentUrl(sessionId: string, kind: DocumentKind, documentId: string): string {
  return `${sessionUrl(sessionId)}/documents/${kind}/${encodeURIComponent(documentId)}`
}

// A saved document never changes, so it is fetched once.
export function documentQueryOptions<Kind extends DocumentKind>(sessionId: string, kind: Kind, documentId: string) {
  return queryOptions({
    queryKey: SESSION_QUERY_KEYS.document(sessionId, kind, documentId),
    queryFn: () => apiFetch<Extract<DocumentResponse, { kind: Kind }>>(documentUrl(sessionId, kind, documentId)),
    staleTime: Infinity,
  })
}

// Fetched rather than linked, so a failed download stays on the page and the server names the file.
export async function downloadExport(
  sessionId: string,
  kind: ExportableKind,
  documentId: string,
  format: ExportFormat,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${documentUrl(sessionId, kind, documentId)}/export?format=${format}`, {
    credentials: 'include',
  })

  if (!response.ok) throw await errorFrom(response)

  saveFile(await response.blob(), attachmentFileName(response.headers.get('Content-Disposition')) ?? `document.${format}`)
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

// Starts an interview for an application, or returns the unfinished one.
export function startInterview(applicationId: string): Promise<SessionSummary> {
  return apiFetch<SessionSummary>(`${sessionUrl(applicationId)}/interviews`, { method: 'POST' })
}

// Ends an interview; resolves once its feedback is saved.
export function endInterview(sessionId: string): Promise<InterviewState> {
  return apiFetch<InterviewState>(`${sessionUrl(sessionId)}/interview/end`, { method: 'POST' })
}
