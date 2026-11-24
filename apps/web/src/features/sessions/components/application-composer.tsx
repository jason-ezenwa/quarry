import { SESSION_LIMITS } from '@quarry/contracts'
import { Link } from 'react-router'
import { Composer, ComposerForm, ComposerInput, ComposerNotice, ComposerSubmit } from '@/components/session/composer'
import { PATHS } from '@/lib/auth/auth.constants'
import type { ApplicationComposerState } from '../sessions.types'

// Stop replaces Send while a reply is written. Closed when archived or at the message limit, saying why.
export function ApplicationComposer({
  state,
  messageLimit,
  draft,
  onSend,
  onStop,
}: {
  state: ApplicationComposerState
  messageLimit: number
  draft?: string
  onSend: (text: string) => void
  onStop: () => void
}) {
  const status = state === 'archived' || state === 'limit' ? 'closed' : state

  return (
    <Composer status={status} draft={draft} onSend={onSend} onStop={onStop}>
      {state === 'archived' ? (
        <ComposerNotice>This application is archived. Unarchive it from the menu to keep working.</ComposerNotice>
      ) : null}
      {state === 'limit' ? (
        <ComposerNotice>
          This application has used its {messageLimit} messages.{' '}
          <Link to={PATHS.home} className="text-foreground underline underline-offset-3">
            Start a new application
          </Link>{' '}
          to keep going.
        </ComposerNotice>
      ) : null}
      <ComposerForm>
        <ComposerInput label="Message" maxLength={SESSION_LIMITS.turnMessageMaxLength} placeholder="Ask for changes" />
        <ComposerSubmit />
      </ComposerForm>
    </Composer>
  )
}
