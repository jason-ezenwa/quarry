import { Inject, Injectable, Logger } from '@nestjs/common';
import type { BlockedJobSite } from '@quarry/contracts';
import { errorName } from '../../common/error-name';
import { GuardedFetchError, guardedFetch } from './guarded-fetch';
import type { GuardedResponse, HostLookup } from './guarded-fetch.types';
import { findBlockedSite, findJobBoard } from './job-boards';
import type { JobBoardMatch } from './job-boards.types';
import {
  blockedSiteMessage,
  HTML_ACCEPT,
  JOB_FETCH_FAILURE_MESSAGES,
  JOB_FETCH_HOST_LOOKUP,
  JOB_FETCH_LIMITS,
  JSON_ACCEPT,
  MAX_DESCRIPTION_CHARS,
  MIN_PAGE_TEXT_CHARS,
  NOT_FOUND_STATUSES,
} from './job-fetcher.constants';
import type {
  FetchAttempt,
  FetchFailureReason,
  JobFetchFailure,
  JobFetchLimits,
  JobFetchOutcome,
} from './job-fetcher.types';
import { extractMainText, htmlToText } from './job-fetcher.utils';

@Injectable()
export class JobFetcherService {
  private readonly logger = new Logger(JobFetcherService.name);

  constructor(
    @Inject(JOB_FETCH_HOST_LOOKUP) private readonly lookup: HostLookup,
    @Inject(JOB_FETCH_LIMITS) private readonly limits: JobFetchLimits,
  ) {}

  async fetch(url: string): Promise<JobFetchOutcome> {
    const startedAt = performance.now();
    const link = URL.parse(url);
    const board = link ? findJobBoard(link) : undefined;

    const { outcome, httpStatus, detail } = link
      ? await this.fetchLink(link, board)
      : { outcome: failure('invalid-url') };

    this.logger.log('Job fetch finished', {
      source: board?.source ?? 'web',
      host: link?.hostname,
      status: outcome.ok ? 'ok' : outcome.reason,
      ...(httpStatus !== undefined && { httpStatus }),
      ...(detail !== undefined && { detail }),
      ms: Math.round(performance.now() - startedAt),
    });

    return outcome;
  }

  private async fetchLink(
    link: URL,
    board: JobBoardMatch | undefined,
  ): Promise<FetchAttempt> {
    const blockedSite = findBlockedSite(link);

    if (blockedSite) return { outcome: blockedSiteFailure(blockedSite) };

    try {
      return board
        ? await this.fetchFromBoard(link, board)
        : await this.fetchPage(link);
    } catch (error) {
      if (error instanceof GuardedFetchError) return fromFetchError(error);

      return {
        outcome: failure('fetch-failed'),
        detail: errorName(error),
      };
    }
  }

  private async fetchPage(link: URL): Promise<FetchAttempt> {
    const result = await this.request(
      link,
      HTML_ACCEPT,
      this.limits.maxPageBytes,
    );

    if ('failed' in result) return result.failed;

    const { response } = result;
    const httpStatus = response.status;

    const text = extractMainText(
      response.body,
      response.url,
      response.contentType,
    );

    if (text.length < MIN_PAGE_TEXT_CHARS) {
      return { outcome: failure('no-job-text'), httpStatus };
    }

    return {
      outcome: {
        ok: true,
        job: {
          source: 'web',
          url: link.href,
          description: capDescription(text),
        },
      },
      httpStatus,
    };
  }

  private async fetchFromBoard(
    link: URL,
    board: JobBoardMatch,
  ): Promise<FetchAttempt> {
    const result = await this.request(
      new URL(board.apiUrl),
      JSON_ACCEPT,
      this.limits.maxApiBytes,
    );

    if ('failed' in result) return result.failed;

    const httpStatus = result.response.status;
    const data = parseJson(result.response.body);

    if (data === undefined) {
      return {
        outcome: failure('fetch-failed'),
        httpStatus,
        detail: 'invalid-json',
      };
    }

    const job = board.toJob(data);

    if (!job) return { outcome: failure('not-found'), httpStatus };

    const description = htmlToText(job.descriptionHtml);

    if (!description) return { outcome: failure('no-job-text'), httpStatus };

    return {
      outcome: {
        ok: true,
        job: {
          source: board.source,
          url: link.href,
          title: job.title,
          company: job.company,
          location: job.location,
          description: capDescription(description),
        },
      },
      httpStatus,
    };
  }

  // A successful response, or the attempt to report when the status says the
  // job is not there. A redirect to a blocked site is refused, not followed.
  private async request(
    url: URL,
    accept: string,
    maxBytes: number,
  ): Promise<{ response: GuardedResponse } | { failed: FetchAttempt }> {
    const response = await guardedFetch(url, {
      lookup: this.lookup,
      accept,
      maxBytes,
      timeoutMs: this.limits.timeoutMs,
      maxRedirects: this.limits.maxRedirects,
      refuseUrl: (hop) => findBlockedSite(hop) !== undefined,
    });
    const statusFailure = failureForStatus(response.status);

    if (statusFailure) {
      return {
        failed: { outcome: statusFailure, httpStatus: response.status },
      };
    }

    return { response };
  }
}

function fromFetchError(error: GuardedFetchError): FetchAttempt {
  switch (error.reason) {
    case 'refused-url': {
      const site = error.url && findBlockedSite(error.url);

      return site
        ? { outcome: blockedSiteFailure(site) }
        : { outcome: failure('fetch-failed'), detail: error.reason };
    }
    case 'invalid-url':
    case 'refused-address':
      return { outcome: failure(error.reason) };
    default:
      return { outcome: failure('fetch-failed'), detail: error.reason };
  }
}

function failureForStatus(status: number): JobFetchFailure | undefined {
  if (NOT_FOUND_STATUSES.has(status)) return failure('not-found');
  if (status < 200 || status >= 300) return failure('fetch-failed');

  return undefined;
}

function parseJson(body: Buffer): unknown {
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    return undefined;
  }
}

function blockedSiteFailure(site: BlockedJobSite): JobFetchFailure {
  return {
    ok: false,
    reason: 'blocked-site',
    site,
    message: blockedSiteMessage(site),
  };
}

function failure(reason: FetchFailureReason): JobFetchFailure {
  return { ok: false, reason, message: JOB_FETCH_FAILURE_MESSAGES[reason] };
}

// Cut at the last word boundary within the cap, so the text never ends mid-word.
function capDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_CHARS) return text;

  const cut = text.slice(0, MAX_DESCRIPTION_CHARS);
  const lastBreak = cut.search(/\s\S*$/);

  return (lastBreak === -1 ? cut : cut.slice(0, lastBreak)).trimEnd();
}
