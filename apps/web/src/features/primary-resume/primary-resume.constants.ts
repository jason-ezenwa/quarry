import { PATHS } from '@/lib/auth/auth.constants'
import { RESUME_LIMITS } from '@/lib/profile/profile.constants'

export const PARSE_POLL_INTERVAL_MS = 3000

export const REUPLOAD_ERRORS = {
  stillReading: 'Your resume is still being read. Try again once it finishes.',
  failed: 'We could not upload that file. Try again.',
} as const

export const RESUME_FILE_ACCEPT = RESUME_LIMITS.mimeTypes.join(',')

export const RESUME_PAGE_CRUMBS = [{ label: 'Profile', to: PATHS.profile }]
