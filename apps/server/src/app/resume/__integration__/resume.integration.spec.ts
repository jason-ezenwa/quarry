import { INestApplication } from '@nestjs/common';
import type { PrimaryResumeResponse, Resume } from '@quarry/contracts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createTestApp,
  getTestBucket,
} from '../../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../../test/integration/database';
import { fakeAnthropicApi } from '../../../../test/integration/fake-anthropic-api';
import {
  signUp,
  TEST_ORIGIN,
} from '../../../lib/__integration__/sign-up.fixture';
import { InMemoryBucket } from '../../../test-utils/in-memory-bucket';
import { InterruptedParseRecovery } from '../parser/interrupted-parse-recovery';
import {
  PARSE_MAX_OUTPUT_TOKENS,
  RESUME_PARSE_MODEL,
  STALE_PARSE_AFTER_MS,
} from '../parser/parser.constants';

const PDF = 'application/pdf';

const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const pdfFile = {
  data: Buffer.from('%PDF-1.7 Ada Obi resume'),
  filename: 'Ada Obi CV.pdf',
  contentType: PDF,
};

const docxFile = {
  data: readFileSync(join(__dirname, 'fixtures/resume.docx')),
  filename: 'Ada Obi CV.docx',
  contentType: DOCX,
};

type TestFile = typeof pdfFile;

const parsedResume: Resume = {
  name: 'Ada Obi',
  contact: {
    email: 'ada@example.com',
    location: 'Lagos, Nigeria',
    links: [{ label: 'GitHub', url: 'https://github.com/ada' }],
  },
  summary: 'Backend engineer focused on payments.',
  experience: [
    {
      title: 'Backend Engineer',
      company: 'Paystack',
      startDate: '2021-03',
      bullets: ['Built the settlement service.'],
    },
  ],
  education: [
    {
      school: 'University of Lagos',
      qualification: 'BSc',
      field: 'Computer Science',
      endDate: '2018',
      details: [],
    },
  ],
  skills: [{ name: 'TypeScript' }, { name: 'MongoDB' }],
  projects: [],
  certifications: [{ name: 'AWS Solutions Architect', date: '2022' }],
};

const answers = {
  targetRoles: ['Backend Engineer'],
  yearsOfExperience: 6,
  countryCode: 'NG',
  workSetups: ['remote'],
  salaryFloor: { amount: 60000, currency: 'USD' },
};

