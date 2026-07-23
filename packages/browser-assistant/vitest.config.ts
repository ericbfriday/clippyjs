import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@clippyjs/browser-parser': path.resolve(__dirname, '../browser-parser/src/index.ts'),
      '@clippyjs/context-providers': path.resolve(__dirname, '../context-providers/src/index.ts'),
      '@clippyjs/ai': path.resolve(__dirname, '../ai/src/index.ts'),
      '@clippyjs/types': path.resolve(__dirname, '../types/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
      ],
    },
  },
});
