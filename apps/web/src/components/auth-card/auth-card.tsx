import { Button } from '@/components/ui/button'
import type { AuthCardProps } from './auth-card.types'
import { AuthShell } from './auth-shell'

// A form in the signed-out shell.
export function AuthCard({ title, description, submitLabel, submitting, onSubmit, alternative, children }: AuthCardProps) {
  return (
    <AuthShell>
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
    </AuthShell>
  )
}
