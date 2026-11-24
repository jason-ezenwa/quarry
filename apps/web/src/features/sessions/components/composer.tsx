import { ArrowUpIcon } from '@phosphor-icons/react/dist/csr/ArrowUp'
import { SESSION_LIMITS } from '@quarry/contracts'
import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { PATHS } from '@/lib/auth/auth.constants'

export type ComposerState = 'open' | 'busy' | 'archived' | 'limit'

function Notice({ children }: { children: ReactNode }) {
  return <p className="px-1 text-small text-muted-foreground">{children}</p>
}

// Asks for changes. Enter sends and Shift+Enter starts a new line. Closed while
// a reply is written, when the session is archived, or at the message limit.
export function Composer({
  state,
  draft = '',
  onSend,
}: {
  state: ComposerState
  // Text to start with, such as a message the server refused.
  draft?: string
  onSend: (text: string) => void
}) {
  const [text, setText] = useState(draft)
  const closed = state === 'archived' || state === 'limit'
  const canSend = state === 'open' && text.trim().length > 0

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!canSend) return
    onSend(text.trim())
    setText('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {state === 'archived' ? <Notice>This application is archived. Unarchive it from the menu to keep working.</Notice> : null}
      {state === 'limit' ? (
        <Notice>
          This application has used its {SESSION_LIMITS.userMessagesPerSession} messages.{' '}
          <Link to={PATHS.home} className="text-foreground underline underline-offset-3">
            Start a new application
          </Link>{' '}
          to keep going.
        </Notice>
      ) : null}
      <form
        onSubmit={submit}
        className="flex min-h-12 items-end gap-2 rounded-lg border border-border bg-card py-1.5 pr-1.5 pl-3.5 has-disabled:opacity-60 has-[textarea:focus-visible]:border-border-strong"
      >
        <label className="flex min-w-0 flex-1 self-center">
          <span className="sr-only">Message</span>
          <textarea
            rows={1}
            value={text}
            disabled={closed}
            maxLength={SESSION_LIMITS.turnMessageMaxLength}
            placeholder="Ask for changes"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            className="field-sizing-content max-h-48 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-field text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
        </label>
        <Button type="submit" variant="primary" size="icon-lg" aria-label="Send" disabled={!canSend} loading={state === 'busy'}>
          {state === 'busy' ? null : <ArrowUpIcon aria-hidden="true" />}
        </Button>
      </form>
    </div>
  )
}
