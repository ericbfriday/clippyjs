/**
 * User Preferences Storage
 *
 * Persistent storage for user settings with:
 * - Type-safe preference access
 * - Default values and validation
 * - Reactive updates (emit events on changes)
 * - IndexedDB persistence
 * - Memory caching for performance
 *
 * Performance targets:
 * - Read operation: <5ms (cached)
 * - Write operation: <50ms (p95)
 */

import { IndexedDBStorage, isIndexedDBSupported, type IndexedDBConfig } from './IndexedDBStorage';

/**
 * User preferences structure
 */
export interface UserPreferences {
  /**
   * UI theme preference
   * @default 'system'
   */
  theme: 'light' | 'dark' | 'system';

  /**
   * Agent intrusion level
   * @default 'balanced'
   */
  intrusionLevel: 'minimal' | 'balanced' | 'proactive';

  /**
   * Preferred AI provider
   * @default 'anthropic'
   */
  preferredProvider: 'anthropic' | 'openai' | 'custom';

  /**
   * Enable animations
   * @default true
   */
  enableAnimations: boolean;

  /**
   * Enable sound effects
   * @default true
   */
  enableSounds: boolean;

  /**
   * Enable conversation history
   * @default true
   */
  enableHistory: boolean;

  /**
   * Enable context caching
   * @default true
   */
  enableCaching: boolean;

  /**
   * Conversation history retention days
   * @default 30
   */
  historyRetentionDays: number;

  /**
   * Debug mode
   * @default false
   */
  debugMode: boolean;

  /**
   * Custom API endpoints
   */
  customEndpoints?: {
    anthropic?: string;
    openai?: string;
  };

  /**
   * Accessibility settings
   */
  accessibility?: {
    reduceMotion?: boolean;
    highContrast?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    screenReaderEnabled?: boolean;
  };
}

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  intrusionLevel: 'balanced',
  preferredProvider: 'anthropic',
  enableAnimations: true,
  enableSounds: true,
  enableHistory: true,
  enableCaching: true,
  historyRetentionDays: 30,
  debugMode: false,
};

/**
 * Preference change event
 */
export interface PreferenceChangeEvent<K extends keyof UserPreferences = keyof UserPreferences> {
  key: K;
  oldValue: UserPreferences[K];
  newValue: UserPreferences[K];
  timestamp: Date;
}

/**
 * Preference change listener
 */
export type PreferenceChangeListener<K extends keyof UserPreferences = keyof UserPreferences> = (
  event: PreferenceChangeEvent<K>
) => void;

/**
 * Validation error
 */
export class PreferenceValidationError extends Error {
  constructor(
    message: string,
    public key: keyof UserPreferences,
    public value: any
  ) {
    super(message);
    this.name = 'PreferenceValidationError';
  }
}

/**
 * Preferences store with persistence and reactivity
 *
 * Features:
 * - Type-safe preference access
 * - IndexedDB persistence
 * - Memory caching for performance
 * - Reactive updates via event listeners
 * - Validation on set
 * - Default values
 * - Graceful fallback to localStorage
 *
 * @example
 * ```typescript
 * const store = new PreferencesStore();
 * await store.initialize();
 *
 * // Get preference
 * const theme = await store.get('theme');
 *
 * // Set preference
 * await store.set('theme', 'dark');
 *
 * // Listen to changes
 * store.onChange('theme', (event) => {
 *   console.log('Theme changed:', event.newValue);
 * });
 *
 * // Get all preferences
 * const prefs = await store.getAll();
 * ```
 */
export class PreferencesStore {
  private storage: IndexedDBStorage<any> | null = null;
  private cache: Partial<UserPreferences> = {};
  private listeners = new Map<keyof UserPreferences, Set<PreferenceChangeListener<any>>>();
  private globalListeners = new Set<PreferenceChangeListener>();
  private initialized = false;
  private destroyed = false;
  private useLocalStorage = false;

  constructor(storageConfig: Partial<IndexedDBConfig> = {}) {
    if (isIndexedDBSupported()) {
      this.storage = new IndexedDBStorage({
        dbName: 'clippy-preferences',
        storeName: 'preferences',
        version: 1,
        ...storageConfig,
      });
    } else {
      this.useLocalStorage = true;
      console.warn('IndexedDB not supported. Using localStorage for preferences.');
    }
  }

  /**
   * Initialize store
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    if (this.storage) {
      await this.storage.initialize();
    }

    // Load all preferences into cache
    await this.loadCache();

    this.initialized = true;
  }

  /**
   * Get preference value
   */
  async get<K extends keyof UserPreferences>(key: K): Promise<UserPreferences[K]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    // Return cached value if available
    if (key in this.cache) {
      return this.cache[key] as UserPreferences[K];
    }

    // Load from storage
    const value = await this.loadPreference(key);

    // Cache the value
    this.cache[key] = value;

