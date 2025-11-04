/**
 * Resource budget management for production environments
 *
 * Enforces resource limits to prevent memory leaks, excessive network usage,
 * and CPU throttling in production deployments.
 */

/**
 * Resource budget configuration
 */
export interface ResourceBudgets {
  /** Memory budget in bytes */
  memory: number;
  /** Storage budget in bytes */
  storage: number;
  /** Network bandwidth budget in bytes/second */
  network: number;
  /** CPU time budget in ms/second (1000 = 100% of one core) */
  cpuTime: number;
}

/**
 * Current resource usage
 */
export interface ResourceUsage {
  /** Current memory usage in bytes */
  memory: number;
  /** Current storage usage in bytes */
  storage: number;
  /** Current network usage in bytes/second */
  network: number;
  /** Current CPU time usage in ms/second */
  cpuTime: number;
  /** Timestamp of measurement */
  timestamp: number;
}

/**
 * Budget violation event
 */
export interface BudgetViolation {
  /** Resource that exceeded budget */
  resource: keyof ResourceBudgets;
  /** Current usage */
  usage: number;
  /** Budget limit */
  limit: number;
  /** Percentage over budget */
  overage: number;
  /** Timestamp of violation */
  timestamp: number;
  /** Violation severity (warning, critical) */
  severity: 'warning' | 'critical';
}

/**
 * Budget enforcement action
 */
export type EnforcementAction = 'log' | 'throttle' | 'reject' | 'cleanup';

/**
 * Budget enforcement configuration
 */
export interface EnforcementConfig {
  /** Action to take on budget violation */
  action: EnforcementAction;
  /** Threshold percentage for warnings (0-1) */
  warningThreshold: number;
  /** Threshold percentage for critical violations (0-1) */
  criticalThreshold: number;
  /** Whether to enable automatic cleanup */
  autoCleanup: boolean;
  /** Callback for violations */
  onViolation?: (violation: BudgetViolation) => void;
}

/**
 * Resource measurement
 */
interface ResourceMeasurement {
  /** Measurement value */
  value: number;
  /** Measurement timestamp */
  timestamp: number;
}

/**
 * Default resource budgets (production-safe)
 */
export const DEFAULT_BUDGETS: ResourceBudgets = {
  memory: 25 * 1024 * 1024,      // 25MB
  storage: 10 * 1024 * 1024,     // 10MB
  network: 100 * 1024,           // 100KB/s
  cpuTime: 500,                  // 50% of one core
};

/**
 * Default enforcement configuration
 */
export const DEFAULT_ENFORCEMENT: EnforcementConfig = {
  action: 'throttle',
  warningThreshold: 0.8,
  criticalThreshold: 0.95,
  autoCleanup: true,
};

/**
 * Resource budget manager
 *
 * Monitors and enforces resource budgets to prevent excessive resource
 * consumption in production environments.
 *
 * Features:
 * - Memory budget enforcement
 * - Network bandwidth limits
 * - CPU time budgeting
 * - Storage quota management
 * - Automatic violation handling
 * - Graduated enforcement (warning -> throttle -> reject)
 *
 * Usage:
 * ```ts
 * const budgetManager = new ResourceBudgetManager({
 *   memory: 25 * 1024 * 1024, // 25MB
 *   network: 100 * 1024,      // 100KB/s
 * });
 *
 * // Check before operation
 * if (budgetManager.checkBudget('memory', operation.size)) {
 *   await performOperation();
 *   budgetManager.recordUsage('memory', operation.size);
 * } else {
 *   console.warn('Operation would exceed budget');
 * }
 *
 * // Enforce budgets periodically
 * setInterval(() => {
 *   budgetManager.enforceBudget();
 * }, 1000);
 * ```
 */
export class ResourceBudgetManager {
  private budgets: ResourceBudgets;
  private enforcement: EnforcementConfig;
  private measurements: Map<keyof ResourceBudgets, ResourceMeasurement[]>;
  private violations: BudgetViolation[] = [];
  private lastEnforcement = Date.now();
  private throttled = new Set<string>();

  constructor(
    budgets: Partial<ResourceBudgets> = {},
    enforcement: Partial<EnforcementConfig> = {}
  ) {
    this.budgets = { ...DEFAULT_BUDGETS, ...budgets };
    this.enforcement = { ...DEFAULT_ENFORCEMENT, ...enforcement };
    this.measurements = new Map([
      ['memory', []],
      ['storage', []],
      ['network', []],
      ['cpuTime', []],
    ]);
  }

