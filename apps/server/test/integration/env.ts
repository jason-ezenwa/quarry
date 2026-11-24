import { inject } from 'vitest';
import { R2_TEST_CONFIG } from './fake-r2';

// Loaded as the first setup file, before anything imports app code: src/lib/auth.ts
// opens its Mongo connection from these values at import time.
process.env.MONGODB_URI = inject('mongoUri');
process.env.APP_ENV = 'test';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.BETTER_AUTH_SECRET = 'integration-test-secret-at-least-32-chars';
process.env.FRONTEND_URL = 'http://localhost:5173';
// The Anthropic API is mocked with MSW, so no real key is ever sent.
process.env.APP_ANTHROPIC_API_KEY = 'test-anthropic-key';
// R2 is faked with MSW in fake-r2.ts.
process.env.R2_ACCOUNT_ID = R2_TEST_CONFIG.accountId;
process.env.R2_ACCESS_KEY_ID = R2_TEST_CONFIG.accessKeyId;
process.env.R2_SECRET_ACCESS_KEY = R2_TEST_CONFIG.secretAccessKey;
process.env.R2_BUCKET_NAME = R2_TEST_CONFIG.bucketName;
// Resend is faked with MSW in fake-resend.ts.
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.EMAIL_FROM = 'Quarry <noreply@quarry.test>';