describe('Resume (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const api = (
    method: 'get' | 'post' | 'put',
    path: string,
    cookie: string[],
  ) =>
    request(app.getHttpServer())
      [method](`/api${path}`)
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie);

  const upload = (cookie: string[], file: TestFile, path: string) =>
    api('post', path, cookie)
      .field('purpose', 'primary-resume')
      .attach('file', file.data, {
        filename: file.filename,
        contentType: file.contentType,
      });

  const onboard = async (cookie: string[], file: TestFile = pdfFile) => {
    const uploaded = await upload(cookie, file, '/profiles/uploads');
    expect(uploaded.status).toBe(201);

    const created = await api('post', '/profiles', cookie).send({
      ...answers,
      resume: uploaded.body,
    });

    expect(created.status).toBe(201);

    return uploaded.body as { key: string; mimeType: string };
  };

  const getPrimary = (cookie: string[]) =>
    api('get', '/resumes/primary', cookie);

  const waitForStatus = (
    cookie: string[],
    parseStatus: PrimaryResumeResponse['parseStatus'],
  ) =>
    vi.waitFor(
      async () => {
        const response = await getPrimary(cookie);
        expect(response.body.parseStatus).toBe(parseStatus);

        return response.body as PrimaryResumeResponse;
      },
      { timeout: 5_000, interval: 20 },
    );

  const findResume = (userId: string) =>
    getTestDatabase()
      .collection('resumes')
      .findOne({ user: new Types.ObjectId(userId), kind: 'primary' });

  const onboardParsed = async (cookie: string[]) => {
    fakeAnthropicApi.reply({ kind: 'resume', resume: parsedResume });
    await onboard(cookie);

    return waitForStatus(cookie, 'parsed');
  };

  it('takes a new user from no profile to a parsed primary resume', async () => {
    const { cookie, userId } = await signUp(app);

    expect((await api('get', '/profiles/me', cookie)).status).toBe(404);

    fakeAnthropicApi.reply({ kind: 'resume', resume: parsedResume });
    await onboard(cookie);

    const parsed = await waitForStatus(cookie, 'parsed');

    expect(parsed).toEqual({
      id: expect.any(String),
      parseStatus: 'parsed',
      parsedAt: expect.any(String),
      reviewedAt: null,
      file: { originalName: 'Ada Obi CV.pdf', mimeType: PDF, size: 23 },
      resume: parsedResume,
    });

    const profile = await api('get', '/profiles/me', cookie);
    expect(profile.status).toBe(200);

    const [profileDoc, resumeDoc] = await Promise.all([
      getTestDatabase()
        .collection('profiles')
        .findOne({ _id: new Types.ObjectId(profile.body.id) }),
      findResume(userId),
    ]);

    expect(profileDoc?.user.toHexString()).toBe(userId);
    expect(resumeDoc?._id.toHexString()).toBe(parsed.id);
  });

  describe('parsing', () => {
    it('sends a PDF to Claude as a file part', async () => {
      const { cookie } = await signUp(app);
      await onboardParsed(cookie);

      expect(fakeAnthropicApi.requests).toHaveLength(1);
      const [sent] = fakeAnthropicApi.requests;
      expect(sent.model).toBe(RESUME_PARSE_MODEL);
      expect(sent.max_tokens).toBe(PARSE_MAX_OUTPUT_TOKENS);

      // Structured output, natively or through the provider's forced tool.
      expect(
        sent.output_config?.format?.type === 'json_schema' ||
          sent.tools?.some((tool) => tool.name === 'json'),
      ).toBe(true);

      expect(sent.messages[0].content).toContainEqual({
        type: 'document',
        source: {
          type: 'base64',
          media_type: PDF,
          data: pdfFile.data.toString('base64'),
        },
      });
    });

    it('sends a DOCX to Claude as its text', async () => {
      const { cookie } = await signUp(app);
      fakeAnthropicApi.reply({ kind: 'resume', resume: parsedResume });
      await onboard(cookie, docxFile);
      await waitForStatus(cookie, 'parsed');

      const content = fakeAnthropicApi.requests[0].messages[0].content;
      expect(content.map((part) => part.type)).toEqual(['text', 'text']);

      expect(content).toContainEqual({
        type: 'text',
        text: expect.stringContaining(
          'Backend Engineer, Paystack, 2021 - Present',
        ),
      });
    });

    it('stores the parsed fields and the token usage', async () => {
      const { cookie, userId } = await signUp(app);

      fakeAnthropicApi.reply({
        kind: 'resume',
        resume: parsedResume,
        inputTokens: 2100,
        outputTokens: 650,
      });

      await onboard(cookie);
      await waitForStatus(cookie, 'parsed');

      expect(await findResume(userId)).toMatchObject({
        ...parsedResume,
        parseStatus: 'parsed',
        parsedAt: expect.any(Date),
        parseError: null,
        parseUsage: {
          model: RESUME_PARSE_MODEL,
          inputTokens: 2100,
          outputTokens: 650,
        },
      });
    });

    it('retries a failed attempt and stores the next good reply', async () => {
      const { cookie } = await signUp(app);

      fakeAnthropicApi.reply(
        { kind: 'error', status: 529 },
        { kind: 'resume', resume: parsedResume },
      );

      await onboard(cookie);

      const parsed = await waitForStatus(cookie, 'parsed');
      expect(parsed.resume).toEqual(parsedResume);
      expect(fakeAnthropicApi.requests).toHaveLength(2);
    });

    it('marks the resume failed after malformed and refused replies use up the retries', async () => {
      const { cookie, userId } = await signUp(app);

      fakeAnthropicApi.reply(
        { kind: 'text', text: '{"name": "Ada' },
        { kind: 'refusal' },
        { kind: 'object', value: { name: 'Ada' } },
      );

      await onboard(cookie);

      const failed = await waitForStatus(cookie, 'failed');
      expect(failed.resume).toBeNull();
      expect(fakeAnthropicApi.requests).toHaveLength(3);

      expect(await findResume(userId)).toMatchObject({
        parseStatus: 'failed',
        parseError: 'invalid-output',
        parsedAt: null,
      });
    });

    it('records a refusal on the last attempt as the reason', async () => {
      const { cookie, userId } = await signUp(app);

      fakeAnthropicApi.reply(
        { kind: 'refusal' },
        { kind: 'refusal' },
        { kind: 'refusal' },
      );

      await onboard(cookie);
      await waitForStatus(cookie, 'failed');

      expect((await findResume(userId))?.parseError).toBe('refused');
    });

    it('fails without calling Claude when a DOCX cannot be read', async () => {
      const { cookie, userId } = await signUp(app);

      await onboard(cookie, {
        ...docxFile,
        data: Buffer.from('not a zip file'),
      });

      await waitForStatus(cookie, 'failed');

      expect(fakeAnthropicApi.requests).toHaveLength(0);
      expect((await findResume(userId))?.parseError).toBe('unreadable-file');
    });
  });

  describe('manual retry', () => {
    const failParse = async (cookie: string[]) => {
      fakeAnthropicApi.reply(
        { kind: 'error', status: 500 },
        { kind: 'error', status: 500 },
        { kind: 'error', status: 500 },
      );

      await onboard(cookie);
      await waitForStatus(cookie, 'failed');
    };

    it('re-parses a failed resume', async () => {
      const { cookie, userId } = await signUp(app);
      await failParse(cookie);

      fakeAnthropicApi.reply({ kind: 'resume', resume: parsedResume });
      const retried = await api('post', '/resumes/primary/parse', cookie);
      expect(retried.status).toBe(202);

      const parsed = await waitForStatus(cookie, 'parsed');
      expect(parsed.resume).toEqual(parsedResume);
      expect((await findResume(userId))?.parseError).toBeNull();
    });

    it('returns 409 while the resume is parsing or parsed', async () => {
      const { cookie } = await signUp(app);
      await onboard(cookie);

      const whileParsing = await api('post', '/resumes/primary/parse', cookie);
      expect(whileParsing.status).toBe(409);

      const other = await signUp(app, { email: 'bo@example.com' });
      await onboardParsed(other.cookie);

      const whileParsed = await api(
        'post',
        '/resumes/primary/parse',
        other.cookie,
      );

      expect(whileParsed.status).toBe(409);
    });
  });

  describe('interrupted parse recovery', () => {
    const seedResume = async (
      parseStatus: 'parsing' | 'failed',
      parseStartedAt: Date,
      bucket = getTestBucket(app),
    ) => {
      const path = `users/${new Types.ObjectId().toHexString()}/primary-resume/a.pdf`;

      await bucket.put(path, pdfFile.data, {
        contentType: PDF,
        metadata: {},
      });

      const { insertedId } = await getTestDatabase()
        .collection('resumes')
        .insertOne({
          user: new Types.ObjectId(),
          kind: 'primary',
          contact: { links: [] },
          experience: [],
          education: [],
          skills: [],
          projects: [],
          certifications: [],
          file: { path, mimeType: PDF, originalName: 'a.pdf', size: 23 },
          parseStatus,
          parseStartedAt,
          parsedAt: null,
          parseError: parseStatus === 'failed' ? 'api-error' : null,
          parseUsage: null,
          reviewedAt: null,
        });

      return insertedId;
    };

    const statusOf = async (id: Types.ObjectId) =>
      getTestDatabase().collection('resumes').findOne({ _id: id });

    const staleStart = () =>
      new Date(Date.now() - STALE_PARSE_AFTER_MS - 1_000);

    it('re-parses a stale parsing resume on startup and leaves fresh and failed ones alone', async () => {
      const bucket = new InMemoryBucket();
      const stale = await seedResume('parsing', staleStart(), bucket);
      const freshStart = new Date(Date.now() - 60_000);
      const fresh = await seedResume('parsing', freshStart, bucket);
      const failed = await seedResume('failed', staleStart(), bucket);
      fakeAnthropicApi.reply({ kind: 'resume', resume: parsedResume });

      const restarted = await createTestApp({ bucket });

      try {
        await vi.waitFor(
          async () =>
            expect((await statusOf(stale))?.parseStatus).toBe('parsed'),
          { timeout: 5_000, interval: 20 },
        );
      } finally {
        await restarted.close();
      }

      expect(fakeAnthropicApi.requests).toHaveLength(1);

      expect(await statusOf(fresh)).toMatchObject({
        parseStatus: 'parsing',
        parseStartedAt: freshStart,
      });

      expect(await statusOf(failed)).toMatchObject({ parseStatus: 'failed' });
    });

    it('parses a stale resume once when two recoveries run at the same time', async () => {
      const stale = await seedResume('parsing', staleStart());

      fakeAnthropicApi.reply(
        { kind: 'resume', resume: parsedResume },
        { kind: 'resume', resume: parsedResume },
      );

      const recovery = app.get(InterruptedParseRecovery);
      await Promise.all([recovery.recover(), recovery.recover()]);

      await vi.waitFor(
        async () => expect((await statusOf(stale))?.parseStatus).toBe('parsed'),
        { timeout: 5_000, interval: 20 },
      );

      expect(fakeAnthropicApi.requests).toHaveLength(1);
    });
  });

  describe('saving the reviewed resume', () => {
    it('returns 409 while the resume is not parsed', async () => {
      const { cookie } = await signUp(app);
      await onboard(cookie);

      const saved = await api('put', '/resumes/primary', cookie).send(
        parsedResume,
      );

      expect(saved.status).toBe(409);
    });

    it('replaces the content and marks the resume reviewed', async () => {
      const { cookie, userId } = await signUp(app);
      await onboardParsed(cookie);

      const { summary: _summary, ...withoutSummary } = parsedResume;

      const edited: Resume = {
        ...withoutSummary,
        experience: [
          {
            ...parsedResume.experience[0],
            bullets: ['Built and ran the settlement service.'],
          },
        ],
      };

      const saved = await api('put', '/resumes/primary', cookie).send(edited);
      expect(saved.status).toBe(200);

      expect(saved.body).toMatchObject({
        parseStatus: 'parsed',
        reviewedAt: expect.any(String),
        resume: edited,
      });

      expect(saved.body.resume).not.toHaveProperty('summary');

      const stored = await findResume(userId);
      expect(stored).not.toHaveProperty('summary');

      expect(stored?.experience[0].bullets).toEqual([
        'Built and ran the settlement service.',
      ]);

      const savedAgain = await api('put', '/resumes/primary', cookie).send(
        parsedResume,
      );

      expect(savedAgain.body.reviewedAt).toEqual(expect.any(String));
      expect((await getPrimary(cookie)).body.resume).toEqual(parsedResume);
    });

    it('rejects an invalid resume', async () => {
      const { cookie } = await signUp(app);
      await onboardParsed(cookie);

      const saved = await api('put', '/resumes/primary', cookie).send({
        ...parsedResume,
        experience: [
          { ...parsedResume.experience[0], startDate: 'March 2021' },
        ],
      });

      expect(saved.status).toBe(400);
    });
  });

  describe('re-uploading the file', () => {
    it('replaces the file, clears the review and re-parses', async () => {
      const { cookie, userId } = await signUp(app);
      fakeAnthropicApi.reply({ kind: 'resume', resume: parsedResume });
      const first = await onboard(cookie);
      await waitForStatus(cookie, 'parsed');
      await api('put', '/resumes/primary', cookie).send(parsedResume);

      const uploaded = await upload(cookie, docxFile, '/resumes/uploads');
      expect(uploaded.status).toBe(201);

      const replaced = await api('put', '/resumes/primary/file', cookie).send(
        uploaded.body,
      );

      expect(replaced.status).toBe(200);

      expect(replaced.body).toMatchObject({
        parseStatus: 'parsing',
        reviewedAt: null,
        file: { originalName: 'Ada Obi CV.docx', mimeType: DOCX },
        // The last good content stays until the new file parses.
        resume: parsedResume,
      });

      const objects = getTestBucket(app).objects;

      expect(objects.has(`users/${userId}/primary-resume/${first.key}`)).toBe(
        false,
      );

      expect(
        objects.has(`users/${userId}/primary-resume/${uploaded.body.key}`),
      ).toBe(true);

      const reparsed: Resume = { ...parsedResume, name: 'Ada N. Obi' };
      fakeAnthropicApi.reply({ kind: 'resume', resume: reparsed });
      const parsed = await waitForStatus(cookie, 'parsed');
      expect(parsed.resume).toEqual(reparsed);
      expect(parsed.reviewedAt).toBeNull();

      expect(
        fakeAnthropicApi.requests.at(-1)?.messages[0].content,
      ).toContainEqual({
        type: 'text',
        text: expect.stringContaining('Built the settlement service.'),
      });
    });

    it('keeps the file when the same upload is submitted twice at once', async () => {
      const { cookie, userId } = await signUp(app);
      await onboardParsed(cookie);
      const uploaded = await upload(cookie, docxFile, '/resumes/uploads');

      // Holds each commit's copy until both requests have passed the
      // `parsing` check, so the two really race for the update.
      const bucket = getTestBucket(app);
      const copy = bucket.copy.bind(bucket);
      let waiting = 0;
      let releaseBoth!: () => void;

      const bothWaiting = new Promise<void>((resolve) => {
        releaseBoth = resolve;
      });

      const held = vi
        .spyOn(bucket, 'copy')
        .mockImplementation(async (source, destination) => {
          if (++waiting === 2) releaseBoth();
          await bothWaiting;
          return copy(source, destination);
        });

      const responses = await Promise.all([
        api('put', '/resumes/primary/file', cookie).send(uploaded.body),
        api('put', '/resumes/primary/file', cookie).send(uploaded.body),
      ]);

      held.mockRestore();

      expect(responses.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);

      expect(
        getTestBucket(app).objects.has(
          `users/${userId}/primary-resume/${uploaded.body.key}`,
        ),
      ).toBe(true);
    });

    it('refuses a replacement file of a type outside the allowlist', async () => {
      const { cookie } = await signUp(app);
      await onboardParsed(cookie);

      const uploaded = await upload(
        cookie,
        { ...pdfFile, filename: 'cv.png', contentType: 'image/png' },
        '/resumes/uploads',
      );

      expect(uploaded.status).toBe(400);
    });

    it('returns 409 while a parse is running and 404 for an unknown upload', async () => {
      const { cookie } = await signUp(app);
      await onboard(cookie);
      const uploaded = await upload(cookie, docxFile, '/resumes/uploads');

      const whileParsing = await api(
        'put',
        '/resumes/primary/file',
        cookie,
      ).send(uploaded.body);

      expect(whileParsing.status).toBe(409);

      const other = await signUp(app, { email: 'bo@example.com' });
      await onboardParsed(other.cookie);

      const unknown = await api(
        'put',
        '/resumes/primary/file',
        other.cookie,
      ).send(uploaded.body);

      expect(unknown.status).toBe(404);
    });
  });

  it('refuses every resume endpoint without a profile', async () => {
    const { cookie } = await signUp(app);

    const responses = await Promise.all([
      getPrimary(cookie),
      api('put', '/resumes/primary', cookie).send(parsedResume),
      api('post', '/resumes/primary/parse', cookie),
      upload(cookie, pdfFile, '/resumes/uploads'),
      api('put', '/resumes/primary/file', cookie).send({
        key: 'V1StGXR8_Z5jdHi6B-myT.pdf',
        mimeType: PDF,
      }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      403, 403, 403, 403, 403,
    ]);
  });
});
