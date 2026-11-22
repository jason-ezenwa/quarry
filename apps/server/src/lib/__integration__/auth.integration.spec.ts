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
    it('stores the user and signs them in', async () => {
      const { cookie, userId } = await signUp(app, {
        email: 'ada@example.com',
      });

      const user = await getTestDatabase()
        .collection('users')
        .findOne({ email: 'ada@example.com' });

      expect(user?._id.toHexString()).toBe(userId);
      expect(cookie.join(';')).toContain('better-auth.session_token');
    });

    it('refuses a second account for the same email', async () => {
      await signUp(app, { email: 'ada@example.com' });

      const response = await post('/sign-up/email', {
        email: 'ada@example.com',
        name: 'Someone Else',
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(422);
      expect(
        await getTestDatabase().collection('users').countDocuments(),
      ).toBe(1);
    });

    it('refuses a password shorter than eight characters', async () => {
      const response = await post('/sign-up/email', {
        email: 'ada@example.com',
        name: 'Ada Obi',
        password: 'short',
      });

      expect(response.status).toBe(400);
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
