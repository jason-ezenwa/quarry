const FIFTEEN_MINUTES_IN_SECONDS = 15 * 60;

// Tighter than Better Auth's defaults: each one sends an email or creates an account.
export const AUTH_RATE_LIMIT_RULES = {
  '/sign-up/email': { window: FIFTEEN_MINUTES_IN_SECONDS, max: 3 },
  '/send-verification-email': { window: FIFTEEN_MINUTES_IN_SECONDS, max: 3 },
  '/request-password-reset': { window: FIFTEEN_MINUTES_IN_SECONDS, max: 3 },
  // Read on every navigation; skipping it saves two database trips a page.
  '/get-session': false as const,
};
