import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/app-frame/page-header'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApplicationRow } from '@/features/sessions/components/application-row'
import { useSessionList } from '@/features/sessions/hooks/use-sessions'
import { PATHS } from '@/lib/auth/auth.constants'

type ListTab = 'active' | 'archived'

// One tab's list, a page at a time.
function ApplicationList({ tab }: { tab: ListTab }) {
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

// Every application, active and archived.
export function ApplicationsPage() {
  const [tab, setTab] = useState<ListTab>('active')

  return (
    <>
      <PageHeader title="Applications" />
      <div className="flex flex-1 justify-center px-4 pt-5 pb-12 md:px-6 md:pt-12">
        <Tabs value={tab} onValueChange={(value) => setTab(value === 'archived' ? 'archived' : 'active')} className="w-full max-w-170 gap-4">
          <TabsList aria-label="Applications">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <ApplicationList tab="active" />
          </TabsContent>
          <TabsContent value="archived">
            <ApplicationList tab="archived" />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
