import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowClockwise'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Callout, CalloutActions, CalloutContent, CalloutMeta, CalloutTitle } from '@/components/ui/callout'
import { useRetryPrimaryResumeParse } from '../use-primary-resume'
import { ReuploadButton } from './reupload-button'

export function ReadingResumeCallout({ fileName }: { fileName?: string }) {
  return (
    <Callout tone="progress">
      <CalloutContent>
        <CalloutTitle>Reading your resume</CalloutTitle>
        {fileName ? <CalloutMeta>{fileName}</CalloutMeta> : null}
      </CalloutContent>
    </Callout>
  )
}

// Retry reads the stored file again; Re-upload swaps in a different one.
export function FailedResumeCallout() {
  const retry = useRetryPrimaryResumeParse()

  return (
    <Callout tone="danger">
      <CalloutContent>
        <CalloutTitle>We couldn't read your resume</CalloutTitle>
      </CalloutContent>
      <CalloutActions>
        <Button
          size="sm"
          loading={retry.isPending}
          onClick={() => retry.mutate(undefined, { onError: () => toast.error('We could not retry. Try again.') })}
        >
          <ArrowClockwiseIcon data-icon="inline-start" aria-hidden="true" />
          Retry
        </Button>
        <ReuploadButton size="sm" />
      </CalloutActions>
    </Callout>
  )
}
