import { SESSION_LIMITS } from '@quarry/contracts'
import { Composer, ComposerForm, ComposerInput, ComposerNotice, ComposerSubmit } from '@/components/session/composer'
import type { InterviewComposerState } from '../interview.types'

// Once the interview has ended or used its messages, it stays in place, closed, saying why.
export function InterviewComposer({
  state,
  messageLimit,
  draft,
  onSend,
  onStop,
}: {
  state: InterviewComposerState
  messageLimit: number
  draft?: string
  onSend: (text: string) => void
  onStop: () => void
}) {
  const status = state === 'ended' || state === 'limit' ? 'closed' : state

  return (
    <Composer status={status} draft={draft} onSend={onSend} onStop={onStop}>
      {state === 'ended' ? <ComposerNotice>This interview has ended. Your feedback is in the Feedback panel.</ComposerNotice> : null}
      {state === 'limit' ? (
        <ComposerNotice>This interview has used its {messageLimit} messages. End it to get your feedback.</ComposerNotice>
      ) : null}
      <ComposerForm layout="stacked">
        <ComposerInput label="Your answer" maxLength={SESSION_LIMITS.turnMessageMaxLength} placeholder="Type your answer" />
        <ComposerSubmit />
      </ComposerForm>
    </Composer>
  )
}
