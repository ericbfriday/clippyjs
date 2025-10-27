/**
 * Error recovery and graceful degradation strategies
 *
 * Provides intelligent fallback mechanisms for handling errors
 * and maintaining service quality during failures.
 */

import type { ErrorInfo } from './ErrorClassifier';

/**
 * Recovery strategy types
 */
export type RecoveryStrategyType =
  | 'fallback'       // Switch to fallback provider/method
  | 'degrade'        // Reduce functionality gracefully
  | 'cache'          // Use cached data
  | 'default'        // Return default value
  | 'skip'           // Skip operation and continue
  | 'retry'          // Retry with backoff
  | 'fail';          // Fail fast

/**
 * Recovery action result
 */
export interface RecoveryAction<T = unknown> {
  /** Strategy used */
  strategy: RecoveryStrategyType;
  /** Whether recovery was successful */
  success: boolean;
  /** Recovered value if successful */
  value?: T;
  /** Error if recovery failed */
  error?: Error;
  /** Additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Recovery strategy configuration
 */
export interface RecoveryStrategyConfig<T = unknown> {
  /** Fallback function to try */
  fallback?: () => Promise<T> | T;
  /** Default value to use */
  defaultValue?: T;
  /** Cache lookup function */
  cacheGet?: (key: string) => Promise<T | undefined> | T | undefined;
  /** Cache key for the operation */
  cacheKey?: string;
  /** Whether to allow graceful degradation */
  allowDegradation?: boolean;
  /** Whether to skip failed operations */
  allowSkip?: boolean;
  /** Maximum degradation attempts */
  maxDegradationAttempts?: number;
  /** Callback when recovery succeeds */
  onRecovery?: (action: RecoveryAction<T>) => void;
  /** Callback when recovery fails */
  onRecoveryFailure?: (action: RecoveryAction<T>) => void;
}

/**
 * Recovery strategy executor
 *
 * Implements intelligent recovery strategies for handling errors
 * and maintaining service quality during failures.
 *
 * Features:
 * - Multiple recovery strategies (fallback, cache, default, degrade)
 * - Configurable degradation levels
 * - Cache integration for offline/degraded modes
 * - Recovery callbacks for monitoring
 * - Graceful degradation patterns
 *
 * Usage:
 * ```ts
 * const recovery = new RecoveryStrategy({
 *   fallback: async () => await secondaryAPI(),
 *   cacheGet: (key) => cache.get(key),
 *   defaultValue: { message: "Service temporarily unavailable" },
 * });
 *
 * try {
 *   const result = await primaryAPI();
 *   return result;
 * } catch (error) {
 *   const recovered = await recovery.recover(error);
 *   if (recovered.success) {
 *     return recovered.value;
 *   }
 *   throw recovered.error;
 * }
 * ```
 */
export class RecoveryStrategy<T = unknown> {
  private config: RecoveryStrategyConfig<T>;
  private degradationAttempts = 0;

  constructor(config: RecoveryStrategyConfig<T> = {}) {
    this.config = config;
  }

  /**
   * Attempt to recover from an error
   */
  async recover(error: unknown, errorInfo?: ErrorInfo): Promise<RecoveryAction<T>> {
    // Try strategies in order of preference

    // 1. Try fallback if available
    if (this.config.fallback) {
      const fallbackResult = await this.tryFallback();
      if (fallbackResult.success) {
        return fallbackResult;
      }
    }

    // 2. Try cache if available and error is retryable
    if (this.config.cacheGet && this.config.cacheKey) {
      const cacheResult = await this.tryCache();
      if (cacheResult.success) {
        return cacheResult;
      }
    }

    // 3. Try graceful degradation if allowed
    if (this.config.allowDegradation && !this.hasExceededDegradationLimit()) {
      const degradeResult = await this.tryDegrade();
      if (degradeResult.success) {
        return degradeResult;
      }
    }

    // 4. Try default value if available
    if (this.config.defaultValue !== undefined) {
      return this.useDefault();
    }

    // 5. Skip if allowed (for non-critical operations)
    if (this.config.allowSkip) {
      return this.skip();
    }

    // 6. No recovery possible, fail
    return this.fail(error);
  }

  /**
   * Try fallback function
   */
  private async tryFallback(): Promise<RecoveryAction<T>> {
    try {
      const value = await Promise.resolve(this.config.fallback!());
      const action: RecoveryAction<T> = {
        strategy: 'fallback',
        success: true,
        value,
        metadata: { attemptedAt: Date.now() },
      };

      if (this.config.onRecovery) {
        this.config.onRecovery(action);
      }

      return action;
    } catch (error) {
      const action: RecoveryAction<T> = {
        strategy: 'fallback',
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { attemptedAt: Date.now() },
      };

      if (this.config.onRecoveryFailure) {
        this.config.onRecoveryFailure(action);
      }

      return action;
    }
  }

