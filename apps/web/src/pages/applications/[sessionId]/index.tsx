import { Link, Navigate, useParams } from 'react-router'
import { PageHeader } from '@/components/app-frame/page-header'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { SessionView } from '@/features/sessions/components/session-view'
import { useSession } from '@/features/sessions/hooks/use-sessions'
import { CRUMBS } from '@/features/sessions/sessions.constants'
import { ApiError } from '@/lib/api/api-fetch'
import { interviewPath, PATHS } from '@/lib/auth/auth.constants'

// One application: the chat with the agent and the documents it saved.
export function SessionPage() {
  const { sessionId = '' } = useParams()
  const { data: session, error, isFetchedAfterMount } = useSession(sessionId, true)

  // An interview has its own page.
  if (session?.kind === 'interview') return <Navigate to={interviewPath(session.id)} replace />
  if (session) return <SessionView key={session.id} session={session} fresh={isFetchedAfterMount} />

  if (error) {
    const missing = error instanceof ApiError && error.status === 404

    return (
      <>
        <PageHeader title="Application" crumbs={CRUMBS} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-ui text-muted-foreground">
            {missing ? "We couldn't find this application." : "We couldn't load this application."}
          </p>
          <Button asChild>
            <Link to={PATHS.applications}>All applications</Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Application" crumbs={CRUMBS} />
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    </>
  )
}
