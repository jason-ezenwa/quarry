import { ArrowUpIcon } from '@phosphor-icons/react/dist/csr/ArrowUp'
import { StopIcon } from '@phosphor-icons/react/dist/csr/Stop'
import { useState, type ComponentProps, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ComposerContext, useComposer } from './composer-context'
import { COMPOSER_SUBMIT_PLACEMENT } from './session.constants'
import type { ComposerContextValue, ComposerStatus } from './session.types'

// Holds the draft and sends it trimmed. Remount it with a new key to start from another draft.
function Composer({
  status,
  draft = '',
  onSend,
  onStop,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSubmit'> & {
  status: ComposerStatus
  // Text to start with, such as a message the server refused.
  draft?: string
  onSend: (text: string) => void
  onStop: () => void
}) {
  const [text, setText] = useState(draft)
  const canSend = status === 'open' && text.trim().length > 0

  const value: ComposerContextValue = {
    state: { text, status },
    actions: {
      setText,
      submit: () => {
        if (!canSend) return
        onSend(text.trim())
        setText('')
      },
      stop: onStop,
    },
    meta: { canSend },
  }

  return (
    <ComposerContext value={value}>
      <div data-slot="composer" className={cn('flex flex-col gap-2', className)} {...props} />
    </ComposerContext>
  )
}

// Why the composer is closed, or anything else to say above it.
function ComposerNotice({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="composer-notice" className={cn('px-1 text-small text-muted-foreground', className)} {...props} />
}

// Stacked (medium screens up) puts Send below a taller field, for longer answers.
function ComposerForm({
  layout = 'inline',
  className,
  ...props
}: Omit<ComponentProps<'form'>, 'onSubmit'> & { layout?: 'inline' | 'stacked' }) {
  const { actions } = useComposer()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    actions.submit()
  }

  return (
    <form
      data-slot="composer-form"
      data-layout={layout}
      onSubmit={onSubmit}
      className={cn(
        'group/composer-form flex min-h-12 items-end gap-2 rounded-lg border border-border bg-card py-1.5 pr-1.5 pl-3.5 has-disabled:opacity-60 has-[textarea:focus-visible]:border-border-strong',
        layout === 'stacked' && 'md:flex-col md:items-stretch md:pt-3 md:pr-3 md:pb-2.5 md:pl-4',
        className,
      )}
      {...props}
    />
  )
}

// Enter sends and Shift+Enter starts a new line, unless the caller's onKeyDown prevents it.
function ComposerInput({
  label,
  className,
  onKeyDown: onKeyDownProp,
  ...props
}: Omit<ComponentProps<'textarea'>, 'value' | 'onChange' | 'disabled'> & { label: string }) {
  const { state, actions } = useComposer()

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDownProp?.(event)
    if (event.defaultPrevented) return

    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      actions.submit()
    }
  }

  return (
    <label className="flex min-w-0 flex-1 self-center md:group-data-[layout=stacked]/composer-form:self-stretch">
      <span className="sr-only">{label}</span>
      <textarea
        data-slot="composer-input"
        rows={1}
        value={state.text}
        disabled={state.status === 'closed'}
        onChange={(event) => actions.setText(event.target.value)}
        className={cn(
          'field-sizing-content max-h-48 min-w-0 flex-1 resize-none md:group-data-[layout=stacked]/composer-form:min-h-18 bg-transparent py-1.5 text-field text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
          className,
        )}
        {...props}
        onKeyDown={onKeyDown}
      />
    </label>
  )
}

// Send, or Stop while a reply streams.
function ComposerSubmit() {
  const { state, actions, meta } = useComposer()

  if (state.status === 'stoppable' || state.status === 'stopping') {
    const stopping = state.status === 'stopping'

    return (
      <Button type="button" variant="primary" size="icon-lg" aria-label="Stop" className={COMPOSER_SUBMIT_PLACEMENT} onClick={actions.stop} loading={stopping}>
        {stopping ? null : <StopIcon weight="fill" aria-hidden="true" />}
      </Button>
    )
  }

  const busy = state.status === 'busy'

  return (
    <Button type="submit" variant="primary" size="icon-lg" aria-label="Send" className={COMPOSER_SUBMIT_PLACEMENT} disabled={!meta.canSend} loading={busy}>
      {busy ? null : <ArrowUpIcon aria-hidden="true" />}
    </Button>
  )
}

export { Composer, ComposerNotice, ComposerForm, ComposerInput, ComposerSubmit }
