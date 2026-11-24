import type { ComponentProps } from 'react'
import type { AuthNotice } from '@/components/auth-card/auth-notice'
import { PATHS } from '@/lib/auth/auth.constants'
import type { Outcome } from './password-reset.types'

export const INVALID_TOKEN_CODE = 'INVALID_TOKEN'

export const OUTCOMES = {
  'invalid-link': {
    title: "This link didn't work",
    description: 'It may have expired or been used already. Ask for a new one.',
    action: { label: 'Request a new link', to: PATHS.forgotPassword },
  },
  'password-reset': {
    title: 'Your password is reset',
    description: "You're signed out everywhere. Sign in with your new password.",
    action: { label: 'Sign in', to: PATHS.signIn },
  },
} satisfies Record<Outcome, ComponentProps<typeof AuthNotice>>
