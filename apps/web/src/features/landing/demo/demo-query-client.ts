import { QueryClient } from '@tanstack/react-query'
import { currentUserQueryOptions } from '@/hooks/use-current-user'
import {
  applicationInterviewsQueryOptions,
  documentQueryOptions,
  sessionListQueryOptions,
  usageQueryOptions,
} from '@/features/sessions/sessions-api'
import {
  DEMO_FIT_REPORT,
  DEMO_FIT_REPORT_ID,
  DEMO_SESSION_ID,
  DEMO_SESSION_PAGE,
  DEMO_USAGE,
  DEMO_USER,
} from './demo.constants'

// Holds everything the demo's sidebar and output panel read, so nothing asks the API.
export function createDemoQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } },
  })

  client.setQueryData(sessionListQueryOptions(false).queryKey, { pages: [DEMO_SESSION_PAGE], pageParams: [null] })
  client.setQueryData(usageQueryOptions.queryKey, DEMO_USAGE)
  client.setQueryData(currentUserQueryOptions.queryKey, DEMO_USER)
  client.setQueryData(documentQueryOptions(DEMO_SESSION_ID, 'fit-score', DEMO_FIT_REPORT_ID).queryKey, DEMO_FIT_REPORT)
  client.setQueryData(applicationInterviewsQueryOptions(DEMO_SESSION_ID).queryKey, [])

  return client
}
