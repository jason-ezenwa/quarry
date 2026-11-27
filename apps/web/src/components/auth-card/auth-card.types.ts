import type { FormEventHandler, ReactNode } from 'react'

export type AuthCardProps = {
  title: string
  description: string
  submitLabel: string
  submitting: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  // The link to the other auth page, shown beside the submit button.
  alternative: ReactNode
  children: ReactNode
}

export type AuthNoticeProps = {
  title: string
  description: string
  action: { label: string; to: string }
}

export type NotInvitedAlertProps = {
  // Empty when no waitlist is set up, which leaves the link out.
  waitlistUrl: string
}
