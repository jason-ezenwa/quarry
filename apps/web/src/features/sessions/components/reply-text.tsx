import type { ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'

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

// The agent writes Markdown.
export function ReplyText({ text }: { text: string }) {
  return (
    <Markdown components={COMPONENTS} disallowedElements={['img']} unwrapDisallowed>
      {text}
    </Markdown>
  )
}
