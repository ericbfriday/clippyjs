import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@opencode-ai/sdk': fileURLToPath(
        new URL('./src/testing/opencode-sdk-stub.ts', import.meta.url)
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/testing/',
        '**/*.config.*',
      ],
    },
  },
});
