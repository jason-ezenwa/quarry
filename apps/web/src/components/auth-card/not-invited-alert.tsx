import { NOT_INVITED_MESSAGE } from '@quarry/contracts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { NotInvitedAlertProps } from './auth-card.types'

// Sign-up's answer to an email that isn't on the beta invite list.
export function NotInvitedAlert({ waitlistUrl }: NotInvitedAlertProps) {
  if (!waitlistUrl) {
    return (
      <Alert variant="warning">
        <AlertDescription>{NOT_INVITED_MESSAGE}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="warning">
      <AlertDescription>
        <p>{NOT_INVITED_MESSAGE} Join the waitlist and we'll let you know when a spot opens.</p>
        <Button asChild variant="link">
          <a href={waitlistUrl} target="_blank" rel="noreferrer">
            Join the waitlist
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
