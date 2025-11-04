/**
 * Performance benchmarks for ContextManager
 *
 * Target metrics from Sprint 4 Plan:
 * - Fresh gathering: <100ms
 * - Cached retrieval: <10ms
 * - Memory usage: <10MB
 */

import { ContextManager } from '../../src/context/ContextManager';
import type { ContextProvider, ContextData } from '../../src/context/ContextProvider';

// Create realistic mock providers
function createMockProvider(name: string, dataSize: 'small' | 'medium' | 'large'): ContextProvider {
  const data: Record<string, any> = { provider: name };

  // Generate different sized data
  switch (dataSize) {
    case 'small':
      data.items = Array(10).fill({ test: 'data' });
      break;
    case 'medium':
      data.items = Array(100).fill({ test: 'data', nested: { more: 'data' } });
      break;
    case 'large':
      data.items = Array(500).fill({ test: 'x'.repeat(50), nested: { more: 'y'.repeat(50) } });
      break;
  }

  return {
    name,
    enabled: true,
    async gather(): Promise<ContextData> {
      // Simulate real async work (DOM queries, etc)
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));

      return {
        provider: name,
        timestamp: new Date(),
        data,
      };
    },
  };
}

async function runBenchmark() {
  console.log('🚀 ContextManager Performance Benchmark\n');
  console.log('Target Metrics:');
  console.log('  - Fresh gathering: <100ms');
  console.log('  - Cached retrieval: <10ms');
  console.log('  - Memory usage: <10MB\n');

  const manager = new ContextManager({
    cacheConfig: {
      ttl: 30000,
      maxSizeMB: 10,
    },
  });

  // Register realistic providers
  manager.registerProvider(createMockProvider('dom', 'medium'));
  manager.registerProvider(createMockProvider('form', 'small'));
  manager.registerProvider(createMockProvider('viewport', 'small'));
  manager.registerProvider(createMockProvider('performance', 'large'));
  manager.registerProvider(createMockProvider('user-action', 'small'));
  manager.registerProvider(createMockProvider('navigation', 'small'));

  // Test 1: Fresh gathering performance
  console.log('📊 Test 1: Fresh Gathering Performance');
  const freshTimes: number[] = [];

  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const result = await manager.gatherContext({ minRelevance: 0 });
    const duration = performance.now() - start;
    freshTimes.push(duration);

    if (i === 0) {
      console.log(`  Contexts gathered: ${result.contexts.length}`);
      console.log(`  Total tokens: ${result.totalTokens}`);
    }
  }

  const avgFresh = freshTimes.reduce((a, b) => a + b, 0) / freshTimes.length;
  const minFresh = Math.min(...freshTimes);
  const maxFresh = Math.max(...freshTimes);

  console.log(`  Average: ${avgFresh.toFixed(2)}ms`);
  console.log(`  Min: ${minFresh.toFixed(2)}ms`);
  console.log(`  Max: ${maxFresh.toFixed(2)}ms`);
  console.log(`  Target: <100ms`);
  console.log(`  ${avgFresh < 100 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 2: Cached retrieval performance
  console.log('📊 Test 2: Cached Retrieval Performance');

  // Prime the cache
  await manager.gatherContext({ cacheKey: 'perf-test' });

  const cachedTimes: number[] = [];

  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    const result = await manager.gatherContext({ cacheKey: 'perf-test' });
    const duration = performance.now() - start;

    if (result.cached) {
      cachedTimes.push(duration);
    }
  }

  const avgCached = cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length;
  const minCached = Math.min(...cachedTimes);
  const maxCached = Math.max(...cachedTimes);

  console.log(`  Samples: ${cachedTimes.length}`);
  console.log(`  Average: ${avgCached.toFixed(2)}ms`);
  console.log(`  Min: ${minCached.toFixed(2)}ms`);
  console.log(`  Max: ${maxCached.toFixed(2)}ms`);
  console.log(`  Target: <10ms`);
  console.log(`  ${avgCached < 10 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 3: Prioritization performance
  console.log('📊 Test 3: Prioritization & Filtering');

  const prioritizationTimes: number[] = [];

  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await manager.gatherContext({
      minRelevance: 0.6,
      trigger: 'user-action',
      forceRefresh: true,
    });
    const duration = performance.now() - start;
    prioritizationTimes.push(duration);
  }

  const avgPrioritization = prioritizationTimes.reduce((a, b) => a + b, 0) / prioritizationTimes.length;

  console.log(`  Average: ${avgPrioritization.toFixed(2)}ms`);
  console.log(`  ${avgPrioritization < 100 ? '✅ PASS' : '⚠️  SLOW'}\n`);

  // Test 4: Token budget constraint performance
  console.log('📊 Test 4: Token Budget Constraint');

  const budgetTimes: number[] = [];

  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    const result = await manager.gatherContext({
      tokenBudget: 500,
      forceRefresh: true,
      minRelevance: 0,
    });
    const duration = performance.now() - start;
    budgetTimes.push(duration);

    if (i === 0) {
      console.log(`  Contexts within budget: ${result.contexts.length}`);
      console.log(`  Total tokens: ${result.totalTokens} (budget: 500)`);
      console.log(`  Budget respected: ${result.totalTokens <= 500 ? '✅' : '❌'}`);
    }
  }

  const avgBudget = budgetTimes.reduce((a, b) => a + b, 0) / budgetTimes.length;

  console.log(`  Average: ${avgBudget.toFixed(2)}ms`);
  console.log(`  ${avgBudget < 100 ? '✅ PASS' : '⚠️  SLOW'}\n`);

  // Test 5: Memory usage
  console.log('📊 Test 5: Memory Usage & Cache Stats');

  // Fill cache with many entries
  for (let i = 0; i < 50; i++) {
    await manager.gatherContext({ cacheKey: `entry-${i}` });
  }

  const stats = manager.getStats();

  console.log(`  Cache size: ${stats.cacheStats.size} entries`);
  console.log(`  Memory usage: ${stats.cacheStats.memoryUsageMB.toFixed(2)}MB`);
  console.log(`  Cache hit rate: ${(stats.cacheStats.hitRate * 100).toFixed(1)}%`);
  console.log(`  Target: <10MB`);
  console.log(`  ${stats.cacheStats.memoryUsageMB < 10 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 6: Provider error handling
  console.log('📊 Test 6: Error Handling Performance');

  // Add a failing provider
  manager.registerProvider({
    name: 'failing',
    enabled: true,
    async gather(): Promise<ContextData> {
      throw new Error('Provider failed');
    },
  });

  const errorTimes: number[] = [];

  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const result = await manager.gatherContext({ forceRefresh: true, minRelevance: 0 });
    const duration = performance.now() - start;
    errorTimes.push(duration);

    if (i === 0) {
      console.log(`  Contexts gathered: ${result.contexts.length}`);
      console.log(`  Errors handled: ${result.errors}`);
    }
  }

  const avgError = errorTimes.reduce((a, b) => a + b, 0) / errorTimes.length;

  console.log(`  Average: ${avgError.toFixed(2)}ms`);
  console.log(`  ${avgError < 100 ? '✅ PASS' : '⚠️  SLOW'}\n`);

  // Final summary
  console.log('📈 Summary:');
  console.log(`  Total gatherings: ${stats.totalGatherings}`);
  console.log(`  Total errors: ${stats.totalErrors}`);
  console.log(`  Avg gather time: ${stats.avgGatherTimeMs.toFixed(2)}ms`);
  console.log(`  Registered providers: ${stats.providers}`);
  console.log(`  Enabled providers: ${stats.enabledProviders}\n`);

  // Cleanup
  manager.destroy();

  console.log('✨ Benchmark complete!');
}

// Run benchmark
runBenchmark().catch(console.error);

export { runBenchmark };
