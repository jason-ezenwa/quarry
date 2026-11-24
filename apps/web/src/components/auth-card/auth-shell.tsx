import type { ReactNode } from 'react'
import { Wordmark } from '@/components/brand/wordmark'

// The signed-out shell: full-bleed on phones, a centred panel on larger screens.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center bg-panel sm:bg-transparent sm:px-6 sm:pt-6 sm:pb-16">
      <div className="flex h-14 items-center self-stretch px-5 sm:h-auto sm:px-2">
        <Wordmark />
      </div>
      <div className="flex w-full flex-1 justify-center sm:mt-12 sm:flex-none">{children}</div>
    </main>
  )
}
