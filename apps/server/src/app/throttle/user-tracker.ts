import { getClientIp } from '../../lib/client-ip/client-ip';
import type { SessionRequest } from './throttle.types';

function isRequestLike(req: Record<string, unknown>): req is SessionRequest {
  return typeof req.headers === 'object' && req.headers !== null;
}

// Limits are per user, so people behind one network don't share a budget.
// Better Auth's global guard attaches the session before route guards run.
export function userTracker(req: Record<string, unknown>): string {
  if (!isRequestLike(req)) {
    throw new Error('Throttled request has no headers');
  }

  return req.session?.user?.id ?? getClientIp(req);
}
