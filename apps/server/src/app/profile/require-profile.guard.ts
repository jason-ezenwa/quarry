import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { SessionUser } from '../common/common.types';
import { ProfileGateService } from './profile-gate.service';

// Runs after the session check, so a missing session has already had a 401.
@Injectable()
export class RequireProfileGuard implements CanActivate {
  constructor(private readonly profileGateService: ProfileGateService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ session?: { user?: SessionUser } }>();

    const userId = request.session?.user?.id;

    if (!userId || !(await this.profileGateService.existsForUser(userId))) {
      throw new ForbiddenException('Profile required');
    }

    return true;
  }
}