    return value;
  }

  /**
   * Set preference value
   */
  async set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    // Validate value
    this.validate(key, value);

    // Get old value for event
    const oldValue = this.cache[key];

    // Update cache
    this.cache[key] = value;

    // Persist to storage
    await this.savePreference(key, value);

    // Emit change event
    this.emitChange({
      key,
      oldValue: oldValue as UserPreferences[K],
      newValue: value,
      timestamp: new Date(),
    });
  }

  /**
   * Get all preferences
   */
  async getAll(): Promise<UserPreferences> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    // Return cached preferences merged with defaults
    return { ...DEFAULT_PREFERENCES, ...this.cache };
  }

  /**
   * Set multiple preferences at once
   */
  async setMany(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    // Validate all values first
    for (const [key, value] of Object.entries(preferences)) {
      this.validate(key as keyof UserPreferences, value);
    }

    // Update all preferences
    for (const [key, value] of Object.entries(preferences)) {
      await this.set(key as keyof UserPreferences, value);
    }
  }

  /**
   * Reset preference to default
   */
  async reset<K extends keyof UserPreferences>(key: K): Promise<void> {
    const defaultValue = DEFAULT_PREFERENCES[key];
    await this.set(key, defaultValue);
  }

  /**
   * Reset all preferences to defaults
   */
  async resetAll(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    // Clear cache
    this.cache = {};

    // Clear storage
    if (this.storage) {
      await this.storage.clear();
    } else if (this.useLocalStorage) {
      this.clearLocalStorage();
    }

    // Emit change events for all keys
    for (const key of Object.keys(DEFAULT_PREFERENCES) as Array<keyof UserPreferences>) {
      this.emitChange({
        key,
        oldValue: (this.cache[key] ?? DEFAULT_PREFERENCES[key]) as any,
        newValue: DEFAULT_PREFERENCES[key] as any,
        timestamp: new Date(),
      });
    }

    // Load defaults into cache
    this.cache = { ...DEFAULT_PREFERENCES };
  }

  /**
   * Listen to preference changes
   */
  onChange<K extends keyof UserPreferences>(
    key: K,
    listener: PreferenceChangeListener<K>
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    this.listeners.get(key)!.add(listener);

    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  /**
   * Listen to all preference changes
   */
  onAnyChange(listener: PreferenceChangeListener): () => void {
    this.globalListeners.add(listener);

    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Destroy store and cleanup
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.cache = {};
    this.listeners.clear();
    this.globalListeners.clear();

    if (this.storage) {
      this.storage.destroy();
    }
  }

  /**
   * Load all preferences into cache
   */
  private async loadCache(): Promise<void> {
    const keys = Object.keys(DEFAULT_PREFERENCES) as Array<keyof UserPreferences>;

    for (const key of keys) {
      try {
        const value = await this.loadPreference(key);
        this.cache[key] = value;
      } catch (error) {
        console.error(`Failed to load preference: ${String(key)}`, error);
        this.cache[key] = DEFAULT_PREFERENCES[key];
      }
    }
  }

  /**
   * Load single preference from storage
   */
  private async loadPreference<K extends keyof UserPreferences>(
    key: K
  ): Promise<UserPreferences[K]> {
    if (this.storage) {
      const value = await this.storage.get(key);
      return value !== null ? value : DEFAULT_PREFERENCES[key];
    } else if (this.useLocalStorage) {
      return this.loadFromLocalStorage(key);
    }

    return DEFAULT_PREFERENCES[key];
  }

  /**
   * Save single preference to storage
   */
  private async savePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> {
    if (this.storage) {
      await this.storage.set(key, value);
    } else if (this.useLocalStorage) {
      this.saveToLocalStorage(key, value);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromLocalStorage<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    try {
      const item = localStorage.getItem(`clippy-pref:${String(key)}`);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.error(`Failed to load from localStorage: ${String(key)}`, error);
    }

    return DEFAULT_PREFERENCES[key];
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void {
    try {
      localStorage.setItem(`clippy-pref:${String(key)}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to localStorage: ${String(key)}`, error);
    }
  }

  /**
   * Clear localStorage
   */
  private clearLocalStorage(): void {
    const keys = Object.keys(DEFAULT_PREFERENCES);
    for (const key of keys) {
      localStorage.removeItem(`clippy-pref:${key}`);
    }
  }

  /**
   * Validate preference value
   */
  private validate<K extends keyof UserPreferences>(key: K, value: any): void {
    switch (key) {
      case 'theme':
        if (!['light', 'dark', 'system'].includes(value)) {
          throw new PreferenceValidationError(
            `Invalid theme: ${value}. Must be 'light', 'dark', or 'system'.`,
            key,
            value
          );
        }
        break;

      case 'intrusionLevel':
        if (!['minimal', 'balanced', 'proactive'].includes(value)) {
          throw new PreferenceValidationError(
            `Invalid intrusion level: ${value}. Must be 'minimal', 'balanced', or 'proactive'.`,
            key,
            value
          );
        }
        break;

      case 'preferredProvider':
        if (!['anthropic', 'openai', 'custom'].includes(value)) {
          throw new PreferenceValidationError(
            `Invalid provider: ${value}. Must be 'anthropic', 'openai', or 'custom'.`,
            key,
            value
          );
        }
        break;

      case 'historyRetentionDays':
        if (typeof value !== 'number' || value < 1 || value > 365) {
          throw new PreferenceValidationError(
            `Invalid retention days: ${value}. Must be between 1 and 365.`,
            key,
            value
          );
        }
        break;

      case 'enableAnimations':
      case 'enableSounds':
      case 'enableHistory':
      case 'enableCaching':
      case 'debugMode':
        if (typeof value !== 'boolean') {
          throw new PreferenceValidationError(
            `Invalid boolean value for ${String(key)}: ${value}`,
            key,
            value
          );
        }
        break;
    }
  }

  /**
   * Emit change event
   */
  private emitChange<K extends keyof UserPreferences>(event: PreferenceChangeEvent<K>): void {
    // Emit to key-specific listeners
    const keyListeners = this.listeners.get(event.key);
    if (keyListeners) {
      const listeners = Array.from(keyListeners);
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in preference change listener:', error);
        }
      }
    }

    // Emit to global listeners
    const globalListeners = Array.from(this.globalListeners);
    for (const listener of globalListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in global preference change listener:', error);
      }
    }
  }
}

/**
 * Create preferences store with feature detection
 */
export async function createPreferencesStore(
  config?: Partial<IndexedDBConfig>
): Promise<PreferencesStore> {
  const store = new PreferencesStore(config);
  await store.initialize();
  return store;
}
