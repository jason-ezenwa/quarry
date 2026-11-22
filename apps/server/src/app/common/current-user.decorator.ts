import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionUser } from './common.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.session.user;
  },
);
