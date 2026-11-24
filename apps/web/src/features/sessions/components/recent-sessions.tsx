import { useId } from 'react'
import { NavLink } from 'react-router'
import { sessionPath } from '@/lib/auth/auth.constants'
import { useSessionList } from '../hooks/use-sessions'
import { RECENT_SESSIONS_LIMIT } from '../sessions.constants'
import { FitDot } from './fit-dot'

// The sidebar's latest active applications, by company, with the fit band and score.
export function RecentSessions() {
  const { data } = useSessionList(false)
  const headingId = useId()
  const sessions = data?.pages[0]?.items.slice(0, RECENT_SESSIONS_LIMIT) ?? []

  if (sessions.length === 0) return null

  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-px">
      <h2 id={headingId} className="px-2.5 pb-1.5 text-label text-muted-foreground">
        Recent
      </h2>
      {sessions.map((session) => (
        <NavLink
          key={session.id}
          to={sessionPath(session.id)}
          className="flex h-control items-center gap-2.25 rounded-md px-2.5 text-small text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
        >
          <FitDot label={session.fitLabel} />
          <span className="truncate">{session.company ?? session.title}</span>
          {session.fitScore === null ? null : <span className="ml-auto text-label">{session.fitScore}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
