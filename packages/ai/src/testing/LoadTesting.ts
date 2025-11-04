/**
 * Load testing framework for AI operations
 *
 * Provides comprehensive load and stress testing capabilities including:
 * - Concurrent request execution
 * - Load pattern simulation (ramp-up, sustained, spike, wave)
 * - Performance degradation detection
 * - Bottleneck identification
 * - Capacity planning metrics
 */

import type { AIProvider, Message, ChatOptions } from '../providers/AIProvider';

/**
 * Load pattern type
 */
export type LoadPattern = 'ramp-up' | 'sustained' | 'spike' | 'wave' | 'stress';

/**
 * Load test scenario configuration
 */
export interface LoadTestScenario {
  /** Scenario name */
  name: string;
  /** Scenario description */
  description?: string;
  /** Messages to send */
  messages: Message[];
  /** Chat options */
  options?: ChatOptions;
  /** Request weight (for weighted scenarios) */
  weight?: number;
}

/**
 * Load pattern configuration
 */
export interface LoadPatternConfig {
  /** Pattern type */
  pattern: LoadPattern;
  /** Initial concurrent users */
  initialUsers?: number;
  /** Peak concurrent users */
  peakUsers: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Ramp-up time in milliseconds (for ramp-up pattern) */
  rampUpMs?: number;
  /** Spike interval in milliseconds (for spike pattern) */
  spikeIntervalMs?: number;
  /** Wave amplitude (for wave pattern) */
  waveAmplitude?: number;
  /** Wave period in milliseconds (for wave pattern) */
  wavePeriodMs?: number;
  /** Stress test increment users per step */
  stressStepUsers?: number;
  /** Stress test step duration in milliseconds */
  stressStepDurationMs?: number;
}

/**
 * Load test configuration
 */
export interface LoadTestConfig {
  /** AI provider to test */
  provider: AIProvider;
  /** Load test scenarios */
  scenarios: LoadTestScenario[];
  /** Load pattern configuration */
  loadPattern: LoadPatternConfig;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Think time between requests per user (ms) */
  thinkTimeMs?: number;
  /** Progress callback */
  onProgress?: (progress: LoadTestProgress) => void;
  /** Request callback (for detailed tracking) */
  onRequest?: (request: RequestResult) => void;
}

/**
 * Request result from load test
 */
export interface RequestResult {
  /** Scenario name */
  scenario: string;
  /** Request start timestamp */
  startTime: number;
  /** Request end timestamp */
  endTime: number;
  /** Latency in milliseconds */
  latencyMs: number;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Concurrent users at time of request */
  concurrentUsers: number;
  /** Response size in characters */
  responseSize?: number;
}

/**
 * Load test progress information
 */
export interface LoadTestProgress {
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Current concurrent users */
  currentUsers: number;
  /** Total requests completed */
  completedRequests: number;
  /** Total requests failed */
  failedRequests: number;
  /** Current requests per second */
  currentThroughput: number;
  /** Current average latency */
  currentLatency: number;
}

/**
 * Time window metrics for performance tracking
 */
export interface TimeWindowMetrics {
  /** Window start time */
  startTime: number;
  /** Window end time */
  endTime: number;
  /** Concurrent users in window */
  concurrentUsers: number;
  /** Requests in window */
  requests: number;
  /** Successful requests */
  successful: number;
  /** Failed requests */
  failed: number;
  /** Average latency (ms) */
  avgLatency: number;
  /** Min latency (ms) */
  minLatency: number;
  /** Max latency (ms) */
  maxLatency: number;
  /** p95 latency (ms) */
  p95Latency: number;
  /** Throughput (req/s) */
  throughput: number;
  /** Error rate (0-1) */
  errorRate: number;
}

/**
 * Performance degradation point
 */
export interface DegradationPoint {
  /** Concurrent users at degradation */
  concurrentUsers: number;
  /** Timestamp of degradation */
  timestamp: number;
  /** Metric that degraded */
  metric: 'latency' | 'throughput' | 'error_rate';
  /** Baseline value */
  baseline: number;
  /** Degraded value */
  degraded: number;
  /** Degradation percentage */
  degradationPercent: number;
}

/**
 * Bottleneck identification
 */
export interface Bottleneck {
  /** Bottleneck type */
  type: 'cpu' | 'memory' | 'network' | 'provider' | 'unknown';
  /** Description */
  description: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Supporting evidence */
  evidence: string[];
}

/**
 * Capacity planning recommendations
 */
