import type { SessionSummary } from '@quarry/contracts'
import { Link } from 'react-router'
import { sessionPath } from '@/lib/auth/auth.constants'
import { formatShortDate, sourceLabel } from '../../session-format'
import { FitDot } from '../../components/fit-dot'
import { StatusBadge } from '../../components/status-badge'

// One application in a list. Phones stack the role over the company and keep the fit and status on the right.
export function ApplicationRow({ session }: { session: SessionSummary }) {
  const fit = session.fitScore === null ? '–' : String(session.fitScore)

  return (
    <li className="border-t border-border-soft">
      <Link
        to={sessionPath(session.id)}
        className="flex min-h-15 items-center gap-3 px-1 hover:bg-accent md:grid md:min-h-11.5 md:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_5.5rem_3.75rem]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.75 md:flex-row md:items-baseline md:gap-2">
          <span className="truncate text-ui-strong">{session.title}</span>
          {session.company ? <span className="truncate text-small text-muted-foreground md:text-ui">{session.company}</span> : null}
        </span>
        <span className="hidden text-label text-muted-foreground md:block">{sourceLabel(session.source)}</span>
        <span className="hidden items-center gap-1.5 md:flex">
          <FitDot label={session.fitLabel} />
          <span className="text-label text-foreground">
            <span className="sr-only">Fit </span>
            {fit}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1.25 md:block">
          <span className="text-label text-foreground md:hidden">
            <span className="sr-only">Fit </span>
            {fit}
          </span>
          <StatusBadge status={session.status} />
        </span>
        <span className="hidden text-right text-label text-muted-foreground md:block">{formatShortDate(session.createdAt)}</span>
      </Link>
    </li>
  )
}
