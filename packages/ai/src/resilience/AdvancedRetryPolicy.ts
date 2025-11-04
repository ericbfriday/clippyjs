/**
 * Advanced retry policy with circuit breaker integration and adaptive backoff
 *
 * Extends Sprint 4's RetryPolicy with:
 * - Retry budgets to prevent retry storms
 * - Circuit breaker coordination
 * - Adaptive backoff based on success rates
 * - Per-operation retry configuration
 */

import { RetryPolicy, RetryPolicyConfig, BackoffStrategy, RetryAttempt } from '../errors/RetryPolicy';
import { ErrorType } from '../errors/ErrorClassifier';
import { CircuitBreaker } from '../errors/CircuitBreaker';

/**
 * Advanced retry configuration extending base policy
 */
export interface AdvancedRetryConfig extends RetryPolicyConfig {
  /** Maximum retries allowed in a time window (prevents retry storms) */
  retryBudget?: number;
  /** Time window for retry budget in milliseconds */
  budgetWindow?: number;
  /** Enable circuit breaker integration */
  circuitBreakerIntegration?: boolean;
  /** Enable adaptive backoff based on success rate */
  adaptiveBackoff?: boolean;
  /** Success rate threshold for adaptive backoff (0-1) */
  adaptiveThreshold?: number;
  /** Name for metrics and logging */
  name?: string;
  /** Enable telemetry */
  telemetryEnabled?: boolean;
}

/**
 * Retry budget tracker
 */
interface RetryBudgetWindow {
  startTime: number;
  retryCount: number;
}

/**
 * Adaptive backoff state
 */
interface AdaptiveState {
  successCount: number;
  failureCount: number;
  lastAdjustment: number;
  backoffMultiplier: number; // Current multiplier adjustment (0.5-2.0)
}

/**
 * Retry metrics
 */
export interface RetryMetrics {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  budgetExhausted: number;
  circuitBreakerTrips: number;
  averageDelay: number;
  successRate: number;
}

/**
 * Default advanced retry configuration
 */
export const DEFAULT_ADVANCED_RETRY_CONFIG: Required<Omit<AdvancedRetryConfig, 'errorPolicies' | 'name'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  strategy: 'exponential',
  multiplier: 2,
  jitter: 0.1,
  timeout: 30000,
  retryImmediately: false,
  retryBudget: 100,          // 100 retries per window
  budgetWindow: 60000,       // 1 minute window
  circuitBreakerIntegration: true,
  adaptiveBackoff: true,
  adaptiveThreshold: 0.7,    // Adjust if success rate < 70%
  telemetryEnabled: true,
};

/**
 * Advanced retry policy with circuit breaker integration
 *
 * Extends base RetryPolicy with production-grade features:
 * - Retry budgets prevent retry storms during outages
 * - Circuit breaker coordination for faster failure detection
 * - Adaptive backoff adjusts delays based on success patterns
 * - Per-operation configuration and metrics
 *
 * Features:
 * - Retry budget enforcement to prevent resource exhaustion
 * - Circuit breaker integration for coordinated failure handling
 * - Adaptive backoff that learns from success/failure patterns
 * - Comprehensive metrics and telemetry
 * - Per-error-type and per-operation policies
 *
 * Usage:
 * ```ts
 * const policy = new AdvancedRetryPolicy({
 *   name: 'api-client',
 *   retryBudget: 50,
 *   budgetWindow: 30000,
 *   adaptiveBackoff: true,
 * });
 *
 * const result = await policy.execute(
 *   async () => await apiCall(),
 *   errorType,
 *   circuitBreaker
 * );
 * ```
 */
