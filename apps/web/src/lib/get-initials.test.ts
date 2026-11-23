import { describe, expect, it } from 'vitest'
import { getInitials } from './get-initials'

describe('getInitials', () => {
  it('takes the first letter of the first two names', () => {
    expect(getInitials('ada lovelace byron')).toBe('AL')
  })

  it('handles a single name and stray spaces', () => {
    expect(getInitials('  ada  ')).toBe('A')
  })

  it('returns nothing for an empty name', () => {
    expect(getInitials('')).toBe('')
  })
})
