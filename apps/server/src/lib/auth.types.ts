import type { createAuthMiddleware } from 'better-auth/api';

// What a Better Auth before-hook receives.
export type AuthHookContext = Parameters<
  Parameters<typeof createAuthMiddleware>[0]
>[0];
