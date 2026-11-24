import type { BlockedJobSite } from '@quarry/contracts';
import type { FetchFailureReason, JobFetchLimits } from './job-fetcher.types';

// Resolves hostnames for the address check; tests point hosts at chosen addresses.
export const JOB_FETCH_HOST_LOOKUP = Symbol('JOB_FETCH_HOST_LOOKUP');

export const JOB_FETCH_LIMITS = Symbol('JOB_FETCH_LIMITS');

const MB = 1024 * 1024;

export const DEFAULT_JOB_FETCH_LIMITS: JobFetchLimits = {
  timeoutMs: 10_000,
  maxRedirects: 5,
  maxPageBytes: 1 * MB,
  maxApiBytes: 10 * MB,
};

// Less main text than this on a web page is a shell or an error page, not a job.
export const MIN_PAGE_TEXT_CHARS = 200;

// About 8k tokens.
export const MAX_DESCRIPTION_CHARS = 32_000;

export const BLOCKED_SITE_NAMES: Record<BlockedJobSite, string> = {
  linkedin: 'LinkedIn',
  glassdoor: 'Glassdoor',
  indeed: 'Indeed',
};

export const JOB_FETCH_FAILURE_MESSAGES: Record<FetchFailureReason, string> = {
  'invalid-url':
    "That link isn't a web address I can open, so paste the job description instead.",
  'refused-address':
    "That link points to a private or local network address, which I won't open, so paste the job description instead.",
  'not-found':
    "That job wasn't found. It may have been taken down, so paste the job description if you still have it.",
  'no-job-text':
    "I couldn't find the job description on that page, so paste it instead.",
  'fetch-failed':
    "I couldn't load that page, so paste the job description instead.",
};

// Short notes shown beside the failed step, after "Couldn't read the job post".
export const JOB_FETCH_FAILURE_NOTES: Record<FetchFailureReason, string> = {
  'invalid-url': 'Not a web link',
  'refused-address': 'Private address',
  'not-found': 'Job not found',
  'no-job-text': 'No job text on the page',
  'fetch-failed': "The page didn't load",
};

export const blockedSiteNote = (site: BlockedJobSite) =>
  `${BLOCKED_SITE_NAMES[site]} blocks us`;

export const blockedSiteMessage = (site: BlockedJobSite) =>
  `${BLOCKED_SITE_NAMES[site]} blocks automated access, so paste the description from the ${BLOCKED_SITE_NAMES[site]} page.`;

export const JSON_ACCEPT = 'application/json';
export const HTML_ACCEPT = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1';
export const NOT_FOUND_STATUSES = new Set([404, 410]);

export const SKIPPED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'SVG',
  'IFRAME',
  'OBJECT',
]);

// Blocks set off by a blank line.
export const PARAGRAPH_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'UL',
  'OL',
  'DL',
  'TABLE',
  'BLOCKQUOTE',
  'PRE',
  'SECTION',
  'ARTICLE',
  'HEADER',
  'FOOTER',
]);

// Blocks that start a new line.
export const LINE_TAGS = new Set(['DIV', 'TR', 'DT', 'DD']);

export const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml']);

export const DEFAULT_CONTENT_TYPE = 'text/html';

// Blocks Readability throws away anyway, removed before jsdom has to build them.
export const DISCARDED_BLOCK_START = '<(script|style|noscript|svg)\\b';
