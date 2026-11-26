import type { SessionSummary } from '@quarry/contracts'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { interviewPath, PATHS } from '@/lib/auth/auth.constants'
import { useInterviewList } from '../../hooks/use-sessions'
import { formatShortDate, jobLine } from '../../session-format'
import { questionProgress } from '../interview-format'
import { INTERVIEW_STATUS_DISPLAY } from '../interviews.constants'

function InterviewRow({ session }: { session: SessionSummary }) {
  const { label, variant } = INTERVIEW_STATUS_DISPLAY[session.interview?.endedAt ? 'ended' : 'live']
  const progress = session.interview ? questionProgress(session.interview) : null

  return (
    <li className="border-t border-border-soft">
      <Link
        to={interviewPath(session.id)}
        className="flex min-h-15 items-center gap-3 px-1 hover:bg-accent md:grid md:min-h-11.5 md:grid-cols-[minmax(0,1fr)_8rem_5.5rem_3.75rem]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.75 md:flex-row md:items-baseline md:gap-2">
          <span className="truncate text-ui-strong">{session.title}</span>
          {session.parentSession ? (
            <span className="truncate text-small text-muted-foreground md:text-ui">
              {jobLine([session.parentSession.title, session.parentSession.company])}
            </span>
          ) : null}
        </span>
        <span className="hidden text-label text-muted-foreground md:block">{progress}</span>
        <Badge variant={variant}>{label}</Badge>
        <span className="text-right text-label text-muted-foreground">{formatShortDate(session.createdAt)}</span>
      </Link>
    </li>
  )
}

export function InterviewList() {
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useInterviewList()
  const sessions = data?.pages.flatMap((page) => page.items) ?? []

  if (isPending) return <Spinner className="mx-auto mt-6" />
  if (isError) return <p className="pt-2 text-small text-muted-foreground">We couldn't load your interviews.</p>

  if (sessions.length === 0) {
    return (
      <p className="pt-2 text-small text-muted-foreground">
        No interviews yet.{' '}
        <Link to={PATHS.applications} className="text-foreground underline underline-offset-3">
          Open an application
        </Link>{' '}
        and start a mock interview from it.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul>
        {sessions.map((session) => (
          <InterviewRow key={session.id} session={session} />
        ))}
      </ul>
      {hasNextPage ? (
        <Button className="self-center" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
          Show more
        </Button>
      ) : null}
    </div>
  )
}
