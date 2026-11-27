import { NOT_INVITED_MESSAGE } from '@quarry/contracts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { WAITLIST_URL } from '@/features/landing/landing.constants'

// Sign-up's answer to an email that isn't on the beta invite list.
export function NotInvitedAlert() {
  return (
    <Alert variant="warning">
      <AlertDescription>
        <p>{NOT_INVITED_MESSAGE} Join the waitlist and we'll let you know when a spot opens.</p>
        <Button asChild variant="link">
          <a href={WAITLIST_URL} target="_blank" rel="noreferrer">
            Join the waitlist
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