export interface CapacityRecommendations {
  /** Maximum concurrent users before degradation */
  maxConcurrentUsers: number;
  /** Recommended peak capacity */
  recommendedPeakCapacity: number;
  /** Safety margin (%) */
  safetyMargin: number;
  /** Identified bottlenecks */
  bottlenecks: Bottleneck[];
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Load test results
 */
export interface LoadTestResults {
  /** Test configuration */
  config: LoadTestConfig;
  /** Test start time */
  startTime: number;
  /** Test end time */
  endTime: number;
  /** Total duration (ms) */
  totalDurationMs: number;
  /** Total requests */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Overall error rate */
  errorRate: number;
  /** Overall throughput (req/s) */
  overallThroughput: number;
  /** Average latency (ms) */
  avgLatency: number;
  /** p95 latency (ms) */
  p95Latency: number;
  /** p99 latency (ms) */
  p99Latency: number;
  /** Max latency (ms) */
  maxLatency: number;
  /** Time window metrics */
  windowMetrics: TimeWindowMetrics[];
  /** All request results */
  requests: RequestResult[];
  /** Degradation points */
  degradationPoints: DegradationPoint[];
  /** Capacity recommendations */
  capacity: CapacityRecommendations;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Select scenario based on weights
 */
function selectScenario(scenarios: LoadTestScenario[]): LoadTestScenario {
  const totalWeight = scenarios.reduce((sum, s) => sum + (s.weight || 1), 0);
  let random = Math.random() * totalWeight;

  for (const scenario of scenarios) {
    random -= (scenario.weight || 1);
    if (random <= 0) {
      return scenario;
    }
  }

  return scenarios[scenarios.length - 1];
}

/**
 * Execute a single request with timeout
 */
async function executeRequest(
  provider: AIProvider,
  scenario: LoadTestScenario,
  timeoutMs: number,
  concurrentUsers: number
): Promise<RequestResult> {
  const startTime = Date.now();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    // Execute request with streaming
    let responseSize = 0;
    const requestPromise = (async () => {
      for await (const chunk of provider.chat(scenario.messages, scenario.options)) {
        if (chunk.type === 'content_delta' && chunk.delta) {
          responseSize += chunk.delta.length;
        }
      }
    })();

    await Promise.race([requestPromise, timeoutPromise]);

    const endTime = Date.now();
    return {
      scenario: scenario.name,
      startTime,
      endTime,
      latencyMs: endTime - startTime,
      success: true,
      concurrentUsers,
      responseSize,
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      scenario: scenario.name,
      startTime,
      endTime,
      latencyMs: endTime - startTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      concurrentUsers,
    };
  }
}

/**
 * Calculate concurrent users for current time based on load pattern
 */
function calculateConcurrentUsers(
  pattern: LoadPatternConfig,
  elapsedMs: number
): number {
  const {
    pattern: patternType,
    initialUsers = 1,
    peakUsers,
    durationMs,
    rampUpMs = durationMs * 0.3,
    spikeIntervalMs = 60000,
    waveAmplitude = peakUsers * 0.3,
    wavePeriodMs = 120000,
    stressStepUsers = Math.ceil(peakUsers / 10),
    stressStepDurationMs = 30000,
  } = pattern;

  switch (patternType) {
    case 'ramp-up':
      if (elapsedMs < rampUpMs) {
        // Linear ramp up
        return Math.floor(initialUsers + ((peakUsers - initialUsers) * elapsedMs) / rampUpMs);
      }
      return peakUsers;

    case 'sustained':
      return peakUsers;

    case 'spike':
      // Spike pattern: baseline with periodic spikes
      const inSpike = Math.floor(elapsedMs / spikeIntervalMs) % 2 === 1;
      return inSpike ? peakUsers : initialUsers;

    case 'wave':
      // Sine wave pattern
      const amplitude = waveAmplitude;
      const midpoint = (peakUsers + initialUsers) / 2;
      const waveValue = Math.sin((elapsedMs / wavePeriodMs) * 2 * Math.PI) * amplitude;
      return Math.max(initialUsers, Math.floor(midpoint + waveValue));

    case 'stress':
      // Incrementally increase users until failure
      const stepNumber = Math.floor(elapsedMs / stressStepDurationMs);
      return Math.min(peakUsers, initialUsers + (stepNumber * stressStepUsers));

    default:
      return peakUsers;
  }
}

/**
 * Analyze time windows for performance metrics
 */
function analyzeTimeWindows(
  requests: RequestResult[],
  windowSizeMs: number = 10000
): TimeWindowMetrics[] {
  if (requests.length === 0) return [];

  const startTime = Math.min(...requests.map(r => r.startTime));
  const endTime = Math.max(...requests.map(r => r.endTime));
  const windows: TimeWindowMetrics[] = [];

  for (let windowStart = startTime; windowStart < endTime; windowStart += windowSizeMs) {
    const windowEnd = windowStart + windowSizeMs;
    const windowRequests = requests.filter(
      r => r.startTime >= windowStart && r.startTime < windowEnd
    );

    if (windowRequests.length === 0) continue;

    const successful = windowRequests.filter(r => r.success);
    const failed = windowRequests.filter(r => !r.success);
    const latencies = successful.map(r => r.latencyMs).sort((a, b) => a - b);

    windows.push({
      startTime: windowStart,
      endTime: windowEnd,
      concurrentUsers: Math.max(...windowRequests.map(r => r.concurrentUsers)),
      requests: windowRequests.length,
      successful: successful.length,
      failed: failed.length,
      avgLatency: latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0,
      minLatency: latencies.length > 0 ? latencies[0] : 0,
      maxLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      p95Latency: percentile(latencies, 95),
      throughput: (successful.length / windowSizeMs) * 1000,
      errorRate: failed.length / windowRequests.length,
    });
  }

  return windows;
}

/**
 * Detect performance degradation points
 */
function detectDegradation(windows: TimeWindowMetrics[]): DegradationPoint[] {
  if (windows.length < 2) return [];

  const degradationPoints: DegradationPoint[] = [];
  const baselineWindow = windows[0];

  // Define degradation thresholds
  const LATENCY_THRESHOLD = 1.5; // 50% increase
  const THROUGHPUT_THRESHOLD = 0.7; // 30% decrease
  const ERROR_RATE_THRESHOLD = 0.05; // 5% error rate

  for (let i = 1; i < windows.length; i++) {
    const window = windows[i];

    // Check latency degradation
    if (window.avgLatency > baselineWindow.avgLatency * LATENCY_THRESHOLD) {
      degradationPoints.push({
        concurrentUsers: window.concurrentUsers,
        timestamp: window.startTime,
        metric: 'latency',
        baseline: baselineWindow.avgLatency,
        degraded: window.avgLatency,
        degradationPercent: ((window.avgLatency - baselineWindow.avgLatency) / baselineWindow.avgLatency) * 100,
      });
    }

    // Check throughput degradation
    if (window.throughput < baselineWindow.throughput * THROUGHPUT_THRESHOLD) {
      degradationPoints.push({
        concurrentUsers: window.concurrentUsers,
        timestamp: window.startTime,
        metric: 'throughput',
        baseline: baselineWindow.throughput,
        degraded: window.throughput,
        degradationPercent: ((baselineWindow.throughput - window.throughput) / baselineWindow.throughput) * 100,
      });
    }

    // Check error rate degradation
    if (window.errorRate > ERROR_RATE_THRESHOLD) {
      degradationPoints.push({
        concurrentUsers: window.concurrentUsers,
        timestamp: window.startTime,
        metric: 'error_rate',
        baseline: baselineWindow.errorRate,
        degraded: window.errorRate,
        degradationPercent: ((window.errorRate - baselineWindow.errorRate) / Math.max(0.01, baselineWindow.errorRate)) * 100,
      });
    }
  }

  return degradationPoints;
}

/**
 * Identify bottlenecks from test results
 */
function identifyBottlenecks(
  windows: TimeWindowMetrics[],
  degradationPoints: DegradationPoint[]
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  if (degradationPoints.length === 0) {
    return bottlenecks;
  }

  // Analyze degradation patterns
  const latencyDegradations = degradationPoints.filter(d => d.metric === 'latency');
  const throughputDegradations = degradationPoints.filter(d => d.metric === 'throughput');
  const errorRateDegradations = degradationPoints.filter(d => d.metric === 'error_rate');

  // Provider bottleneck (high error rate)
  if (errorRateDegradations.length > 0) {
    bottlenecks.push({
      type: 'provider',
      description: 'AI provider experiencing errors under load',
      confidence: 0.8,
      evidence: [
        `Error rate increased to ${(errorRateDegradations[0].degraded * 100).toFixed(1)}%`,
        `First error spike at ${errorRateDegradations[0].concurrentUsers} concurrent users`,
      ],
    });
  }

  // Network/IO bottleneck (latency without throughput issues)
  if (latencyDegradations.length > 0 && throughputDegradations.length === 0) {
    bottlenecks.push({
      type: 'network',
      description: 'Network latency increases under load',
      confidence: 0.7,
      evidence: [
        `Latency increased by ${latencyDegradations[0].degradationPercent.toFixed(0)}%`,
        `Throughput remained stable`,
      ],
    });
  }

  // CPU/Processing bottleneck (throughput degradation)
  if (throughputDegradations.length > 0) {
    bottlenecks.push({
      type: 'cpu',
      description: 'Processing capacity limit reached',
      confidence: 0.75,
      evidence: [
        `Throughput decreased by ${throughputDegradations[0].degradationPercent.toFixed(0)}%`,
        `First degradation at ${throughputDegradations[0].concurrentUsers} concurrent users`,
      ],
    });
  }

  return bottlenecks;
}

/**
 * Generate capacity recommendations
 */
function generateCapacityRecommendations(
  windows: TimeWindowMetrics[],
  degradationPoints: DegradationPoint[],
  peakUsers: number
): CapacityRecommendations {
  // Find maximum users before degradation
  let maxConcurrentUsers = peakUsers;
  if (degradationPoints.length > 0) {
    maxConcurrentUsers = Math.min(...degradationPoints.map(d => d.concurrentUsers));
  }

  // Apply safety margin
  const safetyMargin = 0.2; // 20% safety margin
  const recommendedPeakCapacity = Math.floor(maxConcurrentUsers * (1 - safetyMargin));

  // Identify bottlenecks
  const bottlenecks = identifyBottlenecks(windows, degradationPoints);

  // Generate recommendations
  const recommendations: string[] = [];

  if (degradationPoints.length === 0) {
    recommendations.push('System handled peak load without degradation');
    recommendations.push('Consider testing with higher load to find limits');
  } else {
    recommendations.push(`Limit concurrent users to ${recommendedPeakCapacity} for stable performance`);

    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'provider':
          recommendations.push('Consider rate limiting or provider capacity scaling');
          break;
        case 'network':
          recommendations.push('Optimize network configuration or use connection pooling');
          break;
        case 'cpu':
          recommendations.push('Scale processing resources or optimize request handling');
          break;
      }
    });
  }

  return {
    maxConcurrentUsers,
    recommendedPeakCapacity,
    safetyMargin: safetyMargin * 100,
    bottlenecks,
    recommendations,
  };
}

