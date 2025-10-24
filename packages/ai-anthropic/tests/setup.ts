/**
 * Vitest setup file for ai-anthropic tests
 *
 * Global test setup and configuration
 */

import { beforeEach } from 'vitest';

// Polyfill for crypto.randomUUID if needed
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
    },
  });
}

// Mock fetch for proxy mode tests
(global as any).fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  // Default mock implementation - tests will override this
  return new Response(null, { status: 404 });
};

// Clean up before each test
beforeEach(() => {
  // Reset fetch mock
  (global as any).fetch = async () => new Response(null, { status: 404 });
});
