import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  Throttle,
  ThrottlerGuard,
  type ThrottlerOptions,
} from '@nestjs/throttler';

// The guard isn't global, so a limit only applies alongside it.
export function ThrottlePerUser(limits: Record<string, ThrottlerOptions>) {
  return applyDecorators(UseGuards(ThrottlerGuard), Throttle(limits));
}
