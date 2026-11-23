import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { SessionUser } from '../common/common.types';
import { ProfileService } from './profile.service';

// For endpoints that need a finished onboarding. Runs after the session
// check, so a request without a session has already been refused with 401.
@Injectable()
export class RequireProfileGuard implements CanActivate {
  constructor(private readonly profileService: ProfileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ session?: { user?: SessionUser } }>();
    const userId = request.session?.user?.id;

    if (!userId || !(await this.profileService.existsForUser(userId))) {
      throw new ForbiddenException('Profile required');
    }

    return true;
  }
}
