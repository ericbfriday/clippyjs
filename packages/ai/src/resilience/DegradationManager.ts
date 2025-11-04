/**
 * Graceful degradation manager for feature fallback coordination
 *
 * Manages automatic feature degradation and fallback strategies:
 * - Fallback strategy registry
 * - Automatic feature degradation
 * - Service dependency graph
 * - Degradation level management
 * - Recovery coordination
 */

/**
 * Degradation level severity
 */
export enum DegradationLevel {
  /** Full functionality */
  FULL = 'full',
  /** Minor features disabled */
  PARTIAL = 'partial',
  /** Core features only */
  MINIMAL = 'minimal',
  /** Service unavailable */
  UNAVAILABLE = 'unavailable',
}

/**
 * Feature status
 */
export interface FeatureStatus {
  name: string;
  level: DegradationLevel;
  degradedAt?: number;
  reason?: string;
  dependencies: string[];
  fallbackActive: boolean;
}

/**
 * Fallback strategy interface
 */
export interface FallbackStrategy {
  /** Execute fallback */
  execute(): Promise<any>;
  /** Check if fallback is available */
  isAvailable(): Promise<boolean>;
  /** Get fallback quality score (0-1) */
  getQualityScore(): number;
  /** Cleanup resources */
  cleanup?(): Promise<void>;
}

/**
 * Degradation trigger configuration
 */
export interface DegradationTrigger {
  /** Error rate threshold (0-1) */
  errorRateThreshold?: number;
  /** Response time threshold in ms */
  responseTimeThreshold?: number;
  /** Circuit breaker state trigger */
  circuitBreakerState?: 'open' | 'half-open';
  /** Manual trigger function */
  customTrigger?: () => boolean;
}

/**
 * Feature configuration
 */
export interface FeatureConfig {
  name: string;
  /** Dependencies required for this feature */
  dependencies?: string[];
  /** Fallback strategy */
  fallback?: FallbackStrategy;
  /** Degradation triggers */
  triggers?: DegradationTrigger;
  /** Priority (higher = more important) */
  priority?: number;
  /** Auto-recover when dependencies healthy */
  autoRecover?: boolean;
}

/**
 * Degradation status for all features
 */
export interface DegradationStatus {
  globalLevel: DegradationLevel;
  features: Record<string, FeatureStatus>;
  degradedCount: number;
  unavailableCount: number;
  healthScore: number;
}

/**
 * Degradation event
 */
export interface DegradationEvent {
  type: 'degraded' | 'recovered';
  feature: string;
  level: DegradationLevel;
  previousLevel?: DegradationLevel;
  reason: string;
  timestamp: number;
}

/**
 * Degradation manager options
 */
export interface DegradationManagerOptions {
  /** Enable automatic degradation */
  autoDegrade?: boolean;
  /** Enable automatic recovery */
  autoRecover?: boolean;
  /** Recovery check interval in ms */
  recoveryCheckInterval?: number;
  /** Maximum concurrent degradations */
  maxConcurrentDegradations?: number;
  /** Event callback */
  onDegradationEvent?: (event: DegradationEvent) => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<DegradationManagerOptions> = {
  autoDegrade: true,
  autoRecover: true,
  recoveryCheckInterval: 30000, // 30 seconds
  maxConcurrentDegradations: 10,
  onDegradationEvent: () => {},
};

/**
 * Graceful degradation manager
 *
 * Coordinates feature degradation and recovery across the system.
 * Manages fallback strategies, dependency graphs, and automatic
 * recovery when services become healthy again.
 *
 * Features:
 * - Register fallback strategies per feature
 * - Automatic degradation based on error rates, timeouts
 * - Dependency-aware degradation (cascade control)
 * - Multiple degradation levels (full → partial → minimal → unavailable)
 * - Automatic recovery when dependencies heal
 * - Event notifications for monitoring
 *
 * Usage:
 * ```ts
 * const manager = new DegradationManager({
 *   autoDegrade: true,
 *   autoRecover: true,
 * });
 *
 * // Register features with fallbacks
 * manager.registerFeature({
 *   name: 'ai-suggestions',
 *   dependencies: ['openai-api'],
 *   fallback: new CachedResponseFallback(),
 *   priority: 8,
 * });
 *
 * // Degrade feature
 * await manager.degrade('openai-api', DegradationLevel.UNAVAILABLE);
 * // ai-suggestions automatically degrades to fallback
 *
 * // Recover feature
 * await manager.recover('openai-api');
 * // ai-suggestions automatically recovers
 * ```
 */
export class DegradationManager {
  private options: Required<DegradationManagerOptions>;
  private features = new Map<string, FeatureConfig>();
  private featureStatus = new Map<string, FeatureStatus>();
  private recoveryInterval: NodeJS.Timeout | null = null;
  private degradationEvents: DegradationEvent[] = [];

