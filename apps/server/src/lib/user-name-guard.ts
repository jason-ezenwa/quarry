import { INVALID_NAME_CODE, userNameSchema } from '@quarry/contracts';
import { APIError } from 'better-auth/api';
import { PATHS_TAKING_A_NAME } from './auth.constants';
import type { AuthHookContext } from './auth.types';

function checkUserName(name: unknown): string {
  const result = userNameSchema.safeParse(name);

  if (!result.success) {
    throw new APIError('BAD_REQUEST', {
      code: INVALID_NAME_CODE,
      message: result.error.issues[0]?.message,
    });
  }

  return result.data;
}

// Runs before the email lookup, so a refused name can't reveal an existing account.
export function checkUserNameBeforeSaving(ctx: AuthHookContext) {
  if (!PATHS_TAKING_A_NAME.has(ctx.path)) return;

  const body: unknown = ctx.body;
  if (typeof body !== 'object' || body === null || !('name' in body)) return;

  return { context: { body: { ...body, name: checkUserName(body.name) } } };
}
