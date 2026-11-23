import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestApp,
  getTestBucket,
} from '../../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../../test/integration/database';
import {
  signUp,
  TEST_ORIGIN,
} from '../../../lib/__integration__/sign-up.fixture';
import { ProfileGateModule } from '../profile-gate.module';
import { RequireProfileGuard } from '../require-profile.guard';

const PDF = 'application/pdf';
const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MB = 1024 * 1024;

@Controller('test-profile-gate')
@UseGuards(RequireProfileGuard)
class ProfileGatedController {
  @Get()
  get() {
    return { ok: true };
  }
}

const answers = {
  targetRoles: ['Backend Engineer', 'Platform Engineer'],
  yearsOfExperience: 6,
  countryCode: 'NG',
  workSetups: ['remote'],
  salaryFloor: { amount: 60000, currency: 'USD' },
};

describe('Profile (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [ProfileGatedController],
      imports: [ProfileGateModule],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const upload = (
    cookie: string[] | undefined,
    file: { data: Buffer; filename: string; contentType: string } | null,
    purpose = 'primary-resume',
  ) => {
    const req = request(app.getHttpServer())
      .post('/api/profiles/uploads')
      .set('Origin', TEST_ORIGIN);
    if (cookie) req.set('Cookie', cookie);
    req.field('purpose', purpose);
    if (file) {
      req.attach('file', file.data, {
        filename: file.filename,
        contentType: file.contentType,
      });
    }

    return req;
  };

  const pdf = (size = 64) => ({
    data: Buffer.alloc(size, 'a'),
    filename: 'Ada Obi CV.pdf',
    contentType: PDF,
  });

  const createProfile = (cookie: string[] | undefined, body: object) => {
    const req = request(app.getHttpServer())
      .post('/api/profiles')
      .set('Origin', TEST_ORIGIN);
    if (cookie) req.set('Cookie', cookie);

    return req.send(body);
  };

  const getMe = (cookie?: string[]) => {
    const req = request(app.getHttpServer())
      .get('/api/profiles/me')
      .set('Origin', TEST_ORIGIN);
    if (cookie) req.set('Cookie', cookie);

    return req;
  };

  const getGated = (cookie: string[]) =>
    request(app.getHttpServer())
      .get('/api/test-profile-gate')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie);

  describe('onboarding', () => {
    it('creates the profile and a parsing primary resume from an uploaded file', async () => {
      const { cookie, userId } = await signUp(app);

      expect((await getMe(cookie)).status).toBe(404);

      const uploaded = await upload(cookie, pdf());
      expect(uploaded.status).toBe(201);
      expect(uploaded.body).toEqual({
        key: expect.stringMatching(/^[A-Za-z0-9_-]{21}\.pdf$/),
        mimeType: PDF,
      });

      const created = await createProfile(cookie, {
        ...answers,
        resume: uploaded.body,
      });
      expect(created.status).toBe(201);
      expect(created.body).toEqual({
        id: expect.any(String),
        ...answers,
        createdAt: expect.any(String),
      });

      const path = `users/${userId}/primary-resume/${uploaded.body.key}`;
      expect(getTestBucket(app).objects.get(path)?.data).toEqual(pdf().data);

      const resume = await getTestDatabase()
        .collection('resumes')
        .findOne({ user: new Types.ObjectId(userId) });
      expect(resume).toMatchObject({
        kind: 'primary',
        parseStatus: 'parsing',
        parseStartedAt: expect.any(Date),
        parsedAt: null,
        reviewedAt: null,
        file: {
          path,
          mimeType: PDF,
          originalName: 'Ada Obi CV.pdf',
          size: 64,
        },
        experience: [],
      });

      const me = await getMe(cookie);
      expect(me.status).toBe(200);
      expect(me.body).toEqual(created.body);
    });

    it('accepts a DOCX resume', async () => {
      const { cookie } = await signUp(app);
      const uploaded = await upload(cookie, {
        data: Buffer.from('docx'),
        filename: 'cv.docx',
        contentType: DOCX,
      });

      const created = await createProfile(cookie, {
        ...answers,
        resume: uploaded.body,
      });

      expect(uploaded.body.mimeType).toBe(DOCX);
      expect(created.status).toBe(201);
    });

    it('refuses a second profile with 409', async () => {
      const { cookie } = await signUp(app);
      const first = await upload(cookie, pdf());
      await createProfile(cookie, { ...answers, resume: first.body }).expect(
        201,
      );

      const second = await upload(cookie, pdf());
      const response = await createProfile(cookie, {
        ...answers,
        resume: second.body,
      });

      expect(response.status).toBe(409);
      expect(
        await getTestDatabase().collection('resumes').countDocuments(),
      ).toBe(1);
    });

    it('keeps a non-ASCII file name intact', async () => {
      const { cookie, userId } = await signUp(app);
      const uploaded = await upload(cookie, {
        ...pdf(),
        filename: 'Ọkọlọ CV.pdf',
      });

      await createProfile(cookie, { ...answers, resume: uploaded.body }).expect(
        201,
      );

      const resume = await getTestDatabase()
        .collection('resumes')
        .findOne({ user: new Types.ObjectId(userId) });
      expect(resume?.file.originalName).toBe('Ọkọlọ CV.pdf');
    });

    it('creates one profile from concurrent submits and keeps no stray file', async () => {
      const { cookie, userId } = await signUp(app);
      const [first, second] = await Promise.all([
        upload(cookie, pdf()),
        upload(cookie, pdf()),
      ]);

      const responses = await Promise.all([
        createProfile(cookie, { ...answers, resume: first.body }),
        createProfile(cookie, { ...answers, resume: second.body }),
      ]);

      expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
      const database = getTestDatabase();
      expect(await database.collection('profiles').countDocuments()).toBe(1);
      const resume = await database
        .collection('resumes')
        .findOne({ user: new Types.ObjectId(userId) });
      const committed = [...getTestBucket(app).objects.keys()].filter((path) =>
        path.startsWith(`users/${userId}/`),
      );
      expect(committed).toEqual([resume?.file.path]);
    });

    it("refuses another user's upload key with 404 and creates nothing", async () => {
      const owner = await signUp(app, { email: 'owner@example.com' });
      const other = await signUp(app, { email: 'other@example.com' });
      const uploaded = await upload(owner.cookie, pdf());

      const response = await createProfile(other.cookie, {
        ...answers,
        resume: uploaded.body,
      });

      expect(response.status).toBe(404);
      expect(
        await getTestDatabase().collection('profiles').countDocuments(),
      ).toBe(0);
    });

    it('refuses a resume type that does not match its key with 400', async () => {
      const { cookie } = await signUp(app);
      const uploaded = await upload(cookie, pdf());

      const response = await createProfile(cookie, {
        ...answers,
        resume: { ...uploaded.body, mimeType: DOCX },
      });

      expect(response.status).toBe(400);
    });

    it('refuses invalid answers with 400', async () => {
      const { cookie } = await signUp(app);
      const uploaded = await upload(cookie, pdf());

      const response = await createProfile(cookie, {
        ...answers,
        targetRoles: [],
        resume: uploaded.body,
      });

      expect(response.status).toBe(400);
      expect(
        await getTestDatabase().collection('profiles').countDocuments(),
      ).toBe(0);
    });
  });

  describe('POST /api/profiles/uploads', () => {
    it('refuses a type outside the allowlist with 400', async () => {
      const { cookie } = await signUp(app);

      const response = await upload(cookie, {
        data: Buffer.from('png'),
        filename: 'cv.png',
        contentType: 'image/png',
      });

      expect(response.status).toBe(400);
    });

    it('refuses a request without a file with 400', async () => {
      const { cookie } = await signUp(app);

      expect((await upload(cookie, null)).status).toBe(400);
    });

    it('refuses two files with 400', async () => {
      const { cookie } = await signUp(app);

      const response = await upload(cookie, pdf()).attach(
        'file',
        Buffer.from('b'),
        { filename: 'b.pdf', contentType: PDF },
      );

      expect(response.status).toBe(400);
    });

    it('refuses an unknown purpose with 400', async () => {
      const { cookie } = await signUp(app);

      expect((await upload(cookie, pdf(), 'avatar')).status).toBe(400);
    });

    it('refuses a file over 5 MB with 413', async () => {
      const { cookie } = await signUp(app);

      const response = await upload(cookie, pdf(5 * MB + 1));

      expect(response.status).toBe(413);
    });
  });

  describe('without a session', () => {
    it('refuses every endpoint with 401', async () => {
      expect((await getMe()).status).toBe(401);
      expect((await upload(undefined, pdf())).status).toBe(401);
      expect((await createProfile(undefined, answers)).status).toBe(401);
    });
  });

  describe('RequireProfileGuard', () => {
    it('refuses a user without a profile with 403', async () => {
      const { cookie } = await signUp(app);

      expect((await getGated(cookie)).status).toBe(403);
    });

    it('lets a user with a profile through', async () => {
      const { cookie } = await signUp(app);
      const uploaded = await upload(cookie, pdf());
      await createProfile(cookie, { ...answers, resume: uploaded.body }).expect(
        201,
      );

      const response = await getGated(cookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });
  });
});
