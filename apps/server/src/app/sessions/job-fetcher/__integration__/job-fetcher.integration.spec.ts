import { Test } from '@nestjs/testing';
import { delay, http, HttpResponse } from 'msw';
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mswServer } from '../../../../../test/integration/msw-server';
import {
  DEFAULT_JOB_FETCH_LIMITS,
  JOB_FETCH_FAILURE_MESSAGES,
  JOB_FETCH_HOST_LOOKUP,
  JOB_FETCH_LIMITS,
  MAX_DESCRIPTION_CHARS,
} from '../job-fetcher.constants';
import { jobFetcherProviders } from '../job-fetcher.providers';
import { JobFetcherService } from '../job-fetcher.service';
import { createFakeHostLookup } from './fake-host-lookup';

const hostLookup = createFakeHostLookup();

let jobFetcher: JobFetcherService;

beforeEach(async () => {
  hostLookup.reset();

  const moduleRef = await Test.createTestingModule({
    providers: jobFetcherProviders,
  })
    .overrideProvider(JOB_FETCH_HOST_LOOKUP)
    .useValue(hostLookup)
    .compile();

  jobFetcher = moduleRef.get(JobFetcherService);
});

describe('job boards', () => {
  it('reads a Greenhouse job from its API', async () => {
    mswServer.use(
      http.get(
        'https://boards-api.greenhouse.io/v1/boards/acme/jobs/4012345',
        () =>
          HttpResponse.json({
            id: 4012345,
            title: 'Backend Engineer',
            company_name: 'Acme',
            location: { name: 'Lagos, Nigeria' },
            content:
              '&lt;h2&gt;About&lt;/h2&gt;&lt;p&gt;Build payments &amp;amp; settlements.&lt;/p&gt;',
          }),
      ),
    );

    const link = 'https://boards.greenhouse.io/acme/jobs/4012345';

    expect(await jobFetcher.fetch(link)).toEqual({
      ok: true,
      job: {
        source: 'greenhouse',
        url: link,
        title: 'Backend Engineer',
        company: 'Acme',
        location: 'Lagos, Nigeria',
        description: 'About\n\nBuild payments & settlements.',
      },
    });
  });

  it('reads a Lever job from its API', async () => {
    mswServer.use(
      http.get(
        'https://api.lever.co/v0/postings/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
        () =>
          HttpResponse.json({
            id: '5ac21346-8e0c-4494-8e7a-3eb92ff77902',
            text: 'Backend Engineer',
            categories: { location: 'Remote, Africa', team: 'Payments' },
            description: '<div>Build payments.</div>',
            lists: [
              {
                text: 'Requirements',
                content: '<li>TypeScript</li><li>MongoDB</li>',
              },
            ],
            additional: '<div>We pay in USD.</div>',
          }),
      ),
    );

    const link =
      'https://jobs.lever.co/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902';

    expect(await jobFetcher.fetch(link)).toEqual({
      ok: true,
      job: {
        source: 'lever',
        url: link,
        title: 'Backend Engineer',
        location: 'Remote, Africa',
        description: [
          'Build payments.',
          '',
          'Requirements',
          '',
          '- TypeScript',
          '- MongoDB',
          '',
          'We pay in USD.',
        ].join('\n'),
      },
    });
  });

  it('finds an Ashby job in its board', async () => {
    const id = '1f2a3b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

    mswServer.use(
      http.get('https://api.ashbyhq.com/posting-api/job-board/acme', () =>
        HttpResponse.json({
          jobs: [
            {
              id: '00000000-0000-4000-8000-000000000000',
              title: 'Designer',
              location: 'Berlin',
              descriptionHtml: '<p>Design things.</p>',
            },
            {
              id,
              title: 'Backend Engineer',
              location: 'Remote',
              descriptionHtml: '<p>Build payments.</p>',
            },
          ],
        }),
      ),
    );

    const link = `https://jobs.ashbyhq.com/acme/${id}`;

    expect(await jobFetcher.fetch(link)).toEqual({
      ok: true,
      job: {
        source: 'ashby',
        url: link,
        title: 'Backend Engineer',
        location: 'Remote',
        description: 'Build payments.',
      },
    });
  });

  it('reads a Workable job from its API', async () => {
    mswServer.use(
      http.get(
        'https://apply.workable.com/api/v2/accounts/acme/jobs/3A1B2C3D4E',
        () =>
          HttpResponse.json({
            shortcode: '3A1B2C3D4E',
            title: 'Backend Engineer',
            location: { city: 'Lagos', region: 'Lagos', country: 'Nigeria' },
            description: '<p>Build payments.</p>',
            requirements: '<ul><li>TypeScript</li></ul>',
            benefits: '<p>Remote work.</p>',
          }),
      ),
    );

    const link = 'https://apply.workable.com/acme/j/3A1B2C3D4E/';

    expect(await jobFetcher.fetch(link)).toEqual({
      ok: true,
      job: {
        source: 'workable',
        url: link,
        title: 'Backend Engineer',
        location: 'Lagos, Nigeria',
        description: [
          'Build payments.',
          '',
          'Requirements',
          '',
          '- TypeScript',
          '',
          'Benefits',
          '',
          'Remote work.',
        ].join('\n'),
      },
    });
  });

  it("reads a Workday job from the endpoint Workday's own pages call", async () => {
    mswServer.use(
      http.get(
        'https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/External/job/Lagos/Backend-Engineer_R-1234',
        () =>
          HttpResponse.json({
            jobPostingInfo: {
              title: 'Backend Engineer',
              location: 'Lagos',
              jobDescription: '<p>Build payments.</p>',
            },
            hiringOrganization: { name: 'Acme Inc.' },
          }),
      ),
    );

    const link =
      'https://acme.wd5.myworkdayjobs.com/en-US/External/job/Lagos/Backend-Engineer_R-1234';

    expect(await jobFetcher.fetch(link)).toEqual({
      ok: true,
      job: {
        source: 'workday',
        url: link,
        title: 'Backend Engineer',
        company: 'Acme Inc.',
        location: 'Lagos',
        description: 'Build payments.',
      },
    });
  });

  it('finds no job text in a board job with no description', async () => {
    mswServer.use(
      http.get(
        'https://boards-api.greenhouse.io/v1/boards/acme/jobs/4012345',
        () => HttpResponse.json({ title: 'Backend Engineer', content: '' }),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://boards.greenhouse.io/acme/jobs/4012345',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'no-job-text' });
  });

  it('reports a job taken down from its board as not found', async () => {
    mswServer.use(
      http.get(
        'https://boards-api.greenhouse.io/v1/boards/acme/jobs/4012345',
        () =>
          HttpResponse.json(
            { status: 404, error: 'Job not found' },
            { status: 404 },
          ),
      ),
    );

    expect(
      await jobFetcher.fetch('https://boards.greenhouse.io/acme/jobs/4012345'),
    ).toEqual({
      ok: false,
      reason: 'not-found',
      message: JOB_FETCH_FAILURE_MESSAGES['not-found'],
    });
  });

  it('reports an Ashby job missing from its board as not found', async () => {
    mswServer.use(
      http.get('https://api.ashbyhq.com/posting-api/job-board/acme', () =>
        HttpResponse.json({ jobs: [] }),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://jobs.ashbyhq.com/acme/1f2a3b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'not-found' });
  });

  it.each([
    ['an error status', () => new HttpResponse(null, { status: 503 })],
    ['a body that is not JSON', () => HttpResponse.text('<html>oops</html>')],
  ])(
    'reports a board API answering with %s as a failed fetch',
    async (_label, answer) => {
      mswServer.use(
        http.get(
          'https://api.lever.co/v0/postings/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
          answer,
        ),
      );

      const outcome = await jobFetcher.fetch(
        'https://jobs.lever.co/acme/5ac21346-8e0c-4494-8e7a-3eb92ff77902',
      );

      expect(outcome).toEqual({
        ok: false,
        reason: 'fetch-failed',
        message: JOB_FETCH_FAILURE_MESSAGES['fetch-failed'],
      });
    },
  );
});

const JOB_PARAGRAPHS = [
  'Acme is hiring a Backend Engineer to build the payment rails that move money for thousands of African businesses every day.',
  'You will design and run the services that settle card payments, bank transfers and mobile money, working closely with product and operations.',
  'We are looking for five years of experience with TypeScript and Node.js, solid MongoDB or PostgreSQL skills, and a habit of writing tests first.',
  'The role is remote within Africa, pays in US dollars, and includes a yearly learning budget and a new laptop.',
];

const jobPage = `<!doctype html>
<html>
  <head><title>Backend Engineer | Acme Careers</title></head>
  <body>
    <nav><a href="/">Home</a> <a href="/jobs">All jobs</a> <a href="/about">About us</a></nav>
    <main>
      <article>
        <h1>Backend Engineer</h1>
        ${JOB_PARAGRAPHS.map((paragraph) => `<p>${paragraph}</p>`).join('\n')}
      </article>
    </main>
    <footer>Copyright Acme. Privacy policy. Cookie settings.</footer>
    <script>window.tracking = 'secret-tracker';</script>
  </body>
</html>`;

const htmlPage = (html: string) =>
  new HttpResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

describe('other job sites', () => {
  it('caps a long job page at about 8k tokens, on a word boundary', async () => {
    const longPage = jobPage.replace(
      '</article>',
      `<p>${'responsibility '.repeat(4_000)}</p></article>`,
    );

    mswServer.use(
      http.get('https://careers.acme.example/jobs/long', () =>
        htmlPage(longPage),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://careers.acme.example/jobs/long',
    );

    const description = outcome.ok ? outcome.job.description : '';

    expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_CHARS);
    expect(description.length).toBeGreaterThan(MAX_DESCRIPTION_CHARS - 20);
    expect(description).toMatch(/ responsibility$/);
  });

  it("reads a job page's main text", async () => {
    mswServer.use(
      http.get('https://careers.acme.example/jobs/backend-engineer', () =>
        htmlPage(jobPage),
      ),
    );

    const link = 'https://careers.acme.example/jobs/backend-engineer';
    const outcome = await jobFetcher.fetch(link);

    expect(outcome).toEqual({
      ok: true,
      job: { source: 'web', url: link, description: expect.any(String) },
    });

    const description = outcome.ok ? outcome.job.description : '';

    expect(description.split('\n\n')).toEqual(
      expect.arrayContaining(JOB_PARAGRAPHS),
    );

    expect(description).not.toMatch(/Privacy policy|secret-tracker|All jobs/);
  });

  it('finds no job text on a page built only in the browser', async () => {
    mswServer.use(
      http.get('https://jobs.spa.example/postings/42', () =>
        htmlPage(
          '<!doctype html><html><head><title>Jobs</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
        ),
      ),
    );

    expect(
      await jobFetcher.fetch('https://jobs.spa.example/postings/42'),
    ).toEqual({
      ok: false,
      reason: 'no-job-text',
      message: JOB_FETCH_FAILURE_MESSAGES['no-job-text'],
    });
  });

  it('finds no job text in a response that is not a web page', async () => {
    mswServer.use(
      http.get('https://careers.acme.example/jobs/backend-engineer.pdf', () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.7').buffer, {
          headers: { 'content-type': 'application/pdf' },
        }),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://careers.acme.example/jobs/backend-engineer.pdf',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'no-job-text' });
  });

  it('reports a missing page as not found', async () => {
    mswServer.use(
      http.get(
        'https://careers.acme.example/jobs/closed',
        () =>
          new HttpResponse(jobPage, {
            status: 404,
            headers: { 'content-type': 'text/html' },
          }),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://careers.acme.example/jobs/closed',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'not-found' });
  });
});

describe('links that are never fetched', () => {
  it('turns down a LinkedIn link and names the site', async () => {
    expect(
      await jobFetcher.fetch('https://www.linkedin.com/jobs/view/3912345678'),
    ).toEqual({
      ok: false,
      reason: 'blocked-site',
      site: 'linkedin',
      message:
        'LinkedIn blocks automated access, so paste the description from the LinkedIn page.',
    });
  });

  it.each([
    ['not a URL', 'backend engineer at acme'],
    ['not http(s)', 'file:///etc/passwd'],
    ['carrying credentials', 'https://user:secret@careers.acme.example/jobs/1'],
    ['on a non-standard port', 'https://careers.acme.example:8443/jobs/1'],
  ])('refuses a link %s', async (_label, link) => {
    expect(await jobFetcher.fetch(link)).toEqual({
      ok: false,
      reason: 'invalid-url',
      message: JOB_FETCH_FAILURE_MESSAGES['invalid-url'],
    });
  });
});

describe('private and local addresses', () => {
  const refused = {
    ok: false,
    reason: 'refused-address',
    message: JOB_FETCH_FAILURE_MESSAGES['refused-address'],
  };

  it.each([
    ['localhost', ['127.0.0.1']],
    ['a private address', ['10.0.0.5']],
    ['a private address among public ones', ['104.18.32.7', '192.168.1.10']],
    ['an IPv6 unique local address', ['fd12:3456::1']],
  ])('refuses a host that resolves to %s', async (_label, addresses) => {
    hostLookup.point('careers.acme.example', ...addresses);

    expect(
      await jobFetcher.fetch('https://careers.acme.example/jobs/1'),
    ).toEqual(refused);
  });

  it.each([
    'http://127.0.0.1/jobs/1',
    'http://2130706433/jobs/1',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/jobs/1',
    'http://[::ffff:10.0.0.1]/jobs/1',
    'http://0.0.0.0/jobs/1',
  ])('refuses the address %s', async (link) => {
    expect(await jobFetcher.fetch(link)).toEqual(refused);
  });
});

describe('redirects', () => {
  const redirectTo = (location: string, status = 302) =>
    new HttpResponse(null, { status, headers: { location } });

  it('follows redirects to the job page, keeping the link it was given', async () => {
    mswServer.use(
      http.get('https://acme.example/j/42', () =>
        redirectTo('https://careers.acme.example/jobs/42', 301),
      ),
      http.get('https://careers.acme.example/jobs/42', () =>
        redirectTo('/jobs/backend-engineer', 307),
      ),
      http.get('https://careers.acme.example/jobs/backend-engineer', () =>
        htmlPage(jobPage),
      ),
    );

    const outcome = await jobFetcher.fetch('https://acme.example/j/42');

    expect(outcome).toMatchObject({
      ok: true,
      job: { source: 'web', url: 'https://acme.example/j/42' },
    });
  });

  // No Set-Cookie here: MSW adds cookies from its own store to the request
  // it hands a handler, which would hide what the fetcher really sent.
  it('sends no cookies or credentials on any hop', async () => {
    const sentHeaders: Headers[] = [];

    mswServer.use(
      http.get('https://acme.example/j/42', ({ request }) => {
        sentHeaders.push(request.headers);

        return redirectTo('https://careers.acme.example/jobs/42');
      }),
      http.get('https://careers.acme.example/jobs/42', ({ request }) => {
        sentHeaders.push(request.headers);

        return htmlPage(jobPage);
      }),
    );

    await jobFetcher.fetch('https://acme.example/j/42');

    expect(sentHeaders).toHaveLength(2);

    for (const headers of sentHeaders) {
      expect(headers.get('cookie')).toBeNull();
      expect(headers.get('authorization')).toBeNull();
    }
  });

  it.each([
    ['a private address', 'http://10.0.0.5/admin'],
    ['the cloud metadata address', 'http://169.254.169.254/latest/meta-data/'],
    ['a host that resolves to loopback', 'https://internal.acme.example/'],
  ])('refuses a redirect to %s', async (_label, target) => {
    hostLookup.point('internal.acme.example', '127.0.0.1');

    mswServer.use(
      http.get('https://careers.acme.example/jobs/42', () =>
        redirectTo(target),
      ),
      http.get(target, () => htmlPage(jobPage)),
    );

    const outcome = await jobFetcher.fetch(
      'https://careers.acme.example/jobs/42',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'refused-address' });
  });

  it('refuses a redirect to a non-http address', async () => {
    mswServer.use(
      http.get('https://careers.acme.example/jobs/42', () =>
        redirectTo('file:///etc/passwd'),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://careers.acme.example/jobs/42',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'invalid-url' });
  });

  it('turns down a link that redirects to LinkedIn, without following it', async () => {
    mswServer.use(
      http.get('https://short.example/abc', () =>
        redirectTo('https://www.linkedin.com/jobs/view/3912345678'),
      ),
    );

    expect(await jobFetcher.fetch('https://short.example/abc')).toEqual({
      ok: false,
      reason: 'blocked-site',
      site: 'linkedin',
      message:
        'LinkedIn blocks automated access, so paste the description from the LinkedIn page.',
    });
  });

  it('gives up on a redirect loop', async () => {
    mswServer.use(
      http.get('https://careers.acme.example/jobs/42', () =>
        redirectTo('https://careers.acme.example/jobs/42'),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://careers.acme.example/jobs/42',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'fetch-failed' });
  });
});

describe('limits', () => {
  // Streamed with no content-length, so the cap applies while reading.
  const streamOfBytes = (byteCount: number, contentType: string) => {
    const chunk = new TextEncoder().encode('a'.repeat(64 * 1024));
    let sent = 0;

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= byteCount) return controller.close();
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });

    return new HttpResponse(stream, {
      headers: { 'content-type': contentType },
    });
  };

  it('stops reading a web page larger than the page cap', async () => {
    mswServer.use(
      http.get('https://careers.acme.example/jobs/huge', () =>
        streamOfBytes(DEFAULT_JOB_FETCH_LIMITS.maxPageBytes + 1, 'text/html'),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://careers.acme.example/jobs/huge',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'fetch-failed' });
  });

  it('reads a board API response larger than the page cap', async () => {
    const id = '1f2a3b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

    const otherJob = {
      id: '00000000-0000-4000-8000-000000000000',
      title: 'Designer',
      descriptionHtml: `<p>${'a'.repeat(DEFAULT_JOB_FETCH_LIMITS.maxPageBytes)}</p>`,
    };

    mswServer.use(
      http.get('https://api.ashbyhq.com/posting-api/job-board/acme', () =>
        HttpResponse.json({
          jobs: [
            otherJob,
            {
              id,
              title: 'Backend Engineer',
              descriptionHtml: '<p>Build payments.</p>',
            },
          ],
        }),
      ),
    );

    const outcome = await jobFetcher.fetch(
      `https://jobs.ashbyhq.com/acme/${id}`,
    );

    expect(outcome).toMatchObject({
      ok: true,
      job: { title: 'Backend Engineer', description: 'Build payments.' },
    });
  });

  it('stops reading a board API response larger than the API cap', async () => {
    mswServer.use(
      http.get('https://api.ashbyhq.com/posting-api/job-board/acme', () =>
        streamOfBytes(
          DEFAULT_JOB_FETCH_LIMITS.maxApiBytes + 1,
          'application/json',
        ),
      ),
    );

    const outcome = await jobFetcher.fetch(
      'https://jobs.ashbyhq.com/acme/1f2a3b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b',
    );

    expect(outcome).toMatchObject({ ok: false, reason: 'fetch-failed' });
  });

  it.each([
    ['answers', () => delay('infinite')],
    [
      'finishes its body',
      () => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('<p>Backend'));
          },
        });

        return new HttpResponse(stream, {
          headers: { 'content-type': 'text/html' },
        });
      },
    ],
  ])('gives up on a site that never %s', async (_label, answer) => {
    const moduleRef = await Test.createTestingModule({
      providers: jobFetcherProviders,
    })
      .overrideProvider(JOB_FETCH_HOST_LOOKUP)
      .useValue(hostLookup)
      .overrideProvider(JOB_FETCH_LIMITS)
      .useValue({ ...DEFAULT_JOB_FETCH_LIMITS, timeoutMs: 200 })
      .compile();

    mswServer.use(http.get('https://careers.acme.example/jobs/slow', answer));

    const outcome = await moduleRef
      .get(JobFetcherService)
      .fetch('https://careers.acme.example/jobs/slow');

    expect(outcome).toMatchObject({ ok: false, reason: 'fetch-failed' });
  });
});

describe('logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the outcome by source and host, without the job text or link path', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');

    mswServer.use(
      http.get('https://careers.acme.example/jobs/backend-engineer', () =>
        htmlPage(jobPage),
      ),
    );

    await jobFetcher.fetch(
      'https://careers.acme.example/jobs/backend-engineer',
    );

    expect(log).toHaveBeenCalledWith('Job fetch finished', {
      source: 'web',
      host: 'careers.acme.example',
      status: 'ok',
      httpStatus: 200,
      ms: expect.any(Number),
    });

    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /payment rails|backend-engineer/,
    );
  });

  it('logs why a fetch failed', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');

    await jobFetcher.fetch('http://169.254.169.254/latest/meta-data/');

    expect(log).toHaveBeenCalledWith('Job fetch finished', {
      source: 'web',
      host: '169.254.169.254',
      status: 'refused-address',
      ms: expect.any(Number),
    });
  });
});
