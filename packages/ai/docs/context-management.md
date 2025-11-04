# Context Management Guide

## Overview

The Context Management system is the orchestration layer that coordinates context providers, caching, prioritization, and compression to deliver efficient, relevant context to AI models. It's designed to be fast, intelligent, and cost-effective.

**Key Components**:
- **ContextManager**: Central orchestrator for context operations
- **ContextCache**: Intelligent caching with TTL and eviction policies
- **ContextPrioritizer**: Relevance scoring and filtering
- **ContextCompressor**: Token-aware compression and optimization

**Performance Targets**:
- Fresh gathering: <100ms
- Cached retrieval: <10ms
- Cache hit rate: >70%
- Token savings: >30%

---

## ContextManager

The `ContextManager` is the central component that orchestrates all context operations.

### Basic Setup

```typescript
import { ContextManager } from '@clippyjs/ai';
import {
  ViewportContextProvider,
  PerformanceContextProvider,
  FormStateContextProvider,
  NavigationContextProvider,
} from '@clippyjs/ai';

// Create manager with default configuration
const manager = new ContextManager();

// Register providers
manager.registerProvider('viewport', new ViewportContextProvider());
manager.registerProvider('performance', new PerformanceContextProvider());
manager.registerProvider('form', new FormStateContextProvider());
manager.registerProvider('navigation', new NavigationContextProvider());

// Gather context
const result = await manager.gatherContext();

console.log(result);
// {
//   contexts: [ScoredContext[], ...],
//   timestamp: 1699123456789,
//   cached: false,
//   gatherTimeMs: 45,
//   totalTokens: 850,
//   errors: 0
// }
```

### Advanced Configuration

```typescript
const manager = new ContextManager({
  cacheConfig: {
    maxSizeMB: 10,        // Maximum cache size
    ttl: 30000,           // 30 seconds TTL
    evictionPolicy: 'lru', // Least Recently Used
    enableStats: true,    // Enable statistics tracking
    cleanupInterval: 5000, // Cleanup every 5 seconds
  },
  prioritizerConfig: {
    recencyWeight: 1.5,   // Boost recent contexts
    typeWeights: {
      form: 1.5,          // Forms are high priority
      viewport: 1.2,      // Viewport is important
      navigation: 1.1,    // Navigation matters
      performance: 0.8,   // Performance less urgent
    },
    sizePenalty: 0.8,     // Penalty for large contexts
    minScore: 0.5,        // Minimum relevance score
  },
});
```

---

## Gathering Context

### Basic Gathering

```typescript
// Simple gathering
const result = await manager.gatherContext();

// Access scored contexts
result.contexts.forEach((scored) => {
  console.log(`${scored.context.type}: score=${scored.score}`);
  console.log('Data:', scored.context.data);
});
```

### With Caching

```typescript
// First call - gathers fresh context
const result1 = await manager.gatherContext({
  cacheKey: 'user-action-123',
});
console.log(result1.cached); // false
console.log(result1.gatherTimeMs); // ~50ms

// Second call - uses cache
const result2 = await manager.gatherContext({
  cacheKey: 'user-action-123',
});
console.log(result2.cached); // true
console.log(result2.gatherTimeMs); // ~5ms
```

### With Token Budget

```typescript
// Limit context to 2000 tokens
const result = await manager.gatherContext({
  cacheKey: 'budget-test',
  tokenBudget: 2000,
});

console.log(result.totalTokens); // ≤ 2000

// Contexts are prioritized and compressed to fit budget
result.contexts.forEach((scored) => {
  console.log(`${scored.context.type}: score=${scored.score}`);
});
```

### Selective Provider Usage

```typescript
// Use only specific providers
const result = await manager.gatherContext({
  providerIds: ['viewport', 'form'],
});

// Result only includes viewport and form contexts
console.log(result.contexts.length); // 2
```

### With Relevance Filtering

```typescript
// Only include highly relevant contexts
const result = await manager.gatherContext({
  minRelevance: 0.8,
});

// All contexts have score ≥ 0.8
result.contexts.forEach((scored) => {
  console.log(`${scored.context.type}: ${scored.score}`);
  // All scores will be ≥ 0.8
});
```

### Force Refresh

```typescript
// Skip cache and force fresh gathering
const result = await manager.gatherContext({
  cacheKey: 'test',
  forceRefresh: true,
});

console.log(result.cached); // false (even if cached)
```

---

