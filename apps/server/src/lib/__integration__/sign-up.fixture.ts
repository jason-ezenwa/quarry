import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getTestDatabase } from '../../../test/integration/database';

export const TEST_ORIGIN = 'http://localhost:5173';
export const TEST_PASSWORD = 'correct-horse-battery';

export type SignUpInput = {
  email?: string;
  name?: string;
  password?: string;
};

export type SignedUpUser = {
  cookie: string[];
  userId: string;
};

// A verified, signed-in user, since sign-up alone opens no session.
export async function signUp(
  app: INestApplication,
  {
    email = 'ada@example.com',
    name = 'Ada Obi',
    password = TEST_PASSWORD,
  }: SignUpInput = {},
): Promise<SignedUpUser> {
  const signedUp = await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .set('Origin', TEST_ORIGIN)
    .send({ email, name, password })
    .expect(200);

  await getTestDatabase()
    .collection('users')
    .updateOne({ email }, { $set: { emailVerified: true } });

  const signedIn = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .set('Origin', TEST_ORIGIN)
    .send({ email, password })
    .expect(200);

  const cookie = signedIn.get('Set-Cookie');
  if (!cookie) {
    throw new Error('Sign-in did not set a session cookie');
  }

  return { cookie, userId: signedUp.body.user.id };
}
