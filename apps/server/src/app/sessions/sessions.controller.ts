import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateSessionResponse,
  SessionDetail,
  SessionPage,
  SessionSummary,
} from '@quarry/contracts';
import type { Response } from 'express';
import type { SessionUser } from '../common/common.types';
import { CurrentUser } from '../common/current-user.decorator';
import { RequireProfileGuard } from '../profile/require-profile.guard';
import { AgentService } from './agent/agent.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { ListSessionsDto } from './dto/list-sessions.dto';
import { RunTurnDto } from './dto/run-turn.dto';
import { StopTurnDto } from './dto/stop-turn.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionsService } from './sessions.service';

// Every query is scoped to the signed-in user, so another user's session is
// a 404.
@Controller('sessions')
@UseGuards(RequireProfileGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly agentService: AgentService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: SessionUser,
    @Body() dto: CreateSessionDto,
  ): Promise<CreateSessionResponse> {
    return this.sessionsService.create(user.id, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query() query: ListSessionsDto,
  ): Promise<SessionPage> {
    return this.sessionsService.list(user.id, query);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<SessionDetail> {
    return this.sessionsService.get(user.id, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ): Promise<SessionSummary> {
    return this.sessionsService.setArchived(user.id, id, dto.archived);
  }

  // Refusals are thrown before anything is written to the response.
  @Post(':id/turns')
  async runTurn(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: RunTurnDto,
    @Res() response: Response,
  ): Promise<void> {
    const turn = await this.sessionsService.claimTurn(user.id, id, dto.message);
    await this.agentService.runTurn(turn, response);
  }

  // Answered once the stopped turn has released the lock.
  @Post(':id/turns/stop')
  @HttpCode(204)
  async stopTurn(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: StopTurnDto,
  ): Promise<void> {
    await this.agentService.stopTurn(user.id, id, dto.messageId);
  }
}
