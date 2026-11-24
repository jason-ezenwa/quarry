import type { FetchedJobSource } from './job-fetcher.types';

export type JobBoardSource = Exclude<FetchedJobSource, 'web'>;

export type JobBoardAdapter = {
  source: JobBoardSource;
  // The board's API address for a job link, or undefined when the link is not
  // a job on this board.
  toApiUrl(link: URL): string | undefined;
  // The job's fields from the API response, or undefined when it holds no job.
  toJob(data: unknown, link: URL): BoardJob | undefined;
};

export type BoardJob = {
  title?: string;
  company?: string;
  location?: string;
  descriptionHtml: string;
};

export type JobBoardMatch = {
  source: JobBoardSource;
  apiUrl: string;
  toJob(data: unknown): BoardJob | undefined;
};

export type Json = Record<string, unknown>;
