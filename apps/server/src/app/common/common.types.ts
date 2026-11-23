import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../../lib/auth';

export type SessionUser = UserSession<typeof auth>['user'];
