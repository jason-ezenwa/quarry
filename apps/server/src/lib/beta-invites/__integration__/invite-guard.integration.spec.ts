import { INestApplication } from '@nestjs/common';
import { NOT_INVITED_CODE } from '@quarry/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../../test/integration/database';
import { fakeResend } from '../../../../test/integration/fake-resend';
import {
  inviteToBeta,
  signUp,
  TEST_ORIGIN,
  TEST_PASSWORD,
} from '../../__integration__/sign-up.fixture';
import { BETA_INVITES_COLLECTION } from '../beta-invites.constants';

describe('Invite-only sign-up (integration)', () => {
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

  const signUpAs = (email: string) =>
    post('/sign-up/email', { email, name: 'Ada Obi', password: TEST_PASSWORD });

  const countUsers = () =>
    getTestDatabase().collection('users').countDocuments();

  it('refuses an email that is not on the invite list and stores nothing', async () => {
    const response = await signUpAs('ada@example.com');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe(NOT_INVITED_CODE);
    expect(await countUsers()).toBe(0);
    expect(fakeResend.sent).toEqual([]);
  });

  it('lets an invited email sign up, whatever its case', async () => {
    await inviteToBeta('ada@example.com');

    const response = await signUpAs('Ada@Example.com');

    expect(response.status).toBe(200);
    expect(await countUsers()).toBe(1);
  });

  // The refusal comes before the account lookup, so it can't reveal an account.
  it('refuses an uninvited email the same way whether or not it has an account', async () => {
    await signUp(app, { email: 'ada@example.com' });
    await getTestDatabase().collection(BETA_INVITES_COLLECTION).deleteMany({});

    const response = await signUpAs('ada@example.com');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe(NOT_INVITED_CODE);
  });

  it('keeps an existing account working after its invite is removed', async () => {
    await signUp(app, { email: 'ada@example.com' });
    await getTestDatabase().collection(BETA_INVITES_COLLECTION).deleteMany({});

    const response = await post('/sign-in/email', {
      email: 'ada@example.com',
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(200);
  });
});
