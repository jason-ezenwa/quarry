import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// The conversation beside any output: a scrolling thread above a docked footer, both in one reading column.
function SessionChat({ className, ...props }: ComponentProps<'section'>) {
  return <section data-slot="session-chat" className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)} {...props} />
}

function SessionThread({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="session-thread"
      className={cn('flex flex-1 justify-center overflow-y-auto px-4 pt-3 pb-3 md:px-7 md:pt-7', className)}
      {...props}
    >
      <div className="flex w-full max-w-145 flex-col gap-5.5 md:gap-6">{children}</div>
    </div>
  )
}

// The thread's last line, for scrolling the newest message into view.
function SessionThreadEnd(props: ComponentProps<'div'>) {
  return <div data-slot="session-thread-end" {...props} />
}

function SessionChatFooter({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="session-chat-footer" className={cn('flex justify-center px-3 pt-2 pb-4 md:px-7 md:pt-3 md:pb-5', className)} {...props}>
      <div className="w-full max-w-145">{children}</div>
    </div>
  )
}

export { SessionChat, SessionThread, SessionThreadEnd, SessionChatFooter }
