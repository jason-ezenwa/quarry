import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../../test/integration/database';
import {
  signUp,
  TEST_ORIGIN,
} from '../../../lib/__integration__/sign-up.fixture';

describe('User (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/users/me', () => {
    const getMe = (cookie?: string[]) => {
      const req = request(app.getHttpServer())
        .get('/api/users/me')
        .set('Origin', TEST_ORIGIN);
      if (cookie) req.set('Cookie', cookie);

      return req;
    };

    it('returns the signed-in user', async () => {
      const { cookie, userId } = await signUp(app, {
        email: 'ada@example.com',
        name: 'Ada Obi',
      });

      const response = await getMe(cookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: userId,
        name: 'Ada Obi',
        email: 'ada@example.com',
        emailVerified: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('refuses a session whose user was deleted with 401', async () => {
      const { cookie } = await signUp(app);
      await getTestDatabase().collection('users').deleteMany({});

      const response = await getMe(cookie);

      expect(response.status).toBe(401);
    });

    it('refuses a request without a session with 401', async () => {
      const response = await getMe();

      expect(response.status).toBe(401);
    });
  });
});
