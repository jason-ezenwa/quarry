import { memo, type ComponentProps, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import { cn } from '@/lib/utils'

// The user's messages sit in a bubble on the right.
function UserMessage({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="user-message"
      className={cn('max-w-4/5 self-end rounded-xl bg-muted px-3.5 py-2.5 text-reading wrap-anywhere whitespace-pre-wrap', className)}
      {...props}
    />
  )
}

// Everything one agent reply holds: its steps, its text and its output cards.
function AgentTurn({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="agent-turn" className={cn('flex flex-col gap-3', className)} {...props} />
}

// Agent text is plain, with no avatar.
function AgentMessage({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="agent-message" className={cn('flex flex-col gap-3 text-reading wrap-anywhere', className)} {...props} />
}

function Heading({ children }: { children?: ReactNode }) {
  return (
    <p>
      <strong>{children}</strong>
    </p>
  )
}

// Only the basics are drawn: headings read as bold lines, and raw HTML or images never render.
const COMPONENTS: Components = {
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1.5 pl-5">{children}</ol>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-3">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded-xs bg-muted px-1 font-mono">{children}</code>,
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
}

// Agents write Markdown. Memoised, so a streaming reply re-parses only the text that changed, not the whole thread.
const MessageMarkdown = memo(function MessageMarkdown({ children }: { children: string }) {
  return (
    <Markdown components={COMPONENTS} disallowedElements={['img']} unwrapDisallowed>
      {children}
    </Markdown>
  )
})

export { UserMessage, AgentTurn, AgentMessage, MessageMarkdown }
