import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { STALE_PARSE_AFTER_MS } from './parser.constants';
import { errorName } from '../../common/error-name';
import { ResumeService } from '../resume.service';

// Re-runs parses a restart cut off; failed parses are left alone.
@Injectable()
export class InterruptedParseRecovery implements OnApplicationBootstrap {
  private readonly logger = new Logger(InterruptedParseRecovery.name);

  constructor(private readonly resumeService: ResumeService) {}

  // Not awaited, so startup doesn't wait on Claude.
  onApplicationBootstrap(): void {
    this.recover().catch((error: unknown) => {
      this.logger.error('Interrupted parse recovery failed', {
        error: errorName(error),
      });
    });
  }

  // One at a time, so a post-crash backlog doesn't hit Claude's rate limits.
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
