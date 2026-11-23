import { afterAll, afterEach, beforeAll } from 'vitest';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from './database';

// Every test starts from an empty database, which also wipes anything seeded
// in a spec's beforeAll, so seed in beforeEach instead.
beforeAll(async () => {
  await connectTestDatabase();
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});
