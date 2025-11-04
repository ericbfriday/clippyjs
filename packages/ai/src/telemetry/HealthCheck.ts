/**
 * HealthCheck - Service status monitoring and health reporting
 *
 * Features:
 * - Service status monitoring
 * - Dependency health checks
 * - Degraded state detection
 * - Health status reporting API
 * - Automatic recovery detection
 *
 * @module telemetry
 */

import type { TelemetryCollector } from './TelemetryCollector';

/**
 * Health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Service check result
 */
export interface ServiceCheckResult {
  /** Service name */
  service: string;
  /** Health status */
  status: HealthStatus;
  /** Response time (ms) */
  responseTime?: number;
  /** Check timestamp */
  timestamp: number;
  /** Status message */
  message?: string;
  /** Additional details */
  details?: Record<string, any>;
}

/**
 * Dependency health
 */
export interface DependencyHealth {
  /** Dependency name */
  name: string;
  /** Status */
  status: HealthStatus;
  /** Last check timestamp */
  lastCheck: number;
  /** Consecutive failures */
  consecutiveFailures: number;
  /** Total checks */
  totalChecks: number;
  /** Success rate */
  successRate: number;
}

/**
 * Overall health report
 */
export interface HealthReport {
  /** Overall status */
  status: HealthStatus;
  /** System uptime (ms) */
  uptime: number;
  /** Last check timestamp */
  timestamp: number;
  /** Service checks */
  services: ServiceCheckResult[];
  /** Dependencies */
  dependencies: DependencyHealth[];
  /** Metrics */
  metrics: {
    errorRate: number;
    avgResponseTime: number;
    memoryUsage?: number;
  };
}

/**
 * Health check function
 */
export type HealthCheckFunction = () => Promise<ServiceCheckResult>;

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Enable health checks */
  enabled?: boolean;
  /** Check interval (ms) */
  checkIntervalMs?: number;
  /** Timeout for checks (ms) */
  timeoutMs?: number;
  /** Consecutive failures threshold for unhealthy */
  failureThreshold?: number;
  /** Success count needed to recover */
  recoveryThreshold?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<HealthCheckConfig> = {
  enabled: true,
  checkIntervalMs: 60000, // 1 minute
  timeoutMs: 5000, // 5 seconds
  failureThreshold: 3,
  recoveryThreshold: 2,
};

/**
 * HealthCheck - System health monitoring
 */
export class HealthCheck {
  private config: Required<HealthCheckConfig>;
  private collector: TelemetryCollector;
  private services: Map<string, HealthCheckFunction> = new Map();
  private serviceStatus: Map<string, ServiceCheckResult[]> = new Map();
  private dependencies: Map<string, DependencyHealth> = new Map();
  private checkTimer: NodeJS.Timeout | number | null = null;
  private startTime = Date.now();
  private lastStatus: HealthStatus = HealthStatus.UNKNOWN;

  constructor(collector: TelemetryCollector, config: HealthCheckConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.collector = collector;

    // Start periodic health checks
    if (this.config.enabled) {
      this.startHealthChecks();
    }
  }

  /**
   * Register a service for health checks
   */
  registerService(name: string, checkFn: HealthCheckFunction): void {
    this.services.set(name, checkFn);
    this.serviceStatus.set(name, []);

    // Initialize dependency tracking
    this.dependencies.set(name, {
      name,
      status: HealthStatus.UNKNOWN,
      lastCheck: 0,
      consecutiveFailures: 0,
      totalChecks: 0,
      successRate: 0,
    });
  }

  /**
   * Unregister a service
   */
  unregisterService(name: string): void {
    this.services.delete(name);
    this.serviceStatus.delete(name);
    this.dependencies.delete(name);
  }

  /**
   * Perform health check for a specific service
   */
  async checkService(name: string): Promise<ServiceCheckResult> {
    const checkFn = this.services.get(name);
    if (!checkFn) {
      throw new Error(`Service "${name}" not registered`);
    }

    const startTime = Date.now();

    try {
      // Execute check with timeout
      const result = await this.withTimeout(checkFn(), this.config.timeoutMs);

      // Update dependency tracking
      this.updateDependencyHealth(name, result.status);

      // Store result
      const history = this.serviceStatus.get(name) || [];
      history.push(result);
      if (history.length > 100) {
        history.shift(); // Keep last 100 checks
      }
      this.serviceStatus.set(name, history);

      // Report to telemetry
      this.collector.track({
        type: 'health.check',
        timestamp: Date.now(),
        data: {
          service: name,
          status: result.status,
          responseTime: result.responseTime,
        },
      });

      return result;
    } catch (error) {
      const errorResult: ServiceCheckResult = {
        service: name,
        status: HealthStatus.UNHEALTHY,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Check failed',
      };

      // Update dependency tracking
      this.updateDependencyHealth(name, HealthStatus.UNHEALTHY);

      // Store result
      const history = this.serviceStatus.get(name) || [];
      history.push(errorResult);
      this.serviceStatus.set(name, history);

      // Report to telemetry
      this.collector.trackError(
        error instanceof Error ? error : new Error(String(error)),
        { service: name, type: 'health_check_failure' }
      );

      return errorResult;
    }
  }