export class AdvancedRetryPolicy extends RetryPolicy {
  private advancedConfig: Required<Omit<AdvancedRetryConfig, 'errorPolicies' | 'name'>> & Pick<AdvancedRetryConfig, 'name'>;
  private budgetWindows: RetryBudgetWindow[] = [];
  private adaptiveState: AdaptiveState = {
    successCount: 0,
    failureCount: 0,
    lastAdjustment: Date.now(),
    backoffMultiplier: 1.0,
  };
  private metrics: RetryMetrics = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    budgetExhausted: 0,
    circuitBreakerTrips: 0,
    averageDelay: 0,
    successRate: 0,
  };
  private totalDelay = 0;

  constructor(config: AdvancedRetryConfig = {}) {
    super(config);
    this.advancedConfig = {
      ...DEFAULT_ADVANCED_RETRY_CONFIG,
      ...config,
    };
  }

  /**
   * Execute operation with advanced retry logic
   */
  async executeAdvanced<T>(
    operation: (attempt: RetryAttempt) => Promise<T>,
    errorType?: ErrorType,
    circuitBreaker?: CircuitBreaker,
    abortSignal?: AbortSignal
  ): Promise<T> {
    // Check retry budget
    if (!this.checkRetryBudget()) {
      this.metrics.budgetExhausted++;
      throw new Error(
        `Retry budget exhausted: ${this.advancedConfig.retryBudget} retries in ${this.advancedConfig.budgetWindow}ms window`
      );
    }

    // Check circuit breaker if integration enabled
    if (this.advancedConfig.circuitBreakerIntegration && circuitBreaker) {
      const state = circuitBreaker.getState();
      if (state === 'open') {
        this.metrics.circuitBreakerTrips++;
        throw new Error('Circuit breaker is open, operation rejected');
      }
    }

    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.advancedConfig.maxRetries; attempt++) {
      this.metrics.totalAttempts++;

      // Check abort signal
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      // Calculate delay with adaptive backoff
      const baseDelay = attempt === 0 && this.advancedConfig.retryImmediately
        ? 0
        : this.calculateAdaptiveDelay(attempt);

      if (baseDelay > 0) {
        this.totalDelay += baseDelay;
        await this.sleepAdvanced(baseDelay, abortSignal);
      }

      const attemptInfo: RetryAttempt = {
        attempt,
        delay: baseDelay,
        elapsedTime: Date.now() - startTime,
        previousError: lastError,
      };

      try {
        // Execute through circuit breaker if provided
        let result: T;
        if (this.advancedConfig.circuitBreakerIntegration && circuitBreaker) {
          result = await circuitBreaker.execute(async () => {
            return await this.executeWithTimeoutAdvanced(
              operation(attemptInfo),
              this.advancedConfig.timeout,
              abortSignal
            );
          });
        } else {
          result = await this.executeWithTimeoutAdvanced(
            operation(attemptInfo),
            this.advancedConfig.timeout,
            abortSignal
          );
        }

        // Record success
        this.recordRetryBudgetUsage();
        this.updateAdaptiveState(true);
        if (attempt > 0) {
          this.metrics.successfulRetries++;
        }
        this.updateMetrics();

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.updateAdaptiveState(false);

        // If this was the last attempt, throw
        if (attempt === this.advancedConfig.maxRetries) {
          this.metrics.failedRetries++;
          this.updateMetrics();
          const error = new Error(
            `Operation failed after ${attempt + 1} attempts: ${lastError.message}`
          );
          (error as any).cause = lastError;
          throw error;
        }

        // Record retry budget usage
        this.recordRetryBudgetUsage();
      }
    }

    // Should never reach here
    throw lastError || new Error('Operation failed');
  }

  /**
   * Calculate delay with adaptive backoff
   */
  private calculateAdaptiveDelay(attempt: number): number {
    // Get base delay from parent class
    const baseDelay = this.calculateDelay(attempt, {
      maxRetries: this.advancedConfig.maxRetries,
      initialDelay: this.advancedConfig.initialDelay,
      maxDelay: this.advancedConfig.maxDelay,
      strategy: this.advancedConfig.strategy,
      multiplier: this.advancedConfig.multiplier,
      jitter: this.advancedConfig.jitter,
      timeout: this.advancedConfig.timeout,
      retryImmediately: this.advancedConfig.retryImmediately,
    });

    // Apply adaptive multiplier if enabled
    if (this.advancedConfig.adaptiveBackoff) {
      const adjustedDelay = baseDelay * this.adaptiveState.backoffMultiplier;
      return Math.min(adjustedDelay, this.advancedConfig.maxDelay);
    }

    return baseDelay;
  }

  /**
   * Update adaptive state based on success/failure
   */
  private updateAdaptiveState(success: boolean): void {
    if (!this.advancedConfig.adaptiveBackoff) return;

    if (success) {
      this.adaptiveState.successCount++;
    } else {
      this.adaptiveState.failureCount++;
    }

    // Adjust backoff multiplier every 10 operations or every 30 seconds
    const totalOps = this.adaptiveState.successCount + this.adaptiveState.failureCount;
    const timeSinceLastAdjustment = Date.now() - this.adaptiveState.lastAdjustment;

    if (totalOps >= 10 || timeSinceLastAdjustment >= 30000) {
      const successRate = this.adaptiveState.successCount / totalOps;

      // If success rate is low, increase backoff
      if (successRate < this.advancedConfig.adaptiveThreshold) {
        this.adaptiveState.backoffMultiplier = Math.min(
          this.adaptiveState.backoffMultiplier * 1.5,
          2.0 // Max 2x multiplier
        );
      } else {
        // If success rate is good, decrease backoff
        this.adaptiveState.backoffMultiplier = Math.max(
          this.adaptiveState.backoffMultiplier * 0.8,
          0.5 // Min 0.5x multiplier
        );
      }

      // Reset counters
      this.adaptiveState.successCount = 0;
      this.adaptiveState.failureCount = 0;
      this.adaptiveState.lastAdjustment = Date.now();
    }
  }

  /**
   * Check if retry budget allows another attempt
   */
  private checkRetryBudget(): boolean {
    this.cleanupBudgetWindows();

    const currentWindow = this.getCurrentBudgetWindow();
    return currentWindow.retryCount < this.advancedConfig.retryBudget;
  }

  /**
   * Record retry budget usage
   */
  private recordRetryBudgetUsage(): void {
    const currentWindow = this.getCurrentBudgetWindow();
    currentWindow.retryCount++;
  }

  /**
   * Get or create current budget window
   */
  private getCurrentBudgetWindow(): RetryBudgetWindow {
    const now = Date.now();
    const windowStart = now - (now % this.advancedConfig.budgetWindow);

    let window = this.budgetWindows.find(w => w.startTime === windowStart);
    if (!window) {
      window = {
        startTime: windowStart,
        retryCount: 0,
      };
      this.budgetWindows.push(window);
    }

    return window;
  }

  /**
   * Clean up old budget windows
   */
  private cleanupBudgetWindows(): void {
    const cutoff = Date.now() - this.advancedConfig.budgetWindow;
    this.budgetWindows = this.budgetWindows.filter(w => w.startTime >= cutoff);
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const totalRetries = this.metrics.successfulRetries + this.metrics.failedRetries;
    this.metrics.successRate = totalRetries > 0
      ? this.metrics.successfulRetries / totalRetries
      : 0;
    this.metrics.averageDelay = this.metrics.totalAttempts > 0
      ? this.totalDelay / this.metrics.totalAttempts
      : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get adaptive state
   */
  getAdaptiveState(): Readonly<AdaptiveState> {
    return { ...this.adaptiveState };
  }

  /**
   * Reset metrics and state
   */
  reset(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      budgetExhausted: 0,
      circuitBreakerTrips: 0,
      averageDelay: 0,
      successRate: 0,
    };
    this.totalDelay = 0;
    this.adaptiveState = {
      successCount: 0,
      failureCount: 0,
      lastAdjustment: Date.now(),
      backoffMultiplier: 1.0,
    };
    this.budgetWindows = [];
  }

  /**
   * Execute with timeout helper
   */
  private async executeWithTimeoutAdvanced<T>(
    promise: Promise<T>,
    timeout: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      abortSignal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Operation cancelled'));
      });
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Sleep helper
   */
  private sleepAdvanced(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);

      abortSignal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Sleep cancelled'));
      });
    });
  }
}
