import type { BlockedJobSite, JobSource } from '@quarry/contracts';

export type FetchedJobSource = Exclude<JobSource, 'pasted'>;

export type FetchedJob = {
  source: FetchedJobSource;
  // The link the user gave, not the API address it was read from.
  url: string;
  title?: string;
  company?: string;
  location?: string;
  // Plain text, capped at about 8k tokens.
  description: string;
};

// Every reason but `blocked-site`, which also names the site.
export type FetchFailureReason =
  | 'invalid-url'
  | 'refused-address'
  | 'not-found'
  | 'no-job-text'
  | 'fetch-failed';

export type JobFetchFailureReason = 'blocked-site' | FetchFailureReason;

// `message` is plain words the agent can pass on, ending with the ask to paste.
export type JobFetchFailure =
  | { ok: false; reason: 'blocked-site'; site: BlockedJobSite; message: string }
  | { ok: false; reason: FetchFailureReason; message: string };

export type JobFetchOutcome = { ok: true; job: FetchedJob } | JobFetchFailure;

export type JobFetchLimits = {
  // For the whole fetch, redirects included.
  timeoutMs: number;
  maxRedirects: number;
  // Web pages go through jsdom and Readability, which block the event loop
  // for longer the bigger the page, so they get the smaller cap.
  maxPageBytes: number;
  // Board APIs can list a whole board (Ashby), and JSON is cheap to parse.
  maxApiBytes: number;
};

// What was logged about a fetch besides its outcome.
export type FetchAttempt = {
  outcome: JobFetchOutcome;
  httpStatus?: number;
  // Why a fetch failed, when the outcome's reason is too broad to tell.
  detail?: string;
};
