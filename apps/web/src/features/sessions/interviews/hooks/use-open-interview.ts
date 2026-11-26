import { useNavigate } from 'react-router'
import { interviewPath } from '@/lib/auth/auth.constants'
import type { SessionPageState } from '../../chat/chat.types'
import { useStartInterview } from '../../hooks/use-sessions'
import { startInterviewErrorMessage } from '../interview-format'

// Starts or resumes the application's interview; the page answers the greeting if still unanswered.
export function useOpenInterview(applicationId: string) {
  const start = useStartInterview(applicationId)
  const navigate = useNavigate()

  function open({ onError }: { onError?: (error: Error, message: string) => void } = {}) {
    start.mutate(undefined, {
      onSuccess: ({ id }) => navigate(interviewPath(id), { state: { startTurn: true } satisfies SessionPageState }),
      onError: (error) => onError?.(error, startInterviewErrorMessage(error)),
    })
  }

  return {
    open,
    pending: start.isPending,
    error: start.error,
    errorMessage: start.error ? startInterviewErrorMessage(start.error) : null,
  }
}
