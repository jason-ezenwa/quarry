import type { IntegrationGlobals } from './global-setup.mjs';

// Vitest has no globalTeardown option: this is registered as a second
// globalSetup file whose only hook is `teardown`, run after every spec file.
export async function teardown(): Promise<void> {
  await (globalThis as IntegrationGlobals).__integrationMongo?.stop();
}
