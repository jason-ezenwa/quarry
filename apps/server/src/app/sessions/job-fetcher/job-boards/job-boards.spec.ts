import { describe, expect, it } from 'vitest';
import { findBlockedSite, findJobBoard } from './job-boards';

const boardFor = (link: string) => findJobBoard(new URL(link));

describe('findJobBoard', () => {
  it.each([
    [
      'https://boards.greenhouse.io/acme/jobs/4012345',
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs/4012345',
    ],
    [
      'https://job-boards.greenhouse.io/acme/jobs/4012345?gh_src=x',
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs/4012345',
    ],
    [
      'https://job-boards.eu.greenhouse.io/acme/jobs/4012345',
      'https://boards-api.eu.greenhouse.io/v1/boards/acme/jobs/4012345',
    ],
    [
      'https://boards.greenhouse.io/embed/job_app?for=acme&token=4012345',
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs/4012345',
    ],
    [
      'https://jobs.lever.co/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
      'https://api.lever.co/v0/postings/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
    ],
    [
      'https://jobs.lever.co/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902/apply',
      'https://api.lever.co/v0/postings/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
    ],
    [
      'https://jobs.eu.lever.co/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
      'https://api.eu.lever.co/v0/postings/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
    ],
    [
      'https://jobs.ashbyhq.com/acme/1f2a3b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b',
      'https://api.ashbyhq.com/posting-api/job-board/acme',
    ],
    [
      'https://jobs.ashbyhq.com/Acme%20Labs/1f2a3b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b/application',
      'https://api.ashbyhq.com/posting-api/job-board/Acme%20Labs',
    ],
    [
      'https://apply.workable.com/acme/j/3A1B2C3D4E/',
      'https://apply.workable.com/api/v2/accounts/acme/jobs/3A1B2C3D4E',
    ],
    [
      'https://acme.workable.com/j/3A1B2C3D4E',
      'https://apply.workable.com/api/v2/accounts/acme/jobs/3A1B2C3D4E',
    ],
    [
      'https://acme.wd5.myworkdayjobs.com/en-US/External/job/Lagos/Backend-Engineer_R-1234',
      'https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/External/job/Lagos/Backend-Engineer_R-1234',
    ],
    [
      'https://acme.wd1.myworkdayjobs.com/External/job/Remote/Backend-Engineer_R-1234',
      'https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/External/job/Remote/Backend-Engineer_R-1234',
    ],
    [
      'https://wd3.myworkdaysite.com/en-US/recruiting/acme/External/job/Lagos/Backend-Engineer_R-1234',
      'https://wd3.myworkdaysite.com/wday/cxs/acme/External/job/Lagos/Backend-Engineer_R-1234',
    ],
  ])('maps %s to its API address', (link, apiUrl) => {
    expect(boardFor(link)?.apiUrl).toBe(apiUrl);
  });

  it.each([
    ['a board page with no job', 'https://boards.greenhouse.io/acme'],
    [
      'a lookalike host',
      'https://boards.greenhouse.io.example.com/acme/jobs/1',
    ],
    [
      'an encoded slash',
      'https://jobs.lever.co/acme%2F..%2Fx/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
    ],
    [
      'a Workday search page',
      'https://acme.wd5.myworkdayjobs.com/en-US/External',
    ],
    ['an unknown site', 'https://careers.example.com/jobs/1'],
  ])('finds no board for %s', (_label, link) => {
    expect(boardFor(link)).toBeUndefined();
  });
});

describe('findBlockedSite', () => {
  it.each([
    ['https://www.linkedin.com/jobs/view/3912345678', 'linkedin'],
    ['https://linkedin.com/jobs/view/3912345678', 'linkedin'],
    [
      'https://ng.linkedin.com/jobs/view/backend-engineer-3912345678',
      'linkedin',
    ],
    ['https://lnkd.in/dAbC123', 'linkedin'],
    [
      'https://www.glassdoor.com/job-listing/backend-engineer-JV_IC1.htm',
      'glassdoor',
    ],
    [
      'https://www.glassdoor.co.uk/job-listing/backend-engineer-JV_IC1.htm',
      'glassdoor',
    ],
    ['https://www.indeed.com/viewjob?jk=abc123', 'indeed'],
    ['https://uk.indeed.com/viewjob?jk=abc123', 'indeed'],
    ['https://ng.indeed.com/viewjob?jk=abc123', 'indeed'],
  ])('blocks %s', (link, site) => {
    expect(findBlockedSite(new URL(link))).toBe(site);
  });

  it.each([
    'https://notlinkedin.com/jobs/1',
    'https://linkedin.example.com/jobs/1',
    'https://careers.indeed-partner.com/jobs/1',
  ])('lets %s through', (link) => {
    expect(findBlockedSite(new URL(link))).toBeUndefined();
  });
});
