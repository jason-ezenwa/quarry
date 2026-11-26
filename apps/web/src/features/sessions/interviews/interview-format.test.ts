import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/api-fetch'
import { questionProgress, startInterviewErrorMessage } from './interview-format'
import { START_INTERVIEW_ERRORS, START_INTERVIEW_FAILED } from './interviews.constants'

describe('questionProgress', () => {
  it('counts the questions asked against the total once the interview is set up', () => {
    expect(questionProgress({ questionCount: 3, totalQuestions: 6 })).toBe('3 of 6 questions')
  })

  it('says nothing before the interview is set up, when there is no total yet', () => {
    expect(questionProgress({ questionCount: 0 })).toBeNull()
  })
})

describe('startInterviewErrorMessage', () => {
  it('words the monthly limit with its numbers and reset date', () => {
    const error = new ApiError(429, 'Limit', {
      code: 'monthly-interview-limit',
      used: 10,
      limit: 10,
      resetsAt: '2026-12-01T00:00:00.000Z',
    })

    expect(startInterviewErrorMessage(error)).toBe("You've used all 10 interviews this month. More on December 1.")
  })

  it('names why the application has no interview', () => {
    expect(startInterviewErrorMessage(new ApiError(409, 'No', { code: 'application-archived' }))).toBe(START_INTERVIEW_ERRORS['application-archived'])
    expect(startInterviewErrorMessage(new ApiError(409, 'No', { code: 'job-description-missing' }))).toBe(START_INTERVIEW_ERRORS['job-description-missing'])
  })

  it('falls back to try again for anything else', () => {
    expect(startInterviewErrorMessage(new Error('offline'))).toBe(START_INTERVIEW_FAILED)
    expect(startInterviewErrorMessage(new ApiError(500, 'Boom'))).toBe(START_INTERVIEW_FAILED)
  })
})
