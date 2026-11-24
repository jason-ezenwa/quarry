import { useMutation } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router'
import { AuthPanel } from '@/components/auth-card/auth-panel'
import { AuthShell } from '@/components/auth-card/auth-shell'
import { Button } from '@/components/ui/button'
import {
  isVerifyEmailState,
  resendVerificationEmail,
  VerificationEmailError,
} from '@/features/email-verification/email-verification-api'
import type { VerifyEmailState } from '@/features/email-verification/email-verification.types'
import { PATHS, TOO_MANY_REQUESTS_STATUS } from '@/lib/auth/auth.constants'

function failureMessage(error: Error): string {
  return error instanceof VerificationEmailError && error.status === TOO_MANY_REQUESTS_STATUS
    ? "You've asked for a few links already. Try again in a few minutes."
    : "We couldn't send the email. Try again."
}

function leadFor(arrival: VerifyEmailState | null): string {
  if (!arrival) return 'Sign in to send yourself a new link.'

  return arrival.from === 'sign-up'
    ? `We sent a link to ${arrival.email}. Open it to verify your address, then sign in.`
    : `Verify ${arrival.email} before you sign in. Open the link we emailed you, or send a new one.`
}

// Shown after sign-up, and after signing in to an unverified account.
export function VerifyEmailPage() {
  const { state } = useLocation()
  const arrival = isVerifyEmailState(state) ? state : null
  const resend = useMutation({ mutationFn: resendVerificationEmail })

  const status = resend.isSuccess
    ? `We sent a new link to ${resend.variables}.`
    : resend.isError
      ? failureMessage(resend.error)
      : null

  return (
    <AuthShell>
      <AuthPanel>
        <div className="flex flex-col gap-1">
          <h1 className="text-title">Check your email</h1>
          <p className="text-ui text-muted-foreground">{leadFor(arrival)}</p>
          {status ? (
            <p role="status" className="text-ui text-muted-foreground">
              {status}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          <Button asChild variant="link">
            <Link to={PATHS.signIn}>Back to sign in</Link>
          </Button>
          {arrival ? (
            <Button
              variant="secondary"
              size="lg"
              loading={resend.isPending}
              onClick={() => resend.mutate(arrival.email)}
              className="w-full sm:w-auto"
            >
              Send a new link
            </Button>
          ) : null}
        </div>
      </AuthPanel>
    </AuthShell>
  )
}
