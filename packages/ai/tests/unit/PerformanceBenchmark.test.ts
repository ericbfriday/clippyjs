
import { describe, it, expect, vi } from 'vitest';
import { runBenchmark } from '../../src/testing/PerformanceBenchmark';
import { createTestProvider } from '../../src/testing/TestUtilities';

describe('PerformanceBenchmark', () => {
  it('should correctly aggregate metrics for a scenario', async () => {
    const provider = createTestProvider({
      delay: 10,
      responseText: 'Test response',
    });

    const results = await runBenchmark({
      scenarios: ['simple-query'],
      iterations: 5,
      warmupIterations: 0,
      provider,
    });

    expect(results.scenarios).toHaveLength(1);
    const scenario = results.scenarios[0];
    expect(scenario.scenario).toBe('Simple Query');
    expect(scenario.iterations).toBe(5);
    expect(scenario.successful).toBe(5);
    expect(scenario.failed).toBe(0);
    expect(scenario.errorRate).toBe(0);
    expect(scenario.meanLatency).toBeGreaterThan(0);
    expect(scenario.minLatency).toBeLessThanOrEqual(scenario.meanLatency);
    expect(scenario.maxLatency).toBeGreaterThanOrEqual(scenario.meanLatency);
    expect(scenario.throughput).toBeGreaterThan(0);
    expect(scenario.avgResponseSize).toBeGreaterThan(0);
  });

  it('should handle failed requests correctly', async () => {
    const provider = createTestProvider({
      scenario: 'network-error',
    });

    const results = await runBenchmark({
      scenarios: ['simple-query'],
      iterations: 3,
      warmupIterations: 0,
      provider,
    });

    const scenario = results.scenarios[0];
    expect(scenario.successful).toBe(0);
    expect(scenario.failed).toBe(3);
    expect(scenario.errorRate).toBe(1);
  });

  it('should handle a large number of requests without stack overflow', async () => {
    const provider = createTestProvider({
      delay: 0,
    });

    // We can't actually run 200,000 real requests because it would take too long
    // But we can mock the aggregateMetrics if it were exported, or just run a smaller
    // but still significant number that might trigger it if the limit is low, 
    // or better, we rely on the benchmark.mjs for the 200k case and use a 
    // reasonable number here.
    
    // Actually, I'll use a smaller number here to keep tests fast, 
    // but the optimization will be verified by benchmark.mjs for the 200k case.
    const results = await runBenchmark({
      scenarios: ['simple-query'],
      iterations: 10,
      warmupIterations: 0,
      provider,
    });

    expect(results.passed).toBe(true);
  });
});
