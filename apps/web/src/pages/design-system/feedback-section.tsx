import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Section, Specimen } from './section.tsx'

const alertVariants = ['default', 'info', 'success', 'destructive'] as const
const badgeVariants = ['default', 'secondary', 'outline', 'info', 'success', 'destructive'] as const

export function FeedbackSection() {
  return (
    <Section title="Feedback" description="Alerts, badges, toasts and loading states.">
      <div className="flex flex-col gap-6">
        <Specimen label="Alert">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {alertVariants.map((variant) => (
              <Alert key={variant} variant={variant}>
                <AlertTitle>variant="{variant}"</AlertTitle>
                <AlertDescription>Something worth knowing about this page.</AlertDescription>
              </Alert>
            ))}
          </div>
        </Specimen>
        <Specimen label="Badge">
          <div className="flex flex-wrap gap-2">
            {badgeVariants.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </div>
        </Specimen>
        <Specimen label="Toast">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => toast('Changes saved')}>
              Default
            </Button>
            <Button variant="outline" onClick={() => toast.success('Account created')}>
              Success
            </Button>
            <Button variant="outline" onClick={() => toast.error('Could not save')}>
              Error
            </Button>
          </div>
        </Specimen>
        <Specimen label="Loading">
          <div className="flex flex-col gap-3">
            <Spinner className="size-6" />
            <Skeleton className="h-4 w-full max-w-xs" />
            <Skeleton className="h-4 w-full max-w-56" />
          </div>
        </Specimen>
      </div>
    </Section>
  )
}
