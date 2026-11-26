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
import { Button } from '@/components/ui/button'
import { Callout, CalloutContent, CalloutTitle } from '@/components/ui/callout'
import { useMediaQuery } from '@/hooks/use-media-query'
import { MEDIUM_SCREEN_QUERY, WIDE_SCREEN_QUERY } from '@/hooks/use-media-query.constants'
import { PATHS, sessionPath } from '@/lib/auth/auth.constants'
import { useSessionChat } from '../../chat/hooks/use-session-chat'
import { useEndInterviewAction } from '../hooks/use-end-interview-action'
import { interviewProgress } from '../interview-progress'
import type { InterviewComposerState } from '../interview.types'
import { FeedbackPanel, FeedbackTabs, FeedbackTabsFullWidth } from './feedback-panel'
import { InterviewComposer } from './interview-composer'
import { InterviewProgress } from './interview-progress-bar'
import { InterviewThread } from './interview-thread'

function composerState(
  session: SessionDetail,
  chat: ReturnType<typeof useSessionChat>,
  ended: boolean,
  ending: boolean,
): InterviewComposerState {
  if (ended) return 'ended'
  if (session.userMessageCount >= session.messageLimit) return 'limit'
  if (chat.stopping) return 'stopping'
  if (chat.canStop) return 'stoppable'
  return chat.busy || chat.waiting || ending ? 'busy' : 'open'
}

// Ending, from the header or by Wren, opens the feedback.
export function InterviewView({ session, fresh }: { session: SessionDetail; fresh: boolean }) {
  const chat = useSessionChat(session, fresh)
  const wide = useMediaQuery(WIDE_SCREEN_QUERY)
  const medium = useMediaQuery(MEDIUM_SCREEN_QUERY)
  const ending = useEndInterviewAction(session.id)

  const ended = Boolean(session.interview?.endedAt)
  const progress = interviewProgress(chat.messages, session.interview)
  const working = chat.busy || chat.waiting

  // Beside the chat on wide screens once there is feedback to show; elsewhere the header's button opens it over the page.
  const [panelOpen, setPanelOpen] = useState(ended)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [wasEnded, setWasEnded] = useState(ended)

  // The interview ending while open shows its feedback. Set during render, as React allows.
  if (ended !== wasEnded) {
    setWasEnded(ended)

    if (ended) {
      setPanelOpen(true)
      if (!wide) setSheetOpen(true)
    }
  }

  const showing = wide ? panelOpen : sheetOpen

  function openPanel() {
    if (wide) setPanelOpen(true)
    else setSheetOpen(true)
  }

  const count = progress.total === null ? null : `${progress.asked} of ${progress.total}`
  const parent = session.parentSession
  const crumbs = parent ? [{ label: parent.title, to: sessionPath(parent.id) }] : [{ label: 'Interviews', to: PATHS.interviews }]

  return (
    <SessionFrame>
      <PageHeader
        title={progress.title ?? session.title}
        sub={medium ? undefined : (count ?? undefined)}
        crumbs={crumbs}
        actions={
          <>
            {medium && count ? <span className="pr-1.5 text-label text-muted-foreground">{count}</span> : null}
            {ended ? null : (
              <Button size={medium ? 'default' : 'sm'} loading={ending.ending} disabled={working} onClick={ending.end}>
                {medium ? 'End interview' : 'End'}
              </Button>
            )}
            {showing ? null : <OutputPanelOpen onClick={openPanel} />}
          </>
        }
      />
      {progress.total === null ? null : (
        <div className="px-4">
          <InterviewProgress asked={progress.asked} total={progress.total} ended={ended} />
        </div>
      )}
      <SessionBody>
        <SessionChat aria-label="Interview" className="[--session-column:calc(var(--spacing)*160)]">
          <InterviewThread
            messages={chat.messages}
            working={working}
            error={chat.error}
            currentQuestionId={ended ? null : progress.currentQuestionId}
            onRetry={chat.retry}
          >
            {ending.error ? (
              <Callout tone="danger">
                <CalloutContent>
                  <CalloutTitle>{ending.error}</CalloutTitle>
                </CalloutContent>
              </Callout>
            ) : null}
          </InterviewThread>
          <SessionChatFooter>
            <InterviewComposer
              key={chat.unsent?.key}
              state={composerState(session, chat, ended, ending.ending)}
              messageLimit={session.messageLimit}
              draft={chat.unsent?.text}
              onSend={(text) => {
                ending.dismiss()
                chat.send(text)
              }}
              onStop={chat.stop}
            />
          </SessionChatFooter>
        </SessionChat>
        {wide && panelOpen ? (
          <SessionAside aria-label="Output">
            <FeedbackPanel interview={session.interview} applicationId={parent?.id}>
              <FeedbackTabs />
              <OutputPanelClose onClick={() => setPanelOpen(false)} />
            </FeedbackPanel>
          </SessionAside>
        ) : null}
      </SessionBody>
      <OutputSheet open={!wide && sheetOpen} onOpenChange={setSheetOpen}>
        <OutputSheetHeader>
          <OutputSheetClose onClick={() => setSheetOpen(false)} />
          <OutputSheetTitle>Feedback</OutputSheetTitle>
          <OutputSheetSpacer />
        </OutputSheetHeader>
        <FeedbackPanel interview={session.interview} applicationId={parent?.id}>
          <FeedbackTabsFullWidth />
        </FeedbackPanel>
      </OutputSheet>
    </SessionFrame>
  )
}
