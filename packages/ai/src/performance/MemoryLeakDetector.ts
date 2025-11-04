/**
 * Memory leak detection for production environments
 *
 * Monitors memory usage patterns to detect and report potential memory leaks
 * before they cause application failures.
 */

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  /** Heap used in bytes */
  heapUsed: number;
  /** Heap total in bytes */
  heapTotal: number;
  /** External memory in bytes */
  external: number;
  /** Array buffers in bytes */
  arrayBuffers: number;
  /** Snapshot timestamp */
  timestamp: number;
}

/**
 * Memory growth trend
 */
export interface MemoryTrend {
  /** Growth rate in bytes/second */
  growthRate: number;
  /** Average memory usage in bytes */
  avgUsage: number;
  /** Trend direction (growing, stable, decreasing) */
  direction: 'growing' | 'stable' | 'decreasing';
  /** Confidence level (0-1) */
  confidence: number;
  /** Time period analyzed in ms */
  periodMs: number;
}

/**
 * Potential memory leak
 */
export interface MemoryLeak {
  /** Leak detection timestamp */
  timestamp: number;
  /** Leak severity (low, medium, high, critical) */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Growth rate in bytes/second */
  growthRate: number;
  /** Current memory usage in bytes */
  currentUsage: number;
  /** Estimated time until OOM in ms */
  estimatedTimeToOOM?: number;
  /** Leak pattern detected */
  pattern: LeakPattern;
  /** Confidence level (0-1) */
  confidence: number;
  /** Recommended action */
  recommendation: string;
}

/**
 * Leak detection pattern
 */
export type LeakPattern =
  | 'steady-growth'      // Consistent linear growth
  | 'exponential-growth' // Accelerating growth
  | 'sawtooth'           // Repeated allocation without cleanup
  | 'step-growth'        // Sudden jumps in memory
  | 'no-cleanup';        // Memory never released

/**
 * Leak detector configuration
 */
export interface LeakDetectorConfig {
  /** Snapshot interval in ms */
  snapshotInterval?: number;
  /** Maximum snapshots to keep */
  maxSnapshots?: number;
  /** Growth rate threshold for leak detection (bytes/second) */
  growthThreshold?: number;
  /** Minimum snapshots before analysis */
  minSnapshotsForAnalysis?: number;
  /** Memory ceiling for warnings in bytes */
  memoryCeiling?: number;
  /** Enable automatic cleanup triggers */
  autoCleanup?: boolean;
  /** Callback for leak detection */
  onLeakDetected?: (leak: MemoryLeak) => void;
}

/**
 * Default leak detector configuration
 */
export const DEFAULT_LEAK_DETECTOR_CONFIG: Required<LeakDetectorConfig> = {
  snapshotInterval: 10000,           // 10 seconds
  maxSnapshots: 100,
  growthThreshold: 1024 * 100,       // 100KB/s
  minSnapshotsForAnalysis: 6,
  memoryCeiling: 25 * 1024 * 1024,   // 25MB
  autoCleanup: true,
  onLeakDetected: () => {},
};

/**
 * Memory leak detector
 *
 * Monitors memory usage over time to detect potential memory leaks through
 * pattern analysis and growth trend detection.
 *
 * Features:
 * - Periodic memory snapshots
 * - Growth trend analysis
 * - Multiple leak pattern detection
 * - Automatic cleanup triggers
 * - OOM prediction
 *
 * Usage:
 * ```ts
 * const detector = new MemoryLeakDetector({
 *   snapshotInterval: 10000,
 *   onLeakDetected: (leak) => {
 *     console.error('Memory leak detected:', leak);
 *     triggerCleanup();
 *   },
 * });
 *
 * detector.start();
 *
 * // Later...
 * const leaks = detector.detectLeaks();
 * if (leaks.length > 0) {
 *   console.warn('Active memory leaks:', leaks);
 * }
 * ```
 */
export class MemoryLeakDetector {
  private config: Required<LeakDetectorConfig>;
  private snapshots: MemorySnapshot[] = [];
  private intervalId?: NodeJS.Timeout | number;
  private leaks: MemoryLeak[] = [];
  private cleanupCallbacks: Array<() => void | Promise<void>> = [];

  constructor(config: LeakDetectorConfig = {}) {
    this.config = { ...DEFAULT_LEAK_DETECTOR_CONFIG, ...config };
  }

