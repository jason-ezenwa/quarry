import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { STALE_PARSE_AFTER_MS } from './resume-parser.constants';
import { ResumeService } from './resume.service';

// Re-runs parses that a restart cut off. Runs once at startup, never on a
// timer, and never touches failed parses.
@Injectable()
export class InterruptedParseRecovery implements OnApplicationBootstrap {
  private readonly logger = new Logger(InterruptedParseRecovery.name);

  constructor(private readonly resumeService: ResumeService) {}

  // Not awaited, so startup doesn't wait on Claude.
  onApplicationBootstrap(): void {
    this.recover().catch((error: unknown) => {
      this.logger.error('Interrupted parse recovery failed', {
        error: error instanceof Error ? error.name : 'unknown',
      });
    });
  }

  // One parse at a time, so a backlog after a crash doesn't hit Claude's
  // rate limits all at once.
  async recover(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_PARSE_AFTER_MS);

    for (;;) {
      const claimed = await this.resumeService.claimStaleParse(staleBefore);
      if (!claimed) return;

      this.logger.log('Interrupted resume parse recovered', {
        resumeId: claimed.id,
        userId: claimed.user.toHexString(),
      });

      await this.resumeService.runParse(claimed.id);
    }
  }
}
