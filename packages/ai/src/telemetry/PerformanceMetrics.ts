/**
 * PerformanceMetrics - Core Web Vitals and custom performance tracking
 *
 * Features:
 * - Core Web Vitals tracking (LCP, FID, CLS, TTFB)
 * - Custom performance marks and measures
 * - AI operation timing (context gathering, compression, API calls)
 * - Resource usage monitoring (memory, network)
 * - Percentile calculations (p50, p95, p99)
 *
 * @module telemetry
 */

import type { TelemetryCollector } from './TelemetryCollector';

/**
 * Core Web Vitals metrics
 */
export interface CoreWebVitals {
  /** Largest Contentful Paint (ms) */
  lcp?: number;
  /** First Input Delay (ms) */
  fid?: number;
  /** Cumulative Layout Shift (score) */
  cls?: number;
  /** Time to First Byte (ms) */
  ttfb?: number;
  /** First Contentful Paint (ms) */
  fcp?: number;
}

/**
 * AI operation timing metrics
 */
export interface AIOperationMetrics {
  /** Context gathering duration (ms) */
  contextGatheringMs?: number;
  /** Context compression duration (ms) */
  contextCompressionMs?: number;
  /** API call duration (ms) */
  apiCallMs?: number;
  /** Total operation duration (ms) */
  totalMs?: number;
  /** Token count */
  tokens?: number;
  /** Context size (bytes) */
  contextSizeBytes?: number;
}

/**
 * Resource usage metrics
 */
export interface ResourceMetrics {
  /** Memory usage (bytes) */
  memoryUsage?: number;
  /** Network requests count */
  networkRequests?: number;
  /** Network data transferred (bytes) */
  networkDataBytes?: number;
  /** CPU time (ms) */
  cpuTimeMs?: number;
}

/**
 * Performance timing entry
 */
export interface PerformanceTiming {
  /** Timing name */
  name: string;
  /** Start time (ms) */
  startTime: number;
  /** Duration (ms) */
  duration: number;
  /** Timing tags */
  tags?: Record<string, string>;
}

/**
 * Performance metrics summary
 */
export interface PerformanceMetricsSummary {
  /** Core Web Vitals */
  coreWebVitals: CoreWebVitals;
  /** AI operation metrics */
  aiOperations: {
    count: number;
    avgDuration: number;
    p50: number;
    p95: number;
    p99: number;
    totalTokens: number;
  };
  /** Resource metrics */
  resources: ResourceMetrics;
  /** Custom timings count */
  customTimings: number;
}

/**
 * Performance metrics configuration
 */
