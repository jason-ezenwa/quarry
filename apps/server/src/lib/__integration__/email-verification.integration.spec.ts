import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createTestApp } from '../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../test/integration/database';
import { fakeResend } from '../../../test/integration/fake-resend';
import { inviteToBeta, TEST_ORIGIN, TEST_PASSWORD } from './sign-up.fixture';

const EMAIL = 'ada@example.com';
const CALLBACK_URL = `${TEST_ORIGIN}/email-verified`;
const SESSION_COOKIE = 'better-auth.session_token';

describe('Email verification (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await inviteToBeta(EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (path: string, body: object) =>
    request(app.getHttpServer())
      .post(`/api/auth${path}`)
      .set('Origin', TEST_ORIGIN)
      .send(body);

  const signUp = () =>
    post('/sign-up/email', {
      email: EMAIL,
      name: 'Ada Obi',
      password: TEST_PASSWORD,
    });

  const signIn = (password = TEST_PASSWORD) =>
    post('/sign-in/email', { email: EMAIL, password });

  const resend = () => post('/send-verification-email', { email: EMAIL });

  const findUser = () =>
    getTestDatabase().collection('users').findOne({ email: EMAIL });

  const waitForEmailTo = (email: string) =>
    vi.waitFor(() => fakeResend.linkSentTo(email));

  const followLink = (link: URL) =>
    request(app.getHttpServer()).get(`${link.pathname}${link.search}`);

  const setsSession = (response: request.Response) =>
    (response.get('Set-Cookie') ?? []).some((cookie) =>
      cookie.startsWith(`${SESSION_COOKIE}=`),
    );

  it('emails a verification link on sign-up and opens no session', async () => {
    const response = await signUp();

    expect(response.status).toBe(200);
    expect(response.body.token).toBeNull();
    expect(setsSession(response)).toBe(false);

    const link = await waitForEmailTo(EMAIL);
    expect(link.pathname).toBe('/api/auth/verify-email');
    expect(fakeResend.sent).toHaveLength(1);
    expect(fakeResend.sent[0]).toMatchObject({
      from: 'Quarry <noreply@quarry.test>',
      to: [EMAIL],
      subject: 'Verify your Quarry email',
    });
    const [email] = fakeResend.sent;
    expect(email.text).toMatch(/^Hi Ada,/);
    expect(email.html).toContain('Hi Ada,');
    expect(email.text).toContain(
      "If you didn't sign up for Quarry, ignore this.",
    );
    expect(email.html).toContain(link.href.replaceAll('&', '&amp;'));
    expect((await findUser())?.emailVerified).toBe(false);
  });

  it('refuses to sign in an unverified user without sending another email', async () => {
    await signUp();
    await waitForEmailTo(EMAIL);

    const response = await signIn();

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(setsSession(response)).toBe(false);
    expect(fakeResend.sent).toHaveLength(1);
  });

  it('lands the link on the verified page whatever callback the request named', async () => {
    await post('/sign-up/email', {
      email: EMAIL,
      name: 'Ada Obi',
      password: TEST_PASSWORD,
      callbackURL: `${TEST_ORIGIN}/somewhere-else`,
    });

    const link = await waitForEmailTo(EMAIL);

    expect(link.searchParams.get('callbackURL')).toBe(CALLBACK_URL);
  });

  it('sends nothing for an unverified sign-in with the wrong password', async () => {
    await signUp();
    await waitForEmailTo(EMAIL);

    const response = await signIn('not-the-password');

    expect(response.status).toBe(401);
    expect(fakeResend.sent).toHaveLength(1);
  });

  it('verifies the email from the link and signs the user in', async () => {
    await signUp();

    const verified = await followLink(await waitForEmailTo(EMAIL));

    expect(verified.status).toBe(302);
    expect(verified.get('Location')).toBe(CALLBACK_URL);
    expect(setsSession(verified)).toBe(true);
    expect((await findUser())?.emailVerified).toBe(true);
  });

  it('returns to the web app with an error for a tampered link', async () => {
    await signUp();
    const link = await waitForEmailTo(EMAIL);
    link.searchParams.set('token', 'not-a-token');

    const response = await followLink(link);

    expect(response.status).toBe(302);
    expect(
      new URL(response.get('Location') ?? '').searchParams.get('error'),
    ).toBe('INVALID_TOKEN');
    expect((await findUser())?.emailVerified).toBe(false);
  });

  it('still creates the account when the email fails to send', async () => {
    fakeResend.failNext();

    const response = await signUp();

    expect(response.status).toBe(200);
    expect(await findUser()).not.toBeNull();
    expect(fakeResend.sent).toHaveLength(0);
  });

  it('resends the link to an unverified user without a session', async () => {
    await signUp();
    await waitForEmailTo(EMAIL);

    const response = await resend();

    expect(response.status).toBe(200);
    expect(fakeResend.sent).toHaveLength(2);
  });

  it('sends nothing to an address that is already verified', async () => {
    await signUp();
    await followLink(await waitForEmailTo(EMAIL));

    const response = await resend();

    expect(response.status).toBe(200);
    expect(fakeResend.sent).toHaveLength(1);
  });

  it('reports a failed resend', async () => {
    await signUp();
    await waitForEmailTo(EMAIL);
    fakeResend.failNext();

    const response = await resend();

    expect(response.status).toBeGreaterThanOrEqual(500);
  });
});
