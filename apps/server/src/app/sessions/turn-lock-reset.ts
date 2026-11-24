import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SessionsService } from './sessions.service';

// A restart kills every running turn, so no lock can still be held.
@Injectable()
export class TurnLockReset implements OnApplicationBootstrap {
  private readonly logger = new Logger(TurnLockReset.name);

  constructor(private readonly sessionsService: SessionsService) {}

  async onApplicationBootstrap(): Promise<void> {
    const cleared = await this.sessionsService.clearTurnLocks();

    if (cleared > 0) this.logger.log('Turn locks cleared', { cleared });
  }
}
