import { ClipboardTextIcon } from '@phosphor-icons/react/dist/csr/ClipboardText'
import type { InterviewState } from '@quarry/contracts'
import type { ReactNode } from 'react'
import { OutputPanel, OutputPanelBar, OutputPanelContent, OutputPanelMessage, OutputPanelTab, OutputPanelTabs } from '@/components/session/output-panel'
import { FEEDBACK_PENDING, FEEDBACK_TAB } from '../interview.constants'
import {
  AdditionalNotes,
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
      <OutputPanelContent value={FEEDBACK_TAB} className="md:pt-4">
        {feedback && endedAt ? (
          <InterviewFeedback endedAt={endedAt} questionCount={interview.questionCount}>
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