## Caching

### How Caching Works

The cache system uses a multi-layered approach:

1. **Key-based Storage**: Each context gathering can specify a cache key
2. **TTL Expiration**: Entries expire after configured time-to-live
3. **Size Limits**: Cache enforces maximum memory usage
4. **Eviction Policy**: LRU, FIFO, or LFU eviction when full
5. **Smart Invalidation**: Automatic invalidation on DOM/route changes

### Cache Configuration

```typescript
const manager = new ContextManager({
  cacheConfig: {
    // Maximum cache size in megabytes
    maxSizeMB: 10,

    // Time-to-live in milliseconds (default: 30 seconds)
    ttl: 30000,

    // Eviction policy when cache is full
    // 'lru' = Least Recently Used (recommended)
    // 'fifo' = First In First Out
    // 'lfu' = Least Frequently Used
    evictionPolicy: 'lru',

    // Enable statistics tracking
    enableStats: true,

    // Cleanup interval for expired entries (milliseconds)
    cleanupInterval: 5000,
  },
});
```

### Cache Invalidation

#### Manual Invalidation

```typescript
// Invalidate all cache
manager.invalidateCache('manual');

// Invalidate specific key
manager.invalidateCacheKey('user-action-123');

// Invalidate multiple keys
['key1', 'key2', 'key3'].forEach((key) => {
  manager.invalidateCacheKey(key);
});
```

#### Automatic Invalidation

The cache automatically invalidates on certain triggers:

```typescript
// DOM mutations
const observer = new MutationObserver(() => {
  manager.invalidateCache('dom-mutation');
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Route changes
window.addEventListener('popstate', () => {
  manager.invalidateCache('route-change');
});

// User actions
document.addEventListener('click', () => {
  manager.invalidateCache('user-action');
});
```

#### Selective Invalidation

```typescript
// Only invalidate form-related cache entries
manager.invalidateCacheKey('form-*'); // Pattern-based

// Custom invalidation logic
manager.onCacheInvalidation((trigger, key) => {
  if (trigger === 'dom-mutation') {
    // Only invalidate if mutation affected forms
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
      manager.invalidateCacheKey(key);
    }
  }
});
```

### Cache Statistics

```typescript
// Get cache statistics
const stats = manager.getStats();

console.log('Cache Statistics:');
console.log(`Hit Rate: ${(stats.cacheStats.hitRate * 100).toFixed(1)}%`);
console.log(`Hits: ${stats.cacheStats.hits}`);
console.log(`Misses: ${stats.cacheStats.misses}`);
console.log(`Size: ${stats.cacheStats.size} entries`);
console.log(`Memory: ${stats.cacheStats.memoryUsageMB.toFixed(2)}MB`);
```

---

## Prioritization

### Relevance Scoring

Contexts are scored based on multiple factors:

```typescript
const prioritizerConfig = {
  // Recency: Newer contexts score higher
  recencyWeight: 1.5, // 50% boost for contexts <5 seconds old

  // Type: Different context types have different priorities
  typeWeights: {
    form: 1.5,        // Forms often need help
    viewport: 1.2,    // Current view matters
    navigation: 1.1,  // Where user is matters
    dom: 1.0,         // Base priority
    performance: 0.8, // Less urgent for AI
    action: 1.3,      // User actions are important
  },

  // Size: Prefer compact contexts (penalty for large)
  sizePenalty: 0.8, // 20% penalty for contexts >5KB

  // Minimum score for inclusion
  minScore: 0.5,
};

const manager = new ContextManager({ prioritizerConfig });
```

### Custom Scoring

```typescript
import { ContextPrioritizer } from '@clippyjs/ai';

class CustomPrioritizer extends ContextPrioritizer {
  protected calculateScore(
    context: ContextData,
    options?: GatherOptions
  ): number {
    let score = super.calculateScore(context, options);

    // Custom logic: Boost error-related contexts
    if (context.type === 'form' && context.data.validation?.errors) {
      score *= 2.0; // Double score for forms with errors
    }

    // Boost contexts related to current route
    if (context.type === 'navigation' && options?.trigger === 'user-action') {
      score *= 1.5;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }
}

const manager = new ContextManager();
// Replace default prioritizer
manager.setPrioritizer(new CustomPrioritizer(config));
```

### Filtering by Relevance

