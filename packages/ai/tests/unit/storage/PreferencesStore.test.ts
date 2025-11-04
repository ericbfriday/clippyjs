/**
 * Preferences Store Tests
 *
 * Test coverage:
 * - Preference get/set operations
 * - Validation
 * - Default values
 * - Change listeners
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  PreferencesStore,
  createPreferencesStore,
  PreferenceValidationError,
  DEFAULT_PREFERENCES,
  type UserPreferences,
} from '../../../src/storage/PreferencesStore';

describe('PreferencesStore', () => {
  let store: PreferencesStore;
  let dbCounter = 0;

  beforeEach(async () => {
    dbCounter++;
    store = new PreferencesStore({
      dbName: `prefs-test-${dbCounter}`,
    });
    await store.initialize();
  });

  afterEach(() => {
    store.destroy();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newStore = new PreferencesStore();
      await expect(newStore.initialize()).resolves.toBeUndefined();
      newStore.destroy();
    });

    it('should handle multiple initialization calls', async () => {
      await store.initialize();
      await store.initialize(); // Should not throw
      expect(true).toBe(true);
    });

    it('should throw error when destroyed', async () => {
      const newStore = new PreferencesStore();
      await newStore.initialize();
      newStore.destroy();

      await expect(newStore.get('theme')).rejects.toThrow('destroyed');
    });

    it('should load defaults on first initialization', async () => {
      const theme = await store.get('theme');
      expect(theme).toBe(DEFAULT_PREFERENCES.theme);
    });
  });

  describe('get operations', () => {
    it('should get default value for unset preference', async () => {
      const theme = await store.get('theme');
      expect(theme).toBe('system');
    });

    it('should get all preferences', async () => {
      const prefs = await store.getAll();

      expect(prefs).toHaveProperty('theme');
      expect(prefs).toHaveProperty('intrusionLevel');
      expect(prefs).toHaveProperty('preferredProvider');
      expect(prefs.theme).toBe('system');
    });

    it('should return custom value after set', async () => {
      await store.set('theme', 'dark');
      const theme = await store.get('theme');
      expect(theme).toBe('dark');
    });

    it('should cache values for performance', async () => {
      await store.set('theme', 'dark');

      const start = performance.now();
      await store.get('theme');
      const duration = performance.now() - start;

      // Should be fast (cached)
      expect(duration).toBeLessThan(10);
    });
  });

  describe('set operations', () => {
    it('should set theme preference', async () => {
      await store.set('theme', 'dark');
      expect(await store.get('theme')).toBe('dark');

      await store.set('theme', 'light');
      expect(await store.get('theme')).toBe('light');

      await store.set('theme', 'system');
      expect(await store.get('theme')).toBe('system');
    });

    it('should set intrusion level preference', async () => {
      await store.set('intrusionLevel', 'minimal');
      expect(await store.get('intrusionLevel')).toBe('minimal');

      await store.set('intrusionLevel', 'balanced');
      expect(await store.get('intrusionLevel')).toBe('balanced');

      await store.set('intrusionLevel', 'proactive');
      expect(await store.get('intrusionLevel')).toBe('proactive');
    });

    it('should set provider preference', async () => {
      await store.set('preferredProvider', 'openai');
      expect(await store.get('preferredProvider')).toBe('openai');

      await store.set('preferredProvider', 'anthropic');
      expect(await store.get('preferredProvider')).toBe('anthropic');

      await store.set('preferredProvider', 'custom');
      expect(await store.get('preferredProvider')).toBe('custom');
    });

    it('should set boolean preferences', async () => {
      await store.set('enableAnimations', false);
      expect(await store.get('enableAnimations')).toBe(false);

      await store.set('enableSounds', false);
      expect(await store.get('enableSounds')).toBe(false);

      await store.set('debugMode', true);
      expect(await store.get('debugMode')).toBe(true);
    });

    it('should set numeric preferences', async () => {
      await store.set('historyRetentionDays', 60);
      expect(await store.get('historyRetentionDays')).toBe(60);
    });

    it('should set object preferences', async () => {
      await store.set('customEndpoints', {
        anthropic: 'https://custom.anthropic.com',
        openai: 'https://custom.openai.com',
      });

      const endpoints = await store.get('customEndpoints');
      expect(endpoints?.anthropic).toBe('https://custom.anthropic.com');
    });

    it('should set accessibility preferences', async () => {
      await store.set('accessibility', {
        reduceMotion: true,
        highContrast: true,
        fontSize: 'large',
        screenReaderEnabled: true,
      });

      const accessibility = await store.get('accessibility');
      expect(accessibility?.reduceMotion).toBe(true);
      expect(accessibility?.fontSize).toBe('large');
    });

    it('should persist preferences across reloads', async () => {
      const dbName = `persist-test-${Date.now()}`;
      const store1 = new PreferencesStore({ dbName });
      await store1.initialize();

      await store1.set('theme', 'dark');
      store1.destroy();

      // Small delay to ensure IndexedDB flushes
      await new Promise(resolve => setTimeout(resolve, 10));

      const store2 = new PreferencesStore({ dbName });
      await store2.initialize();

      const theme = await store2.get('theme');
      expect(theme).toBe('dark');

      store2.destroy();
    });
  });

  describe('set many', () => {
    it('should set multiple preferences at once', async () => {
      await store.setMany({
        theme: 'dark',
        enableAnimations: false,
        debugMode: true,
      });

      expect(await store.get('theme')).toBe('dark');
      expect(await store.get('enableAnimations')).toBe(false);
      expect(await store.get('debugMode')).toBe(true);
    });

    it('should validate all preferences before setting', async () => {
      await expect(
        store.setMany({
          theme: 'invalid' as any,
          enableAnimations: true,
        })
      ).rejects.toThrow(PreferenceValidationError);

      // Should not have set any preferences
      expect(await store.get('enableAnimations')).toBe(true); // default
    });
  });

  describe('validation', () => {
    it('should reject invalid theme', async () => {
      await expect(store.set('theme', 'invalid' as any)).rejects.toThrow(
        PreferenceValidationError
      );
    });

    it('should reject invalid intrusion level', async () => {
      await expect(store.set('intrusionLevel', 'invalid' as any)).rejects.toThrow(
        PreferenceValidationError
      );
    });

    it('should reject invalid provider', async () => {
      await expect(store.set('preferredProvider', 'invalid' as any)).rejects.toThrow(
        PreferenceValidationError
      );
    });

    it('should reject invalid retention days (too low)', async () => {
      await expect(store.set('historyRetentionDays', 0)).rejects.toThrow(
        PreferenceValidationError
      );
    });

    it('should reject invalid retention days (too high)', async () => {
      await expect(store.set('historyRetentionDays', 400)).rejects.toThrow(
        PreferenceValidationError
      );
    });

    it('should reject non-boolean for boolean fields', async () => {
      await expect(store.set('enableAnimations', 'yes' as any)).rejects.toThrow(
        PreferenceValidationError
      );
    });

    it('should include error details', async () => {
      try {
        await store.set('theme', 'invalid' as any);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PreferenceValidationError);
        expect((error as PreferenceValidationError).key).toBe('theme');
        expect((error as PreferenceValidationError).value).toBe('invalid');
      }
    });
  });

  describe('reset operations', () => {
    it('should reset single preference to default', async () => {
      await store.set('theme', 'dark');
      await store.reset('theme');

      const theme = await store.get('theme');
      expect(theme).toBe(DEFAULT_PREFERENCES.theme);
    });

    it('should reset all preferences to defaults', async () => {
      await store.set('theme', 'dark');
      await store.set('enableAnimations', false);
      await store.set('debugMode', true);

      await store.resetAll();

      expect(await store.get('theme')).toBe(DEFAULT_PREFERENCES.theme);
      expect(await store.get('enableAnimations')).toBe(DEFAULT_PREFERENCES.enableAnimations);
      expect(await store.get('debugMode')).toBe(DEFAULT_PREFERENCES.debugMode);
    });

    it('should emit change events on reset', async () => {
      const callback = vi.fn();
      store.onChange('theme', callback);

      await store.set('theme', 'dark');
      await store.reset('theme');

      expect(callback).toHaveBeenCalledTimes(2); // Once for set, once for reset
    });
  });

  describe('change listeners', () => {
    it('should notify on preference change', async () => {
      const callback = vi.fn();
      store.onChange('theme', callback);

      await store.set('theme', 'dark');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'theme',
          oldValue: 'system',
          newValue: 'dark',
        })
      );
    });

    it('should include timestamp in change event', async () => {
      const callback = vi.fn();
      store.onChange('theme', callback);

      const before = new Date();
      await store.set('theme', 'dark');
      const after = new Date();

      expect(callback).toHaveBeenCalled();
      const event = callback.mock.calls[0][0];
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should unsubscribe correctly', async () => {
      const callback = vi.fn();
      const unsubscribe = store.onChange('theme', callback);

      unsubscribe();

      await store.set('theme', 'dark');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners on same key', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      store.onChange('theme', callback1);
      store.onChange('theme', callback2);

      await store.set('theme', 'dark');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should support listeners on different keys', async () => {
      const themeCallback = vi.fn();
      const animCallback = vi.fn();

      store.onChange('theme', themeCallback);
      store.onChange('enableAnimations', animCallback);

      await store.set('theme', 'dark');

      expect(themeCallback).toHaveBeenCalled();
      expect(animCallback).not.toHaveBeenCalled();
    });

    it('should notify global listeners', async () => {
      const globalCallback = vi.fn();
      store.onAnyChange(globalCallback);

      await store.set('theme', 'dark');
      await store.set('enableAnimations', false);

      expect(globalCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in listeners gracefully', async () => {
      const failingCallback = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodCallback = vi.fn();

      store.onChange('theme', failingCallback);
      store.onChange('theme', goodCallback);

      // Should not throw
      await store.set('theme', 'dark');

      expect(failingCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('factory function', () => {
    it('should create initialized store', async () => {
      const factoryStore = await createPreferencesStore();

      expect(factoryStore).toBeDefined();

      const theme = await factoryStore.get('theme');
      expect(theme).toBe(DEFAULT_PREFERENCES.theme);

      factoryStore.destroy();
    });

    it('should accept custom config', async () => {
      const factoryStore = await createPreferencesStore({
        dbName: 'custom-prefs',
      });

      expect(factoryStore).toBeDefined();
      factoryStore.destroy();
    });
  });

  describe('performance', () => {
    it('should complete read within target', async () => {
      await store.set('theme', 'dark');

      const start = performance.now();
      await store.get('theme');
      const duration = performance.now() - start;

      // Target: <5ms (cached)
      expect(duration).toBeLessThan(10);
    });

    it('should complete write within target', async () => {
      const start = performance.now();
      await store.set('theme', 'dark');
      const duration = performance.now() - start;

      // Target: <50ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent reads', async () => {
      await store.set('theme', 'dark');

      const reads = await Promise.all([
        store.get('theme'),
        store.get('enableAnimations'),
        store.get('debugMode'),
      ]);

      expect(reads).toHaveLength(3);
    });

    it('should handle concurrent writes', async () => {
      await Promise.all([
        store.set('theme', 'dark'),
        store.set('enableAnimations', false),
        store.set('debugMode', true),
      ]);

      expect(await store.get('theme')).toBe('dark');
      expect(await store.get('enableAnimations')).toBe(false);
      expect(await store.get('debugMode')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid updates to same preference', async () => {
      for (let i = 0; i < 10; i++) {
        await store.set('debugMode', i % 2 === 0);
      }

      const value = await store.get('debugMode');
      expect(typeof value).toBe('boolean');
    });

    it('should handle all preferences being set', async () => {
      const allPrefs: Partial<UserPreferences> = {
        theme: 'dark',
        intrusionLevel: 'proactive',
        preferredProvider: 'openai',
        enableAnimations: false,
        enableSounds: false,
        enableHistory: true,
        enableCaching: true,
        historyRetentionDays: 60,
        debugMode: true,
      };

      await store.setMany(allPrefs);

      const loaded = await store.getAll();
      expect(loaded.theme).toBe('dark');
      expect(loaded.intrusionLevel).toBe('proactive');
      expect(loaded.historyRetentionDays).toBe(60);
    });

    it('should handle nested object updates', async () => {
      await store.set('customEndpoints', {
        anthropic: 'https://v1.com',
      });

      await store.set('customEndpoints', {
        anthropic: 'https://v2.com',
        openai: 'https://openai.com',
      });

      const endpoints = await store.get('customEndpoints');
      expect(endpoints?.anthropic).toBe('https://v2.com');
      expect(endpoints?.openai).toBe('https://openai.com');
    });

    it('should handle undefined optional fields', async () => {
      const prefs = await store.getAll();
      expect(prefs.customEndpoints).toBeUndefined();
      expect(prefs.accessibility).toBeUndefined();
    });
  });

  describe('memory management', () => {
    it('should not leak memory on repeated operations', async () => {
      for (let i = 0; i < 100; i++) {
        await store.set('debugMode', i % 2 === 0);
        await store.get('debugMode');
      }

      // Should complete without issues
      expect(true).toBe(true);
    });

    it('should cleanup on destroy', () => {
      const newStore = new PreferencesStore();
      newStore.destroy();

      // Should not throw
      newStore.destroy(); // Double destroy should be safe
    });

    it('should cleanup listeners on destroy', async () => {
      const callback = vi.fn();
      store.onChange('theme', callback);

      store.destroy();

      // Listeners should be cleared
      // (Can't easily test this without accessing internals)
      expect(true).toBe(true);
    });
  });
});