/**
 * Run load test
 */
export async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
  const {
    provider,
    scenarios,
    loadPattern,
    timeoutMs = 30000,
    thinkTimeMs = 1000,
    onProgress,
    onRequest,
  } = config;

  const results: RequestResult[] = [];
  const startTime = Date.now();
  let completedRequests = 0;
  let failedRequests = 0;

  // Active user simulation
  const activeUsers = new Set<Promise<void>>();
  let shouldStop = false;

  // User simulation function
  const simulateUser = async () => {
    while (!shouldStop) {
      const scenario = selectScenario(scenarios);
      const elapsedMs = Date.now() - startTime;
      const concurrentUsers = calculateConcurrentUsers(loadPattern, elapsedMs);

      const result = await executeRequest(provider, scenario, timeoutMs, concurrentUsers);
      results.push(result);

      if (!result.success) {
        failedRequests++;
      }
      completedRequests++;

      if (onRequest) {
        onRequest(result);
      }

      // Progress callback
      if (onProgress && completedRequests % 10 === 0) {
        const recentRequests = results.slice(-100);
        const recentLatencies = recentRequests.filter(r => r.success).map(r => r.latencyMs);
        const avgLatency = recentLatencies.length > 0
          ? recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length
          : 0;

        const throughput = (recentRequests.length / Math.min(elapsedMs, 10000)) * 1000;

        onProgress({
          elapsedMs,
          currentUsers: concurrentUsers,
          completedRequests,
          failedRequests,
          currentThroughput: throughput,
          currentLatency: avgLatency,
        });
      }

      // Think time between requests
      await new Promise(resolve => setTimeout(resolve, thinkTimeMs));
    }
  };

  // Start test duration timer
  const testDuration = setTimeout(() => {
    shouldStop = true;
  }, loadPattern.durationMs);

  // Main load control loop
  const controlInterval = setInterval(() => {
    if (shouldStop) {
      clearInterval(controlInterval);
      return;
    }

    const elapsedMs = Date.now() - startTime;
    const targetUsers = calculateConcurrentUsers(loadPattern, elapsedMs);
    const currentUsers = activeUsers.size;

    // Add users if below target
    while (activeUsers.size < targetUsers) {
      const userPromise = simulateUser().finally(() => {
        activeUsers.delete(userPromise);
      });
      activeUsers.add(userPromise);
    }
  }, 1000); // Check every second

  // Wait for test to complete
  await new Promise(resolve => setTimeout(resolve, loadPattern.durationMs));
  shouldStop = true;
  clearTimeout(testDuration);
  clearInterval(controlInterval);

  // Wait for all active users to finish
  await Promise.all(Array.from(activeUsers));

  const endTime = Date.now();

  // Analyze results
  const successfulRequests = results.filter(r => r.success);
  const latencies = successfulRequests.map(r => r.latencyMs).sort((a, b) => a - b);

  const windowMetrics = analyzeTimeWindows(results);
  const degradationPoints = detectDegradation(windowMetrics);
  const capacity = generateCapacityRecommendations(
    windowMetrics,
    degradationPoints,
    loadPattern.peakUsers
  );

  return {
    config,
    startTime,
    endTime,
    totalDurationMs: endTime - startTime,
    totalRequests: results.length,
    successfulRequests: successfulRequests.length,
    failedRequests: results.filter(r => !r.success).length,
    errorRate: failedRequests / results.length,
    overallThroughput: (results.length / (endTime - startTime)) * 1000,
    avgLatency: latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0,
    p95Latency: percentile(latencies, 95),
    p99Latency: percentile(latencies, 99),
    maxLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
    windowMetrics,
    requests: results,
    degradationPoints,
    capacity,
  };
}