```typescript
// Only include highly relevant contexts
const highlyRelevant = await manager.gatherContext({
  minRelevance: 0.8,
});

// Include more contexts (lower threshold)
const moreContexts = await manager.gatherContext({
  minRelevance: 0.3,
});

console.log(`High relevance: ${highlyRelevant.contexts.length} contexts`);
console.log(`Lower threshold: ${moreContexts.contexts.length} contexts`);
```

---

## Token Compression

### How Compression Works

The compression system reduces token usage while preserving essential information:

1. **Estimate Tokens**: Calculate approximate token count (1 token ≈ 4 chars)
2. **Check Budget**: Compare against configured token budget
3. **Progressive Compression**:
   - Level 1: Remove redundant data
   - Level 2: Summarize verbose contexts
   - Level 3: Keep only essential data
4. **Track Savings**: Report compression ratio and token savings

### Token Budget Configuration

```typescript
// Strict budget (heavily compressed)
const strict = await manager.gatherContext({
  tokenBudget: 500,
});

// Moderate budget (balanced)
const moderate = await manager.gatherContext({
  tokenBudget: 2000,
});

// Generous budget (minimal compression)
const generous = await manager.gatherContext({
  tokenBudget: 5000,
});

console.log(`Strict: ${strict.totalTokens} tokens`);
console.log(`Moderate: ${moderate.totalTokens} tokens`);
console.log(`Generous: ${generous.totalTokens} tokens`);
```

### Compression Strategies

```typescript
import { ContextCompressor } from '@clippyjs/ai';

// Create compressor with custom strategies
const compressor = new ContextCompressor({
  strategies: [
    // Remove null/undefined values
    'remove-nulls',

    // Remove empty objects/arrays
    'remove-empty',

    // Deduplicate repeated data
    'deduplicate',

    // Summarize long text fields
    'summarize-text',

    // Compress numeric arrays
    'compress-arrays',

    // Remove low-priority fields
    'prioritize-fields',
  ],
});

// Compress context
const compressed = compressor.compress(contexts, {
  tokenBudget: 2000,
  minRelevance: 0.6,
});

console.log('Compression Results:');
console.log(`Original: ${compressed.originalTokens} tokens`);
console.log(`Compressed: ${compressed.compressedTokens} tokens`);
console.log(`Savings: ${(compressed.ratio * 100).toFixed(1)}%`);
```

### Essential vs. Optional Data

```typescript
// Mark fields as essential (never removed)
const compressor = new ContextCompressor({
  essentialFields: [
    'type',
    'timestamp',
    'data.viewport.width',
    'data.viewport.height',
    'data.form.validation.errors',
    'data.navigation.current.pathname',
  ],
});

// These fields will always be preserved, even under extreme compression
```

---

## Configuration Reference

### ContextManagerConfig

```typescript
interface ContextManagerConfig {
  /** Cache configuration */
  cacheConfig?: CacheConfig;

  /** Prioritization configuration */
  prioritizerConfig?: PrioritizerConfig;
}
```

### CacheConfig

```typescript
interface CacheConfig {
  /** Maximum cache size in megabytes (default: 10) */
  maxSizeMB: number;

  /** Time-to-live in milliseconds (default: 30000) */
  ttl: number;

  /** Eviction policy (default: 'lru') */
  evictionPolicy: 'lru' | 'fifo' | 'lfu';

  /** Enable statistics (default: true) */
  enableStats: boolean;

  /** Cleanup interval in milliseconds (default: 5000) */
  cleanupInterval: number;
}
```

### PrioritizerConfig

```typescript
interface PrioritizerConfig {
  /** Weight for recency (default: 1.5) */
  recencyWeight: number;

  /** Weights for different context types */
  typeWeights: Record<string, number>;

  /** Penalty multiplier for large contexts (default: 0.8) */
  sizePenalty: number;

  /** Minimum relevance score for inclusion (default: 0.5) */
  minScore: number;
}
```

### GatherOptions

```typescript
interface GatherOptions {
  /** Cache key for storage/retrieval */
  cacheKey?: string;

  /** Maximum tokens to include */
  tokenBudget?: number;

  /** Trigger type for prioritization */
  trigger?: 'user-action' | 'proactive' | 'manual';

  /** Minimum relevance score (0-1) */
  minRelevance?: number;

  /** Force refresh, skip cache */
  forceRefresh?: boolean;

  /** Only use specific providers */
  providerIds?: string[];
}
```

---

## Events & Monitoring

### Context Events

