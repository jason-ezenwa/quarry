import type { FormEventHandler, ReactNode } from 'react'
import { Wordmark } from '@/components/app-header/wordmark'
import { Button } from '@/components/ui/button'

type AuthCardProps = {
  title: string
  description: string
  submitLabel: string
  submitting: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  // The link to the other auth page, shown beside the submit button.
  alternative: ReactNode
  children: ReactNode
}

// The same shell as onboarding: full-bleed on phones, a panel on larger screens.
export function AuthCard({ title, description, submitLabel, submitting, onSubmit, alternative, children }: AuthCardProps) {
  return (
    <main className="flex min-h-svh flex-col items-center bg-panel sm:bg-transparent sm:px-6 sm:pt-6 sm:pb-16">
      <div className="flex h-14 items-center self-stretch px-5 sm:h-auto sm:px-2">
        <Wordmark />
      </div>
      <div className="flex w-full flex-1 justify-center sm:mt-12 sm:flex-none">
        <form
          noValidate
          onSubmit={onSubmit}
          className="flex w-full flex-col sm:block sm:max-w-110 sm:overflow-hidden sm:rounded-lg sm:border sm:border-border sm:bg-panel sm:shadow-panel"
        >
          <div className="flex flex-col gap-1 px-5 pt-3 sm:px-10 sm:pt-8">
            <h1 className="text-title">{title}</h1>
            <p className="text-ui text-muted-foreground">{description}</p>
          </div>
          <div className="px-5 py-6 sm:px-10">{children}</div>
          <div className="mt-auto flex flex-col-reverse items-center gap-3 border-t border-border-soft px-4 pt-3 pb-5 sm:flex-row sm:justify-between sm:px-10 sm:py-4">
            {alternative}
            <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full sm:w-auto">
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