export interface PerformanceMetricsConfig {
  /** Enable Core Web Vitals tracking */
  trackCoreWebVitals?: boolean;
  /** Enable resource monitoring */
  trackResources?: boolean;
  /** Track performance marks */
  trackMarks?: boolean;
  /** Maximum timings to keep in memory */
  maxTimings?: number;
  /** Time window for aggregations (ms) */
  timeWindowMs?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<PerformanceMetricsConfig> = {
  trackCoreWebVitals: true,
  trackResources: true,
  trackMarks: true,
  maxTimings: 1000,
  timeWindowMs: 300000, // 5 minutes
};

/**
 * PerformanceMetrics - Performance monitoring system
 */
export class PerformanceMetrics {
  private config: Required<PerformanceMetricsConfig>;
  private collector: TelemetryCollector;
  private timings: PerformanceTiming[] = [];
  private coreWebVitals: CoreWebVitals = {};
  private aiOperations: AIOperationMetrics[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private marks: Map<string, number> = new Map();

  constructor(collector: TelemetryCollector, config: PerformanceMetricsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.collector = collector;

    // Initialize Core Web Vitals tracking
    if (this.config.trackCoreWebVitals && typeof window !== 'undefined') {
      this.initCoreWebVitals();
    }

    // Initialize resource monitoring
    if (this.config.trackResources && typeof window !== 'undefined') {
      this.initResourceMonitoring();
    }
  }

  /**
   * Track AI operation performance
   */
  trackAIOperation(metrics: AIOperationMetrics): void {
    this.aiOperations.push({
      ...metrics,
      totalMs: metrics.totalMs || 0,
    });

    // Report to telemetry
    this.collector.trackPerformance({
      name: 'ai.operation',
      value: metrics.totalMs || 0,
      unit: 'ms',
      tags: {
        hasContextGathering: String(!!metrics.contextGatheringMs),
        hasCompression: String(!!metrics.contextCompressionMs),
        hasTokens: String(!!metrics.tokens),
      },
    });

    // Report individual phases
    if (metrics.contextGatheringMs) {
      this.collector.trackPerformance({
        name: 'ai.context.gathering',
        value: metrics.contextGatheringMs,
        unit: 'ms',
      });
    }

    if (metrics.contextCompressionMs) {
      this.collector.trackPerformance({
        name: 'ai.context.compression',
        value: metrics.contextCompressionMs,
        unit: 'ms',
      });
    }

    if (metrics.apiCallMs) {
      this.collector.trackPerformance({
        name: 'ai.api.call',
        value: metrics.apiCallMs,
        unit: 'ms',
      });
    }

    if (metrics.tokens) {
      this.collector.trackPerformance({
        name: 'ai.tokens.used',
        value: metrics.tokens,
        unit: 'count',
      });
    }

    // Cleanup old operations
    this.cleanupOldData();
  }

  /**
   * Start a performance mark
   */
  mark(name: string): void {
    const timestamp = performance.now();
    this.marks.set(name, timestamp);

    if (this.config.trackMarks && typeof performance !== 'undefined') {
      performance.mark(name);
    }
  }

  /**
   * Measure duration between marks
   */
  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      throw new Error(`Start mark "${startMark}" not found`);
    }

    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    if (endMark && !endTime) {
      throw new Error(`End mark "${endMark}" not found`);
    }

    const duration = (endTime || performance.now()) - startTime;

    // Record timing
    const timing: PerformanceTiming = {
      name,
      startTime,
      duration,
    };
    this.timings.push(timing);

    // Report to telemetry
    this.collector.trackPerformance({
      name: `custom.${name}`,
      value: duration,
      unit: 'ms',
    });

    // Cleanup marks
    this.marks.delete(startMark);
    if (endMark) {
      this.marks.delete(endMark);
    }

    // Cleanup old timings
    if (this.timings.length > this.config.maxTimings) {
      this.timings = this.timings.slice(-this.config.maxTimings);
    }

    return duration;
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): CoreWebVitals {
    return { ...this.coreWebVitals };
  }

  /**
   * Get AI operations summary
   */
  getAIOperationsSummary(): PerformanceMetricsSummary['aiOperations'] {
    const durations = this.aiOperations
      .map(op => op.totalMs || 0)
      .filter(d => d > 0)
      .sort((a, b) => a - b);

    return {
      count: this.aiOperations.length,
      avgDuration: durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0,
      p50: this.getPercentile(durations, 50),
      p95: this.getPercentile(durations, 95),
      p99: this.getPercentile(durations, 99),
      totalTokens: this.aiOperations.reduce((sum, op) => sum + (op.tokens || 0), 0),
    };
  }

