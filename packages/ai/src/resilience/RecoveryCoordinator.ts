/**
 * Recovery coordinator for centralized failure recovery orchestration
 *
 * Coordinates recovery across multiple resilience components:
 * - Dependency-aware recovery
 * - Recovery validation
 * - Recovery telemetry
 * - Coordinated circuit breaker and retry policy management
 */

import { EnhancedCircuitBreaker } from './EnhancedCircuitBreaker';
import { AdvancedRetryPolicy } from './AdvancedRetryPolicy';
import { DegradationManager, DegradationLevel } from './DegradationManager';

/**
 * Recovery strategy
 */
export enum RecoveryStrategy {
  /** Immediate recovery attempt */
  IMMEDIATE = 'immediate',
  /** Gradual recovery with testing */
  GRADUAL = 'gradual',
  /** Wait for all dependencies to recover */
  COORDINATED = 'coordinated',
  /** Manual recovery only */
  MANUAL = 'manual',
}

/**
 * Recovery state
 */
export enum RecoveryState {
  /** Healthy, no recovery needed */
  HEALTHY = 'healthy',
  /** Recovery in progress */
  RECOVERING = 'recovering',
  /** Recovery failed */
  FAILED = 'failed',
  /** Degraded but stable */
  DEGRADED = 'degraded',
}

/**
 * Service configuration for recovery
 */
export interface ServiceConfig {
  name: string;
  /** Circuit breaker for this service */
  circuitBreaker?: EnhancedCircuitBreaker;
  /** Retry policy for this service */
  retryPolicy?: AdvancedRetryPolicy;
  /** Dependencies that must be healthy */
  dependencies?: string[];
  /** Recovery strategy */
  strategy?: RecoveryStrategy;
  /** Health check function */
  healthCheck?: () => Promise<boolean>;
  /** Recovery priority (higher = recover first) */
  priority?: number;
  /** Maximum recovery attempts */
  maxRecoveryAttempts?: number;
}

/**
 * Recovery status
 */
export interface RecoveryStatus {
  service: string;
  state: RecoveryState;
  attemptCount: number;
  lastAttempt?: number;
  lastSuccess?: number;
  lastFailure?: number;
  dependencies: string[];
  dependenciesHealthy: boolean;
  circuitState?: 'open' | 'closed' | 'half-open';
  healthScore?: number;
}

/**
 * Recovery event
 */
export interface RecoveryEvent {
  type: 'started' | 'succeeded' | 'failed' | 'degraded';
  service: string;
  timestamp: number;
  details?: string;
  metrics?: Record<string, any>;
}

/**
 * Recovery coordinator options
 */
export interface RecoveryCoordinatorOptions {
  /** Enable automatic recovery */
  autoRecover?: boolean;
  /** Recovery check interval in ms */
  checkInterval?: number;
  /** Maximum concurrent recoveries */
  maxConcurrentRecoveries?: number;
  /** Enable telemetry */
  telemetryEnabled?: boolean;
  /** Event callback */
  onRecoveryEvent?: (event: RecoveryEvent) => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<RecoveryCoordinatorOptions> = {
  autoRecover: true,
  checkInterval: 30000, // 30 seconds
  maxConcurrentRecoveries: 3,
  telemetryEnabled: true,
  onRecoveryEvent: () => {},
};

/**
 * Recovery coordinator
 *
 * Centralized orchestration of failure recovery across services.
 * Manages circuit breakers, retry policies, and degradation managers
 * with dependency-aware recovery and validation.
 *
 * Features:
 * - Dependency-aware recovery ordering
 * - Coordinated circuit breaker resets
 * - Health check validation
 * - Recovery telemetry and metrics
 * - Multiple recovery strategies
 * - Automatic and manual recovery modes
 *
 * Usage:
 * ```ts
 * const coordinator = new RecoveryCoordinator({
 *   autoRecover: true,
 *   checkInterval: 30000,
 * });
 *
 * // Register services
 * coordinator.registerService({
 *   name: 'api-service',
 *   circuitBreaker: apiCircuit,
 *   retryPolicy: apiRetry,
 *   dependencies: ['database'],
 *   healthCheck: async () => await checkApiHealth(),
 * });
 *
 * // Attempt recovery
 * await coordinator.recoverService('api-service');
 * ```
 */
export class RecoveryCoordinator {
  private options: Required<RecoveryCoordinatorOptions>;
  private services = new Map<string, ServiceConfig>();
  private recoveryStatus = new Map<string, RecoveryStatus>();
  private degradationManager?: DegradationManager;
  private checkInterval: NodeJS.Timeout | null = null;
  private activeRecoveries = new Set<string>();
  private events: RecoveryEvent[] = [];