  constructor(options: DegradationManagerOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    if (this.options.autoRecover) {
      this.startRecoveryChecks();
    }
  }

  /**
   * Register a feature with fallback strategy
   */
  registerFeature(config: FeatureConfig): void {
    this.features.set(config.name, {
      dependencies: [],
      priority: 5,
      autoRecover: true,
      ...config,
    });

    // Initialize feature status
    this.featureStatus.set(config.name, {
      name: config.name,
      level: DegradationLevel.FULL,
      dependencies: config.dependencies || [],
      fallbackActive: false,
    });
  }

  /**
   * Unregister a feature
   */
  async unregisterFeature(name: string): Promise<void> {
    const config = this.features.get(name);
    if (config?.fallback?.cleanup) {
      await config.fallback.cleanup();
    }

    this.features.delete(name);
    this.featureStatus.delete(name);
  }

  /**
   * Degrade a feature to specified level
   */
  async degrade(
    featureName: string,
    level: DegradationLevel,
    reason: string = 'Manual degradation'
  ): Promise<void> {
    const status = this.featureStatus.get(featureName);
    if (!status) {
      throw new Error(`Feature not registered: ${featureName}`);
    }

    const previousLevel = status.level;
    if (previousLevel === level) {
      return; // Already at this level
    }

    // Update status
    status.level = level;
    status.degradedAt = Date.now();
    status.reason = reason;

    // Activate fallback if available and degraded
    const config = this.features.get(featureName);
    if (level !== DegradationLevel.FULL && config?.fallback) {
      const fallbackAvailable = await config.fallback.isAvailable();
      status.fallbackActive = fallbackAvailable;
    } else {
      status.fallbackActive = false;
    }

    // Emit degradation event
    this.emitEvent({
      type: 'degraded',
      feature: featureName,
      level,
      previousLevel,
      reason,
      timestamp: Date.now(),
    });

    // Check if dependent features need degradation
    await this.degradeDependentFeatures(featureName, level);
  }

  /**
   * Recover a feature to full functionality
   */
  async recover(featureName: string): Promise<void> {
    const status = this.featureStatus.get(featureName);
    if (!status) {
      throw new Error(`Feature not registered: ${featureName}`);
    }

    if (status.level === DegradationLevel.FULL) {
      return; // Already at full
    }

    const previousLevel = status.level;

    // Check dependencies are healthy
    const dependenciesHealthy = await this.checkDependenciesHealthy(featureName);
    if (!dependenciesHealthy) {
      return; // Cannot recover yet
    }

    // Update status
    status.level = DegradationLevel.FULL;
    status.degradedAt = undefined;
    status.reason = undefined;
    status.fallbackActive = false;

    // Emit recovery event
    this.emitEvent({
      type: 'recovered',
      feature: featureName,
      level: DegradationLevel.FULL,
      previousLevel,
      reason: 'Dependencies recovered',
      timestamp: Date.now(),
    });

    // Attempt to recover dependent features
    await this.recoverDependentFeatures(featureName);
  }