/**
 * Format load test results as report
 */
export function formatLoadTestReport(results: LoadTestResults): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('LOAD TEST RESULTS');
  lines.push('='.repeat(80));
  lines.push('');

  // Test configuration
  lines.push('TEST CONFIGURATION:');
  lines.push(`  Pattern: ${results.config.loadPattern.pattern}`);
  lines.push(`  Peak Users: ${results.config.loadPattern.peakUsers}`);
  lines.push(`  Duration: ${results.config.loadPattern.durationMs / 1000}s`);
  lines.push(`  Scenarios: ${results.config.scenarios.map(s => s.name).join(', ')}`);
  lines.push('');

  // Overall metrics
  lines.push('OVERALL METRICS:');
  lines.push(`  Total Requests: ${results.totalRequests}`);
  lines.push(`  Successful: ${results.successfulRequests} (${((1 - results.errorRate) * 100).toFixed(1)}%)`);
  lines.push(`  Failed: ${results.failedRequests} (${(results.errorRate * 100).toFixed(1)}%)`);
  lines.push(`  Throughput: ${results.overallThroughput.toFixed(2)} req/s`);
  lines.push(`  Avg Latency: ${results.avgLatency.toFixed(2)}ms`);
  lines.push(`  P95 Latency: ${results.p95Latency.toFixed(2)}ms`);
  lines.push(`  P99 Latency: ${results.p99Latency.toFixed(2)}ms`);
  lines.push(`  Max Latency: ${results.maxLatency.toFixed(2)}ms`);
  lines.push('');

  // Degradation analysis
  if (results.degradationPoints.length > 0) {
    lines.push('PERFORMANCE DEGRADATION:');
    results.degradationPoints.forEach((point, i) => {
      lines.push(`  ${i + 1}. ${point.metric.toUpperCase()}`);
      lines.push(`     At ${point.concurrentUsers} concurrent users`);
      lines.push(`     Baseline: ${point.baseline.toFixed(2)}`);
      lines.push(`     Degraded: ${point.degraded.toFixed(2)}`);
      lines.push(`     Change: +${point.degradationPercent.toFixed(1)}%`);
    });
    lines.push('');
  } else {
    lines.push('✓ No performance degradation detected');
    lines.push('');
  }

  // Capacity recommendations
  lines.push('CAPACITY RECOMMENDATIONS:');
  lines.push(`  Max Concurrent Users: ${results.capacity.maxConcurrentUsers}`);
  lines.push(`  Recommended Peak Capacity: ${results.capacity.recommendedPeakCapacity}`);
  lines.push(`  Safety Margin: ${results.capacity.safetyMargin}%`);

  if (results.capacity.bottlenecks.length > 0) {
    lines.push('');
    lines.push('  Identified Bottlenecks:');
    results.capacity.bottlenecks.forEach((bottleneck, i) => {
      lines.push(`    ${i + 1}. ${bottleneck.type.toUpperCase()}: ${bottleneck.description}`);
      lines.push(`       Confidence: ${(bottleneck.confidence * 100).toFixed(0)}%`);
    });
  }

  lines.push('');
  lines.push('  Recommendations:');
  results.capacity.recommendations.forEach((rec, i) => {
    lines.push(`    ${i + 1}. ${rec}`);
  });

  lines.push('');
  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Export load test results to JSON
 */
export function exportLoadTestResults(
  results: LoadTestResults,
  filepath: string
): void {
  // This would write to file in Node.js environment
  // For now, just return the JSON string
  const json = JSON.stringify(results, null, 2);
  console.log(`Export to ${filepath}:\n${json}`);
}
