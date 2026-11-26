import { Button } from '@/components/ui/button'
import { useOpenInterview } from '../../interviews/hooks/use-open-interview'

// Starts a new interview for the same application, or opens its unfinished one, leaving this one as it is.
export function PracticeAgainButton({ applicationId }: { applicationId: string }) {
  const { open, pending, errorMessage } = useOpenInterview(applicationId)

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="primary" loading={pending} onClick={() => open()}>
        Practice again
      </Button>
      {errorMessage ? (
        <p role="alert" className="max-w-70 text-right text-small text-destructive-ink">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
