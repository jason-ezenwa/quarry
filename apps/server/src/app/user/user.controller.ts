import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import type { SessionUser } from '../common/common.types';
import { CurrentUser } from '../common/current-user.decorator';
import { UserService } from './user.service';
import type { UserResponse } from './user.types';
import { toUserResponse } from './user.utils';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@CurrentUser() sessionUser: SessionUser): Promise<UserResponse> {
    const user = await this.userService.findById(sessionUser.id);

    // Only a session whose user was deleted gets here.
    if (!user) {
      throw new UnauthorizedException();
    }

    return toUserResponse(user);
  }
}
