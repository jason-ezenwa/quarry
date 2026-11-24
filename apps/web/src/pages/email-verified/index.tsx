import { useSearchParams } from 'react-router'
import { AuthNotice } from '@/components/auth-card/auth-notice'
import { SIGN_IN } from '@/features/email-verification/email-verification.constants'

// The server checks the token first and adds `error` when it failed.
export function EmailVerifiedPage() {
  const [searchParams] = useSearchParams()

  return searchParams.has('error') ? (
    <AuthNotice
      title="This link didn't work"
      description="It may have expired or been used already. Sign in to send yourself a new one."
      action={SIGN_IN}
    />
  ) : (
    <AuthNotice
      title="Your email is verified"
      description="Thanks for confirming your address. Sign in to continue."
      action={SIGN_IN}
    />
  )
}