  /**
   * Execute feature with fallback
   */
  async executeWithFallback<T>(
    featureName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const status = this.featureStatus.get(featureName);
    if (!status) {
      throw new Error(`Feature not registered: ${featureName}`);
    }

    // If feature is unavailable, use fallback immediately
    if (status.level === DegradationLevel.UNAVAILABLE) {
      const config = this.features.get(featureName);
      if (config?.fallback && status.fallbackActive) {
        return await config.fallback.execute();
      }
      throw new Error(`Feature unavailable and no fallback: ${featureName}`);
    }

    // Try operation
    try {
      return await operation();
    } catch (error) {
      // If operation fails and we have fallback, use it
      const config = this.features.get(featureName);
      if (config?.fallback) {
        const fallbackAvailable = await config.fallback.isAvailable();
        if (fallbackAvailable) {
          // Automatically degrade if auto-degrade enabled
          if (this.options.autoDegrade) {
            await this.degrade(
              featureName,
              DegradationLevel.PARTIAL,
              `Operation failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }
          return await config.fallback.execute();
        }
      }
      throw error;
    }
  }

  /**
   * Get current degradation status
   */
  getStatus(): DegradationStatus {
    const features: Record<string, FeatureStatus> = {};
    let degradedCount = 0;
    let unavailableCount = 0;
    let totalPriority = 0;
    let weightedHealth = 0;

    for (const [name, status] of Array.from(this.featureStatus.entries())) {
      features[name] = { ...status };

      if (status.level !== DegradationLevel.FULL) {
        degradedCount++;
      }
      if (status.level === DegradationLevel.UNAVAILABLE) {
        unavailableCount++;
      }

      // Calculate weighted health
      const config = this.features.get(name);
      const priority = config?.priority || 5;
      totalPriority += priority;

      let levelScore = 1;
      switch (status.level) {
        case DegradationLevel.PARTIAL:
          levelScore = 0.7;
          break;
        case DegradationLevel.MINIMAL:
          levelScore = 0.3;
          break;
        case DegradationLevel.UNAVAILABLE:
          levelScore = 0;
          break;
      }

      weightedHealth += priority * levelScore;
    }

    const healthScore = totalPriority > 0 ? (weightedHealth / totalPriority) * 100 : 100;

    // Determine global level
    let globalLevel = DegradationLevel.FULL;
    if (unavailableCount > 0 || degradedCount > this.featureStatus.size * 0.5) {
      globalLevel = DegradationLevel.MINIMAL;
    } else if (degradedCount > this.featureStatus.size * 0.3) {
      globalLevel = DegradationLevel.PARTIAL;
    }

    return {
      globalLevel,
      features,
      degradedCount,
      unavailableCount,
      healthScore: Math.round(healthScore),
    };
  }

  /**
   * Get feature status
   */
  getFeatureStatus(name: string): FeatureStatus | undefined {
    return this.featureStatus.get(name);
  }

  /**
   * Check if feature is degraded
   */
  isDegraded(name: string): boolean {
    const status = this.featureStatus.get(name);
    return status ? status.level !== DegradationLevel.FULL : false;
  }

  /**
   * Get degradation history
   */
  getHistory(limit = 100): DegradationEvent[] {
    return this.degradationEvents.slice(-limit);
  }

  /**
   * Degrade features that depend on the degraded feature
   */
  private async degradeDependentFeatures(
    featureName: string,
    level: DegradationLevel
  ): Promise<void> {
    for (const [name, status] of Array.from(this.featureStatus.entries())) {
      if (status.dependencies.includes(featureName)) {
        // Dependent feature should degrade to at least the same level
        if (this.compareLevels(status.level, level) < 0) {
          await this.degrade(
            name,
            level,
            `Dependency degraded: ${featureName}`
          );
        }
      }
    }
  }

  /**
   * Attempt to recover features that depend on the recovered feature
   */
  private async recoverDependentFeatures(featureName: string): Promise<void> {
    if (!this.options.autoRecover) return;

    for (const [name, config] of Array.from(this.features.entries())) {
      if (config.autoRecover !== false && config.dependencies?.includes(featureName)) {
        const status = this.featureStatus.get(name);
        if (status && status.level !== DegradationLevel.FULL) {
          await this.recover(name);
        }
      }
    }
  }

  /**
   * Check if all dependencies are healthy
   */
  private async checkDependenciesHealthy(featureName: string): Promise<boolean> {
    const config = this.features.get(featureName);
    if (!config?.dependencies || config.dependencies.length === 0) {
      return true;
    }

    for (const dep of config.dependencies) {
      const depStatus = this.featureStatus.get(dep);
      if (!depStatus || depStatus.level !== DegradationLevel.FULL) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare degradation levels
   */
  private compareLevels(a: DegradationLevel, b: DegradationLevel): number {
    const order = [
      DegradationLevel.FULL,
      DegradationLevel.PARTIAL,
      DegradationLevel.MINIMAL,
      DegradationLevel.UNAVAILABLE,
    ];
    return order.indexOf(a) - order.indexOf(b);
  }

  /**
   * Emit degradation event
   */
  private emitEvent(event: DegradationEvent): void {
    this.degradationEvents.push(event);

    // Limit history size
    if (this.degradationEvents.length > 1000) {
      this.degradationEvents = this.degradationEvents.slice(-500);
    }

    if (this.options.onDegradationEvent) {
      this.options.onDegradationEvent(event);
    }
  }

  /**
   * Start periodic recovery checks
   */
  private startRecoveryChecks(): void {
    this.recoveryInterval = setInterval(
      () => this.checkRecoveries(),
      this.options.recoveryCheckInterval
    );
  }

  /**
   * Check for possible recoveries
   */
  private async checkRecoveries(): Promise<void> {
    for (const [name, config] of Array.from(this.features.entries())) {
      if (config.autoRecover !== false) {
        const status = this.featureStatus.get(name);
        if (status && status.level !== DegradationLevel.FULL) {
          await this.recover(name);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }

    // Cleanup all fallbacks
    for (const [name, config] of Array.from(this.features.entries())) {
      if (config.fallback?.cleanup) {
        await config.fallback.cleanup();
      }
    }

    this.features.clear();
    this.featureStatus.clear();
    this.degradationEvents = [];
  }
}
