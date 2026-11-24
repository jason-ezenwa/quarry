import { BLOCKED_JOB_SITES, type BlockedJobSite } from '@quarry/contracts';
import { JSDOM } from 'jsdom';
import {
  LINKEDIN_SHORT_HOST,
  NUMERIC_ID,
  SAFE_SEGMENT,
  UUID,
  WORKDAY_LOCALE,
} from './job-boards.constants';
import type { JobBoardAdapter, JobBoardMatch, Json } from './job-boards.types';

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const joinHtml = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join('\n');

// "Lagos, Lagos, Nigeria" reads as "Lagos, Nigeria".
function joinUnique(values: unknown[]): string | undefined {
  const parts = [...new Set(values.map(text).filter(Boolean))];

  return parts.length ? parts.join(', ') : undefined;
}

// Greenhouse escapes the description's HTML, so it is unescaped before use.
const unescapeHtml = (value: string) => JSDOM.fragment(value).textContent ?? '';

function decodeSegment(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

function isSafeSegment(value: string | null | undefined): value is string {
  return !!value && SAFE_SEGMENT.test(value) && value !== '.' && value !== '..';
}

// Decoded segments, or none when any could escape its place in a path.
function pathSegments(link: URL): string[] {
  const segments = link.pathname.split('/').filter(Boolean).map(decodeSegment);

  return segments.every(isSafeSegment) ? segments : [];
}

const encodePath = (...segments: string[]) =>
  segments.map(encodeURIComponent).join('/');

const greenhouse: JobBoardAdapter = {
  source: 'greenhouse',
  toApiUrl(link) {
    const host = /^(?:job-)?boards(\.eu)?\.greenhouse\.io$/.exec(link.hostname);

    if (!host) return undefined;

    const [first, second, third] = pathSegments(link);

    const [board, id] =
      first === 'embed'
        ? [link.searchParams.get('for'), link.searchParams.get('token')]
        : second === 'jobs'
          ? [first, third]
          : [];

    if (!isSafeSegment(board) || !id || !NUMERIC_ID.test(id)) return undefined;

    return `https://boards-api${host[1] ?? ''}.greenhouse.io/v1/boards/${encodePath(board, 'jobs', id)}`;
  },
  toJob(data) {
    if (!isObject(data)) return undefined;

    const content = text(data.content);

    return {
      title: text(data.title),
      company: text(data.company_name),
      location: isObject(data.location) ? text(data.location.name) : undefined,
      descriptionHtml: content ? unescapeHtml(content) : '',
    };
  },
};

const lever: JobBoardAdapter = {
  source: 'lever',
  toJob(data) {
    if (!isObject(data)) return undefined;

    const lists = Array.isArray(data.lists) ? data.lists.filter(isObject) : [];

    return {
      title: text(data.text),
      location: isObject(data.categories)
        ? text(data.categories.location)
        : undefined,
      descriptionHtml: joinHtml(
        text(data.description),
        ...lists.map((list) =>
          joinHtml(
            `<h3>${escapeHtml(text(list.text) ?? '')}</h3>`,
            `<ul>${text(list.content) ?? ''}</ul>`,
          ),
        ),
        text(data.additional),
      ),
    };
  },
  toApiUrl(link) {
    const host = /^jobs(\.eu)?\.lever\.co$/.exec(link.hostname);
    const [company, id] = pathSegments(link);

    if (!host || !company || !id || !UUID.test(id)) return undefined;

    return `https://api${host[1] ?? ''}.lever.co/v0/postings/${encodePath(company, id)}`;
  },
};

// The Ashby API lists the whole board, so the job is found in it by this id.
function ashbyJobId(link: URL): string | undefined {
  const [organization, id] = pathSegments(link);

  return organization && id && UUID.test(id) ? id : undefined;
}

const ashby: JobBoardAdapter = {
  source: 'ashby',
  toJob(data, link) {
    const id = ashbyJobId(link);
    const jobs = isObject(data) && Array.isArray(data.jobs) ? data.jobs : [];
    const job = jobs.filter(isObject).find((candidate) => candidate.id === id);

    if (!job) return undefined;

    return {
      title: text(job.title),
      location: text(job.location),
      descriptionHtml: text(job.descriptionHtml) ?? '',
    };
  },
  toApiUrl(link) {
    const [organization] = pathSegments(link);

    if (link.hostname !== 'jobs.ashbyhq.com' || !organization) return undefined;
    if (!ashbyJobId(link)) return undefined;

    return `https://api.ashbyhq.com/posting-api/job-board/${encodePath(organization)}`;
  },
};

const workable: JobBoardAdapter = {
  source: 'workable',
  toJob(data) {
    if (!isObject(data)) return undefined;

    const section = (heading: string, html: string | undefined) =>
      html && joinHtml(`<h3>${heading}</h3>`, html);

    return {
      title: text(data.title),
      location: isObject(data.location)
        ? joinUnique([
            data.location.city,
            data.location.region,
            data.location.country,
          ])
        : undefined,
      descriptionHtml: joinHtml(
        text(data.description),
        section('Requirements', text(data.requirements)),
        section('Benefits', text(data.benefits)),
      ),
    };
  },
  toApiUrl(link) {
    const segments = pathSegments(link);
    const subdomain = /^([\w-]+)\.workable\.com$/.exec(link.hostname)?.[1];

    const [account, j, shortcode] =
      subdomain === 'apply'
        ? segments
        : subdomain && subdomain !== 'www'
          ? [subdomain, ...segments]
          : [];

    if (!account || j !== 'j' || !shortcode) return undefined;

    return `https://apply.workable.com/api/v2/accounts/${encodePath(account, 'jobs', shortcode)}`;
  },
};

// Unofficial: Workday's own job pages load their content from this endpoint.
const workday: JobBoardAdapter = {
  source: 'workday',
  toJob(data) {
    if (!isObject(data) || !isObject(data.jobPostingInfo)) return undefined;

    const posting = data.jobPostingInfo;

    return {
      title: text(posting.title),
      company: isObject(data.hiringOrganization)
        ? text(data.hiringOrganization.name)
        : undefined,
      location: text(posting.location),
      descriptionHtml: text(posting.jobDescription) ?? '',
    };
  },
  toApiUrl(link) {
    const tenantHost = /^([\w-]+)\.wd\d+\.myworkdayjobs\.com$/.exec(
      link.hostname,
    );

    const isSharedHost = /^wd\d+\.myworkdaysite\.com$/.test(link.hostname);
    const segments = pathSegments(link);

    if (WORKDAY_LOCALE.test(segments[0] ?? '')) segments.shift();

    const [tenant, site, job, ...jobPath] = tenantHost
      ? [tenantHost[1], ...segments]
      : isSharedHost && segments[0] === 'recruiting'
        ? segments.slice(1)
        : [];

    if (!tenant || !site || job !== 'job' || jobPath.length === 0) {
      return undefined;
    }

    return `https://${link.hostname}/wday/cxs/${encodePath(tenant, site, 'job', ...jobPath)}`;
  },
};

const JOB_BOARDS = [greenhouse, lever, ashby, workable, workday];

export function findJobBoard(link: URL): JobBoardMatch | undefined {
  for (const board of JOB_BOARDS) {
    const apiUrl = board.toApiUrl(link);

    if (apiUrl) {
      return {
        source: board.source,
        apiUrl,
        toJob: (data) => board.toJob(data, link),
      };
    }
  }

  return undefined;
}

// The site's own domain under .com or a country domain (co.uk, com.ng, de...).
const blockedHostPattern = (site: BlockedJobSite) =>
  new RegExp(`(?:^|\\.)${site}\\.(?:com|(?:co|com)\\.[a-z]{2}|[a-z]{2})$`);

const BLOCKED_HOSTS = BLOCKED_JOB_SITES.map((site) => ({
  site,
  pattern: blockedHostPattern(site),
}));

export function findBlockedSite(link: URL): BlockedJobSite | undefined {
  const host = link.hostname.toLowerCase();

  if (host === LINKEDIN_SHORT_HOST) return 'linkedin';

  return BLOCKED_HOSTS.find(({ pattern }) => pattern.test(host))?.site;
}
