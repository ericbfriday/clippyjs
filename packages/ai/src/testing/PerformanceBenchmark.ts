/**
 * Performance benchmarking for AI operations
 *
 * Provides automated performance testing with metrics collection,
 * latency measurements, throughput assertions, and detailed reporting.
 */

import type { AIProvider, Message, ChatOptions } from '../providers/AIProvider';

/**
 * Benchmark scenario type
 */
export type BenchmarkScenario =
  | 'simple-query'
  | 'long-conversation'
  | 'context-heavy'
  | 'streaming'
  | 'tool-use'
  | 'large-response'
  | 'concurrent-requests';

/**
 * Performance assertions
 */
export interface PerformanceAssertions {
  /** Maximum p95 latency in milliseconds */
  p95Latency?: number;
  /** Maximum p99 latency in milliseconds */
  p99Latency?: number;
  /** Minimum throughput in requests per second */
  throughput?: number;
  /** Maximum memory usage in MB */
  maxMemoryMB?: number;
  /** Maximum error rate (0-1) */
  maxErrorRate?: number;
}

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  /** Scenarios to benchmark */
  scenarios: BenchmarkScenario[] | string[];
  /** Number of iterations per scenario */
  iterations: number;
  /** Performance assertions */
  assertPerformance?: PerformanceAssertions;
  /** Warm-up iterations (not counted in results) */
  warmupIterations?: number;
  /** Provider to benchmark */
  provider?: AIProvider;
  /** Concurrent requests for throughput testing */
  concurrency?: number;
  /** Custom scenario definitions */
  customScenarios?: Record<string, ScenarioDefinition>;
  /** Callback for progress updates */
  onProgress?: (progress: BenchmarkProgress) => void;
  /** Callback for detailed results */
  onComplete?: (results: BenchmarkResults) => void;
}

/**
 * Scenario definition
 */
export interface ScenarioDefinition {
  /** Scenario name */
  name: string;
  /** Scenario description */
  description?: string;
  /** Messages to send */
  messages: Message[];
  /** Chat options */
  options?: ChatOptions;
  /** Whether to test streaming */
  useStreaming?: boolean;
  /** Expected approximate response time (for comparison) */
  expectedLatency?: number;
}

/**
 * Benchmark progress update
 */
export interface BenchmarkProgress {
  /** Current scenario index */
  scenarioIndex: number;
  /** Total scenarios */
  totalScenarios: number;
  /** Current iteration */
  iteration: number;
  /** Total iterations */
  totalIterations: number;
  /** Current scenario name */
  scenarioName: string;
  /** Elapsed time in ms */
  elapsedMs: number;
}

/**
 * Performance metrics for a single request
 */
export interface RequestMetrics {
  /** Request duration in ms */
  latencyMs: number;
  /** Time to first byte (streaming) */
  ttfbMs?: number;
  /** Request timestamp */
  timestamp: number;
  /** Whether request succeeded */
  success: boolean;
  /** Error if failed */
  error?: string;
  /** Memory usage at time of request (if available) */
  memoryMB?: number;
  /** Response size in characters */
  responseSize?: number;
}

/**
 * Aggregated metrics for a scenario
 */
export interface ScenarioMetrics {
  /** Scenario name */
  scenario: string;
  /** Total iterations */
  iterations: number;
  /** Successful iterations */
  successful: number;
  /** Failed iterations */
  failed: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Minimum latency in ms */
  minLatency: number;
  /** Maximum latency in ms */
  maxLatency: number;
  /** Mean latency in ms */
  meanLatency: number;
  /** Median latency in ms */
  medianLatency: number;
  /** P95 latency in ms */
  p95Latency: number;
  /** P99 latency in ms */
  p99Latency: number;
  /** Standard deviation */
  stdDeviation: number;
  /** Throughput in requests per second */
  throughput: number;
  /** Total time in ms */
  totalTimeMs: number;
  /** Peak memory usage in MB */
  peakMemoryMB?: number;
  /** Average response size */
  avgResponseSize?: number;
  /** Individual request metrics */
  requests: RequestMetrics[];
}

/**
 * Complete benchmark results
 */
