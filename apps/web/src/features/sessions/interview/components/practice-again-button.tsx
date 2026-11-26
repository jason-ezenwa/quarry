import { Button } from '@/components/ui/button'
import { useOpenInterview } from '../../interviews/hooks/use-open-interview'

// Starts a new interview for the same application, or opens its unfinished one, leaving this one as it is.
export function PracticeAgainButton({
  applicationId,
  size,
  onError,
}: {
  applicationId: string
  size?: 'default' | 'sm'
  onError: (message: string) => void
}) {
  const { open, pending } = useOpenInterview(applicationId)

  return (
    <Button variant="primary" size={size} loading={pending} onClick={() => open({ onError: (_, message) => onError(message) })}>
      Practice again
    </Button>
  )
}
