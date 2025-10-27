/**
 * Retry policy system with configurable backoff strategies
 *
 * Provides intelligent retry mechanisms with exponential backoff,
 * jitter, and per-error-type policies.
 */

import { ErrorType } from './ErrorClassifier';

/**
 * Backoff strategy types
 */
export type BackoffStrategy = 'exponential' | 'linear' | 'fixed';

/**
 * Retry policy configuration
 */
export interface RetryPolicyConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff strategy */
  strategy?: BackoffStrategy;
  /** Backoff multiplier (for exponential/linear) */
  multiplier?: number;
  /** Jitter to add randomness (0-1) */
  jitter?: number;
  /** Timeout for each attempt in milliseconds */
  timeout?: number;
  /** Per-error-type retry policies */
  errorPolicies?: Record<ErrorType, Partial<RetryPolicyConfig>>;
  /** Whether to retry immediately on first failure */
  retryImmediately?: boolean;
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  /** Attempt number (0-indexed) */
  attempt: number;
  /** Delay before this attempt in milliseconds */
  delay: number;
  /** Total elapsed time in milliseconds */
  elapsedTime: number;
  /** Error from previous attempt */
  previousError?: Error;
}

/**
 * Default retry policy configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<Omit<RetryPolicyConfig, 'errorPolicies'>> = {
  maxRetries: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  strategy: 'exponential',
  multiplier: 2,
  jitter: 0.1,             // 10% jitter
  timeout: 30000,          // 30 second timeout per attempt
  retryImmediately: false,
};

/**
 * Configurable retry policy with backoff strategies
 *
 * Implements retry logic with exponential backoff, jitter to prevent
 * thundering herd, and per-error-type customization.
 *
 * Features:
 * - Multiple backoff strategies (exponential, linear, fixed)
 * - Configurable jitter to prevent synchronized retries
 * - Per-error-type retry policies
 * - Timeout enforcement per attempt
 * - Abort controller integration for cancellation
 *
 * Usage:
 * ```ts
 * const policy = new RetryPolicy({
 *   maxRetries: 3,
 *   strategy: 'exponential',
 *   initialDelay: 1000,
 *   jitter: 0.1,
 *   errorPolicies: {
 *     rate_limit: {
 *       maxRetries: 5,
 *       initialDelay: 5000,
 *     },
 *   },
 * });
 *
 * const result = await policy.execute(async () => {
 *   return await fetchData();
 * });
 * ```
 */
export class RetryPolicy {
  private config: Required<Omit<RetryPolicyConfig, 'errorPolicies'>> & Pick<RetryPolicyConfig, 'errorPolicies'>;

  constructor(config: RetryPolicyConfig = {}) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    };
  }

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(
    operation: (attempt: RetryAttempt) => Promise<T>,
    errorType?: ErrorType,
    abortSignal?: AbortSignal
  ): Promise<T> {
    const effectiveConfig = this.getEffectiveConfig(errorType);
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= effectiveConfig.maxRetries; attempt++) {
      // Check if aborted
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      // Calculate delay
      const delay = attempt === 0 && effectiveConfig.retryImmediately
        ? 0
        : this.calculateDelay(attempt, effectiveConfig);

      // Wait before attempt (except first immediate attempt)
      if (delay > 0) {
        await this.sleep(delay, abortSignal);
      }

      const attemptInfo: RetryAttempt = {
        attempt,
        delay,
        elapsedTime: Date.now() - startTime,
        previousError: lastError,
      };

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(
          operation(attemptInfo),
          effectiveConfig.timeout,
          abortSignal
        );
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this was the last attempt, throw
        if (attempt === effectiveConfig.maxRetries) {
          throw new Error(
            `Operation failed after ${attempt + 1} attempts: ${lastError.message}`,
            { cause: lastError }
          );
        }

        // Continue to next attempt
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Operation failed');
  }

  /**
   * Calculate delay for a given attempt
   */
  calculateDelay(
    attempt: number,
    config: Required<Omit<RetryPolicyConfig, 'errorPolicies'>>
  ): number {
    let delay: number;

    switch (config.strategy) {
      case 'exponential':
        delay = config.initialDelay * Math.pow(config.multiplier, attempt);
        break;

      case 'linear':
        delay = config.initialDelay + (config.multiplier * attempt * 1000);
        break;

      case 'fixed':
        delay = config.initialDelay;
        break;

      default:
        delay = config.initialDelay;
    }

    // Apply max delay cap
    delay = Math.min(delay, config.maxDelay);

    // Apply jitter
    if (config.jitter > 0) {
      const jitterAmount = delay * config.jitter;
      const randomJitter = (Math.random() * 2 - 1) * jitterAmount;
      delay = Math.max(0, delay + randomJitter);
    }

    return Math.floor(delay);
  }

  /**
   * Get effective configuration for an error type
   */
  private getEffectiveConfig(errorType?: ErrorType): Required<Omit<RetryPolicyConfig, 'errorPolicies'>> {
    if (!errorType || !this.config.errorPolicies?.[errorType]) {
      return this.config;
    }

    const errorPolicy = this.config.errorPolicies[errorType];
    return {
      ...this.config,
      ...errorPolicy,
    } as Required<Omit<RetryPolicyConfig, 'errorPolicies'>>;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      // Clear timeout if aborted
      abortSignal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Operation cancelled'));
      });
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Sleep with abort support
   */
  private sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);

      // Clear timer if aborted
      abortSignal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Sleep cancelled'));
      });
    });
  }

  /**
   * Calculate expected delay for an attempt
   */
  getExpectedDelay(attempt: number, errorType?: ErrorType): number {
    const effectiveConfig = this.getEffectiveConfig(errorType);
    return this.calculateDelay(attempt, effectiveConfig);
  }

  /**
   * Get maximum total time for all retries
   */
  getMaxTotalTime(errorType?: ErrorType): number {
    const effectiveConfig = this.getEffectiveConfig(errorType);
    let totalTime = 0;

    for (let i = 0; i <= effectiveConfig.maxRetries; i++) {
      totalTime += this.calculateDelay(i, effectiveConfig);
      totalTime += effectiveConfig.timeout;
    }

    return totalTime;
  }

  /**
   * Check if an error type should be retried
   */
  shouldRetry(errorType: ErrorType, attempt: number): boolean {
    const effectiveConfig = this.getEffectiveConfig(errorType);
    return attempt < effectiveConfig.maxRetries;
  }
}

/**
 * Retry decorator for class methods
 *
 * Usage:
 * ```ts
 * class APIClient {
 *   @retry({ maxRetries: 3 })
 *   async fetchData() {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function retry(config?: RetryPolicyConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const policy = new RetryPolicy(config);

    descriptor.value = async function (...args: any[]) {
      return policy.execute(async () => {
        return await originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}