export interface BenchmarkResults {
  /** Benchmark configuration */
  config: BenchmarkConfig;
  /** Metrics per scenario */
  scenarios: ScenarioMetrics[];
  /** Overall aggregated metrics */
  overall: Omit<ScenarioMetrics, 'scenario'>;
  /** Performance assertions */
  assertions?: PerformanceAssertions;
  /** Assertion results */
  assertionResults?: AssertionResult[];
  /** Whether all assertions passed */
  passed: boolean;
  /** Total benchmark time in ms */
  totalTimeMs: number;
  /** Benchmark start timestamp */
  startTime: number;
  /** Benchmark end timestamp */
  endTime: number;
}

/**
 * Assertion result
 */
export interface AssertionResult {
  /** Assertion type */
  type: keyof PerformanceAssertions;
  /** Expected value */
  expected: number;
  /** Actual value */
  actual: number;
  /** Whether assertion passed */
  passed: boolean;
  /** Failure message if failed */
  message?: string;
}

/**
 * Default scenario definitions
 */
const DEFAULT_SCENARIOS: Record<BenchmarkScenario, ScenarioDefinition> = {
  'simple-query': {
    name: 'Simple Query',
    description: 'Single message with short response',
    messages: [
      {
        role: 'user',
        content: 'Hello, how are you?',
      },
    ],
    useStreaming: false,
    expectedLatency: 500,
  },

  'long-conversation': {
    name: 'Long Conversation',
    description: 'Multi-turn conversation with context',
    messages: [
      { role: 'user', content: 'Tell me about artificial intelligence' },
      {
        role: 'assistant',
        content: 'Artificial intelligence (AI) is the simulation of human intelligence processes by machines.',
      },
      { role: 'user', content: 'What are the main types of AI?' },
      {
        role: 'assistant',
        content: 'The main types are narrow AI, general AI, and super AI.',
      },
      { role: 'user', content: 'Can you explain narrow AI in detail?' },
    ],
    useStreaming: false,
    expectedLatency: 1500,
  },

  'context-heavy': {
    name: 'Context Heavy',
    description: 'Large context window with multiple messages',
    messages: Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `This is message ${i + 1}. `.repeat(50), // ~50 words per message
    })),
    useStreaming: false,
    expectedLatency: 2500,
  },

  streaming: {
    name: 'Streaming Response',
    description: 'Streaming message with token-by-token delivery',
    messages: [
      {
        role: 'user',
        content: 'Write a paragraph about the benefits of streaming responses in AI applications.',
      },
    ],
    useStreaming: true,
    expectedLatency: 1000,
  },

  'tool-use': {
    name: 'Tool Use',
    description: 'Request requiring tool invocation',
    messages: [
      {
        role: 'user',
        content: 'Search for information about TypeScript',
      },
    ],
    options: {
      tools: [
        {
          name: 'web_search',
          description: 'Search the web for information',
          input_schema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
        },
      ],
    },
    useStreaming: false,
    expectedLatency: 800,
  },

  'large-response': {
    name: 'Large Response',
    description: 'Request expecting large response',
    messages: [
      {
        role: 'user',
        content:
          'Provide a comprehensive guide to TypeScript generics with multiple examples and use cases.',
      },
    ],
    options: {
      maxTokens: 2000,
    },
    useStreaming: false,
    expectedLatency: 3000,
  },

  'concurrent-requests': {
    name: 'Concurrent Requests',
    description: 'Multiple simultaneous requests',
    messages: [
      {
        role: 'user',
        content: 'Quick response test',
      },
    ],
    useStreaming: false,
    expectedLatency: 500,
  },
};

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Get memory usage in MB (if available)
 */
function getMemoryUsageMB(): number | undefined {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
  }
  return undefined;
}

/**
 * Run a single benchmark request
 */
async function runRequest(
  provider: AIProvider,
  scenario: ScenarioDefinition
): Promise<RequestMetrics> {
  const startTime = performance.now();
  const startMemory = getMemoryUsageMB();
  let ttfbMs: number | undefined;
  let responseSize = 0;

  try {
    // AIProvider.chat() always returns AsyncIterableIterator<StreamChunk>
    let firstChunk = true;
    for await (const chunk of provider.chat(scenario.messages, scenario.options)) {
      if (firstChunk) {
        ttfbMs = performance.now() - startTime;
        firstChunk = false;
      }
      if (chunk.type === 'content_delta' && chunk.delta) {
        responseSize += chunk.delta.length;
      }
    }

    const endTime = performance.now();
    const endMemory = getMemoryUsageMB();

    return {
      latencyMs: endTime - startTime,
      ttfbMs,
      timestamp: Date.now(),
      success: true,
      memoryMB: endMemory,
      responseSize,
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      latencyMs: endTime - startTime,
      ttfbMs,
      timestamp: Date.now(),
      success: false,
      error: error instanceof Error ? error.message : String(error),
      memoryMB: startMemory,
    };
  }
}

