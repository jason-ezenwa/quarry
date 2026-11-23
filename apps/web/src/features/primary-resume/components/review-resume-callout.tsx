import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Callout, CalloutActions, CalloutContent, CalloutTitle } from '@/components/ui/callout'
import { PATHS } from '@/lib/auth/auth.constants'
import { usePrimaryResume } from '../use-primary-resume'
import { ReadingResumeCallout } from './resume-state-callouts'

// Home's reminder, shown until the primary resume is reviewed.
export function ReviewResumeCallout() {
  const { data } = usePrimaryResume()

  if (!data || data.reviewedAt) return null

  if (data.parseStatus === 'parsing') return <ReadingResumeCallout fileName={data.file.originalName} />

  if (data.parseStatus === 'failed') {
    return (
      <Callout tone="danger">
        <CalloutContent>
          <CalloutTitle>We couldn't read your resume</CalloutTitle>
        </CalloutContent>
        <CalloutActions>
          <Button asChild size="sm">
            <Link to={PATHS.profile}>
              Go to profile
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </CalloutActions>
      </Callout>
    )
  }

  return (
    <Callout tone="review">
      <CalloutContent>
        <CalloutTitle>Review your resume</CalloutTitle>
      </CalloutContent>
      <CalloutActions>
        <Button asChild variant="primary" size="sm">
          <Link to={PATHS.resume}>Review resume</Link>
        </Button>
      </CalloutActions>
    </Callout>
  )
}
