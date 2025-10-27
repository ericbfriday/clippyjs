/**
 * Telemetry hooks for error reporting and monitoring
 *
 * Provides integration points for external error reporting services
 * and custom error handling logic.
 */

import type { ErrorInfo } from './ErrorClassifier';
import type { CircuitState } from './CircuitBreaker';
import type { RecoveryAction } from './RecoveryStrategies';

/**
 * Error event data
 */
export interface ErrorEvent {
  /** Error information */
  error: ErrorInfo;
  /** Original error object */
  originalError: unknown;
  /** Timestamp */
  timestamp: number;
  /** Context where error occurred */
  context?: Record<string, unknown>;
  /** Whether error was recovered */
  recovered?: boolean;
  /** Recovery action if applicable */
  recoveryAction?: RecoveryAction;
}

/**
 * Circuit breaker event data
 */
export interface CircuitBreakerEvent {
  /** Circuit identifier */
  circuitKey: string;
  /** New circuit state */
  state: CircuitState;
  /** Reason for state change */
  reason: string;
  /** Timestamp */
  timestamp: number;
  /** Circuit statistics */
  stats: {
    failureRate: number;
    totalRequests: number;
    failures: number;
    successes: number;
  };
}

/**
 * Retry event data
 */
export interface RetryEvent {
  /** Attempt number */
  attempt: number;
  /** Max retry attempts */
  maxAttempts: number;
  /** Delay before retry in ms */
  delay: number;
  /** Error being retried */
  error: ErrorInfo;
  /** Timestamp */
  timestamp: number;
  /** Whether retry succeeded */
  success?: boolean;
}

/**
 * Telemetry hook callbacks
 */
export interface TelemetryCallbacks {
  /** Called when an error occurs */
  onError?: (event: ErrorEvent) => void | Promise<void>;
  /** Called when circuit breaker changes state */
  onCircuitBreaker?: (event: CircuitBreakerEvent) => void | Promise<void>;
  /** Called when retry attempt is made */
  onRetry?: (event: RetryEvent) => void | Promise<void>;
  /** Called when recovery is attempted */
  onRecovery?: (event: { error: ErrorInfo; recovery: RecoveryAction }) => void | Promise<void>;
}

/**
 * Global telemetry manager
 *
 * Provides centralized error reporting and monitoring integration.
 *
 * Usage:
 * ```ts
 * // Setup telemetry
 * Telemetry.configure({
 *   onError: async (event) => {
 *     await Sentry.captureException(event.originalError, {
 *       extra: event.context,
 *       tags: { errorType: event.error.type },
 *     });
 *   },
 *   onCircuitBreaker: (event) => {
 *     console.log(`Circuit ${event.circuitKey} ${event.state}: ${event.reason}`);
 *   },
 * });
 *
 * // Emit events
 * Telemetry.reportError(error, errorInfo, { userId: '123' });
 * ```
 */
export class Telemetry {
  private static callbacks: TelemetryCallbacks = {};
  private static enabled = true;

  /**
   * Configure telemetry callbacks
   */
  static configure(callbacks: TelemetryCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Enable telemetry
   */
  static enable(): void {
    this.enabled = true;
  }

  /**
   * Disable telemetry
   */
  static disable(): void {
    this.enabled = false;
  }

  /**
   * Report an error
   */
  static reportError(
    originalError: unknown,
    errorInfo: ErrorInfo,
    context?: Record<string, unknown>,
    recovered?: boolean,
    recoveryAction?: RecoveryAction
  ): void {
    if (!this.enabled || !this.callbacks.onError) return;

    const event: ErrorEvent = {
      error: errorInfo,
      originalError,
      timestamp: Date.now(),
      context,
      recovered,
      recoveryAction,
    };

    this.safeCall(() => this.callbacks.onError!(event));
  }

  /**
   * Report circuit breaker state change
   */
  static reportCircuitBreaker(
    circuitKey: string,
    state: CircuitState,
    reason: string,
    stats: CircuitBreakerEvent['stats']
  ): void {
    if (!this.enabled || !this.callbacks.onCircuitBreaker) return;

    const event: CircuitBreakerEvent = {
      circuitKey,
      state,
      reason,
      timestamp: Date.now(),
      stats,
    };

    this.safeCall(() => this.callbacks.onCircuitBreaker!(event));
  }

  /**
   * Report retry attempt
   */
  static reportRetry(
    attempt: number,
    maxAttempts: number,
    delay: number,
    error: ErrorInfo,
    success?: boolean
  ): void {
    if (!this.enabled || !this.callbacks.onRetry) return;

    const event: RetryEvent = {
      attempt,
      maxAttempts,
      delay,
      error,
      timestamp: Date.now(),
      success,
    };

    this.safeCall(() => this.callbacks.onRetry!(event));
  }

  /**
   * Report recovery attempt
   */
  static reportRecovery(error: ErrorInfo, recovery: RecoveryAction): void {
    if (!this.enabled || !this.callbacks.onRecovery) return;

    this.safeCall(() => this.callbacks.onRecovery!({ error, recovery }));
  }

  /**
   * Safely call callback without throwing
   */
  private static safeCall(fn: () => void | Promise<void>): void {
    try {
      const result = fn();
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error('Telemetry callback error:', error);
        });
      }
    } catch (error) {
      console.error('Telemetry callback error:', error);
    }
  }

  /**
   * Reset all callbacks
   */
  static reset(): void {
    this.callbacks = {};
  }
}
