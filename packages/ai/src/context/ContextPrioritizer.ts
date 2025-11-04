import type { ContextData } from './ContextProvider';

/**
 * Scored context with relevance score
 */
export interface ScoredContext {
  /** Original context data */
  context: ContextData;
  /** Relevance score (0-1) */
  score: number;
  /** Provider identifier */
  source: string;
}

/**
 * Prioritizer configuration
 */
export interface PrioritizerConfig {
  /**
   * Weight multiplier for recent contexts (last 5 seconds)
   * @default 1.5
   */
  recencyWeight: number;

  /**
   * Weight multipliers for different context types
   * Higher = more relevant by default
   * @default { form: 1.5, 'user-action': 1.4, viewport: 1.2, navigation: 1.1, dom: 1.0, performance: 0.8 }
   */
  typeWeights: Record<string, number>;

  /**
   * Penalty multiplier for large contexts (>5KB JSON)
   * @default 0.8
   */
  sizePenalty: number;

  /**
   * Boost multipliers for different trigger types
   * @default { 'user-action': 1.2, proactive: 1.0, manual: 1.0 }
   */
  triggerBoosts: Record<string, number>;
}

/**
 * Default prioritizer configuration
 */
export const DEFAULT_PRIORITIZER_CONFIG: PrioritizerConfig = {
  recencyWeight: 1.5,
  typeWeights: {
    form: 1.5,
    'user-action': 1.4,
    viewport: 1.2,
    navigation: 1.1,
    dom: 1.0,
    performance: 0.8,
  },
  sizePenalty: 0.8,
  triggerBoosts: {
    'user-action': 1.2,
    proactive: 1.0,
    manual: 1.0,
  },
};

/**
 * Options for context prioritization
 */
export interface PrioritizationOptions {
  /** Type of trigger that initiated gathering */
  trigger?: 'user-action' | 'proactive' | 'manual';
  /** Token budget constraint */
  tokenBudget?: number;
  /** Minimum relevance threshold */
  minRelevance?: number;
}

/**
 * Context Prioritizer
 *
 * Scores and ranks contexts by relevance using multiple factors:
 * - Recency: Recent contexts (last 5s) get boost
 * - Type: Different context types have different base relevance
 * - Size: Large contexts get penalty (prefer compact)
 * - Trigger: Certain triggers boost specific context types
 *
 * Scores are normalized to 0-1 range where:
 * - 1.0 = Highly relevant, fresh, compact
 * - 0.5 = Average relevance
 * - 0.0 = Not relevant
 */
export class ContextPrioritizer {
  private config: PrioritizerConfig;

  constructor(config: Partial<PrioritizerConfig> = {}) {
    this.config = { ...DEFAULT_PRIORITIZER_CONFIG, ...config };
  }

  /**
   * Score and sort contexts by relevance
   * @param contexts Array of contexts to score
   * @param options Prioritization options
   * @returns Sorted array of scored contexts (highest score first)
   */
  score(contexts: ContextData[], options: PrioritizationOptions = {}): ScoredContext[] {
    return contexts
      .map((ctx) => ({
        context: ctx,
        score: this.calculateScore(ctx, options),
        source: ctx.provider,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate relevance score for a single context
   */
  private calculateScore(ctx: ContextData, options: PrioritizationOptions): number {
    let score = 1.0;

    // Factor 1: Recency boost (contexts from last 5 seconds)
    const age = Date.now() - ctx.timestamp.getTime();
    if (age < 5000) {
      score *= this.config.recencyWeight; // Default: 1.5x
    }

    // Factor 2: Type priority
    const typeWeight = this.config.typeWeights[ctx.provider] || 1.0;
    score *= typeWeight;

    // Factor 3: Size penalty (prefer compact contexts)
    const size = this.estimateSize(ctx);
    if (size > 5000) {
      // >5KB JSON
      score *= this.config.sizePenalty; // Default: 0.8x
    }

    // Factor 4: Trigger-specific boosts
    if (options.trigger) {
      const boost = this.config.triggerBoosts[options.trigger] || 1.0;
      score *= boost;

      // Special case: form contexts get extra boost for user-action trigger
      if (options.trigger === 'user-action' && ctx.provider === 'form') {
        score *= 1.2;
      }
    }

    // Normalize to 0-1 range
    // Base score can be up to ~2.7 (1.5 * 1.5 * 1.2 * 1.2)
    // So divide by 3 to normalize
    return Math.min(1.0, Math.max(0.0, score / 3.0));
  }

  /**
   * Estimate size of context in bytes (JSON stringified)
   */
  private estimateSize(ctx: ContextData): number {
    try {
      return JSON.stringify(ctx).length * 2; // UTF-16 bytes
    } catch (e) {
      // Fallback to conservative estimate
      return 1024; // 1KB default
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PrioritizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<PrioritizerConfig> {
    return { ...this.config };
  }
}