  /**
   * Perform health check for all services
   */
  async checkAll(): Promise<ServiceCheckResult[]> {
    const results = await Promise.all(
      Array.from(this.services.keys()).map(name => this.checkService(name))
    );
    return results;
  }

  /**
   * Get current health report
   */
  async getHealthReport(): Promise<HealthReport> {
    const results = await this.checkAll();
    const overallStatus = this.calculateOverallStatus(results);

    // Detect status change
    if (overallStatus !== this.lastStatus) {
      this.collector.track({
        type: 'health.status_change',
        timestamp: Date.now(),
        data: {
          from: this.lastStatus,
          to: overallStatus,
        },
      });
      this.lastStatus = overallStatus;
    }

    return {
      status: overallStatus,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
      services: results,
      dependencies: Array.from(this.dependencies.values()),
      metrics: this.calculateMetrics(),
    };
  }

  /**
   * Get service history
   */
  getServiceHistory(name: string, limit: number = 10): ServiceCheckResult[] {
    const history = this.serviceStatus.get(name) || [];
    return history.slice(-limit);
  }

  /**
   * Get dependency status
   */
  getDependencyStatus(name: string): DependencyHealth | undefined {
    return this.dependencies.get(name);
  }

  /**
   * Check if system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const report = await this.getHealthReport();
    return report.status === HealthStatus.HEALTHY;
  }

  /**
   * Check if system is degraded
   */
  async isDegraded(): Promise<boolean> {
    const report = await this.getHealthReport();
    return report.status === HealthStatus.DEGRADED;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopHealthChecks();
    this.services.clear();
    this.serviceStatus.clear();
    this.dependencies.clear();
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.checkTimer = setInterval(() => {
      void this.checkAll();
    }, this.config.checkIntervalMs);

    // Perform initial check
    void this.checkAll();
  }

  /**
   * Stop periodic health checks
   */
  private stopHealthChecks(): void {
    if (this.checkTimer !== null) {
      clearInterval(this.checkTimer as number);
      this.checkTimer = null;
    }
  }

  /**
   * Update dependency health tracking
   */
  private updateDependencyHealth(name: string, status: HealthStatus): void {
    const dependency = this.dependencies.get(name);
    if (!dependency) return;

    dependency.totalChecks++;
    dependency.lastCheck = Date.now();

    if (status === HealthStatus.HEALTHY) {
      // Reset consecutive failures on success
      if (dependency.consecutiveFailures > 0) {
        this.collector.track({
          type: 'health.recovery',
          timestamp: Date.now(),
          data: {
            service: name,
            previousFailures: dependency.consecutiveFailures,
          },
        });
      }
      dependency.consecutiveFailures = 0;
      dependency.status = HealthStatus.HEALTHY;
    } else {
      dependency.consecutiveFailures++;

      // Update status based on consecutive failures
      if (dependency.consecutiveFailures >= this.config.failureThreshold) {
        if (dependency.status !== HealthStatus.UNHEALTHY) {
          this.collector.track({
            type: 'health.degradation',
            timestamp: Date.now(),
            data: {
              service: name,
              consecutiveFailures: dependency.consecutiveFailures,
            },
          });
        }
        dependency.status = HealthStatus.UNHEALTHY;
      } else {
        dependency.status = HealthStatus.DEGRADED;
      }
    }

    // Calculate success rate
    const history = this.serviceStatus.get(name) || [];
    const recent = history.slice(-20); // Last 20 checks
    const successes = recent.filter(r => r.status === HealthStatus.HEALTHY).length;
    dependency.successRate = recent.length > 0 ? successes / recent.length : 0;
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(results: ServiceCheckResult[]): HealthStatus {
    if (results.length === 0) return HealthStatus.UNKNOWN;

    const unhealthy = results.filter(r => r.status === HealthStatus.UNHEALTHY);
    const degraded = results.filter(r => r.status === HealthStatus.DEGRADED);

    // System is unhealthy if any critical service is unhealthy
    if (unhealthy.length > 0) {
      return HealthStatus.UNHEALTHY;
    }

    // System is degraded if any service is degraded
    if (degraded.length > 0) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Calculate system metrics
   */
  private calculateMetrics(): HealthReport['metrics'] {
    const allResults = Array.from(this.serviceStatus.values()).flat();
    const recent = allResults.slice(-100); // Last 100 checks

    const errors = recent.filter(
      r => r.status === HealthStatus.UNHEALTHY || r.status === HealthStatus.DEGRADED
    );
    const errorRate = recent.length > 0 ? errors.length / recent.length : 0;

    const responseTimes = recent
      .map(r => r.responseTime)
      .filter((t): t is number => t !== undefined);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

    const metrics: HealthReport['metrics'] = {
      errorRate,
      avgResponseTime,
    };

    // Add memory usage if available
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    return metrics;
  }

  /**
   * Execute function with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
      ),
    ]);
  }
}
