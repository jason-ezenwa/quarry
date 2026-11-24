import { Link } from 'react-router'
import { PATHS } from '@/lib/auth/auth.constants'
import { useSessionList } from '../hooks/use-sessions'
import { HOME_RECENT_SESSIONS_LIMIT } from '../sessions.constants'
import { ApplicationRow } from './application-row'

// Home's list of the latest active applications, with the month's count beside the heading.
export function RecentApplications({ usageLabel }: { usageLabel?: string }) {
  const { data } = useSessionList(false)
  const sessions = data?.pages[0]?.items ?? []

  if (sessions.length === 0) return null

  const more = sessions.length > HOME_RECENT_SESSIONS_LIMIT || Boolean(data?.pages[0]?.nextCursor)

  return (
    <section aria-labelledby="recent-applications" className="flex flex-col gap-2 md:gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-applications" className="text-ui-strong md:text-small">
          Recent
        </h2>
        {usageLabel ? <span className="hidden text-label text-muted-foreground md:inline">{usageLabel}</span> : null}
      </div>
      <ul>
        {sessions.slice(0, HOME_RECENT_SESSIONS_LIMIT).map((session) => (
          <ApplicationRow key={session.id} session={session} />
        ))}
      </ul>
      {more ? (
        <Link to={PATHS.applications} className="self-start text-small text-muted-foreground underline-offset-3 hover:text-foreground hover:underline">
          All applications
        </Link>
      ) : null}
    </section>
  )
}
