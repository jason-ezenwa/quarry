import type { ReactNode } from 'react'

// A message panel in the signed-out shell: full-bleed on phones, a card on larger screens.
export function AuthPanel({ children }: { children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-6 px-5 pt-3 sm:max-w-110 sm:rounded-lg sm:border sm:border-border sm:bg-panel sm:px-10 sm:py-8 sm:shadow-panel">
      {children}
    </section>
  )
}
