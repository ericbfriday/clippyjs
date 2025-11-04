/**
 * Enhanced circuit breaker with adaptive thresholds and health metrics
 *
 * Extends Sprint 4's CircuitBreaker with:
 * - Half-open state with gradual recovery
 * - Failure rate threshold (not just count)
 * - Adaptive timeout adjustment
 * - Circuit health metrics and telemetry
 */

import { CircuitBreaker, CircuitBreakerConfig, CircuitState } from '../errors/CircuitBreaker';

/**
 * Enhanced circuit breaker configuration
 */
export interface EnhancedCircuitBreakerConfig extends CircuitBreakerConfig {
  /** Enable adaptive threshold adjustment */
  adaptiveThresholds?: boolean;
  /** Minimum failure threshold (adaptive won't go below) */
  minFailureThreshold?: number;
  /** Maximum failure threshold (adaptive won't go above) */
  maxFailureThreshold?: number;
  /** Enable adaptive timeout adjustment */
  adaptiveTimeout?: boolean;
  /** Minimum reset timeout in ms */
  minResetTimeout?: number;
  /** Maximum reset timeout in ms */
  maxResetTimeout?: number;
  /** Success rate needed to close from half-open (0-1) */
  halfOpenSuccessRate?: number;
  /** Enable health score tracking */
  healthScoreEnabled?: boolean;
  /** Health score decay rate (0-1) */
  healthDecayRate?: number;
  /** Name for metrics and logging */
  name?: string;
}

/**
 * Circuit health metrics
 */
export interface CircuitHealthMetrics {
  healthScore: number;            // 0-100 current health score
  state: CircuitState;
  failureRate: number;            // Current failure rate
  successRate: number;            // Current success rate
  consecutiveFailures: number;    // Consecutive failures
  consecutiveSuccesses: number;   // Consecutive successes
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  avgResponseTime: number;        // Average response time in ms
  timeInState: number;           // Time in current state (ms)
  lastStateChange: number;       // Timestamp of last state change
  tripCount: number;             // Number of times circuit has tripped
}

/**
 * Request timing record
 */
interface RequestTiming {
  timestamp: number;
  success: boolean;
  duration: number;
}

/**
 * Default enhanced configuration
 */
export const DEFAULT_ENHANCED_CIRCUIT_CONFIG: Required<Omit<EnhancedCircuitBreakerConfig, 'onStateChange' | 'name'>> = {
  failureThreshold: 0.5,
  requestThreshold: 10,
  resetTimeout: 60000,
  monitoringWindow: 120000,
  halfOpenRequests: 3,
  adaptiveThresholds: true,
  minFailureThreshold: 0.3,
  maxFailureThreshold: 0.8,
  adaptiveTimeout: true,
  minResetTimeout: 30000,      // 30 seconds min
  maxResetTimeout: 300000,     // 5 minutes max
  halfOpenSuccessRate: 0.8,    // 80% success needed to close
  healthScoreEnabled: true,
  healthDecayRate: 0.1,        // 10% decay per monitoring window
};

/**
 * Enhanced circuit breaker with adaptive behavior
 *
 * Extends base CircuitBreaker with production-grade features:
 * - Adaptive thresholds based on historical patterns
 * - Gradual recovery with configurable success requirements
 * - Health score tracking for proactive monitoring
 * - Response time tracking and adaptive timeouts
 * - Comprehensive metrics and telemetry
 *
 * Features:
 * - Adaptive failure thresholds that adjust to traffic patterns
 * - Half-open state requires sustained success to close
 * - Health score (0-100) tracks circuit wellness
 * - Automatic timeout adjustment based on response times
 * - Detailed metrics for monitoring and debugging
 *
 * Usage:
 * ```ts
 * const circuit = new EnhancedCircuitBreaker({
 *   name: 'api-circuit',
 *   adaptiveThresholds: true,
 *   halfOpenSuccessRate: 0.8,
 *   healthScoreEnabled: true,
 * });
 *
 * await circuit.executeEnhanced(async () => {
 *   return await apiCall();
 * });
 * ```
 */
export class EnhancedCircuitBreaker extends CircuitBreaker {
  private enhancedConfig: Required<Omit<EnhancedCircuitBreakerConfig, 'onStateChange' | 'name'>> & Pick<EnhancedCircuitBreakerConfig, 'name'>;
  private requestTimings: RequestTiming[] = [];
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private healthScore = 100;
  private lastHealthUpdate = Date.now();
  private tripCount = 0;
  private stateStartTime = Date.now();
  private totalResponseTime = 0;
  private currentThreshold: number;
  private currentResetTimeout: number;