/**
 * Aggregate metrics from request results
 */
function aggregateMetrics(
  scenarioName: string,
  requests: RequestMetrics[],
  totalTimeMs: number
): ScenarioMetrics {
  const successful = requests.filter((r) => r.success);
  const failed = requests.filter((r) => !r.success);
  const latencies = successful.map((r) => r.latencyMs).sort((a, b) => a - b);

  const meanLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  return {
    scenario: scenarioName,
    iterations: requests.length,
    successful: successful.length,
    failed: failed.length,
    errorRate: requests.length > 0 ? failed.length / requests.length : 0,
    minLatency: latencies.length > 0 ? latencies[0] : 0,
    maxLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
    meanLatency,
    medianLatency: percentile(latencies, 50),
    p95Latency: percentile(latencies, 95),
    p99Latency: percentile(latencies, 99),
    stdDeviation: standardDeviation(latencies, meanLatency),
    throughput: totalTimeMs > 0 ? (successful.length / totalTimeMs) * 1000 : 0,
    totalTimeMs,
    peakMemoryMB: Math.max(...requests.map((r) => r.memoryMB || 0).filter((m) => m > 0)),
    avgResponseSize:
      successful.length > 0
        ? successful.reduce((sum, r) => sum + (r.responseSize || 0), 0) / successful.length
        : 0,
    requests,
  };
}

/**
 * Check performance assertions
 */
function checkAssertions(
  results: BenchmarkResults,
  assertions: PerformanceAssertions
): AssertionResult[] {
  const assertionResults: AssertionResult[] = [];

  if (assertions.p95Latency !== undefined) {
    const actual = results.overall.p95Latency;
    const passed = actual <= assertions.p95Latency;
    assertionResults.push({
      type: 'p95Latency',
      expected: assertions.p95Latency,
      actual,
      passed,
      message: passed
        ? undefined
        : `P95 latency ${actual.toFixed(2)}ms exceeds limit of ${assertions.p95Latency}ms`,
    });
  }

  if (assertions.p99Latency !== undefined) {
    const actual = results.overall.p99Latency;
    const passed = actual <= assertions.p99Latency;
    assertionResults.push({
      type: 'p99Latency',
      expected: assertions.p99Latency,
      actual,
      passed,
      message: passed
        ? undefined
        : `P99 latency ${actual.toFixed(2)}ms exceeds limit of ${assertions.p99Latency}ms`,
    });
  }

  if (assertions.throughput !== undefined) {
    const actual = results.overall.throughput;
    const passed = actual >= assertions.throughput;
    assertionResults.push({
      type: 'throughput',
      expected: assertions.throughput,
      actual,
      passed,
      message: passed
        ? undefined
        : `Throughput ${actual.toFixed(2)} req/s is below minimum of ${assertions.throughput} req/s`,
    });
  }

  if (assertions.maxMemoryMB !== undefined && results.overall.peakMemoryMB) {
    const actual = results.overall.peakMemoryMB;
    const passed = actual <= assertions.maxMemoryMB;
    assertionResults.push({
      type: 'maxMemoryMB',
      expected: assertions.maxMemoryMB,
      actual,
      passed,
      message: passed
        ? undefined
        : `Peak memory ${actual.toFixed(2)}MB exceeds limit of ${assertions.maxMemoryMB}MB`,
    });
  }

  if (assertions.maxErrorRate !== undefined) {
    const actual = results.overall.errorRate;
    const passed = actual <= assertions.maxErrorRate;
    assertionResults.push({
      type: 'maxErrorRate',
      expected: assertions.maxErrorRate,
      actual,
      passed,
      message: passed
        ? undefined
        : `Error rate ${(actual * 100).toFixed(2)}% exceeds limit of ${(assertions.maxErrorRate * 100).toFixed(2)}%`,
    });
  }

  return assertionResults;
}

