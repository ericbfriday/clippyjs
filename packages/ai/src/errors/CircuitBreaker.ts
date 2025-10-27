/**
 * Circuit breaker pattern for preventing cascade failures
 *
 * Monitors failure rates and "trips" to prevent requests to failing services,
 * allowing time for recovery before retrying.
 */

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to trip circuit (0-1) */
  failureThreshold?: number;
  /** Number of requests to track for threshold */
  requestThreshold?: number;
  /** Time in ms to wait before attempting reset */
  resetTimeout?: number;
  /** Time in ms for success/failure window */
  monitoringWindow?: number;
  /** Number of test requests in half-open state */
  halfOpenRequests?: number;
  /** Callback when circuit state changes */
  onStateChange?: (state: CircuitState, reason: string) => void;
}

/**
 * Request result tracking
 */
interface RequestRecord {
  timestamp: number;
  success: boolean;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: Required<Omit<CircuitBreakerConfig, 'onStateChange'>> = {
  failureThreshold: 0.5,    // 50% failure rate
  requestThreshold: 10,     // Minimum 10 requests to trip
  resetTimeout: 60000,      // 60 seconds before retry
  monitoringWindow: 120000, // 2 minute tracking window
  halfOpenRequests: 3,      // 3 test requests in half-open
};

/**
 * Circuit breaker for preventing cascade failures
 *
 * Implements the circuit breaker pattern to detect and prevent
 * repeated calls to failing services. Three states:
 *
 * - **Closed**: Normal operation, requests pass through
 * - **Open**: Failures detected, requests immediately fail
 * - **Half-Open**: Testing recovery, limited requests allowed
 *
 * Features:
 * - Automatic failure detection and circuit tripping
 * - Configurable thresholds and timeouts
 * - Gradual recovery testing with half-open state
 * - Per-provider circuit isolation
 * - State change callbacks for monitoring
 *
 * Usage:
 * ```ts
 * const circuit = new CircuitBreaker({
 *   failureThreshold: 0.5,
 *   requestThreshold: 10,
 *   resetTimeout: 60000,
 * });
 *
 * try {
 *   await circuit.execute(async () => {
 *     return await apiCall();
 *   });
 * } catch (error) {
 *   // Handle circuit open or operation failure
 * }
 * ```
 */
export class CircuitBreaker {
  private config: Required<Omit<CircuitBreakerConfig, 'onStateChange'>> & Pick<CircuitBreakerConfig, 'onStateChange'>;
  private state: CircuitState = 'closed';
  private requests: RequestRecord[] = [];
  private openedAt: number | null = null;
  private halfOpenAttempts = 0;
  private stateChangeTimer: NodeJS.Timeout | null = null;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      ...DEFAULT_CIRCUIT_CONFIG,
      ...config,
    };
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      // Check if it's time to transition to half-open
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open', 'Reset timeout expired, testing recovery');
      } else {
        throw new Error('Circuit breaker is open, request rejected');
      }
    }

    // Check if we should allow request in half-open state
    if (this.state === 'half-open' && this.halfOpenAttempts >= this.config.halfOpenRequests) {
      throw new Error('Circuit breaker is half-open, test request limit reached');
    }

    // Track half-open attempts
    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
    }

    try {
      // Execute operation
      const result = await operation();

      // Record success
      this.recordSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.recordFailure();

      // Re-throw error
      throw error;
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    this.addRequest(true);

    // If half-open and all test requests succeeded, close circuit
    if (this.state === 'half-open' && this.halfOpenAttempts >= this.config.halfOpenRequests) {
      const recentRequests = this.getRecentRequests();
      const failureRate = this.calculateFailureRate(recentRequests);

      if (failureRate === 0) {
        this.transitionTo('closed', 'All test requests succeeded');
      }
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(): void {
    this.addRequest(false);

    // Check if we should trip the circuit
    const recentRequests = this.getRecentRequests();

    if (recentRequests.length >= this.config.requestThreshold) {
      const failureRate = this.calculateFailureRate(recentRequests);

      if (failureRate >= this.config.failureThreshold) {
        this.transitionTo(
          'open',
          `Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${(this.config.failureThreshold * 100).toFixed(1)}%`
        );
      }
    }

    // If half-open and any request fails, reopen circuit
    if (this.state === 'half-open') {
      this.transitionTo('open', 'Test request failed, reopening circuit');
    }
  }

  /**
   * Add a request record
   */
  private addRequest(success: boolean): void {
    this.requests.push({
      timestamp: Date.now(),
      success,
    });

    // Clean up old requests
    this.cleanupOldRequests();
  }

  /**
   * Get recent requests within monitoring window
   */
  private getRecentRequests(): RequestRecord[] {
    const cutoff = Date.now() - this.config.monitoringWindow;
    return this.requests.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Calculate failure rate from requests
   */
  private calculateFailureRate(requests: RequestRecord[]): number {
    if (requests.length === 0) return 0;

    const failures = requests.filter(r => !r.success).length;
    return failures / requests.length;
  }

  /**
   * Clean up requests outside monitoring window
   */
  private cleanupOldRequests(): void {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.requests = this.requests.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (this.state !== 'open' || !this.openedAt) return false;
    return Date.now() - this.openedAt >= this.config.resetTimeout;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState, reason: string): void {
    const oldState = this.state;

    if (oldState === newState) return;

    this.state = newState;

    // Clear any existing timer
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = null;
    }

    // Handle state-specific logic
    if (newState === 'open') {
      this.openedAt = Date.now();

      // Schedule automatic transition to half-open
      this.stateChangeTimer = setTimeout(() => {
        this.transitionTo('half-open', 'Reset timeout expired');
      }, this.config.resetTimeout);
    } else if (newState === 'half-open') {
      this.halfOpenAttempts = 0;
    } else if (newState === 'closed') {
      this.openedAt = null;
      this.halfOpenAttempts = 0;
      // Clear old request history when closing
      this.requests = [];
    }

    // Notify state change
    if (this.config.onStateChange) {
      this.config.onStateChange(newState, reason);
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    const recentRequests = this.getRecentRequests();
    const failureRate = this.calculateFailureRate(recentRequests);

    return {
      state: this.state,
      failureRate,
      totalRequests: recentRequests.length,
      failures: recentRequests.filter(r => !r.success).length,
      successes: recentRequests.filter(r => r.success).length,
      openedAt: this.openedAt,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Manually reset circuit
   */
  reset(): void {
    this.transitionTo('closed', 'Manual reset');
  }

  /**
   * Force circuit open (for testing or emergency)
   */
  forceOpen(reason = 'Manually forced open'): void {
    this.transitionTo('open', reason);
  }

  /**
   * Clean up timers
   */
  destroy(): void {
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = null;
    }
  }
}

/**
 * Circuit breaker registry for managing multiple circuits
 *
 * Useful for isolating circuits per provider or service.
 *
 * Usage:
 * ```ts
 * const registry = new CircuitBreakerRegistry();
 *
 * const anthropicCircuit = registry.get('anthropic');
 * const openaiCircuit = registry.get('openai');
 *
 * await anthropicCircuit.execute(() => anthropicCall());
 * await openaiCircuit.execute(() => openaiCall());
 * ```
 */
export class CircuitBreakerRegistry {
  private circuits = new Map<string, CircuitBreaker>();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig: CircuitBreakerConfig = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Get or create circuit for a key
   */
  get(key: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuits.has(key)) {
      const circuit = new CircuitBreaker({
        ...this.defaultConfig,
        ...config,
      });
      this.circuits.set(key, circuit);
    }

    return this.circuits.get(key)!;
  }

  /**
   * Check if circuit exists
   */
  has(key: string): boolean {
    return this.circuits.has(key);
  }

  /**
   * Remove circuit
   */
  remove(key: string): boolean {
    const circuit = this.circuits.get(key);
    if (circuit) {
      circuit.destroy();
      return this.circuits.delete(key);
    }
    return false;
  }

  /**
   * Get all circuit stats
   */
  getAllStats() {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};

    for (const [key, circuit] of this.circuits.entries()) {
      stats[key] = circuit.getStats();
    }

    return stats;
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }

  /**
   * Clean up all circuits
   */
  destroy(): void {
    for (const circuit of this.circuits.values()) {
      circuit.destroy();
    }
    this.circuits.clear();
  }
}
