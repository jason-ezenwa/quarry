import { Db, MongoClient } from 'mongodb';
import { inject } from 'vitest';
import { DATABASE_NAME } from '../../src/lib/database';

let client: MongoClient | null = null;

export async function connectTestDatabase(): Promise<void> {
  client = new MongoClient(inject('mongoUri'));
  await client.connect();
}

export async function disconnectTestDatabase(): Promise<void> {
  await client?.close();
  client = null;
}

// The database the app under test reads and writes, for asserting on what a
// request persisted or seeding state before one.
export function getTestDatabase(): Db {
  if (!client) {
    throw new Error('Test database is not connected. Is setup.ts loaded?');
  }
  return client.db(DATABASE_NAME);
}

// migrate-mongo's own bookkeeping — clearing these makes it re-run migrations.
const MIGRATION_COLLECTIONS = new Set(['changelog', 'changelog_lock']);

// Empties every other collection but keeps them — and their indexes — in
// place, so indexes created by migrations survive between tests.
export async function clearTestDatabase(): Promise<void> {
  const collections = await getTestDatabase().collections();
  await Promise.all(
    collections
      .filter(
        (collection) => !MIGRATION_COLLECTIONS.has(collection.collectionName),
      )
      .map((collection) => collection.deleteMany({})),
  );
}
