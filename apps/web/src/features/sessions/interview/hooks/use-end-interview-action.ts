import { isOneOf, SESSION_ERROR_CODES } from '@quarry/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/api-fetch'
import { useEndInterview } from '../../hooks/use-sessions'
import { SESSION_QUERY_KEYS } from '../../sessions.constants'
import { END_ERRORS, END_FAILED } from '../interview.constants'

function errorCode(error: unknown) {
  return error instanceof ApiError && isOneOf(SESSION_ERROR_CODES, error.code) ? error.code : null
}

// An interview already ended elsewhere shows as ended; any other refusal leaves it open and says why.
export function useEndInterviewAction(sessionId: string) {
  const queryClient = useQueryClient()
  const mutation = useEndInterview(sessionId)
  const code = errorCode(mutation.error)

  return {
    ending: mutation.isPending,
    // A refusal stops applying once the user carries on.
    dismiss: mutation.reset,
    error: !mutation.error || code === 'interview-ended' ? null : ((code && END_ERRORS[code]) ?? END_FAILED),
    end: () =>
      mutation.mutate(undefined, {
        onError: (error) => {
          if (errorCode(error) === 'interview-ended') {
            void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.detail(sessionId) })
          }
        },
      }),
  }
}