  /**
   * Set budget for a resource
   */
  setBudget(resource: keyof ResourceBudgets, limit: number): void {
    if (limit <= 0) {
      throw new Error(`Budget limit must be positive: ${limit}`);
    }
    this.budgets[resource] = limit;
  }

  /**
   * Get current budget for a resource
   */
  getBudget(resource: keyof ResourceBudgets): number {
    return this.budgets[resource];
  }

  /**
   * Get all budgets
   */
  getBudgets(): ResourceBudgets {
    return { ...this.budgets };
  }

  /**
   * Check if operation would exceed budget
   */
  checkBudget(resource: keyof ResourceBudgets, usage: number): boolean {
    const currentUsage = this.getCurrentUsage(resource);
    const projected = currentUsage + usage;
    const limit = this.budgets[resource];

    // Check if projected usage exceeds critical threshold
    const criticalLimit = limit * this.enforcement.criticalThreshold;
    if (projected > criticalLimit) {
      this.recordViolation({
        resource,
        usage: projected,
        limit,
        overage: (projected - limit) / limit,
        timestamp: Date.now(),
        severity: 'critical',
      });
      return false;
    }

    return true;
  }

  /**
   * Record resource usage
   */
  recordUsage(resource: keyof ResourceBudgets, value: number): void {
    const measurements = this.measurements.get(resource) || [];
    measurements.push({
      value,
      timestamp: Date.now(),
    });

    // Keep last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }

    this.measurements.set(resource, measurements);

    // Check for budget violations
    this.checkForViolations(resource);
  }

  /**
   * Get current usage for a resource
   */
  getCurrentUsage(resource: keyof ResourceBudgets): number {
    const measurements = this.measurements.get(resource) || [];
    if (measurements.length === 0) return 0;

    // For rate-based resources (network, CPU), calculate average over last second
    if (resource === 'network' || resource === 'cpuTime') {
      const now = Date.now();
      const recentMeasurements = measurements.filter(
        m => now - m.timestamp < 1000
      );
      if (recentMeasurements.length === 0) return 0;
      return recentMeasurements.reduce((sum, m) => sum + m.value, 0);
    }

    // For absolute resources (memory, storage), use most recent
    return measurements[measurements.length - 1].value;
  }

  /**
   * Get usage for all resources
   */
  getUsage(): ResourceUsage {
    return {
      memory: this.getCurrentUsage('memory'),
      storage: this.getCurrentUsage('storage'),
      network: this.getCurrentUsage('network'),
      cpuTime: this.getCurrentUsage('cpuTime'),
      timestamp: Date.now(),
    };
  }

  /**
   * Get usage percentage for a resource (0-1)
   */
  getUsagePercentage(resource: keyof ResourceBudgets): number {
    const usage = this.getCurrentUsage(resource);
    const limit = this.budgets[resource];
    return limit > 0 ? Math.min(usage / limit, 1) : 0;
  }

  /**
   * Check if resource is near budget limit
   */
  isNearLimit(resource: keyof ResourceBudgets): boolean {
    const percentage = this.getUsagePercentage(resource);
    return percentage >= this.enforcement.warningThreshold;
  }

  /**
   * Check if resource exceeded budget
   */
  isOverBudget(resource: keyof ResourceBudgets): boolean {
    const usage = this.getCurrentUsage(resource);
    return usage > this.budgets[resource];
  }

  /**
   * Enforce budget limits
   */
  enforceBudget(): void {
    const now = Date.now();
    const timeSinceLastEnforcement = now - this.lastEnforcement;
    this.lastEnforcement = now;

    // Check each resource
    for (const resource of Object.keys(this.budgets) as Array<keyof ResourceBudgets>) {
      this.checkForViolations(resource);
    }

    // Clean up old measurements
    this.cleanupMeasurements();

    // Execute enforcement actions
    if (this.violations.length > 0 && this.enforcement.autoCleanup) {
      this.executeEnforcement();
    }
  }

  /**
   * Get recent violations
   */
  getViolations(since?: number): BudgetViolation[] {
    const cutoff = since || Date.now() - 60000; // Default: last minute
    return this.violations.filter(v => v.timestamp >= cutoff);
  }

  /**
   * Clear violation history
   */
  clearViolations(): void {
    this.violations = [];
  }

  /**
   * Check if currently throttled
   */
  isThrottled(operationId: string): boolean {
    return this.throttled.has(operationId);
  }

  /**
   * Throttle an operation
   */
  throttle(operationId: string, durationMs: number = 5000): void {
    this.throttled.add(operationId);
    setTimeout(() => {
      this.throttled.delete(operationId);
    }, durationMs);
  }

