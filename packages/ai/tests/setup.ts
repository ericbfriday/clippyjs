/**
 * Vitest setup file
 *
 * Global test setup and configuration
 */

// Import testing-library matchers
import '@testing-library/jest-dom/vitest';

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

// Mock localStorage and sessionStorage with separate storage objects
const createMockStorage = () => {
  const storage: Record<string, string> = {};

  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach(key => delete storage[key]);
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] || null,
    _getStorage: () => storage, // For testing/debugging
  };
};

const localStorageMock = createMockStorage();
const sessionStorageMock = createMockStorage();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock });

// Clean up storage before each test
beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
});
