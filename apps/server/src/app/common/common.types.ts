import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../../lib/auth';

export type SessionUser = UserSession<typeof auth>['user'];

// The user and application session a request acts for, taken from the
// signed-in request, never from the model.
export type SessionContext = {
  userId: string;
  sessionId: string;
};
