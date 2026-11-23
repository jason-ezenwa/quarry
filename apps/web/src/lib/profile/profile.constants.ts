import { BYTES_PER_MB, UPLOAD_PURPOSES, YEARS_OF_EXPERIENCE_LIMITS } from '@quarry/contracts'

export const RESUME_LIMITS = UPLOAD_PURPOSES['primary-resume']
export const RESUME_MAX_MB = RESUME_LIMITS.maxBytes / BYTES_PER_MB

export const RESUME_ERRORS = {
  missing: 'Add your resume',
  wrongType: 'Use a PDF or DOCX',
  tooLarge: `That file is over ${RESUME_MAX_MB} MB`,
} as const

export const WHOLE_NUMBER = /^\d+$/
export const SALARY_SEPARATORS = /[,\s]/g

export const YEARS_MESSAGE = `Use a number from ${YEARS_OF_EXPERIENCE_LIMITS.min} to ${YEARS_OF_EXPERIENCE_LIMITS.max}`
export const SALARY_MESSAGE = 'Enter an amount above 0'

// Some systems report no type, or a generic one, for a .docx, so fall back to the extension.
export const UNKNOWN_FILE_TYPES = ['', 'application/octet-stream']

export const HTTP_BAD_REQUEST = 400
export const HTTP_CONFLICT = 409
export const HTTP_PAYLOAD_TOO_LARGE = 413
