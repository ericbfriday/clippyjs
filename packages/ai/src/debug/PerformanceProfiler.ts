/**
 * Performance profiling system
 *
 * Identifies performance bottlenecks in AI operations.
 */

import type { DebugCollector, ResponseDebugInfo } from './DebugCollector';

/**
 * Performance bottleneck
 */
export interface PerformanceBottleneck {
  /** Bottleneck type */
  type: 'slow-request' | 'high-latency' | 'frequent-errors' | 'cache-miss-rate';
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
  /** Description */
  description: string;
  /** Measured value */
  value: number;
  /** Threshold */
  threshold: number;
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Performance profile
 */
export interface PerformanceProfile {
  /** Profiling period */
  period: {
    startTime: number;
    endTime: number;
    durationMs: number;
  };
  /** Performance metrics */
  metrics: {
    avgRequestDuration: number;
    p95RequestDuration: number;
    p99RequestDuration: number;
    errorRate: number;
    cacheHitRate: number;
    totalRequests: number;
  };
  /** Identified bottlenecks */
  bottlenecks: PerformanceBottleneck[];
  /** Performance score (0-100) */
  score: number;
}

/**
 * Performance profiler
 *
 * Profiles and analyzes AI operation performance.
 *
 * Usage:
 * ```ts
 * const profiler = new PerformanceProfiler(debugCollector);
 *
 * // Get performance profile
 * const profile = profiler.profile();
 *
 * // Get bottlenecks
 * const bottlenecks = profiler.identifyBottlenecks();
 * ```
 */
export class PerformanceProfiler {
  constructor(private debugCollector: DebugCollector) {}

  /**
   * Generate performance profile
   */
  profile(): PerformanceProfile {
    const events = this.debugCollector.getEvents();
    if (events.length === 0) {
      return this.emptyProfile();
    }

    const startTime = events[0]?.data['timestamp'] || Date.now();
    const endTime = events[events.length - 1]?.data['timestamp'] || Date.now();

    const stats = this.debugCollector.getPerformanceStats();
    const durations = this.getRequestDurations();

    const metrics = {
      avgRequestDuration: stats.avgRequestDuration,
      p95RequestDuration: this.percentile(durations, 95),
      p99RequestDuration: this.percentile(durations, 99),
      errorRate: stats.errorRate,
      cacheHitRate: stats.cacheHitRate,
      totalRequests: stats.totalRequests,
    };

    const bottlenecks = this.identifyBottlenecks(metrics);
    const score = this.calculatePerformanceScore(metrics, bottlenecks);

    return {
      period: {
        startTime,
        endTime,
        durationMs: endTime - startTime,
      },
      metrics,
      bottlenecks,
      score,
    };
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(metrics?: PerformanceProfile['metrics']): PerformanceBottleneck[] {
    const m = metrics || this.profile().metrics;
    const bottlenecks: PerformanceBottleneck[] = [];

    // Slow requests
    if (m.avgRequestDuration > 3000) {
      bottlenecks.push({
        type: 'slow-request',
        severity: m.avgRequestDuration > 5000 ? 'high' : 'medium',
        description: 'Average request duration is high',
        value: m.avgRequestDuration,
        threshold: 3000,
        suggestions: [
          'Enable response caching',
          'Optimize context size',
          'Use streaming for better perceived performance',
        ],
      });
    }

    // High p99 latency
    if (m.p99RequestDuration > 10000) {
      bottlenecks.push({
        type: 'high-latency',
        severity: 'high',
        description: 'P99 latency is very high',
        value: m.p99RequestDuration,
        threshold: 10000,
        suggestions: [
          'Investigate slow requests',
          'Implement request timeout',
          'Consider request queuing',
        ],
      });
    }

    // High error rate
    if (m.errorRate > 0.05) {
      bottlenecks.push({
        type: 'frequent-errors',
        severity: m.errorRate > 0.1 ? 'high' : 'medium',
        description: 'Error rate is elevated',
        value: m.errorRate,
        threshold: 0.05,
        suggestions: [
          'Review error logs',
          'Implement better error handling',
          'Check API rate limits',
        ],
      });
    }

    // Low cache hit rate
    if (m.cacheHitRate < 0.3 && m.totalRequests > 10) {
      bottlenecks.push({
        type: 'cache-miss-rate',
        severity: m.cacheHitRate < 0.1 ? 'high' : 'low',
        description: 'Cache hit rate is low',
        value: m.cacheHitRate,
        threshold: 0.3,
        suggestions: [
          'Enable response caching',
          'Increase cache size',
          'Review cache key strategy',
        ],
      });
    }

    return bottlenecks;
  }

  /**
   * Get request durations
   */
  private getRequestDurations(): number[] {
    const responses = this.debugCollector.getEventsByType('request-end');
    return responses
      .map((e) => (e.data as ResponseDebugInfo).duration)
      .filter((d) => d > 0);
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(
    metrics: PerformanceProfile['metrics'],
    bottlenecks: PerformanceBottleneck[]
  ): number {
    let score = 100;

    // Penalize for slow requests
    if (metrics.avgRequestDuration > 3000) {
      score -= Math.min(30, (metrics.avgRequestDuration - 3000) / 100);
    }

    // Penalize for high error rate
    score -= metrics.errorRate * 100;

    // Penalize for bottlenecks
    for (const bottleneck of bottlenecks) {
      if (bottleneck.severity === 'high') score -= 15;
      else if (bottleneck.severity === 'medium') score -= 10;
      else score -= 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Empty profile
   */
  private emptyProfile(): PerformanceProfile {
    return {
      period: {
        startTime: Date.now(),
        endTime: Date.now(),
        durationMs: 0,
      },
      metrics: {
        avgRequestDuration: 0,
        p95RequestDuration: 0,
        p99RequestDuration: 0,
        errorRate: 0,
        cacheHitRate: 0,
        totalRequests: 0,
      },
      bottlenecks: [],
      score: 100,
    };
  }
}
