import { describe, expect, it } from 'vitest'
import { formatResetDate, jobLine } from './session-format'

describe('formatResetDate', () => {
  it('reads the reset in UTC, so the first of the month never shows as the last day of the one before', () => {
    expect(formatResetDate('2026-12-01T00:00:00.000Z')).toBe('December 1')
  })
})

describe('jobLine', () => {
  it('joins what is known and leaves out the rest', () => {
    expect(jobLine(['Halden', null, 'Ashby'])).toBe('Halden  ·  Ashby')
  })
})
