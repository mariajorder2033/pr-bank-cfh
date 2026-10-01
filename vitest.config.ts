import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    // Run tests against workspace sources so they don't depend on a prior build.
    alias: {
      '@pr-bank/domain': src('./packages/domain/src/index.ts'),
      '@pr-bank/design-tokens': src('./packages/design-tokens/src/index.ts'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['packages/*/src/**/*.test.ts', 'services/*/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'web',
          include: ['apps/web/src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['apps/web/src/test/setup.ts'],
        },
      },
    ],
  },
});
