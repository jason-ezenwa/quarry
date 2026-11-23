/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// Integration tests live in an `__integration__/` folder inside the module
// they cover, matching the server's layout.
const INTEGRATION_DIRS = 'src/**/__integration__/**'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [INTEGRATION_DIRS],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: [`${INTEGRATION_DIRS}/*.integration.test.{ts,tsx}`],
          setupFiles: ['src/test/integration/setup.ts'],
        },
      },
    ],
  },
})
