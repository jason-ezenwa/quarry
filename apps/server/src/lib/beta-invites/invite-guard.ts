import { NOT_INVITED_CODE, NOT_INVITED_MESSAGE } from '@quarry/contracts';
import { APIError } from 'better-auth/api';
import type { Db } from 'mongodb';
import type { AuthHookContext } from '../auth.types';
import { isInvited } from './beta-invites';

const SIGN_UP_PATH = '/sign-up/email';

// Only invited emails can sign up. Runs before Better Auth looks the email up,
// so the refusal says nothing about whether an account exists.
export function refuseUninvitedSignUp(db: Db) {
  return async (ctx: AuthHookContext): Promise<void> => {
    if (ctx.path !== SIGN_UP_PATH) return;

    const body: unknown = ctx.body;
    if (typeof body !== 'object' || body === null || !('email' in body)) return;
    // Better Auth's own validation refuses a missing or malformed email.
    if (typeof body.email !== 'string') return;

    if (await isInvited(db, body.email)) return;

    throw new APIError('FORBIDDEN', {
      code: NOT_INVITED_CODE,
      message: NOT_INVITED_MESSAGE,
    });
  };
}
