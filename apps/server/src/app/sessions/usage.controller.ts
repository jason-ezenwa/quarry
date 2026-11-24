import { Controller, Get, UseGuards } from '@nestjs/common';
import type { UsageResponse } from '@quarry/contracts';
import type { SessionUser } from '../common/common.types';
import { CurrentUser } from '../common/current-user.decorator';
import { RequireProfileGuard } from '../profile/require-profile.guard';
import { SessionsService } from './sessions.service';

@Controller('usage')
@UseGuards(RequireProfileGuard)
export class UsageController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  async get(@CurrentUser() user: SessionUser): Promise<UsageResponse> {
    return this.sessionsService.usage(user.id);
  }
}
