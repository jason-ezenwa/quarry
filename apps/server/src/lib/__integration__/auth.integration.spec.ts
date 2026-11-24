import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../test/integration/database';
import { signUp, TEST_ORIGIN, TEST_PASSWORD } from './sign-up.fixture';

describe('Email and password auth (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (path: string, body: object) =>
    request(app.getHttpServer())
      .post(`/api/auth${path}`)
      .set('Origin', TEST_ORIGIN)
      .send(body);

  describe('sign-up', () => {
    it('stores the user without signing them in', async () => {
      const response = await post('/sign-up/email', {
        email: 'ada@example.com',
        name: 'Ada Obi',
        password: TEST_PASSWORD,
      });

      const user = await getTestDatabase()
        .collection('users')
        .findOne({ email: 'ada@example.com' });

      expect(response.status).toBe(200);
      expect(user?._id.toHexString()).toBe(response.body.user.id);
      expect(response.get('Set-Cookie')?.join(';') ?? '').not.toContain(
        'better-auth.session_token',
      );
    });

    // Answers as if it worked, so sign-up can't reveal which emails have accounts.
    it('creates no second account for the same email', async () => {
      await signUp(app, { email: 'ada@example.com' });

      const response = await post('/sign-up/email', {
        email: 'ada@example.com',
        name: 'Someone Else',
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(200);
      expect(await getTestDatabase().collection('users').countDocuments()).toBe(
        1,
      );
    });

    it('refuses a password shorter than eight characters', async () => {
      const response = await post('/sign-up/email', {
        email: 'ada@example.com',
        name: 'Ada Obi',
        password: 'short',
      });

      expect(response.status).toBe(400);
    });

    it.each([
      ['a link', 'Claim your prize https://bit.ly/x'],
      ['a domain', 'visit prize.io'],
      ['HTML', '<b>Ada</b>'],
      ['only spaces', '   '],
    ])('refuses a name with %s and stores nothing', async (_, name) => {
      const response = await post('/sign-up/email', {
        email: 'ada@example.com',
        name,
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_NAME');
      expect(await getTestDatabase().collection('users').countDocuments()).toBe(
        0,
      );
    });

    // Checked before the email is looked up, so the answer reveals nothing.
    it('refuses a bad name the same way for an email that has an account', async () => {
      await signUp(app, { email: 'ada@example.com' });

      const response = await post('/sign-up/email', {
        email: 'ada@example.com',
        name: 'visit prize.io',
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_NAME');
    });

    it('stores the name trimmed', async () => {
      await post('/sign-up/email', {
        email: 'ada@example.com',
        name: '  Ada Obi  ',
        password: TEST_PASSWORD,
      });

      const user = await getTestDatabase()
        .collection('users')
        .findOne({ email: 'ada@example.com' });
      expect(user?.name).toBe('Ada Obi');
    });
  });

  describe('name change', () => {
    const updateName = (cookie: string[], name: string) =>
      post('/update-user', { name }).set('Cookie', cookie);

    const storedName = async () =>
      (
        await getTestDatabase()
          .collection('users')
          .findOne({ email: 'ada@example.com' })
      )?.name;

    it('refuses a name with a link and keeps the old one', async () => {
      const { cookie } = await signUp(app);

      const response = await updateName(cookie, 'https://evil.test');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_NAME');
      expect(await storedName()).toBe('Ada Obi');
    });

    it('refuses a name that is not text', async () => {
      const { cookie } = await signUp(app);

      const response = await post('/update-user', { name: null }).set(
        'Cookie',
        cookie,
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_NAME');
      expect(await storedName()).toBe('Ada Obi');
    });

    it('saves a plain name', async () => {
      const { cookie } = await signUp(app);

      const response = await updateName(cookie, 'Ada Lovelace');

      expect(response.status).toBe(200);
      expect(await storedName()).toBe('Ada Lovelace');
    });
  });

  describe('sign-in', () => {
    it('signs in with the right password', async () => {
      await signUp(app, { email: 'ada@example.com' });

      const response = await post('/sign-in/email', {
        email: 'ada@example.com',
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')?.join(';')).toContain(
        'better-auth.session_token',
      );
    });

    it('refuses the wrong password', async () => {
      await signUp(app, { email: 'ada@example.com' });

      const response = await post('/sign-in/email', {
        email: 'ada@example.com',
        password: 'not-the-password',
      });

      expect(response.status).toBe(401);
    });
  });
});
