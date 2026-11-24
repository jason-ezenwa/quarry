import type { ReactNode } from 'react'

// Agent replies are plain text with no avatar; the user's sit in a bubble on the right.
export function Message({ role, children }: { role: 'user' | 'assistant'; children: ReactNode }) {
  if (role === 'user') {
    return (
      <div className="max-w-4/5 self-end rounded-xl bg-muted px-3.5 py-2.5 text-reading wrap-anywhere whitespace-pre-wrap">
        {children}
      </div>
    )
  }

  return <div className="flex flex-col gap-3 text-reading wrap-anywhere">{children}</div>
}
