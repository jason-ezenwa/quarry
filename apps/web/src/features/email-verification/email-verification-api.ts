import { authClient } from '@/lib/auth-client'
import type { VerifyEmailState } from './email-verification.types'

// Carries the response status, so callers can tell a rate limit apart.
export class VerificationEmailError extends Error {
  readonly status: number

  constructor(status: number) {
    super('Could not send the verification email')
    this.status = status
  }
}

// The server points the link at the web app's email-verified page.
export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await authClient.sendVerificationEmail({ email })
  if (error) throw new VerificationEmailError(error.status)
}

export function isVerifyEmailState(state: unknown): state is VerifyEmailState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'email' in state &&
    typeof state.email === 'string' &&
    'from' in state &&
    (state.from === 'sign-up' || state.from === 'sign-in')
  )
}
