import { describe, expect, it } from 'vitest'
import { onboardingSchema, type OnboardingFormValues } from './onboarding-schema'

const PDF = 'application/pdf'
const MB = 1024 * 1024

function file(name: string, type: string, bytes = 1024) {
  const value = new File(['x'], name, { type })
  Object.defineProperty(value, 'size', { value: bytes })
  return value
}

const valid: OnboardingFormValues = {
  resume: file('resume.pdf', PDF),
  targetRoles: ['Senior Product Engineer', 'Founding Engineer'],
  yearsOfExperience: '4',
  countryCode: 'NG',
  workSetups: ['remote'],
  salaryAmount: '60,000',
  currency: 'USD',
}

function errors(values: Partial<OnboardingFormValues>) {
  const result = onboardingSchema.safeParse({ ...valid, ...values })
  return (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message])
}

describe('onboardingSchema', () => {
  it('turns valid answers into the onboarding request values', () => {
    const { resume, ...answers } = onboardingSchema.parse(valid)

    expect(resume).toBe(valid.resume)

    expect(answers).toEqual({
      targetRoles: ['Senior Product Engineer', 'Founding Engineer'],
      yearsOfExperience: 4,
      countryCode: 'NG',
      workSetups: ['remote'],
      salaryFloor: { amount: 60000, currency: 'USD' },
    })
  })

  it('accepts a DOCX resume', () => {
    expect(
      errors({ resume: file('cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') }),
    ).toEqual([])
  })

  it('reads a DOCX with no reported type from its extension', () => {
    const { resume } = onboardingSchema.parse({ ...valid, resume: file('cv.docx', '') })

    expect(resume.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })

  it.each([
    ['no resume', { resume: null }, 'resume', 'Add your resume'],
    ['a file that is not a PDF or DOCX', { resume: file('cv.png', 'image/png') }, 'resume', 'Use a PDF or DOCX'],
    ['a file over 5 MB', { resume: file('cv.pdf', PDF, 5 * MB + 1) }, 'resume', 'That file is over 5 MB'],
    ['no roles', { targetRoles: [] }, 'targetRoles', 'Add at least one role'],
    ['more than 3 roles', { targetRoles: ['a', 'b', 'c', 'd'] }, 'targetRoles', 'Add up to 3 roles'],
    ['blank years', { yearsOfExperience: '' }, 'yearsOfExperience', 'Use a number from 0 to 60'],
    ['61 years', { yearsOfExperience: '61' }, 'yearsOfExperience', 'Use a number from 0 to 60'],
    ['negative years', { yearsOfExperience: '-1' }, 'yearsOfExperience', 'Use a number from 0 to 60'],
    ['fractional years', { yearsOfExperience: '2.5' }, 'yearsOfExperience', 'Use a number from 0 to 60'],
    ['no country', { countryCode: '' }, 'countryCode', 'Choose a country'],
    ['no work setup', { workSetups: [] }, 'workSetups', 'Pick at least one'],
    ['a salary of zero', { salaryAmount: '0' }, 'salaryAmount', 'Enter an amount above 0'],
    ['no salary', { salaryAmount: '' }, 'salaryAmount', 'Enter an amount above 0'],
    ['a salary that is not a whole number', { salaryAmount: '60k' }, 'salaryAmount', 'Enter a whole number'],
    ['a salary too large to store exactly', { salaryAmount: '99999999999999999999' }, 'salaryAmount', 'Enter a smaller amount'],
    ['a file with no type and an unknown extension', { resume: file('cv.txt', '') }, 'resume', 'Use a PDF or DOCX'],
    ['an unknown currency', { currency: 'ABC' }, 'currency', 'Choose a currency'],
  ])('rejects %s', (_, values, path, message) => {
    expect(errors(values)).toEqual([[path, message]])
  })

  it('accepts the bounds of years of experience', () => {
    expect(errors({ yearsOfExperience: '0' })).toEqual([])
    expect(errors({ yearsOfExperience: '60' })).toEqual([])
  })
})
