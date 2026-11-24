import { SidebarSimpleIcon } from '@phosphor-icons/react/dist/csr/SidebarSimple'
import type { SessionDetail } from '@quarry/contracts'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PageHeader } from '@/components/app-frame/page-header'
import { OutputPanelClose } from '@/components/session/output-panel'
import { SessionChat, SessionChatFooter } from '@/components/session/session-chat'
import {
  OutputSheet,
  OutputSheetClose,
  OutputSheetHeader,
  OutputSheetSpacer,
  OutputSheetTitle,
  SessionAside,
  SessionBody,
  SessionFrame,
} from '@/components/session/session-layout'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ApplicationComposer } from '@/features/sessions/components/application-composer'
import { ApplicationThread } from '@/features/sessions/components/application-thread'
import { DocumentPanel, DocumentTabs, DocumentTabsFullWidth } from '@/features/sessions/components/document-panel'
import { SessionMenu } from '@/features/sessions/components/session-menu'
import { StatusBadge } from '@/features/sessions/components/status-badge'
import { useOpenDocuments } from '@/features/sessions/hooks/use-open-documents'
import { useSessionChat } from '@/features/sessions/hooks/use-session-chat'
import { useSession } from '@/features/sessions/hooks/use-sessions'
import { CRUMBS } from '@/features/sessions/sessions.constants'
import type { ApplicationComposerState, DocumentAnnouncement } from '@/features/sessions/sessions.types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { WIDE_SCREEN_QUERY } from '@/hooks/use-media-query.constants'
import { ApiError } from '@/lib/api/api-fetch'
import { PATHS } from '@/lib/auth/auth.constants'

function composerState(session: SessionDetail, chat: ReturnType<typeof useSessionChat>): ApplicationComposerState {
  if (session.archivedAt) return 'archived'
  if (session.userMessageCount >= session.messageLimit) return 'limit'
  if (chat.stopping) return 'stopping'
  if (chat.canStop) return 'stoppable'
  return chat.busy || chat.waiting ? 'busy' : 'open'
}

function SessionView({ session, fresh }: { session: SessionDetail; fresh: boolean }) {
  const chat = useSessionChat(session, fresh)
  const wide = useMediaQuery(WIDE_SCREEN_QUERY)
  const outputs = useOpenDocuments(chat.messages)

  // Open by default beside the chat on wide screens; elsewhere a card opens it over the page.
  const [panelOpen, setPanelOpen] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const showing = wide ? panelOpen : sheetOpen

  function openDocument(document: DocumentAnnouncement) {
    outputs.open(document)
    if (wide) setPanelOpen(true)
    else setSheetOpen(true)
  }

  const working = chat.busy || chat.waiting

  const panelProps = {
    sessionId: session.id,
    job: session.job,
    tab: outputs.tab,
    documents: outputs.documents,
    onTabChange: outputs.changeTab,
  }

  return (
    <SessionFrame>
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
      <SessionBody>
        <SessionChat aria-label="Session">
          <ApplicationThread
            messages={chat.messages}
            working={working}
            error={chat.error}
            activeDocumentId={showing ? (outputs.documents[outputs.tab]?.id ?? null) : null}
            onOpenDocument={openDocument}
            onRetry={chat.retry}
          />
          <SessionChatFooter>
            <ApplicationComposer
              key={chat.unsent?.key}
              state={composerState(session, chat)}
              messageLimit={session.messageLimit}
              draft={chat.unsent?.text}
              onSend={chat.send}
              onStop={chat.stop}
            />
          </SessionChatFooter>
        </SessionChat>
        {wide && panelOpen ? (
          <SessionAside aria-label="Output">
            <DocumentPanel {...panelProps}>
              <DocumentTabs />
              <OutputPanelClose onClick={() => setPanelOpen(false)} />
            </DocumentPanel>
          </SessionAside>
        ) : null}
      </SessionBody>
      <OutputSheet open={!wide && sheetOpen} onOpenChange={setSheetOpen}>
        <OutputSheetHeader>
          <OutputSheetClose onClick={() => setSheetOpen(false)} />
          <OutputSheetTitle>{session.company ?? session.title}</OutputSheetTitle>
          <OutputSheetSpacer />
        </OutputSheetHeader>
        <DocumentPanel {...panelProps}>
          <DocumentTabsFullWidth />
        </DocumentPanel>
      </OutputSheet>
    </SessionFrame>
  )
}

// One application: the chat with the agent and the documents it saved.
export function SessionPage() {
  const { sessionId = '' } = useParams()
  const { data: session, error, isFetchedAfterMount } = useSession(sessionId, true)

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
