import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../test/integration/database';
import { RESOLVED_CLIENT_IP_HEADER } from '../client-ip/client-ip.constants';
import { TEST_ORIGIN, TEST_PASSWORD } from './sign-up.fixture';

// Rate limiting is off in tests and on when deployed, here behind an edge that
// sets cf-connecting-ip. Hoisted above the imports, so auth.ts reads them.
vi.hoisted(() => {
  process.env.APP_ENV = 'staging';
  process.env.TRUSTED_CLIENT_IP_HEADER = 'cf-connecting-ip';
});

const CLIENT = '102.88.168.221';
const OTHER_CLIENT = '198.51.100.20';

describe('Auth rate limits (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.TRUSTED_CLIENT_IP_HEADER;
  });

  const post = (
    path: string,
    body: object,
    headers: Record<string, string> = {},
  ) =>
    request(app.getHttpServer())
      .post(`/api/auth${path}`)
      .set('Origin', TEST_ORIGIN)
      .set(headers)
      .send(body);

  const signUpAs = (
    clientIp: string,
    index: number,
    headers: Record<string, string> = {},
  ) =>
    post(
      '/sign-up/email',
      {
        email: `user-${index}@example.com`,
        name: 'Ada Obi',
        password: TEST_PASSWORD,
      },
      { 'cf-connecting-ip': clientIp, ...headers },
    );

  it('allows three sign-ups per client in fifteen minutes', async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 4; index++) {
      statuses.push((await signUpAs(CLIENT, index)).status);
    }
    const otherClient = await signUpAs(OTHER_CLIENT, 4);

    expect(statuses).toEqual([200, 200, 200, 429]);
    expect(otherClient.status).toBe(200);
  });

  it('ignores the headers a caller can set to dodge the limit', async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 4; index++) {
      const response = await signUpAs(CLIENT, index, {
        'x-forwarded-for': `203.0.113.${index + 1}`,
        [RESOLVED_CLIENT_IP_HEADER]: `198.51.100.${index + 1}`,
      });
      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('falls back to the connection address without the edge header', async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 4; index++) {
      const response = await post('/sign-up/email', {
        email: `user-${index}@example.com`,
        name: 'Ada Obi',
        password: TEST_PASSWORD,
      });
      statuses.push(response.status);
    }
    const viaEdge = await signUpAs(CLIENT, 4);

    expect(statuses).toEqual([200, 200, 200, 429]);
    expect(viaEdge.status).toBe(200);
  });

  it('keeps the counters in the database', async () => {
    await signUpAs(CLIENT, 0);

    const counter = await getTestDatabase()
      .collection('rateLimits')
      .findOne({ key: `${CLIENT}|/sign-up/email` });

    expect(counter?.count).toBe(1);
  });

  it('allows three verification emails per client in fifteen minutes', async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 4; index++) {
      const response = await post(
        '/send-verification-email',
        { email: 'nobody@example.com' },
        { 'cf-connecting-ip': CLIENT },
      );
      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('allows three password reset emails per client in fifteen minutes', async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 4; index++) {
      const response = await post(
        '/request-password-reset',
        { email: 'nobody@example.com' },
        { 'cf-connecting-ip': CLIENT },
      );
      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});
