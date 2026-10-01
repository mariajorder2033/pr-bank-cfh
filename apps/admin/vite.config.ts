import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Use the domain package's sources directly, so the app needs no prior build of it.
    alias: {
      '@pr-bank/domain': fileURLToPath(
        new URL('../../packages/domain/src/index.ts', import.meta.url),
      ),
    },
  },
});
