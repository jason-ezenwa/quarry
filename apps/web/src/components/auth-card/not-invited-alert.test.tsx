import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotInvitedAlert } from './not-invited-alert'

describe('NotInvitedAlert', () => {
  it('links to the waitlist', () => {
    render(<NotInvitedAlert waitlistUrl="https://forms.example.com/waitlist" />)

    expect(screen.getByRole('link', { name: 'Join the waitlist' })).toHaveAttribute(
      'href',
      'https://forms.example.com/waitlist',
    )
  })

  it('leaves the waitlist out when there is none', () => {
    render(<NotInvitedAlert waitlistUrl="" />)

    expect(
      screen.getByText("Quarry is in private beta, and this email isn't on the invite list yet."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/waitlist/)).not.toBeInTheDocument()
  })
})
