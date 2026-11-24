import type { Provider } from '@nestjs/common';
import { lookupHost } from './guarded-fetch/guarded-fetch';
import {
  DEFAULT_JOB_FETCH_LIMITS,
  JOB_FETCH_HOST_LOOKUP,
  JOB_FETCH_LIMITS,
} from './job-fetcher.constants';
import { JobFetcherService } from './job-fetcher.service';

export const jobFetcherProviders: Provider[] = [
  JobFetcherService,
  { provide: JOB_FETCH_HOST_LOOKUP, useValue: lookupHost },
  { provide: JOB_FETCH_LIMITS, useValue: DEFAULT_JOB_FETCH_LIMITS },
];
