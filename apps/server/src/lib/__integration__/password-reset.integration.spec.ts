import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../test/integration/database';
import { fakeResend } from '../../../test/integration/fake-resend';
import { signUp, TEST_ORIGIN, TEST_PASSWORD } from './sign-up.fixture';

const EMAIL = 'ada@example.com';
const NEW_PASSWORD = 'a-brand-new-password';
const RESET_PAGE_URL = `${TEST_ORIGIN}/reset-password`;

describe('Password reset (integration)', () => {
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

  const requestReset = (email = EMAIL) =>
    post('/request-password-reset', { email });

  const signIn = (password: string) =>
    post('/sign-in/email', { email: EMAIL, password });

  const findUser = () =>
    getTestDatabase().collection('users').findOne({ email: EMAIL });

  // Follows the emailed link and returns the token the reset page receives.
  const tokenFromEmail = async () => {
    const link = await vi.waitFor(() => fakeResend.linkSentTo(EMAIL));
    const opened = await request(app.getHttpServer()).get(
      `${link.pathname}${link.search}`,
    );
    const landing = new URL(opened.get('Location') ?? '');
    return { link, opened, landing, token: landing.searchParams.get('token') };
  };

  it('emails a link that lands on the reset page with a token', async () => {
    await signUp(app);

    const response = await requestReset();
    const { link, opened, landing, token } = await tokenFromEmail();

    expect(response.status).toBe(200);
    expect(link.searchParams.get('callbackURL')).toBe(RESET_PAGE_URL);
    expect(fakeResend.sent.at(-1)).toMatchObject({
      to: [EMAIL],
      subject: 'Reset your Quarry password',
    });
    expect(fakeResend.sent.at(-1)?.text).toMatch(/^Hi Ada,/);
    expect(opened.status).toBe(302);
    expect(`${landing.origin}${landing.pathname}`).toBe(RESET_PAGE_URL);
    expect(token).toBeTruthy();
  });

  it('sets the new password and signs out every session', async () => {
    const { cookie } = await signUp(app);
    await requestReset();
    const { token } = await tokenFromEmail();

    const reset = await post('/reset-password', {
      newPassword: NEW_PASSWORD,
      token,
    });

    expect(reset.status).toBe(200);
    expect((await signIn(TEST_PASSWORD)).status).toBe(401);
    expect((await signIn(NEW_PASSWORD)).status).toBe(200);

    const oldSession = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Cookie', cookie);
    expect(oldSession.body).toBeNull();
  });

  // Lets an owner take back an account a stranger signed up with their address.
  it('verifies an unverified email', async () => {
    await post('/sign-up/email', {
      email: EMAIL,
      name: 'Someone Else',
      password: TEST_PASSWORD,
    });
    await vi.waitFor(() => fakeResend.linkSentTo(EMAIL));
    fakeResend.reset();

    await requestReset();
    const { token } = await tokenFromEmail();
    await post('/reset-password', { newPassword: NEW_PASSWORD, token });

    expect((await findUser())?.emailVerified).toBe(true);
    expect((await signIn(NEW_PASSWORD)).status).toBe(200);
  });

  it('answers an unknown email as it does a known one, and emails only the known one', async () => {
    await signUp(app);
    await vi.waitFor(() => fakeResend.linkSentTo(EMAIL));
    fakeResend.reset();

    const unknown = await requestReset('nobody@example.com');
    const known = await requestReset();
    await vi.waitFor(() => fakeResend.linkSentTo(EMAIL));

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(fakeResend.sent.map((email) => email.to)).toEqual([[EMAIL]]);
  });

  it('refuses a made-up token', async () => {
    await signUp(app);

    const response = await post('/reset-password', {
      newPassword: NEW_PASSWORD,
      token: 'not-a-token',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('refuses a token that was already used', async () => {
    await signUp(app);
    await requestReset();
    const { token } = await tokenFromEmail();
    await post('/reset-password', { newPassword: NEW_PASSWORD, token });

    const again = await post('/reset-password', {
      newPassword: 'yet-another-password',
      token,
    });

    expect(again.status).toBe(400);
    expect(again.body.code).toBe('INVALID_TOKEN');
    expect((await signIn('yet-another-password')).status).toBe(401);
  });
});
