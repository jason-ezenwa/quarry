import { createRequire } from 'module';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

export type IntegrationGlobals = typeof globalThis & {
  __integrationMongo?: MongoMemoryReplSet;
};

// Real Node require, not Vite's module graph, so migrate-mongo-config.js's
// own `require('ts-node').register(...)` can resolve lib/database.ts.
const require = createRequire(import.meta.url);

// Runs once before any spec loads. A replica set, because better-auth writes
// inside transactions and MongoDB only allows those on a replica set.
export default async function globalSetup(project: TestProject): Promise<void> {
  const server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = server.getUri();

  await runMigrations(mongoUri);

  project.provide('mongoUri', mongoUri);
  (globalThis as IntegrationGlobals).__integrationMongo = server;
}

// The in-memory database starts empty, so it needs production's migrations
// too — otherwise a test's indexes drift from what `migrate-mongo up` creates.
async function runMigrations(mongoUri: string): Promise<void> {
  const migrateMongoConfig = require('../../migrate-mongo-config.js');
  const { config, database, up } = await import('migrate-mongo');

  config.set({
    ...migrateMongoConfig,
    mongodb: { ...migrateMongoConfig.mongodb, url: mongoUri },
  });

  const { db, client } = await database.connect();
  try {
    await up(db, client);
  } finally {
    await client.close();
  }
}
