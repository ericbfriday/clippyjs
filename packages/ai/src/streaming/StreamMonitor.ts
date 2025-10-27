/**
 * Stream Monitor for Performance Metrics Tracking
 *
 * Tracks bytes, tokens, rate, and performance metrics for streaming operations.
 */

import type { StreamProgress } from './StreamController';

/**
 * Detailed stream metrics
 */
export interface StreamMetrics {
  /** Total bytes received */
  bytesReceived: number;
  /** Total tokens received */
  tokensReceived: number;
  /** Total chunks processed */
  chunksProcessed: number;
  /** Current rate in tokens/second */
  currentRate: number;
  /** Average rate in tokens/second */
  averageRate: number;
  /** Peak rate in tokens/second */
  peakRate: number;
  /** Minimum rate in tokens/second */
  minRate: number;
  /** Total elapsed time in milliseconds */
  elapsedTime: number;
  /** Total paused time in milliseconds */
  pausedTime: number;
  /** Active streaming time in milliseconds */
  activeTime: number;
  /** Average chunk size in bytes */
  avgChunkSize: number;
  /** Average tokens per chunk */
  avgTokensPerChunk: number;
  /** Timestamp when monitoring started */
  startTime: number;
  /** Timestamp of last update */
  lastUpdateTime: number;
}

/**
 * Stream monitor configuration
 */
export interface StreamMonitorConfig {
  /** Enable detailed metrics tracking */
  detailedMetrics?: boolean;
  /** Sampling interval for rate calculations in milliseconds */
  samplingInterval?: number;
  /** Callback when metrics update */
  onMetricsUpdate?: (metrics: StreamMetrics) => void;
}

/**
 * StreamMonitor
 *
 * Monitors streaming operations and tracks performance metrics.
 *
 * Features:
 * - Track bytes, tokens, and chunks
 * - Calculate current, average, peak, and minimum rates
 * - Monitor elapsed and active streaming time
 * - Calculate average chunk sizes
 *
 * Usage:
 * ```typescript
 * const monitor = new StreamMonitor();
 *
 * // Start monitoring
 * monitor.start();
 *
 * // Record chunk
 * monitor.recordChunk(512, 128);
 *
 * // Get current metrics
 * const metrics = monitor.getMetrics();
 * console.log(`Rate: ${metrics.currentRate} tokens/sec`);
 *
 * // Stop monitoring
 * monitor.stop();
 * ```
 */
export class StreamMonitor {
  private config: StreamMonitorConfig;
  private metrics: StreamMetrics;
  private isMonitoring: boolean = false;
  private rateHistory: Array<{ time: number; tokens: number }> = [];
  private pauseStartTime: number = 0;
  private totalPausedTime: number = 0;

  constructor(config: StreamMonitorConfig = {}) {
    this.config = {
      detailedMetrics: true,
      samplingInterval: 1000,
      ...config,
    };

    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Start monitoring
   */
  start(): void {
    const now = Date.now();
    this.isMonitoring = true;
    this.metrics = this.createEmptyMetrics();
    this.metrics.startTime = now;
    this.metrics.lastUpdateTime = now;
    this.rateHistory = [];
    this.pauseStartTime = 0;
    this.totalPausedTime = 0;
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.isMonitoring) {
      this.updateElapsedTime();
      this.isMonitoring = false;
    }
  }

  /**
   * Pause monitoring
   */
  pause(): void {
    if (this.isMonitoring && this.pauseStartTime === 0) {
      this.pauseStartTime = Date.now();
    }
  }

  /**
   * Resume monitoring
   */
  resume(): void {
    if (this.pauseStartTime > 0) {
      this.totalPausedTime += Date.now() - this.pauseStartTime;
      this.metrics.pausedTime = this.totalPausedTime;
      this.pauseStartTime = 0;
    }
  }

  /**
   * Record a new chunk
   */
  recordChunk(bytes: number, tokens: number): void {
    if (!this.isMonitoring) {
      return;
    }

    const now = Date.now();

    // Update counters
    this.metrics.bytesReceived += bytes;
    this.metrics.tokensReceived += tokens;
    this.metrics.chunksProcessed += 1;
    this.metrics.lastUpdateTime = now;

    // Update rate tracking
    if (this.config.detailedMetrics) {
      this.rateHistory.push({ time: now, tokens });
      this.updateRates();
      this.updateAverages();
    }

    this.updateElapsedTime();
    this.notifyMetricsUpdate();
  }