/**
 * Run performance benchmark
 *
 * Executes performance testing across multiple scenarios with configurable
 * iterations and assertions. Provides detailed metrics and reporting.
 *
 * Usage:
 * ```ts
 * const results = await runBenchmark({
 *   scenarios: ['simple-query', 'long-conversation'],
 *   iterations: 100,
 *   provider: myProvider,
 *   assertPerformance: {
 *     p95Latency: 2000,
 *     throughput: 10,
 *   },
 * });
 *
 * if (!results.passed) {
 *   console.error('Performance benchmarks failed');
 *   results.assertionResults?.forEach(result => {
 *     if (!result.passed) {
 *       console.error(result.message);
 *     }
 *   });
 * }
 * ```
 */
export async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResults> {
  const {
    scenarios,
    iterations,
    warmupIterations = 5,
    provider,
    concurrency = 1,
    customScenarios = {},
    assertPerformance,
    onProgress,
    onComplete,
  } = config;

  if (!provider) {
    throw new Error('Provider is required for benchmark');
  }

  const benchmarkStartTime = Date.now();
  const allScenarioMetrics: ScenarioMetrics[] = [];

  // Resolve scenario definitions
  const scenarioDefs = scenarios.map((s) => {
    if (typeof s === 'string') {
      return customScenarios[s] || DEFAULT_SCENARIOS[s as BenchmarkScenario];
    }
    return s;
  });

  // Run benchmarks for each scenario
  for (let scenarioIndex = 0; scenarioIndex < scenarioDefs.length; scenarioIndex++) {
    const scenarioDef = scenarioDefs[scenarioIndex];
    if (!scenarioDef) {
      console.warn(`Scenario ${scenarios[scenarioIndex]} not found, skipping`);
      continue;
    }

    // Warm-up phase
    for (let i = 0; i < warmupIterations; i++) {
      await runRequest(provider, scenarioDef);
    }

    // Actual benchmark
    const requests: RequestMetrics[] = [];
    const scenarioStartTime = performance.now();

    for (let iteration = 0; iteration < iterations; iteration++) {
      if (onProgress) {
        onProgress({
          scenarioIndex,
          totalScenarios: scenarioDefs.length,
          iteration,
          totalIterations: iterations,
          scenarioName: scenarioDef.name,
          elapsedMs: Date.now() - benchmarkStartTime,
        });
      }

      if (concurrency > 1 && scenarioDef.name === 'Concurrent Requests') {
        // Run concurrent requests
        const concurrentPromises = Array.from({ length: concurrency }, () =>
          runRequest(provider, scenarioDef)
        );
        const results = await Promise.all(concurrentPromises);
        requests.push(...results);
      } else {
        const result = await runRequest(provider, scenarioDef);
        requests.push(result);
      }
    }

    const scenarioEndTime = performance.now();
    const scenarioMetrics = aggregateMetrics(
      scenarioDef.name,
      requests,
      scenarioEndTime - scenarioStartTime
    );

    allScenarioMetrics.push(scenarioMetrics);
  }

  const benchmarkEndTime = Date.now();

  // Aggregate overall metrics
  const allRequests = allScenarioMetrics.flatMap((s) => s.requests);
  const overallMetrics = aggregateMetrics(
    'Overall',
    allRequests,
    benchmarkEndTime - benchmarkStartTime
  );

  const results: BenchmarkResults = {
    config,
    scenarios: allScenarioMetrics,
    overall: overallMetrics,
    assertions: assertPerformance,
    assertionResults: undefined,
    passed: true,
    totalTimeMs: benchmarkEndTime - benchmarkStartTime,
    startTime: benchmarkStartTime,
    endTime: benchmarkEndTime,
  };

  // Check assertions
  if (assertPerformance) {
    const assertionResults = checkAssertions(results, assertPerformance);
    results.assertionResults = assertionResults;
    results.passed = assertionResults.every((r) => r.passed);
  }

  if (onComplete) {
    onComplete(results);
  }

  return results;
}

/**
 * Format benchmark results as a readable report
 */
