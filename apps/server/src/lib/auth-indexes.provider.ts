import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ensureAuthIndexes } from './ensure-auth-indexes';

// Nest awaits this before listen(), so indexes exist before any request.
@Injectable()
export class AuthIndexesProvider implements OnApplicationBootstrap {
  async onApplicationBootstrap(): Promise<void> {
    await ensureAuthIndexes();
  }
}
