import type { SessionDetail } from '@quarry/contracts'
import { useState } from 'react'
import { PageHeader } from '@/components/app-frame/page-header'
import { OutputPanelClose, OutputPanelOpen } from '@/components/session/output-panel'
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
import { useMediaQuery } from '@/hooks/use-media-query'
import { WIDE_SCREEN_QUERY } from '@/hooks/use-media-query.constants'
import { ApplicationComposer } from '../chat/components/application-composer'
import { ApplicationThread } from '../chat/components/application-thread'
import { useSessionChat } from '../chat/hooks/use-session-chat'
import { DocumentPanel, DocumentTabs, DocumentTabsFullWidth } from '../documents/components/document-panel'
import { useOpenDocuments } from '../documents/hooks/use-open-documents'
import { InterviewsTab, InterviewsTabContent, InterviewsTabPlain } from '../interviews/components/interviews-tab'
import { MockInterviewButton } from '../interviews/components/mock-interview-button'
import type { ApplicationComposerState, SessionChatState } from '../chat/chat.types'
import { CRUMBS } from '../sessions.constants'
import type { DocumentAnnouncement } from '../sessions.types'
import { SessionMenu } from './session-menu'
import { StatusBadge } from './status-badge'

function composerState(session: SessionDetail, chat: SessionChatState): ApplicationComposerState {
  if (session.archivedAt) return 'archived'
  if (session.userMessageCount >= session.messageLimit) return 'limit'
  if (chat.stopping) return 'stopping'
  if (chat.canStop) return 'stoppable'
  return chat.busy || chat.waiting ? 'busy' : 'open'
}

export function SessionView({ session, fresh }: { session: SessionDetail; fresh: boolean }) {
  return <SessionScreen session={session} chat={useSessionChat(session, fresh)} />
}

// The session page around a conversation, wherever it comes from.
export function SessionScreen({ session, chat }: { session: SessionDetail; chat: SessionChatState }) {
  const wide = useMediaQuery(WIDE_SCREEN_QUERY)
  const outputs = useOpenDocuments(chat.messages)

  // Open by default beside the chat on wide screens; elsewhere a card or the header's button opens it over the page.
  const [panelOpen, setPanelOpen] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const showing = wide ? panelOpen : sheetOpen

  function openPanel() {
    if (wide) setPanelOpen(true)
    else setSheetOpen(true)
  }

  function openDocument(document: DocumentAnnouncement) {
    outputs.open(document)
    openPanel()
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
            {showing ? null : <OutputPanelOpen onClick={openPanel} />}
            <MockInterviewButton applicationId={session.id} available={!session.archivedAt && session.job.hasDescription} />
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
            activeDocumentId={showing ? (outputs.shown?.id ?? null) : null}
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
            <DocumentPanel
              {...panelProps}
              bar={
                <>
                  <DocumentTabs>
                    <InterviewsTab />
                  </DocumentTabs>
                  <OutputPanelClose onClick={() => setPanelOpen(false)} />
                </>
              }
            >
              <InterviewsTabContent applicationId={session.id} />
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
        <DocumentPanel
          {...panelProps}
          bar={
            <DocumentTabsFullWidth>
              <InterviewsTabPlain />
            </DocumentTabsFullWidth>
          }
        >
          <InterviewsTabContent applicationId={session.id} />
        </DocumentPanel>
      </OutputSheet>
    </SessionFrame>
  )
}
