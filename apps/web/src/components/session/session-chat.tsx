import { ArrowDownIcon } from '@phosphor-icons/react/dist/csr/ArrowDown'
import { useEffect, useRef, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SessionThreadContext, useSessionThread } from './session-thread-context'
import type { SessionThreadContextValue } from './session.types'
import { useFollowBottom } from './use-follow-bottom'

// The conversation beside any output: a scrolling thread above a docked footer, both in one reading column.
function SessionChat({ className, ...props }: ComponentProps<'section'>) {
  return <section data-slot="session-chat" className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)} {...props} />
}

// Follows a streaming reply while the reader is near the bottom, and lets them scroll up freely, offering
// a jump back down. Bottom padding the composer's height keeps the last message clear of it.
function SessionThread({ className, children, jumpLabel = 'Jump to latest', ...props }: ComponentProps<'div'> & { jumpLabel?: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const { following, onScroll, jumpToBottom } = useFollowBottom(scroller, content)

  const value: SessionThreadContextValue = { state: { following }, actions: { jumpToBottom } }

  return (
    <SessionThreadContext value={value}>
      <div data-slot="session-thread" className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scroller}
          data-slot="session-thread-viewport"
          onScroll={onScroll}
          className={cn('flex flex-1 justify-center overflow-y-auto px-4 pt-3 pb-12 [overflow-anchor:none] md:px-7 md:pt-7', className)}
          {...props}
        >
          <div ref={content} className="flex h-fit w-full max-w-145 flex-col gap-5.5 md:gap-6">
            {children}
          </div>
        </div>
        {following ? null : (
          <Button size="icon-float" aria-label={jumpLabel} className="absolute bottom-3 left-1/2 -translate-x-1/2" onClick={() => jumpToBottom()}>
            <ArrowDownIcon aria-hidden="true" />
          </Button>
        )}
      </div>
    </SessionThreadContext>
  )
}

// Scrolls to the bottom and follows again whenever `resetKey` changes, such as when the reader sends a message.
function SessionThreadFollow({ resetKey }: { resetKey: number }) {
  const { actions } = useSessionThread()
  const { jumpToBottom } = actions

  useEffect(() => {
    jumpToBottom('instant')
  }, [resetKey, jumpToBottom])

  return null
}

function SessionChatFooter({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="session-chat-footer" className={cn('flex justify-center px-3 pt-2 pb-4 md:px-7 md:pt-3 md:pb-5', className)} {...props}>
      <div className="w-full max-w-145">{children}</div>
    </div>
  )
}

export { SessionChat, SessionThread, SessionThreadFollow, SessionChatFooter }
