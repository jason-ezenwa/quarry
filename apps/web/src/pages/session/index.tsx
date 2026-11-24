import { SidebarSimpleIcon } from '@phosphor-icons/react/dist/csr/SidebarSimple'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { DOCUMENT_KINDS, type DocumentKind, type SessionDetail } from '@quarry/contracts'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PageHeader } from '@/components/app-frame/page-header'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import type { ComposerState } from '@/features/sessions/components/composer'
import { OutputPanel } from '@/features/sessions/components/output-panel'
import { SessionChat } from '@/features/sessions/components/session-chat'
import { SessionMenu } from '@/features/sessions/components/session-menu'
import { StatusBadge } from '@/features/sessions/components/status-badge'
import { useSessionChat } from '@/features/sessions/hooks/use-session-chat'
import { useSession } from '@/features/sessions/hooks/use-sessions'
import { latestDocuments } from '@/features/sessions/session-parts'
import type { DocumentAnnouncement, OpenDocument } from '@/features/sessions/sessions.types'
import { WIDE_SCREEN_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { ApiError } from '@/lib/api/api-fetch'
import { PATHS } from '@/lib/auth/auth.constants'

const CRUMBS = [{ label: 'Applications', to: PATHS.applications }]

function composerState(session: SessionDetail, busy: boolean): ComposerState {
  if (session.archivedAt) return 'archived'
  if (session.userMessageCount >= session.messageLimit) return 'limit'
  return busy ? 'busy' : 'open'
}

function SessionView({ session, fresh }: { session: SessionDetail; fresh: boolean }) {
  const chat = useSessionChat(session, fresh)
  const wide = useMediaQuery(WIDE_SCREEN_QUERY)
  // Open by default beside the chat on wide screens; elsewhere a card opens it over the page.
  const [panelOpen, setPanelOpen] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tab, setTab] = useState<DocumentKind>('fit-score')
  // A document opened from a card. Without one, each tab shows the newest of its kind.
  const [pinned, setPinned] = useState<OpenDocument | null>(null)

  const latest = latestDocuments(chat.messages)
  const documents: Partial<Record<DocumentKind, OpenDocument>> = Object.fromEntries(
    DOCUMENT_KINDS.map((kind) => [kind, pinned?.kind === kind ? pinned : latest[kind]]),
  )
  const showing = wide ? panelOpen : sheetOpen

  function openDocument({ kind, id }: DocumentAnnouncement) {
    setPinned({ kind, id })
    setTab(kind)
    if (wide) setPanelOpen(true)
    else setSheetOpen(true)
  }

  function changeTab(next: DocumentKind) {
    setTab(next)
    setPinned(null)
  }

  const working = chat.busy || chat.waiting
  const panel = (fill: boolean) => (
    <OutputPanel
      sessionId={session.id}
      job={session.job}
      tab={tab}
      documents={documents}
      onTabChange={changeTab}
      onClose={() => setPanelOpen(false)}
      fill={fill}
    />
  )

  return (
    <div className="flex h-svh flex-col md:h-[calc(100svh-1rem)]">
      <PageHeader
        title={session.title}
        sub={session.company ?? undefined}
        badge={<StatusBadge status={working ? 'drafting' : session.status} />}
        crumbs={CRUMBS}
        actions={
          <>
            {wide && !panelOpen ? (
              <Button variant="ghost" size="icon" aria-label="Open panel" onClick={() => setPanelOpen(true)}>
                <SidebarSimpleIcon aria-hidden="true" />
              </Button>
            ) : null}
            <SessionMenu sessionId={session.id} archived={Boolean(session.archivedAt)} />
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <SessionChat
          messages={chat.messages}
          working={working}
          error={chat.error}
          composer={composerState(session, working)}
          unsent={chat.unsent}
          activeDocumentId={showing ? (documents[tab]?.id ?? null) : null}
          onOpenDocument={openDocument}
          onSend={chat.send}
          onRetry={chat.retry}
        />
        {wide && panelOpen ? (
          <aside aria-label="Output" className="flex w-125 shrink-0 flex-col border-l border-border-soft bg-background texture-plaster 2xl:w-140">
            {panel(false)}
          </aside>
        ) : null}
      </div>
      <Sheet open={!wide && sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" size="document" aria-describedby={undefined} className="bg-background texture-plaster">
          <header className="flex h-14 shrink-0 items-center gap-1 px-1.5">
            <Button variant="ghost" size="icon-touch" aria-label="Close" onClick={() => setSheetOpen(false)}>
              <XIcon aria-hidden="true" />
            </Button>
            <SheetTitle className="flex-1 truncate text-center">{session.company ?? session.title}</SheetTitle>
            <span className="size-11 shrink-0" />
          </header>
          {panel(true)}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// One application: the chat with the agent and the documents it saved.
export function SessionPage() {
  const { sessionId = '' } = useParams()
  const { data: session, error, isFetchedAfterMount } = useSession(sessionId, true)

  if (session) return <SessionView key={session.id} session={session} fresh={isFetchedAfterMount} />

  if (error) {
    const missing = error instanceof ApiError && (error.status === 404 || error.status === 400)
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