```typescript
// Subscribe to context gathering events
const subscription = manager.subscribe((result) => {
  console.log('Context gathered:', {
    cached: result.cached,
    contexts: result.contexts.length,
    tokens: result.totalTokens,
    time: result.gatherTimeMs,
  });
});

// Unsubscribe
subscription.unsubscribe();
```

### Cache Events

```typescript
// Subscribe to cache invalidation events
manager.onCacheInvalidation((trigger, key) => {
  console.log(`Cache invalidated: trigger=${trigger}, key=${key}`);
});

// Subscribe to cache statistics
manager.onCacheStats((stats) => {
  console.log('Cache Stats:', {
    hitRate: stats.hitRate,
    size: stats.size,
    memory: stats.memoryUsageMB,
  });
});
```

### Performance Monitoring

```typescript
// Monitor gathering performance
manager.onGather((result) => {
  if (result.gatherTimeMs > 100) {
    console.warn('Slow context gathering:', result.gatherTimeMs + 'ms');
  }

  if (result.errors > 0) {
    console.error(`${result.errors} provider errors`);
  }
});

// Track statistics over time
setInterval(() => {
  const stats = manager.getStats();

  console.log('Manager Statistics:', {
    gatherings: stats.totalGatherings,
    avgTime: stats.avgGatherTimeMs,
    cacheHitRate: stats.cacheStats.hitRate,
    errors: stats.totalErrors,
  });
}, 60000); // Every minute
```

---

## Best Practices

### Caching Strategy

**Use descriptive cache keys**:
```typescript
// ❌ Bad: Generic keys
await manager.gatherContext({ cacheKey: 'data' });

// ✅ Good: Specific, descriptive keys
await manager.gatherContext({ cacheKey: 'checkout-form-page' });
await manager.gatherContext({ cacheKey: 'product-detail-123' });
await manager.gatherContext({ cacheKey: 'user-profile-edit' });
```

**Cache per user action**:
```typescript
function handleUserAction(action: string) {
  const cacheKey = `action-${action}-${Date.now()}`;

  const context = await manager.gatherContext({
    cacheKey,
    trigger: 'user-action',
  });

  // Use context for AI interaction
}
```

**Invalidate on state changes**:
```typescript
// Form submission
form.addEventListener('submit', () => {
  manager.invalidateCache('user-action');
});

// Route navigation
router.on('navigate', () => {
  manager.invalidateCache('route-change');
});

// Data updates
onDataUpdate(() => {
  manager.invalidateCache('manual');
});
```

### Token Optimization

**Set appropriate budgets**:
```typescript
// Small queries (quick responses)
const quickHelp = await manager.gatherContext({
  tokenBudget: 500,
});

// Standard queries (balanced)
const standard = await manager.gatherContext({
  tokenBudget: 2000,
});

// Complex queries (comprehensive)
const complex = await manager.gatherContext({
  tokenBudget: 5000,
});
```

**Use relevance filtering**:
```typescript
// High-relevance only (focused assistance)
const focused = await manager.gatherContext({
  minRelevance: 0.8,
  tokenBudget: 1500,
});

// Comprehensive (broader context)
const comprehensive = await manager.gatherContext({
  minRelevance: 0.5,
  tokenBudget: 3000,
});
```

### Provider Management

**Register providers strategically**:
```typescript
// Always-on providers
manager.registerProvider('viewport', new ViewportContextProvider());
manager.registerProvider('navigation', new NavigationContextProvider());

// Conditional providers
if (document.querySelector('form')) {
  manager.registerProvider('form', new FormStateContextProvider());
}

// Performance-critical only when needed
if (detectPerformanceIssues()) {
  manager.registerProvider('performance', new PerformanceContextProvider());
}
```

**Enable/disable dynamically**:
```typescript
// Disable expensive providers when not needed
if (!userNeedsPerformanceHelp()) {
  manager.disableProvider('performance');
}

// Re-enable when needed
if (userAsksAboutPerformance()) {
  manager.enableProvider('performance');
}
```

---

## Advanced Usage

### Custom Context Pipeline

