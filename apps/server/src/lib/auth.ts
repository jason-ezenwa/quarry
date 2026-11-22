import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './auth.constants';
import { DATABASE_NAME, getMongoUri } from './database';
import { TRUSTED_ORIGINS } from './trusted-origins';

config();

const client = new MongoClient(getMongoUri());
const db = client.db(DATABASE_NAME);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: mongodbAdapter(db, { client }),
  trustedOrigins: TRUSTED_ORIGINS,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    revokeSessionsOnPasswordReset: true,
  },
  rateLimit: {
    enabled: process.env.APP_ENV !== 'test',
  },
  user: {
    modelName: 'users',
  },
  account: {
    modelName: 'accounts',
  },
  session: {
    modelName: 'sessions',
  },
  verification: {
    modelName: 'verifications',
  },
});