  /**
   * Get bytes received
   */
  getBytesReceived(): number {
    return this.metrics.bytesReceived;
  }

  /**
   * Get tokens received
   */
  getTokensReceived(): number {
    return this.metrics.tokensReceived;
  }

  /**
   * Get current rate in tokens/second
   */
  getCurrentRate(): number {
    this.updateRates();
    return this.metrics.currentRate;
  }

  /**
   * Get average rate in tokens/second
   */
  getAverageRate(): number {
    return this.metrics.averageRate;
  }

  /**
   * Get all metrics
   */
  getMetrics(): StreamMetrics {
    if (this.isMonitoring) {
      this.updateElapsedTime();
      this.updateRates();
    }
    return { ...this.metrics };
  }

  /**
   * Reset monitor to initial state
   */
  reset(): void {
    this.isMonitoring = false;
    this.metrics = this.createEmptyMetrics();
    this.rateHistory = [];
    this.pauseStartTime = 0;
    this.totalPausedTime = 0;
  }

  /**
   * Create progress object from current metrics
   */
  toProgress(): StreamProgress {
    this.updateElapsedTime();
    this.updateRates();

    return {
      bytes: this.metrics.bytesReceived,
      tokens: this.metrics.tokensReceived,
      chunks: this.metrics.chunksProcessed,
      percentage: 0, // StreamController manages percentage
      avgRate: this.metrics.averageRate,
    };
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Update elapsed time metrics
   */
  private updateElapsedTime(): void {
    const now = Date.now();
    const currentPausedTime = this.pauseStartTime > 0 ? now - this.pauseStartTime : 0;
    this.metrics.elapsedTime = now - this.metrics.startTime;
    this.metrics.pausedTime = this.totalPausedTime + currentPausedTime;
    this.metrics.activeTime = this.metrics.elapsedTime - this.metrics.pausedTime;
  }

  /**
   * Update rate calculations
   */
  private updateRates(): void {
    if (!this.config.detailedMetrics || this.rateHistory.length === 0) {
      return;
    }

    const now = Date.now();
    const samplingInterval = this.config.samplingInterval || 1000;

    // Remove old rate history entries
    this.rateHistory = this.rateHistory.filter(
      (entry) => now - entry.time <= samplingInterval
    );

    // Calculate current rate from recent history
    if (this.rateHistory.length > 0) {
      const recentTokens = this.rateHistory.reduce((sum, entry) => sum + entry.tokens, 0);
      const timeSpan = now - this.rateHistory[0].time;

      if (timeSpan > 0) {
        this.metrics.currentRate = (recentTokens / timeSpan) * 1000;
      }
    }

    // Calculate average rate from total
    if (this.metrics.activeTime > 0) {
      this.metrics.averageRate = (this.metrics.tokensReceived / this.metrics.activeTime) * 1000;
    }

    // Update peak and min rates
    if (this.metrics.currentRate > this.metrics.peakRate) {
      this.metrics.peakRate = this.metrics.currentRate;
    }

    if (this.metrics.currentRate < this.metrics.minRate || this.metrics.minRate === 0) {
      if (this.metrics.currentRate > 0) {
        this.metrics.minRate = this.metrics.currentRate;
      }
    }
  }

  /**
   * Update average calculations
   */
  private updateAverages(): void {
    if (this.metrics.chunksProcessed > 0) {
      this.metrics.avgChunkSize = this.metrics.bytesReceived / this.metrics.chunksProcessed;
      this.metrics.avgTokensPerChunk = this.metrics.tokensReceived / this.metrics.chunksProcessed;
    }
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): StreamMetrics {
    return {
      bytesReceived: 0,
      tokensReceived: 0,
      chunksProcessed: 0,
      currentRate: 0,
      averageRate: 0,
      peakRate: 0,
      minRate: 0,
      elapsedTime: 0,
      pausedTime: 0,
      activeTime: 0,
      avgChunkSize: 0,
      avgTokensPerChunk: 0,
      startTime: 0,
      lastUpdateTime: 0,
    };
  }

  /**
   * Notify metrics update callback
   */
  private notifyMetricsUpdate(): void {
    if (this.config.onMetricsUpdate) {
      this.config.onMetricsUpdate(this.getMetrics());
    }
  }
}
