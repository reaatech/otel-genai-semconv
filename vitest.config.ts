import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'examples', 'dashboards'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'tests',
        'examples',
        'dashboards',
        'vitest.config.ts',
        'eslint.config.mjs',
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      concurrent: true,
    },
  },
});