  constructor(
    options: RecoveryCoordinatorOptions = {},
    degradationManager?: DegradationManager
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    this.degradationManager = degradationManager;

    if (this.options.autoRecover) {
      this.startRecoveryChecks();
    }
  }

  /**
   * Register a service for recovery coordination
   */
  registerService(config: ServiceConfig): void {
    this.services.set(config.name, {
      dependencies: [],
      strategy: RecoveryStrategy.GRADUAL,
      priority: 5,
      maxRecoveryAttempts: 5,
      ...config,
    });

    this.recoveryStatus.set(config.name, {
      service: config.name,
      state: RecoveryState.HEALTHY,
      attemptCount: 0,
      dependencies: config.dependencies || [],
      dependenciesHealthy: true,
    });
  }

  /**
   * Unregister a service
   */
  unregisterService(name: string): void {
    this.services.delete(name);
    this.recoveryStatus.delete(name);
    this.activeRecoveries.delete(name);
  }

  /**
   * Attempt to recover a service
   */
  async recoverService(name: string): Promise<boolean> {
    const config = this.services.get(name);
    const status = this.recoveryStatus.get(name);

    if (!config || !status) {
      throw new Error(`Service not registered: ${name}`);
    }

    // Check if already recovering
    if (this.activeRecoveries.has(name)) {
      return false;
    }

    // Check if at max concurrent recoveries
    if (this.activeRecoveries.size >= this.options.maxConcurrentRecoveries) {
      return false;
    }

    // Check max attempts
    if (status.attemptCount >= (config.maxRecoveryAttempts || 5)) {
      this.emitEvent({
        type: 'failed',
        service: name,
        timestamp: Date.now(),
        details: 'Maximum recovery attempts exceeded',
      });
      return false;
    }

    this.activeRecoveries.add(name);
    status.state = RecoveryState.RECOVERING;
    status.attemptCount++;
    status.lastAttempt = Date.now();

    this.emitEvent({
      type: 'started',
      service: name,
      timestamp: Date.now(),
    });

    try {
      // Check dependencies
      const depsHealthy = await this.checkDependencies(name);
      status.dependenciesHealthy = depsHealthy;

      if (!depsHealthy && config.strategy === RecoveryStrategy.COORDINATED) {
        throw new Error('Dependencies not healthy');
      }

      // Execute recovery based on strategy
      const success = await this.executeRecovery(config, status);

      if (success) {
        status.state = RecoveryState.HEALTHY;
        status.lastSuccess = Date.now();
        status.attemptCount = 0; // Reset on success

        // Reset circuit breaker if present
        if (config.circuitBreaker) {
          config.circuitBreaker.reset();
        }

        // Reset retry policy metrics if present
        if (config.retryPolicy) {
          config.retryPolicy.reset();
        }

        // Recover in degradation manager if present
        if (this.degradationManager) {
          await this.degradationManager.recover(name);
        }

        this.emitEvent({
          type: 'succeeded',
          service: name,
          timestamp: Date.now(),
          metrics: this.getServiceMetrics(config),
        });

        return true;
      } else {
        throw new Error('Recovery validation failed');
      }
    } catch (error) {
      status.state = RecoveryState.FAILED;
      status.lastFailure = Date.now();

      this.emitEvent({
        type: 'failed',
        service: name,
        timestamp: Date.now(),
        details: error instanceof Error ? error.message : String(error),
      });

      return false;
    } finally {
      this.activeRecoveries.delete(name);
    }
  }

  /**
   * Execute recovery based on strategy
   */
  private async executeRecovery(
    config: ServiceConfig,
    status: RecoveryStatus
  ): Promise<boolean> {
    switch (config.strategy) {
      case RecoveryStrategy.IMMEDIATE:
        return await this.immediateRecovery(config);

      case RecoveryStrategy.GRADUAL:
        return await this.gradualRecovery(config);

      case RecoveryStrategy.COORDINATED:
        return await this.coordinatedRecovery(config);

      case RecoveryStrategy.MANUAL:
        return false; // Requires manual intervention

      default:
        return await this.gradualRecovery(config);
    }
  }

  /**
   * Immediate recovery - reset and validate
   */
  private async immediateRecovery(config: ServiceConfig): Promise<boolean> {
    // Reset circuit breaker
    if (config.circuitBreaker) {
      config.circuitBreaker.reset();
    }

    // Run health check
    if (config.healthCheck) {
      return await config.healthCheck();
    }

    return true;
  }