  /**
   * Try cache lookup
   */
  private async tryCache(): Promise<RecoveryAction<T>> {
    try {
      const cached = await Promise.resolve(
        this.config.cacheGet!(this.config.cacheKey!)
      );

      if (cached !== undefined) {
        const action: RecoveryAction<T> = {
          strategy: 'cache',
          success: true,
          value: cached,
          metadata: {
            cacheKey: this.config.cacheKey,
            retrievedAt: Date.now(),
          },
        };

        if (this.config.onRecovery) {
          this.config.onRecovery(action);
        }

        return action;
      }

      return {
        strategy: 'cache',
        success: false,
        metadata: { cacheKey: this.config.cacheKey, cacheMiss: true },
      };
    } catch (error) {
      return {
        strategy: 'cache',
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { cacheKey: this.config.cacheKey },
      };
    }
  }

  /**
   * Try graceful degradation
   */
  private async tryDegrade(): Promise<RecoveryAction<T>> {
    this.degradationAttempts++;

    // Degradation logic depends on application context
    // This is a placeholder that applications can extend
    const action: RecoveryAction<T> = {
      strategy: 'degrade',
      success: false,
      metadata: {
        degradationLevel: this.degradationAttempts,
        maxAttempts: this.config.maxDegradationAttempts || 3,
      },
    };

    if (this.config.onRecoveryFailure) {
      this.config.onRecoveryFailure(action);
    }

    return action;
  }

  /**
   * Use default value
   */
  private useDefault(): RecoveryAction<T> {
    const action: RecoveryAction<T> = {
      strategy: 'default',
      success: true,
      value: this.config.defaultValue,
      metadata: { usedDefaultValue: true },
    };

    if (this.config.onRecovery) {
      this.config.onRecovery(action);
    }

    return action;
  }

  /**
   * Skip operation
   */
  private skip(): RecoveryAction<T> {
    const action: RecoveryAction<T> = {
      strategy: 'skip',
      success: true,
      metadata: { skipped: true },
    };

    if (this.config.onRecovery) {
      this.config.onRecovery(action);
    }

    return action;
  }

  /**
   * Fail without recovery
   */
  private fail(error: unknown): RecoveryAction<T> {
    const action: RecoveryAction<T> = {
      strategy: 'fail',
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      metadata: { noRecoveryAvailable: true },
    };

    if (this.config.onRecoveryFailure) {
      this.config.onRecoveryFailure(action);
    }

    return action;
  }

  /**
   * Check if degradation limit exceeded
   */
  private hasExceededDegradationLimit(): boolean {
    const maxAttempts = this.config.maxDegradationAttempts || 3;
    return this.degradationAttempts >= maxAttempts;
  }

  /**
   * Reset degradation counter
   */
  reset(): void {
    this.degradationAttempts = 0;
  }

  /**
   * Get current degradation level
   */
  getDegradationLevel(): number {
    return this.degradationAttempts;
  }
}

/**
 * Predefined recovery strategies for common scenarios
 */
export const RecoveryStrategies = {
  /**
   * Simple fallback strategy
   */
  fallback: <T>(fallbackFn: () => Promise<T> | T): RecoveryStrategyConfig<T> => ({
    fallback: fallbackFn,
  }),

  /**
   * Cache-first strategy
   */
  cacheFirst: <T>(
    cacheGet: (key: string) => Promise<T | undefined> | T | undefined,
    cacheKey: string
  ): RecoveryStrategyConfig<T> => ({
    cacheGet,
    cacheKey,
  }),

  /**
   * Default value strategy
   */
  useDefault: <T>(defaultValue: T): RecoveryStrategyConfig<T> => ({
    defaultValue,
  }),

  /**
   * Skip strategy
   */
  skip: <T>(): RecoveryStrategyConfig<T> => ({
    allowSkip: true,
  }),

  /**
   * Cascading strategy (try fallback, then cache, then default)
   */
  cascading: <T>(
    fallbackFn: () => Promise<T> | T,
    cacheGet: (key: string) => Promise<T | undefined> | T | undefined,
    cacheKey: string,
    defaultValue: T
  ): RecoveryStrategyConfig<T> => ({
    fallback: fallbackFn,
    cacheGet,
    cacheKey,
    defaultValue,
  }),
};