  /**
   * Start periodic memory monitoring
   */
  start(): void {
    if (this.intervalId !== undefined) {
      return; // Already started
    }

    // Take initial snapshot
    this.takeSnapshot();

    // Start periodic snapshots
    this.intervalId = setInterval(() => {
      this.takeSnapshot();
      this.analyzeMemory();
    }, this.config.snapshotInterval);
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId as number);
      this.intervalId = undefined;
    }
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const memUsage = this.getMemoryUsage();
    const snapshot: MemorySnapshot = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);

    // Limit snapshot history
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): MemorySnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Analyze memory for leaks
   */
  analyzeMemory(): void {
    if (this.snapshots.length < this.config.minSnapshotsForAnalysis) {
      return; // Not enough data
    }

    const trend = this.calculateTrend();
    const patterns = this.detectPatterns();

    // Check for potential leaks
    for (const pattern of patterns) {
      if (this.isLeak(pattern, trend)) {
        const leak = this.createLeakReport(pattern, trend);
        this.recordLeak(leak);
      }
    }
  }

  /**
   * Detect memory leaks
   */
  detectLeaks(): MemoryLeak[] {
    this.analyzeMemory();
    return [...this.leaks];
  }

  /**
   * Get active leaks
   */
  getActiveLeaks(): MemoryLeak[] {
    const cutoff = Date.now() - 60000; // Last minute
    return this.leaks.filter(leak => leak.timestamp >= cutoff);
  }

  /**
   * Clear leak history
   */
  clearLeaks(): void {
    this.leaks = [];
  }

  /**
   * Calculate memory growth trend
   */
  calculateTrend(windowMs: number = 60000): MemoryTrend {
    const now = Date.now();
    const windowStart = now - windowMs;
    const windowSnapshots = this.snapshots.filter(
      s => s.timestamp >= windowStart
    );

    if (windowSnapshots.length < 2) {
      return {
        growthRate: 0,
        avgUsage: 0,
        direction: 'stable',
        confidence: 0,
        periodMs: windowMs,
      };
    }

    // Calculate linear regression
    const points = windowSnapshots.map(s => ({
      x: s.timestamp - windowStart,
      y: s.heapUsed,
    }));

    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const growthRate = slope; // bytes/ms -> bytes/s
    const avgUsage = sumY / n;

    // Calculate R² for confidence
    const yMean = avgUsage;
    const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const ssResidual = points.reduce((sum, p) => {
      const predicted = slope * p.x + (sumY - slope * sumX) / n;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    // Determine direction
    let direction: 'growing' | 'stable' | 'decreasing';
    if (Math.abs(growthRate) < 100) {
      direction = 'stable';
    } else if (growthRate > 0) {
      direction = 'growing';
    } else {
      direction = 'decreasing';
    }

    return {
      growthRate: growthRate * 1000, // Convert to bytes/second
      avgUsage,
      direction,
      confidence: Math.max(0, Math.min(1, rSquared)),
      periodMs: windowMs,
    };
  }

  /**
   * Register cleanup callback
   */
  registerCleanup(callback: () => void | Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Trigger cleanup callbacks
   */
  async triggerCleanup(): Promise<void> {
    console.log('[MemoryLeakDetector] Triggering cleanup callbacks');

    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('[MemoryLeakDetector] Cleanup callback failed:', error);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.snapshots = [];
    this.leaks = [];
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): MemorySnapshot {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers || 0,
        timestamp: Date.now(),
      };
    }

    // Browser fallback
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        external: 0,
        arrayBuffers: 0,
        timestamp: Date.now(),
      };
    }

    // Fallback
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Detect leak patterns
   */
  private detectPatterns(): LeakPattern[] {
    const patterns: LeakPattern[] = [];

    if (this.snapshots.length < this.config.minSnapshotsForAnalysis) {
      return patterns;
    }

    // Check for steady growth
    if (this.hasSteadyGrowth()) {
      patterns.push('steady-growth');
    }

    // Check for exponential growth
    if (this.hasExponentialGrowth()) {
      patterns.push('exponential-growth');
    }

    // Check for sawtooth pattern
    if (this.hasSawtoothPattern()) {
      patterns.push('sawtooth');
    }

    // Check for step growth
    if (this.hasStepGrowth()) {
      patterns.push('step-growth');
    }

    // Check for no cleanup
    if (this.hasNoCleanup()) {
      patterns.push('no-cleanup');
    }

    return patterns;
  }

  /**
   * Check for steady linear growth
   */
  private hasSteadyGrowth(): boolean {
    const trend = this.calculateTrend();
    return (
      trend.direction === 'growing' &&
      trend.confidence > 0.8 &&
      trend.growthRate > this.config.growthThreshold
    );
  }

  /**
   * Check for exponential growth
   */
  private hasExponentialGrowth(): boolean {
    if (this.snapshots.length < 10) return false;

    const recent = this.snapshots.slice(-10);
    const differences = [];

    for (let i = 1; i < recent.length; i++) {
      differences.push(recent[i].heapUsed - recent[i - 1].heapUsed);
    }

    // Check if differences are increasing
    let increasing = 0;
    for (let i = 1; i < differences.length; i++) {
      if (differences[i] > differences[i - 1]) increasing++;
    }

    return increasing / differences.length > 0.7;
  }

  /**
   * Check for sawtooth pattern
   */
  private hasSawtoothPattern(): boolean {
    if (this.snapshots.length < 10) return false;

    const recent = this.snapshots.slice(-10);
    let peaks = 0;
    let valleys = 0;

    for (let i = 1; i < recent.length - 1; i++) {
      const prev = recent[i - 1].heapUsed;
      const curr = recent[i].heapUsed;
      const next = recent[i + 1].heapUsed;

      if (curr > prev && curr > next) peaks++;
      if (curr < prev && curr < next) valleys++;
    }

    return peaks >= 3 && valleys >= 3;
  }

  /**
   * Check for step growth
   */
  private hasStepGrowth(): boolean {
    if (this.snapshots.length < 6) return false;

    const recent = this.snapshots.slice(-6);
    const jumps = [];

    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i].heapUsed - recent[i - 1].heapUsed;
      jumps.push(diff);
    }

    // Check for sudden large jumps
    const avgJump = jumps.reduce((sum, j) => sum + j, 0) / jumps.length;
    const largeJumps = jumps.filter(j => j > avgJump * 2).length;

    return largeJumps >= 2;
  }

  /**
   * Check for no cleanup pattern
   */
  private hasNoCleanup(): boolean {
    if (this.snapshots.length < 10) return false;

    const recent = this.snapshots.slice(-10);
    let decreases = 0;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].heapUsed < recent[i - 1].heapUsed * 0.95) {
        decreases++;
      }
    }

    return decreases === 0;
  }

  /**
   * Check if pattern indicates a leak
   */
  private isLeak(pattern: LeakPattern, trend: MemoryTrend): boolean {
    switch (pattern) {
      case 'steady-growth':
      case 'exponential-growth':
      case 'no-cleanup':
        return trend.growthRate > this.config.growthThreshold;

      case 'sawtooth':
      case 'step-growth':
        return trend.avgUsage > this.config.memoryCeiling * 0.8;

      default:
        return false;
    }
  }

  /**
   * Create leak report
   */
  private createLeakReport(pattern: LeakPattern, trend: MemoryTrend): MemoryLeak {
    const latest = this.getLatestSnapshot();
    const currentUsage = latest?.heapUsed || 0;

    // Calculate severity
    let severity: 'low' | 'medium' | 'high' | 'critical';
    const usagePercent = currentUsage / this.config.memoryCeiling;

    if (usagePercent > 0.95 || pattern === 'exponential-growth') {
      severity = 'critical';
    } else if (usagePercent > 0.85 || pattern === 'no-cleanup') {
      severity = 'high';
    } else if (usagePercent > 0.75 || pattern === 'step-growth') {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    // Estimate time to OOM
    let estimatedTimeToOOM: number | undefined;
    if (trend.growthRate > 0) {
      const remaining = this.config.memoryCeiling - currentUsage;
      estimatedTimeToOOM = (remaining / trend.growthRate) * 1000;
    }

    // Generate recommendation
    const recommendation = this.generateRecommendation(pattern, severity);

    return {
      timestamp: Date.now(),
      severity,
      growthRate: trend.growthRate,
      currentUsage,
      estimatedTimeToOOM,
      pattern,
      confidence: trend.confidence,
      recommendation,
    };
  }

  /**
   * Generate recommendation based on pattern and severity
   */
  private generateRecommendation(
    pattern: LeakPattern,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): string {
    const recommendations = {
      'steady-growth': 'Check for unbounded caches or event listeners',
      'exponential-growth': 'Immediate action required - investigate recursive allocations',
      'sawtooth': 'Review garbage collection frequency and object lifecycle',
      'step-growth': 'Investigate large allocations and consider chunking',
      'no-cleanup': 'Enable garbage collection and review object retention',
    };

    const base = recommendations[pattern];

    if (severity === 'critical') {
      return `CRITICAL: ${base}. Consider restarting application.`;
    } else if (severity === 'high') {
      return `HIGH: ${base}. Take action soon.`;
    }

    return base;
  }

  /**
   * Record a detected leak
   */
  private recordLeak(leak: MemoryLeak): void {
    this.leaks.push(leak);

    // Keep last 50 leaks
    if (this.leaks.length > 50) {
      this.leaks.shift();
    }

    // Call detection callback
    this.config.onLeakDetected(leak);

    // Trigger cleanup if enabled and leak is severe
    if (this.config.autoCleanup && leak.severity === 'critical') {
      this.triggerCleanup().catch(error => {
        console.error('[MemoryLeakDetector] Auto-cleanup failed:', error);
      });
    }
  }
}
