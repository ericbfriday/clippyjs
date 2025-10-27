import type { ContextProvider, ContextTrigger } from '../context/ContextProvider';

/**
 * Intrusion level for proactive suggestions
 */
export type IntrusionLevel = 'low' | 'medium' | 'high';

/**
 * Proactive behavior configuration
 */
export interface ProactiveBehaviorConfig {
  /** Enable/disable proactive behavior */
  enabled: boolean;
  /** How often to check for proactive opportunities (milliseconds) */
  checkInterval: number;
  /** Intrusion level for suggestions */
  intrusionLevel: IntrusionLevel;
  /** Maximum number of consecutive ignores before stopping */
  maxConsecutiveIgnores: number;
  /** Cooldown period after ignore (milliseconds) */
  ignoreCooldown: number;
}

/**
 * Trigger reason for proactive suggestion
 */
export type ProactiveTriggerReason =
  | 'idle_timeout'
  | 'form_detected'
  | 'error_detected'
  | 'context_change'
  | 'manual';

/**
 * Proactive suggestion event
 */
export interface ProactiveSuggestion {
  reason: ProactiveTriggerReason;
  context: any;
  timestamp: Date;
}

/**
 * Default proactive behavior configuration
 */
export const DEFAULT_PROACTIVE_CONFIG: ProactiveBehaviorConfig = {
  enabled: true,
  checkInterval: 120000, // 2 minutes
  intrusionLevel: 'medium',
  maxConsecutiveIgnores: 3,
  ignoreCooldown: 300000, // 5 minutes
};

/**
 * Proactive Behavior Engine
 *
 * Manages proactive AI suggestions based on user behavior,
 * context changes, and configured triggers.
 *
 * Features:
 * - Idle detection and periodic suggestions
 * - Context-based triggers (forms, errors, etc.)
 * - Intrusion level management
 * - Automatic cooldown after ignores
 * - Event-driven architecture
 */
export class ProactiveBehaviorEngine {
  private config: ProactiveBehaviorConfig;
  private contextProviders: ContextProvider[] = [];
  private checkTimer: NodeJS.Timeout | null = null;
  private lastSuggestionTime: Date | null = null;
  private consecutiveIgnores = 0;
  private inCooldown = false;
  private listeners: Array<(suggestion: ProactiveSuggestion) => void> = [];

  // Direct React callback property to avoid lookup issues
  public reactCallback: ((suggestion: ProactiveSuggestion) => void) | null = null;

  constructor(config: Partial<ProactiveBehaviorConfig> = {}) {
    this.config = { ...DEFAULT_PROACTIVE_CONFIG, ...config };
  }

  /**
   * Start the proactive behavior engine
   */
  start(): void {
    if (!this.config.enabled) {
      return;
    }

    this.stop(); // Clear any existing timer

    this.checkTimer = setInterval(() => {
      this.checkForProactiveOpportunities();
    }, this.config.checkInterval);
  }

  /**
   * Stop the proactive behavior engine
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Register a context provider
   */
  registerContextProvider(provider: ContextProvider): void {
    this.contextProviders.push(provider);
  }