  /**
   * Gradual recovery - test before full recovery
   */
  private async gradualRecovery(config: ServiceConfig): Promise<boolean> {
    // If circuit breaker exists, use half-open state for testing
    if (config.circuitBreaker) {
      const state = config.circuitBreaker.getState();

      if (state === 'open') {
        // Circuit will automatically transition to half-open after timeout
        return false;
      }

      if (state === 'half-open') {
        // Wait for half-open testing to complete
        const metrics = config.circuitBreaker.getHealthMetrics();
        return metrics.successRate > 0.8; // 80% success rate needed
      }
    }

    // Run health check
    if (config.healthCheck) {
      const healthy = await config.healthCheck();
      if (healthy) {
        config.circuitBreaker?.reset();
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Coordinated recovery - wait for dependencies
   */
  private async coordinatedRecovery(config: ServiceConfig): Promise<boolean> {
    // Check all dependencies are healthy
    const depsHealthy = await this.checkDependencies(config.name);
    if (!depsHealthy) {
      return false;
    }

    // Proceed with gradual recovery
    return await this.gradualRecovery(config);
  }

  /**
   * Check if dependencies are healthy
   */
  private async checkDependencies(serviceName: string): Promise<boolean> {
    const config = this.services.get(serviceName);
    if (!config?.dependencies || config.dependencies.length === 0) {
      return true;
    }

    for (const dep of config.dependencies) {
      const depStatus = this.recoveryStatus.get(dep);
      if (!depStatus || depStatus.state !== RecoveryState.HEALTHY) {
        return false;
      }

      // Also check circuit breaker state
      const depConfig = this.services.get(dep);
      if (depConfig?.circuitBreaker) {
        const state = depConfig.circuitBreaker.getState();
        if (state === 'open') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get service metrics
   */
  private getServiceMetrics(config: ServiceConfig): Record<string, any> {
    const metrics: Record<string, any> = {};

    if (config.circuitBreaker) {
      const health = config.circuitBreaker.getHealthMetrics();
      metrics.circuit = {
        state: health.state,
        healthScore: health.healthScore,
        failureRate: health.failureRate,
      };
    }

    if (config.retryPolicy) {
      const retryMetrics = config.retryPolicy.getMetrics();
      metrics.retry = {
        successRate: retryMetrics.successRate,
        averageDelay: retryMetrics.averageDelay,
      };
    }

    return metrics;
  }

  /**
   * Get recovery status for a service
   */
  getStatus(name: string): RecoveryStatus | undefined {
    const status = this.recoveryStatus.get(name);
    if (!status) return undefined;

    const config = this.services.get(name);

    // Update circuit state if present
    if (config?.circuitBreaker) {
      status.circuitState = config.circuitBreaker.getState();
      const metrics = config.circuitBreaker.getHealthMetrics();
      status.healthScore = metrics.healthScore;
    }

    return { ...status };
  }

  /**
   * Get status for all services
   */
  getAllStatus(): Record<string, RecoveryStatus> {
    const result: Record<string, RecoveryStatus> = {};

    for (const name of Array.from(this.services.keys())) {
      const status = this.getStatus(name);
      if (status) {
        result[name] = status;
      }
    }

    return result;
  }

  /**
   * Get recovery history
   */
  getHistory(limit = 100): RecoveryEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Emit recovery event
   */
  private emitEvent(event: RecoveryEvent): void {
    this.events.push(event);

    // Limit history size
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }

    if (this.options.onRecoveryEvent) {
      this.options.onRecoveryEvent(event);
    }
  }

  /**
   * Start periodic recovery checks
   */
  private startRecoveryChecks(): void {
    this.checkInterval = setInterval(
      () => this.checkRecoveries(),
      this.options.checkInterval
    );
  }

  /**
   * Check for services that need recovery
   */
  private async checkRecoveries(): Promise<void> {
    // Get services sorted by priority
    const sortedServices = Array.from(this.services.entries())
      .sort(([, a], [, b]) => (b.priority || 5) - (a.priority || 5));

    for (const [name, config] of sortedServices) {
      const status = this.recoveryStatus.get(name);
      if (!status) continue;

      // Check if service needs recovery
      const needsRecovery =
        status.state === RecoveryState.FAILED ||
        status.state === RecoveryState.DEGRADED ||
        (config.circuitBreaker?.getState() === 'open');

      if (needsRecovery && config.strategy !== RecoveryStrategy.MANUAL) {
        await this.recoverService(name);
      }
    }
  }

  /**
   * Stop recovery checks
   */
  stopRecoveryChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopRecoveryChecks();
    this.services.clear();
    this.recoveryStatus.clear();
    this.activeRecoveries.clear();
    this.events = [];
  }
}