  /**
   * Get budget health summary
   */
  getHealthSummary(): {
    healthy: boolean;
    warnings: string[];
    critical: string[];
    usage: Record<string, number>;
  } {
    const warnings: string[] = [];
    const critical: string[] = [];
    const usage: Record<string, number> = {};

    for (const resource of Object.keys(this.budgets) as Array<keyof ResourceBudgets>) {
      const percentage = this.getUsagePercentage(resource);
      usage[resource] = Math.round(percentage * 100);

      if (percentage >= this.enforcement.criticalThreshold) {
        critical.push(
          `${resource}: ${Math.round(percentage * 100)}% (${this.formatResource(resource, this.getCurrentUsage(resource))} / ${this.formatResource(resource, this.budgets[resource])})`
        );
      } else if (percentage >= this.enforcement.warningThreshold) {
        warnings.push(
          `${resource}: ${Math.round(percentage * 100)}% (${this.formatResource(resource, this.getCurrentUsage(resource))} / ${this.formatResource(resource, this.budgets[resource])})`
        );
      }
    }

    return {
      healthy: critical.length === 0,
      warnings,
      critical,
      usage,
    };
  }

  /**
   * Reset all measurements
   */
  reset(): void {
    this.measurements.clear();
    this.measurements.set('memory', []);
    this.measurements.set('storage', []);
    this.measurements.set('network', []);
    this.measurements.set('cpuTime', []);
    this.violations = [];
    this.throttled.clear();
  }

  /**
   * Check for budget violations
   */
  private checkForViolations(resource: keyof ResourceBudgets): void {
    const usage = this.getCurrentUsage(resource);
    const limit = this.budgets[resource];
    const percentage = usage / limit;

    // Check warning threshold
    if (percentage >= this.enforcement.warningThreshold && percentage < this.enforcement.criticalThreshold) {
      this.recordViolation({
        resource,
        usage,
        limit,
        overage: (usage - limit) / limit,
        timestamp: Date.now(),
        severity: 'warning',
      });
    }

    // Check critical threshold
    if (percentage >= this.enforcement.criticalThreshold) {
      this.recordViolation({
        resource,
        usage,
        limit,
        overage: (usage - limit) / limit,
        timestamp: Date.now(),
        severity: 'critical',
      });
    }
  }

  /**
   * Record a budget violation
   */
  private recordViolation(violation: BudgetViolation): void {
    this.violations.push(violation);

    // Keep last 100 violations
    if (this.violations.length > 100) {
      this.violations.shift();
    }

    // Call violation callback
    if (this.enforcement.onViolation) {
      this.enforcement.onViolation(violation);
    }
  }

  /**
   * Execute enforcement actions
   */
  private executeEnforcement(): void {
    const recentViolations = this.getViolations(Date.now() - 5000);
    if (recentViolations.length === 0) return;

    const criticalViolations = recentViolations.filter(v => v.severity === 'critical');

    switch (this.enforcement.action) {
      case 'log':
        if (criticalViolations.length > 0) {
          console.warn('[ResourceBudget] Critical violations:', criticalViolations);
        }
        break;

      case 'throttle':
        if (criticalViolations.length > 0) {
          // Throttle high-resource operations
          this.throttle('high-resource-ops', 10000);
          console.warn('[ResourceBudget] Throttling high-resource operations');
        }
        break;

      case 'cleanup':
        if (criticalViolations.length > 0) {
          // Trigger cleanup
          this.cleanupMeasurements();
          console.warn('[ResourceBudget] Cleaning up resources');
        }
        break;

      case 'reject':
        if (criticalViolations.length > 0) {
          // Reject new operations
          this.throttle('all-ops', 5000);
          console.error('[ResourceBudget] Rejecting operations due to budget violations');
        }
        break;
    }
  }

  /**
   * Clean up old measurements
   */
  private cleanupMeasurements(): void {
    const cutoff = Date.now() - 60000; // Keep last minute

    for (const [resource, measurements] of this.measurements.entries()) {
      const filtered = measurements.filter(m => m.timestamp >= cutoff);
      this.measurements.set(resource, filtered);
    }

    // Clean up old violations
    this.violations = this.violations.filter(v => v.timestamp >= cutoff);
  }

  /**
   * Format resource value for display
   */
  private formatResource(resource: keyof ResourceBudgets, value: number): string {
    switch (resource) {
      case 'memory':
      case 'storage':
        return this.formatBytes(value);
      case 'network':
        return `${this.formatBytes(value)}/s`;
      case 'cpuTime':
        return `${value}ms/s`;
      default:
        return value.toString();
    }
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }
}