  /**
   * Get resource metrics
   */
  getResourceMetrics(): ResourceMetrics {
    const metrics: ResourceMetrics = {};

    if (typeof performance !== 'undefined' && performance.memory) {
      metrics.memoryUsage = (performance.memory as any).usedJSHeapSize;
    }

    if (typeof performance !== 'undefined') {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      metrics.networkRequests = entries.length;
      metrics.networkDataBytes = entries.reduce(
        (sum, entry) => sum + (entry.transferSize || 0),
        0
      );
    }

    return metrics;
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceMetricsSummary {
    return {
      coreWebVitals: this.getCoreWebVitals(),
      aiOperations: this.getAIOperationsSummary(),
      resources: this.getResourceMetrics(),
      customTimings: this.timings.length,
    };
  }

  /**
   * Get timings by name pattern
   */
  getTimings(namePattern?: string): PerformanceTiming[] {
    if (!namePattern) return [...this.timings];

    const pattern = new RegExp(namePattern);
    return this.timings.filter(t => pattern.test(t.name));
  }

  /**
   * Calculate percentile from sorted array
   */
  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Initialize Core Web Vitals tracking
   */
  private initCoreWebVitals(): void {
    // LCP - Largest Contentful Paint
    this.observeMetric('largest-contentful-paint', entry => {
      const lcp = entry.renderTime || entry.loadTime;
      this.coreWebVitals.lcp = lcp;
      this.collector.trackPerformance({
        name: 'cwv.lcp',
        value: lcp,
        unit: 'ms',
        tags: { rating: this.rateLCP(lcp) },
      });
    });

    // FID - First Input Delay
    this.observeMetric('first-input', entry => {
      const fid = entry.processingStart - entry.startTime;
      this.coreWebVitals.fid = fid;
      this.collector.trackPerformance({
        name: 'cwv.fid',
        value: fid,
        unit: 'ms',
        tags: { rating: this.rateFID(fid) },
      });
    });

    // CLS - Cumulative Layout Shift
    this.observeMetric('layout-shift', entry => {
      if (!(entry as any).hadRecentInput) {
        this.coreWebVitals.cls = (this.coreWebVitals.cls || 0) + (entry as any).value;
        this.collector.trackPerformance({
          name: 'cwv.cls',
          value: this.coreWebVitals.cls,
          unit: 'score',
          tags: { rating: this.rateCLS(this.coreWebVitals.cls) },
        });
      }
    });

    // Navigation timing
    if (typeof performance !== 'undefined' && performance.timing) {
      const timing = performance.timing;
      const ttfb = timing.responseStart - timing.requestStart;
      this.coreWebVitals.ttfb = ttfb;
      this.collector.trackPerformance({
        name: 'cwv.ttfb',
        value: ttfb,
        unit: 'ms',
      });
    }
  }

  /**
   * Initialize resource monitoring
   */
  private initResourceMonitoring(): void {
    // Monitor resource timing
    this.observeMetric('resource', entry => {
      const resourceEntry = entry as PerformanceResourceTiming;
      this.collector.trackPerformance({
        name: 'resource.load',
        value: resourceEntry.duration,
        unit: 'ms',
        tags: {
          type: resourceEntry.initiatorType,
          size: String(resourceEntry.transferSize || 0),
        },
      });
    });

    // Monitor navigation timing
    this.observeMetric('navigation', entry => {
      const navEntry = entry as PerformanceNavigationTiming;
      this.collector.trackPerformance({
        name: 'navigation.load',
        value: navEntry.loadEventEnd - navEntry.loadEventStart,
        unit: 'ms',
      });
    });
  }

  /**
   * Observe performance metric
   */
  private observeMetric(
    entryType: string,
    callback: (entry: PerformanceEntry) => void
  ): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          callback(entry);
        }
      });

      observer.observe({ entryTypes: [entryType], buffered: true });
      this.observers.set(entryType, observer);
    } catch (error) {
      // Observer not supported for this entry type
    }
  }

  /**
   * Rate LCP metric
   */
  private rateLCP(value: number): string {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Rate FID metric
   */
  private rateFID(value: number): string {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Rate CLS metric
   */
  private rateCLS(value: number): string {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const windowStart = now - this.config.timeWindowMs;

    // Keep only recent AI operations
    if (this.aiOperations.length > this.config.maxTimings) {
      this.aiOperations = this.aiOperations.slice(-this.config.maxTimings);
    }

    // Keep only recent timings
    if (this.timings.length > this.config.maxTimings) {
      this.timings = this.timings.slice(-this.config.maxTimings);
    }
  }

  /**
   * Destroy and cleanup observers
   */
  destroy(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.marks.clear();
  }
}