```typescript
class CustomContextManager extends ContextManager {
  async gatherContext(options?: GatherOptions): Promise<GatheredContext> {
    // Pre-processing
    const enhancedOptions = this.enhanceOptions(options);

    // Gather contexts
    const result = await super.gatherContext(enhancedOptions);

    // Post-processing
    return this.postProcess(result);
  }

  private enhanceOptions(options?: GatherOptions): GatherOptions {
    // Add custom logic
    return {
      ...options,
      // Auto-adjust budget based on context
      tokenBudget: options?.tokenBudget ?? this.calculateOptimalBudget(),
    };
  }

  private postProcess(result: GatheredContext): GatheredContext {
    // Add custom transformations
    return {
      ...result,
      // Add custom metadata
      contexts: result.contexts.map((scored) => ({
        ...scored,
        metadata: this.addMetadata(scored.context),
      })),
    };
  }
}
```

### Context Streaming

```typescript
// Stream contexts as they're gathered
async function* streamContexts(
  manager: ContextManager,
  options?: GatherOptions
) {
  const providerIds = options?.providerIds ?? manager.getProviderIds();

  for (const providerId of providerIds) {
    const result = await manager.gatherContext({
      ...options,
      providerIds: [providerId],
    });

    yield result.contexts[0];
  }
}

// Usage
for await (const context of streamContexts(manager, { tokenBudget: 2000 })) {
  console.log('Received context:', context.context.type);
  // Process incrementally
}
```

### Multi-Manager Coordination

```typescript
// Different managers for different scenarios
const quickManager = new ContextManager({
  cacheConfig: { ttl: 10000 }, // Short TTL
});

const detailedManager = new ContextManager({
  cacheConfig: { ttl: 60000 }, // Long TTL
});

// Quick response
const quick = await quickManager.gatherContext({
  tokenBudget: 500,
  minRelevance: 0.8,
});

// Detailed analysis
const detailed = await detailedManager.gatherContext({
  tokenBudget: 5000,
  minRelevance: 0.5,
});
```

---

## Troubleshooting

### High Cache Miss Rate

**Issue**: Cache hit rate is <50%

**Solutions**:
1. Use consistent cache keys
2. Increase TTL if invalidating too frequently
3. Reduce overly aggressive invalidation
4. Check if `forceRefresh` is being used unnecessarily

```typescript
// Monitor cache performance
const stats = manager.getStats();
if (stats.cacheStats.hitRate < 0.5) {
  console.warn('Low cache hit rate:', stats.cacheStats);

  // Adjust configuration
  manager.updateCacheConfig({
    ttl: 60000, // Increase TTL
  });
}
```

### High Token Usage

**Issue**: Contexts exceed token budget frequently

**Solutions**:
1. Increase minimum relevance threshold
2. Use smaller token budgets
3. Disable verbose providers
4. Implement custom compression

```typescript
// Reduce token usage
const result = await manager.gatherContext({
  tokenBudget: 1000,      // Lower budget
  minRelevance: 0.7,       // Higher threshold
  providerIds: [           // Essential providers only
    'viewport',
    'navigation',
  ],
});
```

### Slow Context Gathering

**Issue**: Gathering takes >100ms consistently

**Solutions**:
1. Profile individual providers
2. Disable slow providers
3. Implement provider caching
4. Use selective provider gathering

```typescript
// Profile providers
const start = performance.now();
const result = await manager.gatherContext({ forceRefresh: true });
const duration = performance.now() - start;

if (duration > 100) {
  // Identify slow providers
  result.contexts.forEach((scored) => {
    console.log(`${scored.context.type}: score=${scored.score}`);
  });

  // Disable slow providers temporarily
  manager.disableProvider('performance');
}
```

---

## Performance Benchmarks

### Target Metrics

| Operation | Target | Acceptable | Poor |
|-----------|--------|------------|------|
| Fresh Gathering | <80ms | <100ms | >100ms |
| Cached Retrieval | <5ms | <10ms | >10ms |
| Cache Hit Rate | >80% | >70% | <70% |
| Token Savings | >40% | >30% | <30% |

### Measuring Performance

```typescript
// Benchmark gathering
async function benchmarkGathering(manager: ContextManager) {
  const iterations = 100;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await manager.gatherContext({
      cacheKey: `bench-${i}`,
      forceRefresh: true,
    });
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times.sort()[Math.floor(iterations * 0.95)];

  console.log('Gathering Performance:');
  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`P95: ${p95.toFixed(2)}ms`);
}
```

---

## Next Steps

- **Read**: [Developer Tools Guide](./developer-tools.md) for debugging and inspection
- **Read**: [Context Provider API](./context-providers.md) for creating custom providers
- **Explore**: Advanced configuration options
- **Optimize**: Tune performance for your specific use case
