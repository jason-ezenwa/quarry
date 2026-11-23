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