  /**
   * Unregister a context provider
   */
  unregisterContextProvider(provider: ContextProvider): void {
    this.contextProviders = this.contextProviders.filter((p) => p !== provider);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProactiveBehaviorConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    // Restart if enabled state changed
    if (wasEnabled !== this.config.enabled) {
      if (this.config.enabled) {
        this.start();
      } else {
        this.stop();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ProactiveBehaviorConfig {
    return { ...this.config };
  }

  /**
   * Subscribe to proactive suggestions
   */
  onSuggestion(listener: (suggestion: ProactiveSuggestion) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Record that user ignored a suggestion
   */
  recordIgnore(): void {
    this.consecutiveIgnores++;

    if (this.consecutiveIgnores >= this.config.maxConsecutiveIgnores) {
      // Enter cooldown period
      this.inCooldown = true;
      setTimeout(() => {
        this.inCooldown = false;
        this.consecutiveIgnores = 0;
      }, this.config.ignoreCooldown);
    }
  }

  /**
   * Record that user accepted a suggestion
   */
  recordAccept(): void {
    this.consecutiveIgnores = 0;
    this.inCooldown = false;
  }

  /**
   * Manually trigger a proactive suggestion
   */
  async triggerSuggestion(reason: ProactiveTriggerReason = 'manual'): Promise<void> {
    console.log('[ProactiveBehaviorEngine] triggerSuggestion called with reason:', reason);

    // For manual triggers, bypass time interval check
    const isManual = reason === 'manual';
    const canTrigger = this.shouldTrigger(isManual);
    console.log('[ProactiveBehaviorEngine] shouldTrigger returned:', canTrigger);

    if (!canTrigger) {
      console.log('[ProactiveBehaviorEngine] Cannot trigger - config.enabled:', this.config.enabled, 'inCooldown:', this.inCooldown);
      return;
    }

    console.log('[ProactiveBehaviorEngine] Gathering context...');
    let context;
    try {
      context = await this.gatherContext();
      console.log('[ProactiveBehaviorEngine] Context gathered:', context);
    } catch (error) {
      console.error('[ProactiveBehaviorEngine] Error gathering context:', error);
      // Use empty context if gathering fails
      context = {};
    }

    const suggestion: ProactiveSuggestion = {
      reason,
      context,
      timestamp: new Date(),
    };

    this.lastSuggestionTime = suggestion.timestamp;
    console.log('[ProactiveBehaviorEngine] Calling notifyListeners with suggestion:', suggestion);
    this.notifyListeners(suggestion);
    console.log('[ProactiveBehaviorEngine] notifyListeners completed');
  }

  /**
   * Check if we should trigger a proactive suggestion
   */
  private shouldTrigger(bypassTimeCheck = false): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (this.inCooldown) {
      return false;
    }

    // Don't trigger too frequently based on intrusion level (unless bypassing time check)
    if (!bypassTimeCheck && this.lastSuggestionTime) {
      const timeSinceLastSuggestion = Date.now() - this.lastSuggestionTime.getTime();
      const minInterval = this.getMinIntervalForIntrusionLevel();

      if (timeSinceLastSuggestion < minInterval) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get minimum interval based on intrusion level
   */
  private getMinIntervalForIntrusionLevel(): number {
    switch (this.config.intrusionLevel) {
      case 'low':
        return 300000; // 5 minutes
      case 'medium':
        return 120000; // 2 minutes
      case 'high':
        return 60000; // 1 minute
      default:
        return 120000;
    }
  }

  /**
   * Check for proactive opportunities
   */
  private async checkForProactiveOpportunities(): Promise<void> {
    if (!this.shouldTrigger()) {
      return;
    }

    // Gather context and analyze for triggers
    const context = await this.gatherContext();

    // Check for specific triggers based on context
    const trigger = this.analyzeTriggers(context);
    if (trigger) {
      await this.triggerSuggestion(trigger);
    }
  }

  /**
   * Gather context from all providers
   */
  private async gatherContext(): Promise<any> {
    const trigger: ContextTrigger = 'proactive';
    const contextData = await Promise.all(
      this.contextProviders
        .filter((p) => p.enabled && (!p.shouldInclude || p.shouldInclude(trigger)))
        .map((p) => p.gather())
    );

    return contextData.reduce((acc, data) => {
      acc[data.provider] = data.data;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Analyze context for specific triggers
   */
  private analyzeTriggers(context: any): ProactiveTriggerReason | null {
    // Check for forms
    if (context.dom?.forms && context.dom.forms.length > 0) {
      return 'form_detected';
    }

    // Check for errors in console (if available)
    // This would require additional context provider

    // Check for significant context changes
    // This is a simple idle timeout trigger
    return 'idle_timeout';
  }

  /**
   * Notify all listeners of a suggestion
   */
  private notifyListeners(suggestion: ProactiveSuggestion): void {
    console.log('[ProactiveBehaviorEngine] notifyListeners called');
    console.log('[ProactiveBehaviorEngine] reactCallback:', !!this.reactCallback);
    console.log('[ProactiveBehaviorEngine] listeners.length:', this.listeners.length);

    // Call React callback first if set (direct property for React state updates)
    if (this.reactCallback) {
      try {
        console.log('[ProactiveBehaviorEngine] Calling reactCallback');
        this.reactCallback(suggestion);
        console.log('[ProactiveBehaviorEngine] reactCallback completed successfully');
      } catch (error) {
        console.error('[ProactiveBehaviorEngine] Error in React callback:', error);
      }
    }

    // Then call all registered listeners
    this.listeners.forEach((listener, index) => {
      try {
        console.log(`[ProactiveBehaviorEngine] Calling listener ${index + 1}/${this.listeners.length}`);
        listener(suggestion);
        console.log(`[ProactiveBehaviorEngine] Listener ${index + 1} completed successfully`);
      } catch (error) {
        console.error('[ProactiveBehaviorEngine] Error in proactive suggestion listener:', error);
      }
    });

    console.log('[ProactiveBehaviorEngine] notifyListeners finished calling all callbacks');
  }

  /**
   * Destroy the engine and clean up resources
   */
  destroy(): void {
    this.stop();
    this.listeners = [];
    this.contextProviders = [];
  }
}
