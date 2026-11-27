import { ClipboardTextIcon } from '@phosphor-icons/react/dist/csr/ClipboardText'
import type { InterviewState } from '@quarry/contracts'
import type { ReactNode } from 'react'
import {
  OutputPanel,
  OutputPanelBar,
  OutputPanelContent,
  OutputPanelMessage,
  OutputPanelName,
  OutputPanelTab,
  OutputPanelTabs,
  OutputPanelToolbar,
} from '@/components/session/output-panel'
import { FEEDBACK_PENDING, FEEDBACK_TAB } from '../interview.constants'
import {
  AdditionalNotes,
  FeedbackMeta,
  FeedbackPoints,
  InterviewFeedback,
  StrongerAnswers,
  ToImprove,
  WentWell,
} from './interview-feedback'

// The feedback, once the interview has ended. The children fill the bar: the tab and its actions.
export function FeedbackPanel({
  interview,
  children,
}: {
  interview: InterviewState | undefined
  children: ReactNode
}) {
  const feedback = interview?.feedback
  const endedAt = interview?.endedAt

  return (
    <OutputPanel value={FEEDBACK_TAB}>
      <OutputPanelBar>{children}</OutputPanelBar>
      {feedback && endedAt ? (
        <OutputPanelToolbar>
          <OutputPanelName>
            <FeedbackMeta endedAt={endedAt} questionCount={interview.questionCount} />
          </OutputPanelName>
        </OutputPanelToolbar>
      ) : null}
      <OutputPanelContent value={FEEDBACK_TAB} className="px-4 md:pr-2.5 md:pl-3.5">
        {feedback && endedAt ? (
          <InterviewFeedback>
            <FeedbackPoints>
              <WentWell items={feedback.wentWell} />
              <ToImprove items={feedback.toImprove} />
            </FeedbackPoints>
            <StrongerAnswers answers={feedback.strongerAnswers} />
            {feedback.additionalNotes.trim() ? <AdditionalNotes>{feedback.additionalNotes}</AdditionalNotes> : null}
          </InterviewFeedback>
        ) : (
          <OutputPanelMessage className="px-1 pt-2">{FEEDBACK_PENDING}</OutputPanelMessage>
        )}
      </OutputPanelContent>
    </OutputPanel>
  )
}

// For the panel beside the chat.
export function FeedbackTabs() {
  return (
    <OutputPanelTabs aria-label="Outputs">
      <OutputPanelTab value={FEEDBACK_TAB}>
        <ClipboardTextIcon aria-hidden="true" />
        Feedback
      </OutputPanelTab>
    </OutputPanelTabs>
  )
}

// Full width with no icon, for phones.
export function FeedbackTabsFullWidth() {
  return (
    <OutputPanelTabs fill aria-label="Outputs">
      <OutputPanelTab value={FEEDBACK_TAB}>Feedback</OutputPanelTab>
    </OutputPanelTabs>
  )
}
