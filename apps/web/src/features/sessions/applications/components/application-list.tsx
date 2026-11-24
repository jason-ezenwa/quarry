import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PATHS } from '@/lib/auth/auth.constants'
import { useSessionList } from '../../hooks/use-sessions'
import type { ListTab } from '../applications.types'
import { ApplicationRow } from './application-row'

// One tab's list, a page at a time.
export function ApplicationList({ tab }: { tab: ListTab }) {
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useSessionList(tab === 'archived')
  const sessions = data?.pages.flatMap((page) => page.items) ?? []

  if (isPending) return <Spinner className="mx-auto mt-6" />
  if (isError) return <p className="pt-2 text-small text-muted-foreground">We couldn't load your applications.</p>

  if (sessions.length === 0) {
    return (
      <p className="pt-2 text-small text-muted-foreground">
        {tab === 'active' ? (
          <>
            No applications yet.{' '}
            <Link to={PATHS.home} className="text-foreground underline underline-offset-3">
              Paste a job link on Home
            </Link>{' '}
            to start one.
          </>
        ) : (
          'Nothing archived. Archive an application from its menu.'
        )}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul>
        {sessions.map((session) => (
          <ApplicationRow key={session.id} session={session} />
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
