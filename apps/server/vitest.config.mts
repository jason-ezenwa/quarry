import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Integration specs live in an `__integration__/` folder inside the module
// they cover, next to that module's integration fixtures.
const INTEGRATION_DIRS = 'src/**/__integration__/**';

export default defineConfig({
  // esbuild cannot emit decorator metadata, which Nest's DI depends on.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
          exclude: [INTEGRATION_DIRS],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: [`${INTEGRATION_DIRS}/*.integration.spec.ts`],
          globalSetup: [
            'test/integration/global-setup.mts',
            'test/integration/global-teardown.ts',
          ],
          setupFiles: ['test/integration/env.ts', 'test/integration/setup.ts'],
          // Every spec file shares one in-memory MongoDB and the app's
          // hardcoded database name, so files must not clear each other's data.
          fileParallelism: false,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
