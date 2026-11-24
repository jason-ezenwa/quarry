import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import {
  ONE_HOUR_IN_SECONDS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './auth.constants';
import { AUTH_RATE_LIMIT_RULES } from './auth-rate-limit.constants';
import { RESOLVED_CLIENT_IP_HEADER } from './client-ip/client-ip.constants';
import { DATABASE_NAME, getMongoUri } from './database';
import type {
  PasswordResetEmailInput,
  VerificationEmailInput,
} from './email/email.types';
import { sendPasswordResetEmail } from './email/password-reset-email';
import { sendVerificationEmail } from './email/verification-email';
import { DEV_WEB_ORIGIN, TRUSTED_ORIGINS } from './trusted-origins';
import { checkUserNameBeforeSaving } from './user-name-guard';

config();

const WEB_ORIGIN = process.env.FRONTEND_URL || DEV_WEB_ORIGIN;

const EMAIL_VERIFIED_URL = new URL('/email-verified', WEB_ORIGIN).href;
const RESET_PASSWORD_URL = new URL('/reset-password', WEB_ORIGIN).href;

// A no-op handler lets background sends run unawaited; Better Auth logs failures.
function runWithoutWaiting(): void {}

// Points an emailed link's callback at the web app page, whatever the request named.
function withCallback(url: string, callbackURL: string): string {
  const link = new URL(url);
  link.searchParams.set('callbackURL', callbackURL);
  return link.href;
}

function sendVerificationEmailToWebApp({
  user,
  url,
}: VerificationEmailInput): Promise<void> {
  return sendVerificationEmail({
    user,
    url: withCallback(url, EMAIL_VERIFIED_URL),
  });
}

function sendPasswordResetToWebApp({
  user,
  url,
}: PasswordResetEmailInput): Promise<void> {
  return sendPasswordResetEmail({
    user,
    url: withCallback(url, RESET_PASSWORD_URL),
  });
}

// The reset link proves the inbox is theirs, so the email counts as verified,
// letting an owner reclaim an account a stranger signed up with their address.
async function verifyEmailOnPasswordReset({
  user,
}: {
  user: { id: string };
}): Promise<void> {
  const context = await auth.$context;

  try {
    await context.internalAdapter.updateUser(user.id, { emailVerified: true });
  } catch (error) {
    // The new password is already saved, so the reset still succeeds.
    context.logger.error('Could not verify the email after a reset', error);
  }
}

const client = new MongoClient(getMongoUri());
const db = client.db(DATABASE_NAME);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: mongodbAdapter(db, { client }),
  trustedOrigins: TRUSTED_ORIGINS,
  emailAndPassword: {
    enabled: true,
    // No session until the email is verified.
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    sendResetPassword: sendPasswordResetToWebApp,
    resetPasswordTokenExpiresIn: ONE_HOUR_IN_SECONDS,
    revokeSessionsOnPasswordReset: true,
    onPasswordReset: verifyEmailOnPasswordReset,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Off: sign-in is limited more loosely than resends, so it points to the resend page.
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: sendVerificationEmailToWebApp,
  },
  rateLimit: {
    enabled: process.env.APP_ENV !== 'test',
    // In MongoDB, so auth limits survive restarts and hold across instances.
    storage: 'database',
    modelName: 'rateLimits',
    customRules: AUTH_RATE_LIMIT_RULES,
  },
  advanced: {
    // Not awaiting the email keeps sign-up's timing from revealing existing accounts.
    backgroundTasks: { handler: runWithoutWaiting },
    // The same client IP the throttler uses, resolved by resolveClientIp.
    ipAddress: { ipAddressHeaders: [RESOLVED_CLIENT_IP_HEADER] },
  },
  hooks: { before: checkUserNameBeforeSaving },
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
