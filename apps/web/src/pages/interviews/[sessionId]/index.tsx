import { Link, useParams } from 'react-router'
import { PageHeader } from '@/components/app-frame/page-header'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { InterviewView } from '@/features/sessions/interview/components/interview-view'
import { INTERVIEW_CRUMBS } from '@/features/sessions/interview/interview.constants'
import { useSession } from '@/features/sessions/hooks/use-sessions'
import { ApiError } from '@/lib/api/api-fetch'
import { PATHS } from '@/lib/auth/auth.constants'

export function InterviewPage() {
  const { sessionId = '' } = useParams()
  const { data: session, error, isFetchedAfterMount } = useSession(sessionId, true)

  if (session?.kind === 'interview') return <InterviewView key={session.id} session={session} fresh={isFetchedAfterMount} />

  // An application's id opens no interview.
  if (error || session) {
    const missing = Boolean(session) || (error instanceof ApiError && error.status === 404)

    return (
      <>
        <PageHeader title="Mock interview" crumbs={INTERVIEW_CRUMBS} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-ui text-muted-foreground">
            {missing ? "We couldn't find this interview." : "We couldn't load this interview."}
          </p>
          <Button asChild>
            <Link to={PATHS.interviews}>All interviews</Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Mock interview" crumbs={INTERVIEW_CRUMBS} />
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    </>
  )
}
