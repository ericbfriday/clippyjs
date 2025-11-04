# Persistent Storage Guide

Complete guide to ClippyJS persistent storage system for conversation history, context caching, and user preferences.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [IndexedDB Storage](#indexeddb-storage)
4. [Persistent History Store](#persistent-history-store)
5. [Persistent Context Cache](#persistent-context-cache)
6. [Preferences Store](#preferences-store)
7. [Migration Guide](#migration-guide)
8. [Performance Best Practices](#performance-best-practices)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

## Overview

The ClippyJS persistent storage system provides browser-based persistence for:

- **Conversation History**: Store and retrieve conversation messages across sessions
- **Context Cache**: Two-tier caching (memory + IndexedDB) for context data
- **User Preferences**: Persistent, reactive user settings and preferences

### Key Features

- **Browser Storage**: Uses IndexedDB for reliable, large-capacity storage (50MB+)
- **Performance**: Two-tier caching with <10ms memory access, <100ms IndexedDB access
- **Reliability**: Automatic retry, error handling, and graceful fallback
- **Type Safety**: Full TypeScript support with generic types
- **React Integration**: Works seamlessly with ClippyJS React components

### Browser Compatibility

- Chrome/Edge 24+
- Firefox 16+
- Safari 10+
- Handles Safari's IndexedDB quirks automatically

## Architecture

### Storage Layers

```
┌─────────────────────────────────────┐
│      Application Layer              │
│  (React Components, API Calls)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Storage Abstraction Layer      │
│  - IndexedDBStorage (generic)       │
│  - PersistentHistoryStore           │
│  - PersistentContextCache           │
│  - PreferencesStore                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Browser Storage Layer          │
│  - IndexedDB (primary)              │
│  - localStorage (fallback)          │
│  - Memory (fallback)                │
└─────────────────────────────────────┘
```

### Two-Tier Caching (Context Cache)

```
┌─────────────┐    Fast    ┌──────────────┐
│   Memory    │◄──────────►│ Application  │
│   Tier      │   <10ms    │              │
│  (Hot Data) │            └──────────────┘
└──────┬──────┘
       │ Promotion/
       │ Demotion
       ▼
┌─────────────┐    Slower  ┌──────────────┐
│  IndexedDB  │◄──────────►│  Cold Start  │
│   Tier      │  <100ms    │  Preload     │
│ (Cold Data) │            └──────────────┘
└─────────────┘
```

## IndexedDB Storage

Generic key-value storage abstraction with IndexedDB.

### Basic Usage

```typescript
import { IndexedDBStorage } from '@clippyjs/ai/storage';

// Create storage instance
const storage = new IndexedDBStorage<User>({
  dbName: 'my-app',
  storeName: 'users',
  version: 1,
});

// Initialize (required before use)
await storage.initialize();

// Set value
await storage.set('user1', {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
});

// Get value
const user = await storage.get('user1');
console.log(user?.name); // 'Alice'

// Delete value
await storage.delete('user1');

// Clear all
await storage.clear();

// Get all keys
const keys = await storage.keys();

// Get size
const count = await storage.size();

// Check existence
const exists = await storage.has('user1');

// Get statistics
const stats = await storage.getStats();
console.log(stats.itemCount, stats.estimatedSize);

// Cleanup
storage.destroy();
```

### Configuration Options

```typescript
interface IndexedDBConfig {
  dbName: string;              // Database name
  storeName: string;           // Object store name
  version: number;             // Database version
  enableRetry: boolean;        // Auto-retry on errors (default: true)
  maxRetries: number;          // Max retry attempts (default: 3)
  retryDelay: number;          // Retry delay in ms (default: 100)
  enableQuotaManagement: boolean;  // Quota monitoring (default: true)
  quotaWarningThreshold: number;   // Warning at % usage (default: 0.8)
  migrations?: MigrationFunction[];  // Schema migrations
}
```

### Migrations

Handle schema changes with migrations:

```typescript
const migration: MigrationFunction = (db, transaction, oldVersion, newVersion) => {
  if (oldVersion < 2) {
    // Add index
    const store = transaction.objectStore('users');
    store.createIndex('email', 'email', { unique: true });
  }
};

const storage = new IndexedDBStorage({
  dbName: 'my-app',
  version: 2,
  migrations: [migration],
});
```

### Error Handling

```typescript
import { StorageError, StorageErrorType } from '@clippyjs/ai/storage';

try {
  await storage.set('key', largeValue);
} catch (error) {
  if (error instanceof StorageError) {
    switch (error.type) {
      case StorageErrorType.QUOTA_EXCEEDED:
        // Handle quota exceeded
        console.warn('Storage quota exceeded');
        break;
      case StorageErrorType.DATABASE_LOCKED:
        // Handle database locked
        console.warn('Database locked, retry later');
        break;
      case StorageErrorType.NOT_SUPPORTED:
        // Handle IndexedDB not supported
        console.warn('IndexedDB not supported');
        break;
      default:
        // Handle other errors
        console.error('Storage error:', error.message);
    }
  }
}
```

### Performance Tips

- **Batch operations**: Use Promise.all for multiple operations
- **Use appropriate retry settings**: Balance reliability vs performance
- **Monitor quota**: Check stats regularly to avoid quota issues
- **Type safety**: Use generics for compile-time type checking

```typescript
// Good: Parallel operations
await Promise.all([
  storage.set('key1', value1),
  storage.set('key2', value2),
  storage.set('key3', value3),
]);

// Bad: Sequential operations
await storage.set('key1', value1);
await storage.set('key2', value2);
await storage.set('key3', value3);
```

## Persistent History Store

Store conversation history with retention policies and search.

### Basic Usage

```typescript
import { PersistentHistoryStore } from '@clippyjs/ai/storage';

// Create store
const historyStore = new PersistentHistoryStore({
  maxMessages: 1000,
  maxAgeDays: 30,
  compressAfterDays: 7,
  enableAutoCleanup: true,
});

await historyStore.initialize();

// Save conversation
await historyStore.save({
  agentName: 'Clippy',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello!',
      timestamp: new Date(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi! How can I help?',
      timestamp: new Date(),
    },
  ],
  startedAt: new Date(),
  lastInteraction: new Date(),
});

// Load conversation
const history = await historyStore.load('Clippy');
console.log(history?.messages.length);

// Clear specific agent
await historyStore.clear('Clippy');

// Clear all
await historyStore.clearAll();
```

### Pagination

```typescript
// Get paginated messages
const result = await historyStore.getMessages('Clippy', {
  pageSize: 20,
  page: 0,
  order: 'desc', // or 'asc'
});

console.log(result.items); // Message array
console.log(result.total); // Total count
console.log(result.hasNext); // Has next page
console.log(result.hasPrev); // Has previous page

// Navigate pages
if (result.hasNext) {
  const nextPage = await historyStore.getMessages('Clippy', {
    pageSize: 20,
    page: result.page + 1,
    order: 'desc',
  });
}
```

### Search

```typescript
// Search conversations
const results = await historyStore.search({
  query: 'authentication',
  agentName: 'Clippy', // Optional filter
  startDate: new Date('2024-01-01'), // Optional
  endDate: new Date(), // Optional
  limit: 50, // Max results
});

for (const result of results) {
  console.log('Conversation:', result.conversation.agentName);
  console.log('Matches:', result.matches.length);
  console.log('Relevance:', result.score);
}
```

### Retention Policy

Configure automatic cleanup and compression:

```typescript
const store = new PersistentHistoryStore({
  // Limit message count
  maxMessages: 1000,

  // Remove messages older than 30 days
  maxAgeDays: 30,

  // Compress messages older than 7 days
  compressAfterDays: 7,

  // Enable automatic cleanup
  enableAutoCleanup: true,

  // Cleanup interval (1 hour)
  cleanupInterval: 3600000,
});
```

### Factory Function

Automatically detect IndexedDB support and fallback:

```typescript
import { createHistoryStore } from '@clippyjs/ai/storage';

// Automatically selects best storage
const store = await createHistoryStore({
  maxMessages: 500,
  maxAgeDays: 60,
});

// Will use:
// - PersistentHistoryStore if IndexedDB available
// - MemoryHistoryStore if IndexedDB not available
```

## Persistent Context Cache

Two-tier cache with memory and IndexedDB layers.

### Basic Usage

```typescript
import { PersistentContextCache } from '@clippyjs/ai/storage';

// Create cache
const cache = new PersistentContextCache({
  memoryTierSizeMB: 5,
  persistentTierSizeMB: 50,
  ttl: 30000, // 30 seconds
  promotionThreshold: 3,
  demotionThreshold: 60000, // 1 minute
});

await cache.initialize();

// Set context (starts in memory tier)
await cache.set('dom-context', {
  type: 'dom',
  selector: '#main',
  data: { html: '<div>...</div>' },
  priority: 1,
  timestamp: new Date(),
  metadata: {},
});

// Get context (memory or persistent tier)
const context = await cache.get('dom-context');

// Invalidate
await cache.invalidate('dom-context');

// Clear all
await cache.clear();

// Check existence
const exists = await cache.has('dom-context');

// Get statistics
const stats = cache.getStats();
console.log(stats.hits, stats.misses, stats.hitRate);
```

### Two-Tier Configuration

```typescript
const cache = new PersistentContextCache({
  // Memory tier (fast, limited)
  memoryTierSizeMB: 5,

  // Persistent tier (slower, larger)
  persistentTierSizeMB: 50,

  // Promotion: move from persistent to memory after N accesses
  promotionThreshold: 3,

  // Demotion: move from memory to persistent after N ms idle
  demotionThreshold: 60000,

  // TTL for both tiers
  ttl: 30000,

  // Eviction policy: 'lru' | 'fifo' | 'lfu'
  evictionPolicy: 'lru',
});
```

### Cold Start Optimization

Preload frequently accessed items on initialization:

```typescript
const cache = new PersistentContextCache({
  enableColdStartOptimization: true,
  coldStartPreloadCount: 10, // Preload top 10 items
});

await cache.initialize();
// Top 10 most accessed items are now in memory tier
```

### Invalidation Callbacks

React to cache invalidations:

```typescript
const unsubscribe = cache.onInvalidate((trigger, key) => {
  console.log(`Cache invalidated: ${trigger}`);

  if (key) {
    console.log(`Key: ${key}`);
  }

  // Trigger types:
  // - 'manual': Explicit invalidation
  // - 'ttl-expired': TTL expiration
  // - 'dom-mutation': DOM changed
  // - 'route-change': Navigation
  // - 'user-action': User interaction
});

// Cleanup
unsubscribe();
```

### Performance Monitoring

```typescript
const stats = cache.getStats();

console.log('Cache Performance:');
console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`  Total Hits: ${stats.hits}`);
console.log(`  Total Misses: ${stats.misses}`);
console.log(`  Memory Usage: ${stats.memoryUsageMB.toFixed(2)} MB`);
console.log(`  Items: ${stats.size}`);
console.log(`  Evictions: ${stats.evictions}`);

// Target metrics:
// - Hit rate: >70%
// - Memory usage: <5MB
// - Memory tier access: <10ms
// - Persistent tier access: <100ms
```

## Preferences Store

Persistent, reactive user preferences.

### Basic Usage

```typescript
import { PreferencesStore } from '@clippyjs/ai/storage';

// Create store
const prefs = new PreferencesStore();
await prefs.initialize();

// Get preference
const theme = await prefs.get('theme');
console.log(theme); // 'system' | 'light' | 'dark'

// Set preference
await prefs.set('theme', 'dark');
await prefs.set('enableAnimations', false);
await prefs.set('historyRetentionDays', 60);

// Get all preferences
const allPrefs = await prefs.getAll();
console.log(allPrefs.theme, allPrefs.intrusionLevel);

// Set multiple at once
await prefs.setMany({
  theme: 'dark',
  enableAnimations: false,
  debugMode: true,
});

// Reset to default
await prefs.reset('theme');
await prefs.resetAll();
```

### Available Preferences

```typescript
interface UserPreferences {
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  enableAnimations: boolean;
  enableSounds: boolean;

  // Agent preferences
  intrusionLevel: 'minimal' | 'balanced' | 'proactive';
  preferredProvider: 'anthropic' | 'openai' | 'custom';

  // Storage preferences
  enableHistory: boolean;
  enableCaching: boolean;
  historyRetentionDays: number; // 1-365

  // Development preferences
  debugMode: boolean;

  // Custom endpoints
  customEndpoints?: {
    anthropic?: string;
    openai?: string;
  };

  // Accessibility
  accessibility?: {
    reduceMotion?: boolean;
    highContrast?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    screenReaderEnabled?: boolean;
  };
}
```

### Change Listeners

React to preference changes:

```typescript
// Listen to specific preference
const unsubscribe = prefs.onChange('theme', (event) => {
  console.log('Theme changed:', event.oldValue, '→', event.newValue);
  console.log('At:', event.timestamp);

  // Update UI
  document.body.className = event.newValue;
});

// Listen to all changes
const unsubscribeAll = prefs.onAnyChange((event) => {
  console.log(`${event.key} changed`);
});

// Cleanup
unsubscribe();
unsubscribeAll();
```

### React Integration

```typescript
import { PreferencesStore } from '@clippyjs/ai/storage';
import { useState, useEffect } from 'react';

function usePreference<K extends keyof UserPreferences>(
  store: PreferencesStore,
  key: K
): [UserPreferences[K], (value: UserPreferences[K]) => Promise<void>] {
  const [value, setValue] = useState<UserPreferences[K]>();

  useEffect(() => {
    // Load initial value
    store.get(key).then(setValue);

    // Subscribe to changes
    return store.onChange(key, (event) => {
      setValue(event.newValue);
    });
  }, [store, key]);

  const update = async (newValue: UserPreferences[K]) => {
    await store.set(key, newValue);
  };

  return [value!, update];
}

// Usage in component
function ThemeToggle({ prefs }: { prefs: PreferencesStore }) {
  const [theme, setTheme] = usePreference(prefs, 'theme');

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

### Validation

All preference values are validated:

```typescript
try {
  await prefs.set('theme', 'invalid'); // Throws
} catch (error) {
  if (error instanceof PreferenceValidationError) {
    console.error(`Invalid value for ${error.key}: ${error.value}`);
  }
}

// Valid ranges:
// - theme: 'light' | 'dark' | 'system'
// - intrusionLevel: 'minimal' | 'balanced' | 'proactive'
// - preferredProvider: 'anthropic' | 'openai' | 'custom'
// - historyRetentionDays: 1-365
// - boolean fields: true | false only
```

## Migration Guide

### From Memory-Only to Persistent

#### Step 1: Install Package

```typescript
// Before
import { MemoryContextCache } from '@clippyjs/ai';

// After
import { PersistentContextCache } from '@clippyjs/ai/storage';
```

#### Step 2: Update Initialization

```typescript
// Before
const cache = new MemoryContextCache({
  maxSizeMB: 10,
  ttl: 30000,
});

// After
const cache = new PersistentContextCache({
  memoryTierSizeMB: 5,
  persistentTierSizeMB: 50,
  ttl: 30000,
});
await cache.initialize(); // Required!
```

#### Step 3: Update API Calls (No Changes)

```typescript
// API remains the same
await cache.set('key', context);
const context = await cache.get('key');
```

### From LocalStorage to IndexedDB

#### History Store

```typescript
// Before
import { LocalStorageHistoryStore } from '@clippyjs/ai';
const store = new LocalStorageHistoryStore();

// After
import { PersistentHistoryStore } from '@clippyjs/ai/storage';
const store = new PersistentHistoryStore();
await store.initialize();

// Or use factory for auto-detection
import { createHistoryStore } from '@clippyjs/ai/storage';
const store = await createHistoryStore();
```

#### Preferences

```typescript
// Before: Manual localStorage
const theme = localStorage.getItem('theme');
localStorage.setItem('theme', 'dark');

// After: Preferences Store
import { PreferencesStore } from '@clippyjs/ai/storage';
const prefs = new PreferencesStore();
await prefs.initialize();

const theme = await prefs.get('theme');
await prefs.set('theme', 'dark');
```

### Backward Compatibility

All persistent stores maintain the same interface:

```typescript
// HistoryStore interface (unchanged)
interface HistoryStore {
  save(history: ConversationHistory): Promise<void>;
  load(agentName: AgentName): Promise<ConversationHistory | null>;
  clear(agentName: AgentName): Promise<void>;
}

// ContextCache interface (unchanged)
interface ContextCache {
  get(key: string): Promise<ContextData | null>;
  set(key: string, context: ContextData): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): ContextCacheStats;
}
```

## Performance Best Practices

### 1. Use Two-Tier Caching

```typescript
// Good: Let cache manage tiers automatically
const cache = new PersistentContextCache({
  memoryTierSizeMB: 5,  // Hot data
  persistentTierSizeMB: 50,  // Cold data
  promotionThreshold: 3,  // Auto-promote frequently accessed
});

// Access patterns automatically optimize tier placement
await cache.get('frequently-used-key'); // Fast memory access after promotion
```

### 2. Batch Operations

```typescript
// Good: Parallel operations
await Promise.all([
  storage.set('key1', value1),
  storage.set('key2', value2),
  storage.set('key3', value3),
]);

// Bad: Sequential operations
await storage.set('key1', value1);
await storage.set('key2', value2);
await storage.set('key3', value3);
```

### 3. Monitor Quota Usage

```typescript
const stats = await storage.getStats();

if (stats.quotaUsage && stats.quotaUsage > 0.8) {
  console.warn('Storage quota at 80%, consider cleanup');

  // Clean up old data
  await historyStore.resetAll();
  await cache.clear();
}
```

### 4. Use Appropriate TTLs

```typescript
// Short TTL for dynamic data
const dynamicCache = new PersistentContextCache({
  ttl: 30000, // 30 seconds
});

// Long TTL for static data
const staticCache = new PersistentContextCache({
  ttl: 3600000, // 1 hour
});
```

### 5. Enable Cold Start Optimization

```typescript
const cache = new PersistentContextCache({
  enableColdStartOptimization: true,
  coldStartPreloadCount: 10,
});

// First access after reload is fast
await cache.initialize(); // Preloads top 10 items
const context = await cache.get('frequently-used'); // Fast!
```

### 6. Use Retention Policies

```typescript
const store = new PersistentHistoryStore({
  maxMessages: 1000, // Limit memory usage
  maxAgeDays: 30, // Remove old data
  compressAfterDays: 7, // Compress old data
  enableAutoCleanup: true, // Automatic cleanup
});
```

## Troubleshooting

### IndexedDB Not Available

**Problem**: IndexedDB not supported or disabled

**Solutions**:
```typescript
import { isIndexedDBSupported } from '@clippyjs/ai/storage';

if (!isIndexedDBSupported()) {
  // Use fallback
  console.warn('IndexedDB not available, using memory storage');

  // Option 1: Memory-only
  const cache = new MemoryContextCache();

  // Option 2: localStorage fallback
  const prefs = new PreferencesStore(); // Auto-fallback to localStorage
}
```

### Quota Exceeded

**Problem**: Storage quota exceeded

**Solutions**:
```typescript
// 1. Monitor quota
const stats = await storage.getStats();
if (stats.quotaUsage > 0.9) {
  // Clear old data
  await historyStore.clear('OldAgent');
}

// 2. Adjust retention policy
const store = new PersistentHistoryStore({
  maxMessages: 500, // Reduce from 1000
  maxAgeDays: 14, // Reduce from 30
});

// 3. Manual cleanup
await cache.clear();
await historyStore.clearAll();
```

### Database Locked

**Problem**: Database locked by another tab

**Solutions**:
```typescript
// 1. Enable retry (automatic)
const storage = new IndexedDBStorage({
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 100,
});

// 2. Handle error
try {
  await storage.set('key', value);
} catch (error) {
  if (error instanceof StorageError && error.type === StorageErrorType.DATABASE_LOCKED) {
    // Ask user to close other tabs
    alert('Please close other tabs');
  }
}
```

### Slow Performance

**Problem**: Operations slower than expected

**Solutions**:
```typescript
// 1. Check tier placement (context cache)
const stats = cache.getStats();
console.log('Memory hits:', stats.memoryHits);
console.log('Persistent hits:', stats.persistentHits);

// Adjust promotion threshold
const cache = new PersistentContextCache({
  promotionThreshold: 2, // Promote sooner (was 3)
});

// 2. Reduce TTL cleanup frequency
const cache = new PersistentContextCache({
  cleanupInterval: 60000, // 1 minute (was 5 seconds)
});

// 3. Batch operations
await Promise.all([
  storage.set('k1', v1),
  storage.set('k2', v2),
]);
```

### Memory Leaks

**Problem**: Memory usage grows over time

**Solutions**:
```typescript
// 1. Call destroy() when done
useEffect(() => {
  const store = new PersistentHistoryStore();
  store.initialize();

  return () => {
    store.destroy(); // Cleanup
  };
}, []);

// 2. Unsubscribe from listeners
const unsubscribe = prefs.onChange('theme', handler);
// Later:
unsubscribe();

// 3. Clear cache periodically
setInterval(() => {
  cache.clear();
}, 3600000); // Every hour
```

### Safari Issues

**Problem**: IndexedDB quirks in Safari

**Solutions**:
- Storage layer handles Safari quirks automatically
- Test in Safari if issues persist
- Use factory functions for auto-fallback

```typescript
// Auto-detects Safari issues
const store = await createHistoryStore();
const prefs = await createPreferencesStore();
```

## API Reference

### IndexedDBStorage

Generic key-value storage.

```typescript
class IndexedDBStorage<T = any> implements PersistentStorage<T> {
  constructor(config: Partial<IndexedDBConfig>);

  initialize(): Promise<void>;
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
  has(key: string): Promise<boolean>;
  getStats(): Promise<StorageStats>;
  destroy(): void;
}

function isIndexedDBSupported(): boolean;
```

### PersistentHistoryStore

Conversation history storage.

```typescript
class PersistentHistoryStore implements HistoryStore {
  constructor(
    policy?: Partial<RetentionPolicy>,
    storageConfig?: Partial<IndexedDBConfig>
  );

  initialize(): Promise<void>;
  save(history: ConversationHistory): Promise<void>;
  load(agentName: AgentName): Promise<ConversationHistory | null>;
  clear(agentName: AgentName): Promise<void>;
  clearAll(): Promise<void>;
  getMessages(
    agentName: AgentName,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ConversationMessage>>;
  search(options: SearchOptions): Promise<SearchResult[]>;
  getStats(): Promise<StorageStats>;
  destroy(): void;
}

function createHistoryStore(
  policy?: Partial<RetentionPolicy>,
  storageConfig?: Partial<IndexedDBConfig>
): Promise<HistoryStore>;
```

### PersistentContextCache

Two-tier context cache.

```typescript
class PersistentContextCache implements ContextCache {
  constructor(config?: Partial<TwoTierCacheConfig>);

  initialize(): Promise<void>;
  get(key: string): Promise<ContextData | null>;
  set(key: string, context: ContextData): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): ContextCacheStats;
  onInvalidate(callback: InvalidationCallback): () => void;
  destroy(): void;
}
```

### PreferencesStore

User preferences storage.

```typescript
class PreferencesStore {
  constructor(storageConfig?: Partial<IndexedDBConfig>);

  initialize(): Promise<void>;
  get<K extends keyof UserPreferences>(key: K): Promise<UserPreferences[K]>;
  set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): Promise<void>;
  getAll(): Promise<UserPreferences>;
  setMany(preferences: Partial<UserPreferences>): Promise<void>;
  reset<K extends keyof UserPreferences>(key: K): Promise<void>;
  resetAll(): Promise<void>;
  onChange<K extends keyof UserPreferences>(
    key: K,
    listener: PreferenceChangeListener<K>
  ): () => void;
  onAnyChange(listener: PreferenceChangeListener): () => void;
  destroy(): void;
}

function createPreferencesStore(
  config?: Partial<IndexedDBConfig>
): Promise<PreferencesStore>;
```

---

## Additional Resources

- [ClippyJS Documentation](https://github.com/yourusername/clippyjs)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Storage Quota](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
- [Browser Compatibility](https://caniuse.com/indexeddb)

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/clippyjs/issues
- Documentation: https://clippyjs.dev/docs/storage

---

**Version**: 0.7.0
**Last Updated**: January 2025
