import { describe, expect, it } from 'vitest'
import { formatDateRange, formatPartialDate } from './resume-format'

describe('formatPartialDate', () => {
  it.each([
    ['2024', '2024'],
    ['2024-03', 'Mar 2024'],
    ['2019-12', 'Dec 2019'],
  ])('formats %s as %s', (date, expected) => {
    expect(formatPartialDate(date)).toBe(expected)
  })
})

describe('formatDateRange', () => {
  it.each([
    ['2022', '2024', '2022–2024'],
    ['2024-01', undefined, 'Jan 2024–now'],
    [undefined, '2020', '2020'],
    [undefined, undefined, undefined],
  ])('formats %s to %s as %s', (start, end, expected) => {
    expect(formatDateRange(start, end)).toBe(expected)
  })
})
