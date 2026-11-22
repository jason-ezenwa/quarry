import { INestApplication } from '@nestjs/common';
import request from 'supertest';

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

export async function signUp(
  app: INestApplication,
  {
    email = 'ada@example.com',
    name = 'Ada Obi',
    password = TEST_PASSWORD,
  }: SignUpInput = {},
): Promise<SignedUpUser> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .set('Origin', TEST_ORIGIN)
    .send({ email, name, password })
    .expect(200);

  const cookie = response.get('Set-Cookie');
  if (!cookie) {
    throw new Error('Sign-up did not set a session cookie');
  }

  return { cookie, userId: response.body.user.id };
}
