import { afterAll, afterEach, beforeAll } from 'vitest';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from './database';
import { fakeAnthropicApi } from './fake-anthropic-api';
import { listenToNetwork, mswServer } from './msw-server';

// Every test starts from an empty database, which also wipes anything seeded
// in a spec's beforeAll, so seed in beforeEach instead.
beforeAll(async () => {
  listenToNetwork();
  await connectTestDatabase();
});

afterEach(async () => {
  mswServer.resetHandlers();
  fakeAnthropicApi.reset();
  await clearTestDatabase();
});

afterAll(async () => {
  mswServer.close();
  await disconnectTestDatabase();
});
