import { describe, expect, it } from 'vitest'
import { attachmentFileName, formatResetDate, jobLine } from './session-format'

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

describe('attachmentFileName', () => {
  it.each([
    ['attachment; filename="ada-obi-lead-with-payments.pdf"', 'ada-obi-lead-with-payments.pdf'],
    ['attachment', null],
    [null, null],
  ])('reads %s as %s', (disposition, expected) => {
    expect(attachmentFileName(disposition)).toBe(expected)
  })
})
