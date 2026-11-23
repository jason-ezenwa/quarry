import type { ProfileResponse } from '@quarry/contracts'
import type { ReactNode } from 'react'

export type FormRowProps = {
  label: string
  labelId: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
}

export type OnboardingFormProps = {
  onSaved: (profile: ProfileResponse) => void
  onAlreadyOnboarded: () => void
}
