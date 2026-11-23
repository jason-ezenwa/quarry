import { inject } from 'vitest';

// Loaded as the first setup file, before anything imports app code: src/lib/auth.ts
// opens its Mongo connection from these values at import time.
process.env.MONGODB_URI = inject('mongoUri');
process.env.APP_ENV = 'test';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.BETTER_AUTH_SECRET = 'integration-test-secret-at-least-32-chars';
process.env.FRONTEND_URL = 'http://localhost:5173';
// The Anthropic API is mocked with MSW, so no real key is ever sent.
process.env.APP_ANTHROPIC_API_KEY = 'test-anthropic-key';