  constructor(config: EnhancedCircuitBreakerConfig = {}) {
    // Add state change callback to track trips
    const originalOnStateChange = config.onStateChange;
    const enhancedConfig = {
      ...config,
      onStateChange: (state: CircuitState, reason: string) => {
        // Track when circuit opens (trips)
        if (state === 'open') {
          this.tripCount++;
        }
        // Update state start time on any state change
        this.stateStartTime = Date.now();
        // Call original callback if provided
        if (originalOnStateChange) {
          originalOnStateChange(state, reason);
        }
      },
    };

    super(enhancedConfig);
    this.enhancedConfig = {
      ...DEFAULT_ENHANCED_CIRCUIT_CONFIG,
      ...config,
    };
    this.currentThreshold = this.enhancedConfig.failureThreshold || 0.5;
    this.currentResetTimeout = this.enhancedConfig.resetTimeout || 60000;
  }

  /**
   * Execute operation with enhanced circuit breaker logic
   */
  async executeEnhanced<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    // Update health score with decay
    this.updateHealthScore();

    try {
      // Execute through base circuit breaker
      const result = await this.execute(operation);

      // Record successful request
      const duration = Date.now() - startTime;
      this.recordRequest(true, duration);

      return result;
    } catch (error) {
      // Record failed request
      const duration = Date.now() - startTime;
      this.recordRequest(false, duration);

      throw error;
    }
  }

  /**
   * Record request with timing
   */
  private recordRequest(success: boolean, duration: number): void {
    // Add timing record
    this.requestTimings.push({
      timestamp: Date.now(),
      success,
      duration,
    });

    this.totalResponseTime += duration;

    // Clean up old records
    this.cleanupTimings();

    // Update consecutive counters
    if (success) {
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
    }

    // Update health score based on success/failure
    if (this.enhancedConfig.healthScoreEnabled) {
      if (success) {
        this.healthScore = Math.min(100, this.healthScore + 2);
      } else {
        this.healthScore = Math.max(0, this.healthScore - 5);
      }
    }

    // Check if we should adjust thresholds
    if (this.enhancedConfig.adaptiveThresholds) {
      this.adjustThresholds();
    }

    // Check if we should adjust timeout
    if (this.enhancedConfig.adaptiveTimeout) {
      this.adjustTimeout();
    }

    // Check half-open state success rate
    if (this.getState() === 'half-open') {
      this.checkHalfOpenSuccess();
    }
  }

  /**
   * Update health score with time-based decay
   */
  private updateHealthScore(): void {
    if (!this.enhancedConfig.healthScoreEnabled) return;

    const now = Date.now();
    const timeSinceUpdate = now - this.lastHealthUpdate;
    const windowsPassed = timeSinceUpdate / this.enhancedConfig.monitoringWindow;

    if (windowsPassed >= 1) {
      // Apply decay for each window passed
      const decayFactor = Math.pow(1 - this.enhancedConfig.healthDecayRate, windowsPassed);
      this.healthScore = Math.max(0, this.healthScore * decayFactor);
      this.lastHealthUpdate = now;
    }
  }

  /**
   * Adjust failure threshold based on patterns
   */
  private adjustThresholds(): void {
    const recentTimings = this.getRecentTimings();
    if (recentTimings.length < this.enhancedConfig.requestThreshold) return;

    const failureRate = this.calculateFailureRateEnhanced(recentTimings);
    const avgFailureRate = failureRate;

    // If we're consistently below threshold, we can lower it
    if (avgFailureRate < this.currentThreshold * 0.7) {
      this.currentThreshold = Math.max(
        this.enhancedConfig.minFailureThreshold,
        this.currentThreshold * 0.9
      );
    }
    // If we're consistently at threshold, raise it slightly
    else if (avgFailureRate > this.currentThreshold * 0.9) {
      this.currentThreshold = Math.min(
        this.enhancedConfig.maxFailureThreshold,
        this.currentThreshold * 1.1
      );
    }
  }

  /**
   * Adjust reset timeout based on recovery patterns
   */
  private adjustTimeout(): void {
    // Increase timeout if we're experiencing repeated failures
    if (this.consecutiveFailures > 5) {
      this.currentResetTimeout = Math.min(
        this.enhancedConfig.maxResetTimeout,
        this.currentResetTimeout * 1.5
      );
    }
    // Decrease timeout if circuit is healthy
    else if (this.healthScore > 80 && this.getState() === 'closed') {
      this.currentResetTimeout = Math.max(
        this.enhancedConfig.minResetTimeout,
        this.currentResetTimeout * 0.9
      );
    }
  }

  /**
   * Check if half-open state should transition to closed
   */
  private checkHalfOpenSuccess(): void {
    const halfOpenTimings = this.requestTimings.filter(
      r => r.timestamp >= this.stateStartTime
    );

    if (halfOpenTimings.length >= this.enhancedConfig.halfOpenRequests) {
      const successRate = this.calculateSuccessRate(halfOpenTimings);

      if (successRate >= this.enhancedConfig.halfOpenSuccessRate) {
        // Sufficient success rate to close circuit
        this.reset();
      } else if (successRate < 0.5) {
        // Poor success rate, reopen circuit
        this.forceOpen('Half-open test failed with low success rate');
      }
    }
  }

  /**
   * Get recent request timings
   */
  private getRecentTimings(): RequestTiming[] {
    const cutoff = Date.now() - this.enhancedConfig.monitoringWindow;
    return this.requestTimings.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Calculate failure rate from timings
   */
  private calculateFailureRateEnhanced(timings: RequestTiming[]): number {
    if (timings.length === 0) return 0;
    const failures = timings.filter(r => !r.success).length;
    return failures / timings.length;
  }

  /**
   * Calculate success rate from timings
   */
  private calculateSuccessRate(timings: RequestTiming[]): number {
    return 1 - this.calculateFailureRateEnhanced(timings);
  }

  /**
   * Calculate average response time
   */
  private calculateAvgResponseTime(): number {
    const recentTimings = this.getRecentTimings();
    if (recentTimings.length === 0) return 0;

    const totalDuration = recentTimings.reduce((sum, r) => sum + r.duration, 0);
    return totalDuration / recentTimings.length;
  }

  /**
   * Clean up old timing records
   */
  private cleanupTimings(): void {
    const cutoff = Date.now() - this.enhancedConfig.monitoringWindow * 2;
    this.requestTimings = this.requestTimings.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Get comprehensive health metrics
   */
  getHealthMetrics(): CircuitHealthMetrics {
    const baseStats = this.getStats();
    const recentTimings = this.getRecentTimings();

    return {
      healthScore: Math.round(this.healthScore),
      state: baseStats.state,
      failureRate: baseStats.failureRate,
      successRate: 1 - baseStats.failureRate,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      totalRequests: baseStats.totalRequests,
      totalFailures: baseStats.failures,
      totalSuccesses: baseStats.successes,
      avgResponseTime: this.calculateAvgResponseTime(),
      timeInState: Date.now() - this.stateStartTime,
      lastStateChange: this.stateStartTime,
      tripCount: this.tripCount,
    };
  }

  /**
   * Get current adaptive thresholds
   */
  getAdaptiveThresholds() {
    return {
      currentFailureThreshold: this.currentThreshold,
      currentResetTimeout: this.currentResetTimeout,
      minFailureThreshold: this.enhancedConfig.minFailureThreshold,
      maxFailureThreshold: this.enhancedConfig.maxFailureThreshold,
      minResetTimeout: this.enhancedConfig.minResetTimeout,
      maxResetTimeout: this.enhancedConfig.maxResetTimeout,
    };
  }

  /**
   * Override reset to clear consecutive counters - state time handled by callback
   */
  reset(): void {
    super.reset();
    // State time is tracked in the onStateChange callback
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
  }

  /**
   * Override forceOpen - state time tracking handled by callback
   */
  forceOpen(reason?: string): void {
    // Trip count and state time are tracked in the onStateChange callback
    super.forceOpen(reason);
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics() {
    const metrics = this.getHealthMetrics();
    const thresholds = this.getAdaptiveThresholds();

    return {
      ...metrics,
      ...thresholds,
      config: {
        adaptiveThresholds: this.enhancedConfig.adaptiveThresholds,
        adaptiveTimeout: this.enhancedConfig.adaptiveTimeout,
        healthScoreEnabled: this.enhancedConfig.healthScoreEnabled,
        halfOpenSuccessRate: this.enhancedConfig.halfOpenSuccessRate,
      },
    };
  }

  /**
   * Reset metrics and state
   */
  resetMetrics(): void {
    this.requestTimings = [];
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.healthScore = 100;
    this.lastHealthUpdate = Date.now();
    this.tripCount = 0;
    this.totalResponseTime = 0;
    this.currentThreshold = this.enhancedConfig.failureThreshold || 0.5;
    this.currentResetTimeout = this.enhancedConfig.resetTimeout || 60000;
  }
}
