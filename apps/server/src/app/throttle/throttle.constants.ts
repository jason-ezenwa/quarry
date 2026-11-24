import type {
  ThrottlerModuleOptions,
  ThrottlerOptions,
} from '@nestjs/throttler';
import { userTracker } from './user-tracker';

const HOUR_MS = 60 * 60 * 1000;

// The module needs a default throttler; every throttled route overrides it.
export const THROTTLER_OPTIONS = {
  throttlers: [{ ttl: HOUR_MS, limit: 60 }],
  getTracker: userTracker,
} satisfies ThrottlerModuleOptions;

// Each upload writes a file to storage.
export const RESUME_UPLOAD_THROTTLE = {
  default: { ttl: HOUR_MS, limit: 10 },
} satisfies Record<string, ThrottlerOptions>;

// Each retry is a paid AI call.
export const RESUME_PARSE_THROTTLE = {
  default: { ttl: HOUR_MS, limit: 5 },
} satisfies Record<string, ThrottlerOptions>;

// Each turn is a paid AI call of up to ten steps.
export const SESSION_TURN_THROTTLE = {
  default: { ttl: HOUR_MS, limit: 60 },
} satisfies Record<string, ThrottlerOptions>;
