import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout, CalloutActions, CalloutContent, CalloutMeta, CalloutTitle } from '@/components/ui/callout'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Section, Specimen } from './section.tsx'

const alertVariants = ['default', 'success', 'warning', 'destructive'] as const
const badgeVariants = ['ready', 'interview', 'drafting', 'neutral'] as const

export function FeedbackSection() {
  return (
    <Section title="Feedback" description="Alerts, callouts, badges, toasts and loading states.">
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
        <Specimen label="Callout (background work)">
          <div className="flex flex-col gap-3">
            <Callout tone="progress">
              <CalloutContent>
                <CalloutTitle>tone="progress"</CalloutTitle>
                <CalloutMeta>resume.pdf</CalloutMeta>
              </CalloutContent>
            </Callout>
            <Callout tone="review">
              <CalloutContent>
                <CalloutTitle>tone="review"</CalloutTitle>
              </CalloutContent>
              <CalloutActions>
                <Button variant="primary" size="sm">Review</Button>
              </CalloutActions>
            </Callout>
            <Callout tone="danger">
              <CalloutContent>
                <CalloutTitle>tone="danger"</CalloutTitle>
              </CalloutContent>
              <CalloutActions>
                <Button size="sm">Retry</Button>
              </CalloutActions>
            </Callout>
          </div>
        </Specimen>
        <Specimen label="Badge (status pill)">
          <div className="flex flex-wrap gap-2">
            {badgeVariants.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </Badge>
            ))}
          </div>
        </Specimen>
        <Specimen label="Toast">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => toast('Changes saved')}>
              Default
            </Button>
            <Button onClick={() => toast.success('Account created')}>
              Success
            </Button>
            <Button onClick={() => toast.error('Could not save')}>
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