export function formatBenchmarkReport(results: BenchmarkResults): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('PERFORMANCE BENCHMARK RESULTS');
  lines.push('='.repeat(80));
  lines.push('');

  // Overall summary
  lines.push('OVERALL METRICS:');
  lines.push(`  Total Requests: ${results.overall.iterations}`);
  lines.push(`  Successful: ${results.overall.successful} (${((results.overall.successful / results.overall.iterations) * 100).toFixed(1)}%)`);
  lines.push(`  Failed: ${results.overall.failed}`);
  lines.push(`  Error Rate: ${(results.overall.errorRate * 100).toFixed(2)}%`);
  lines.push(`  Total Time: ${(results.totalTimeMs / 1000).toFixed(2)}s`);
  lines.push('');

  lines.push('LATENCY METRICS:');
  lines.push(`  Min: ${results.overall.minLatency.toFixed(2)}ms`);
  lines.push(`  Max: ${results.overall.maxLatency.toFixed(2)}ms`);
  lines.push(`  Mean: ${results.overall.meanLatency.toFixed(2)}ms`);
  lines.push(`  Median: ${results.overall.medianLatency.toFixed(2)}ms`);
  lines.push(`  P95: ${results.overall.p95Latency.toFixed(2)}ms`);
  lines.push(`  P99: ${results.overall.p99Latency.toFixed(2)}ms`);
  lines.push(`  Std Dev: ${results.overall.stdDeviation.toFixed(2)}ms`);
  lines.push('');

  lines.push('THROUGHPUT:');
  lines.push(`  ${results.overall.throughput.toFixed(2)} req/s`);
  lines.push('');

  if (results.overall.peakMemoryMB && results.overall.peakMemoryMB > 0) {
    lines.push('MEMORY:');
    lines.push(`  Peak: ${results.overall.peakMemoryMB.toFixed(2)}MB`);
    lines.push('');
  }

  // Per-scenario breakdown
  if (results.scenarios.length > 1) {
    lines.push('-'.repeat(80));
    lines.push('PER-SCENARIO BREAKDOWN:');
    lines.push('');

    for (const scenario of results.scenarios) {
      lines.push(`${scenario.scenario}:`);
      lines.push(`  Iterations: ${scenario.iterations} (${scenario.successful} successful, ${scenario.failed} failed)`);
      lines.push(`  Mean Latency: ${scenario.meanLatency.toFixed(2)}ms`);
      lines.push(`  P95 Latency: ${scenario.p95Latency.toFixed(2)}ms`);
      lines.push(`  Throughput: ${scenario.throughput.toFixed(2)} req/s`);
      lines.push('');
    }
  }

  // Assertions
  if (results.assertionResults && results.assertionResults.length > 0) {
    lines.push('-'.repeat(80));
    lines.push('PERFORMANCE ASSERTIONS:');
    lines.push('');

    for (const assertion of results.assertionResults) {
      const status = assertion.passed ? '✓ PASS' : '✗ FAIL';
      lines.push(`${status} ${assertion.type}: ${assertion.actual.toFixed(2)} (limit: ${assertion.expected})`);
      if (assertion.message) {
        lines.push(`  ${assertion.message}`);
      }
    }
    lines.push('');
  }

  lines.push('='.repeat(80));
  lines.push(`BENCHMARK ${results.passed ? 'PASSED' : 'FAILED'}`);
  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Export results to JSON
 */
export function exportBenchmarkResults(results: BenchmarkResults): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Compare two benchmark results
 */
export function compareBenchmarks(
  baseline: BenchmarkResults,
  current: BenchmarkResults
): BenchmarkComparison {
  return {
    baseline: baseline.overall,
    current: current.overall,
    changes: {
      p95LatencyChange: ((current.overall.p95Latency - baseline.overall.p95Latency) / baseline.overall.p95Latency) * 100,
      throughputChange: ((current.overall.throughput - baseline.overall.throughput) / baseline.overall.throughput) * 100,
      errorRateChange: current.overall.errorRate - baseline.overall.errorRate,
    },
    improved: current.overall.p95Latency < baseline.overall.p95Latency && current.overall.throughput > baseline.overall.throughput,
  };
}

/**
 * Benchmark comparison result
 */
export interface BenchmarkComparison {
  baseline: Omit<ScenarioMetrics, 'scenario'>;
  current: Omit<ScenarioMetrics, 'scenario'>;
  changes: {
    p95LatencyChange: number; // percentage
    throughputChange: number; // percentage
    errorRateChange: number; // absolute
  };
  improved: boolean;
}
