// Mirrors the server's Better Auth password limits.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export const TOO_MANY_REQUESTS_STATUS = 429
export const RATE_LIMITED_MESSAGE = 'Too many attempts. Try again in a few minutes.'

export const PATHS = {
  // Signed-in visitors are sent on to home.
  landing: '/',
  home: '/home',
  // The app playing a scripted session, shown on the landing page. Static, so it wins over the session route.
  landingDemo: '/applications/demo',
  signIn: '/sign-in',
  signUp: '/sign-up',
  onboarding: '/onboarding',
  profile: '/profile',
  resume: '/profile/resume',
  applications: '/applications',
  session: '/applications/:sessionId',
  interviews: '/interviews',
  interview: '/interviews/:sessionId',
  verifyEmail: '/verify-email',
  emailVerified: '/email-verified',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
} as const

export function sessionPath(sessionId: string): string {
  return `${PATHS.applications}/${encodeURIComponent(sessionId)}`
}

export function interviewPath(sessionId: string): string {
  return `${PATHS.interviews}/${encodeURIComponent(sessionId)}`
}

export const SIGN_UP_ERRORS: Record<number, string> = {
  [TOO_MANY_REQUESTS_STATUS]: RATE_LIMITED_MESSAGE,
}

export const SIGN_IN_ERRORS: Record<number, string> = {
  401: 'Incorrect email or password.',
  [TOO_MANY_REQUESTS_STATUS]: RATE_LIMITED_MESSAGE,
}
