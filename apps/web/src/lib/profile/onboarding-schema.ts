import {
  COUNTRY_CODES,
  CURRENCIES,
  FILE_EXTENSIONS,
  TARGET_ROLES_LIMITS,
  WORK_SETUPS,
  YEARS_OF_EXPERIENCE_LIMITS,
  type CountryCode,
  type Currency,
  type OnboardingAnswers,
  type UploadMimeType,
} from '@quarry/contracts'
import { z } from 'zod'
import {
  RESUME_ERRORS,
  RESUME_LIMITS,
  SALARY_MESSAGE,
  SALARY_SEPARATORS,
  UNKNOWN_FILE_TYPES,
  WHOLE_NUMBER,
  YEARS_MESSAGE,
} from './profile.constants'

function resumeMimeType(file: File): UploadMimeType | null {
  const allowed: readonly string[] = RESUME_LIMITS.mimeTypes
  if (allowed.includes(file.type)) return file.type as UploadMimeType
  if (!UNKNOWN_FILE_TYPES.includes(file.type)) return null
  const extension = file.name.split('.').pop()?.toLowerCase()
  return RESUME_LIMITS.mimeTypes.find((mimeType) => FILE_EXTENSIONS[mimeType] === extension) ?? null
}

const resume = z.custom<File | null>().transform((file, ctx) => {
  if (!(file instanceof File)) {
    ctx.addIssue({ code: 'custom', message: RESUME_ERRORS.missing })
    return z.NEVER
  }

  const mimeType = resumeMimeType(file)

  if (!mimeType) {
    ctx.addIssue({ code: 'custom', message: RESUME_ERRORS.wrongType })
    return z.NEVER
  }

  if (file.size > RESUME_LIMITS.maxBytes) {
    ctx.addIssue({ code: 'custom', message: RESUME_ERRORS.tooLarge })
    return z.NEVER
  }

  // Uploaded with its real type, which the server checks.
  return file.type === mimeType ? file : new File([file], file.name, { type: mimeType })
})

const yearsOfExperience = z
  .string()
  .trim()
  .regex(WHOLE_NUMBER, YEARS_MESSAGE)
  .transform(Number)
  .pipe(z.number().max(YEARS_OF_EXPERIENCE_LIMITS.max, YEARS_MESSAGE))

// Accepts "60,000" and "60 000" as well as "60000".
const salaryAmount = z.string().transform((value, ctx) => {
  const digits = value.replace(SALARY_SEPARATORS, '')

  if (digits !== '' && !WHOLE_NUMBER.test(digits)) {
    ctx.addIssue({ code: 'custom', message: 'Enter a whole number' })
    return z.NEVER
  }

  const amount = Number(digits)

  // An empty field reads as 0 here, so it gets the same message as a zero.
  if (amount <= 0) {
    ctx.addIssue({ code: 'custom', message: SALARY_MESSAGE })
    return z.NEVER
  }

  if (!Number.isSafeInteger(amount)) {
    ctx.addIssue({ code: 'custom', message: 'Enter a smaller amount' })
    return z.NEVER
  }

  return amount
})

export const onboardingSchema = z
  .object({
    resume,
    targetRoles: z
      .array(z.string().trim().min(1).max(TARGET_ROLES_LIMITS.maxLength))
      .min(TARGET_ROLES_LIMITS.minItems, 'Add at least one role')
      .max(TARGET_ROLES_LIMITS.maxItems, `Add up to ${TARGET_ROLES_LIMITS.maxItems} roles`),
    yearsOfExperience,
    countryCode: z.string().pipe(z.enum(COUNTRY_CODES as [CountryCode, ...CountryCode[]], { error: 'Choose a country' })),
    workSetups: z.array(z.enum(WORK_SETUPS)).min(1, 'Pick at least one'),
    salaryAmount,
    currency: z.string().pipe(z.enum(CURRENCIES as [Currency, ...Currency[]], { error: 'Choose a currency' })),
  })
  .transform(
    ({ resume, salaryAmount, currency, ...answers }): OnboardingAnswers & { resume: File } => ({
      resume,
      ...answers,
      salaryFloor: { amount: salaryAmount, currency },
    }),
  )
