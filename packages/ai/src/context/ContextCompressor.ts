import type { ContextData } from './ContextProvider';
import { DEFAULT_COMPRESSION_STRATEGIES } from './compression/CompressionStrategies';

/**
 * Configuration for context compression
 */
export interface CompressionConfig {
  /**
   * Token budget to target (default: undefined = no limit)
   * When undefined, no compression is performed
   */
  tokenBudget?: number;

  /**
   * Minimum essential data to preserve (default: 0.95 = 95%)
   * Value between 0 and 1
   */
  minEssentialPreservation: number;

  /**
   * Compression strategies to apply in order of preference
   */
  strategies: CompressionStrategy[];

  /**
   * Token estimation function (default: chars / 4)
   * Rough heuristic: 1 token ≈ 4 characters
   */
  estimateTokens?: (text: string) => number;
}

/**
 * Result of context compression operation
 */
export interface CompressionResult {
  /** Original uncompressed context */
  original: ContextData;

  /** Compressed context */
  compressed: ContextData;

  /** Token savings statistics */
  savings: CompressionSavings;

  /** Names of strategies that were applied */
  strategiesApplied: string[];

  /** Percentage of essential data preserved (0-1, 1 = 100%) */
  essentialDataPreserved: number;
}

/**
 * Token savings statistics
 */
export interface CompressionSavings {
  /** Original token count */
  originalTokens: number;

  /** Compressed token count */
  compressedTokens: number;

  /** Tokens saved */
  savedTokens: number;

  /** Compression ratio (0-1, 0.7 = 70% of original size) */
  compressionRatio: number;

  /** Percent saved (0-100, 30 = 30% saved) */
  percentSaved: number;
}

/**
 * Compression strategy interface
 */
export interface CompressionStrategy {
  /** Strategy name for tracking */
  readonly name: string;

  /**
   * Apply compression strategy to context
   * @param context Context to compress
   * @returns Compressed context
   */
  apply(context: ContextData): ContextData;
}

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  tokenBudget: undefined, // No limit by default
  minEssentialPreservation: 0.95, // Preserve 95% of essential data
  strategies: DEFAULT_COMPRESSION_STRATEGIES,
  estimateTokens: (text: string) => Math.ceil(text.length / 4), // 1 token ≈ 4 chars
};

/**
 * Context compressor for optimizing token usage
 *
 * Features:
 * - Progressive compression strategies (remove redundancy → summarize → keep essential)
 * - Token budget compliance (stays within specified limits)
 * - Essential data preservation (>95% of critical information)
 * - Compression analytics (savings, ratios, preservation metrics)
 *
 * Performance targets:
 * - Compression time: <10ms
 * - Token savings: >30%
 * - Essential preservation: >95%
 * - Budget violations: <5%
 *
 * Usage:
 * ```typescript
 * const compressor = new ContextCompressor({
 *   tokenBudget: 500,
 *   minEssentialPreservation: 0.95,
 * });
 *
 * const result = compressor.compress(context);
 * console.log(`Saved ${result.savings.percentSaved}% tokens`);
 * ```
 */
export class ContextCompressor {
  private config: CompressionConfig;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      ...DEFAULT_COMPRESSION_CONFIG,
      ...config,
    };
  }

  /**
   * Compress context to fit within token budget
   *
   * Applies compression strategies progressively until:
   * 1. Token budget is met, OR
   * 2. All strategies exhausted, OR
   * 3. Essential data preservation threshold violated
   *
   * @param context Context to compress
   * @param budget Optional budget override
   * @returns Compression result with savings and metrics
   */
  compress(context: ContextData, budget?: number): CompressionResult {
    const original = context;
    let compressed = this.deepClone(context);
    const strategiesApplied: string[] = [];

    const targetBudget = budget ?? this.config.tokenBudget;

    // No budget = no compression
    if (targetBudget === undefined) {
      return this.createResult(original, compressed, strategiesApplied);
    }

    let currentTokens = this.estimateTokens(compressed);
    let previousCompressed = compressed;

    // Progressive compression: apply strategies in order until budget met
    for (const strategy of this.config.strategies) {
      // Already within budget? Stop here
      if (currentTokens <= targetBudget) {
        break;
      }

      // Apply strategy
      compressed = strategy.apply(compressed);
      strategiesApplied.push(strategy.name);
      currentTokens = this.estimateTokens(compressed);

      // Check essential data preservation
      const preservation = this.calculatePreservation(original, compressed);

      if (preservation < this.config.minEssentialPreservation) {
        // Too much data lost - revert to previous state
        console.warn(
          `Strategy "${strategy.name}" removed too much data (${(preservation * 100).toFixed(1)}%), reverting`
        );
        compressed = previousCompressed;
        strategiesApplied.pop(); // Remove failed strategy
        break;
      }

      // Save this state as previous for next iteration
      previousCompressed = this.deepClone(compressed);
    }

    return this.createResult(original, compressed, strategiesApplied);
  }

  /**
   * Estimate token count for context
   *
   * Uses configured estimation function or default heuristic:
   * 1 token ≈ 4 characters (rough approximation)
   *
   * @param context Context to estimate
   * @returns Estimated token count
   */
  estimateTokens(context: ContextData): number {
    const text = JSON.stringify(context);

    if (this.config.estimateTokens) {
      return this.config.estimateTokens(text);
    }

    // Default: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate how much essential data is preserved
   *
   * Essential data includes:
   * - Form errors and validation state
   * - Focused fields and active elements
   * - Current viewport and scroll position
   * - Navigation current URL
   * - Performance Core Web Vitals
   *
   * Non-essential data:
   * - Historical data (navigation history, old values)
   * - Large field values (can be summarized)
   * - Redundant information
   * - Metadata and timestamps
   *
   * @param original Original context
   * @param compressed Compressed context
   * @returns Preservation ratio (0-1, 1 = 100% preserved)
   */
  private calculatePreservation(original: ContextData, compressed: ContextData): number {
    // Define essential fields by provider type
    const essentialFields = this.getEssentialFields(original.provider);

    let originalEssentialCount = 0;
    let compressedEssentialCount = 0;

    // Count essential fields in original
    for (const field of essentialFields) {
      if (this.hasField(original.data, field)) {
        originalEssentialCount++;
      }
    }

    // Count essential fields in compressed
    for (const field of essentialFields) {
      if (this.hasField(compressed.data, field)) {
        compressedEssentialCount++;
      }
    }

    // If no essential fields identified, fall back to size ratio
    if (originalEssentialCount === 0) {
      const originalSize = JSON.stringify(original).length;
      const compressedSize = JSON.stringify(compressed).length;
      return compressedSize / originalSize;
    }

    // Return ratio of essential fields preserved
    return compressedEssentialCount / originalEssentialCount;
  }

  /**
   * Get essential field paths by provider type
   *
   * @param provider Provider name
   * @returns Array of essential field paths
   */
  private getEssentialFields(provider: string): string[] {
    const essentialFieldMap: Record<string, string[]> = {
      form: [
        'forms',
        'validation',
        'errors',
        'focused',
        'completion',
        'fields.type',
        'fields.name',
        'fields.required',
      ],
      viewport: [
        'viewport.width',
        'viewport.height',
        'viewport.orientation',
        'scroll.percentX',
        'scroll.percentY',
      ],
      performance: ['vitals', 'navigation.loadTime', 'paint.fcp', 'paint.lcp'],
      navigation: ['current.url', 'current.pathname', 'current.params'],
      dom: ['elementCount', 'interactiveElements'],
      'user-action': ['action', 'target', 'timestamp'],
    };

    return essentialFieldMap[provider] || [];
  }

  /**
   * Check if object has field at path
   *
   * @param obj Object to check
   * @param path Dot-separated field path
   * @returns True if field exists
   */
  private hasField(obj: any, path: string): boolean {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return false;
      }

      if (typeof current !== 'object') {
        return false;
      }

      current = current[part];
    }

    return current !== undefined;
  }

  /**
   * Create compression result with statistics
   *
   * @param original Original context
   * @param compressed Compressed context
   * @param strategies Strategies applied
   * @returns Compression result
   */
  private createResult(
    original: ContextData,
    compressed: ContextData,
    strategies: string[]
  ): CompressionResult {
    const originalTokens = this.estimateTokens(original);
    const compressedTokens = this.estimateTokens(compressed);
    const savedTokens = originalTokens - compressedTokens;

    return {
      original,
      compressed,
      savings: {
        originalTokens,
        compressedTokens,
        savedTokens,
        compressionRatio: originalTokens > 0 ? compressedTokens / originalTokens : 1,
        percentSaved: originalTokens > 0 ? (savedTokens / originalTokens) * 100 : 0,
      },
      strategiesApplied: strategies,
      essentialDataPreserved: this.calculatePreservation(original, compressed),
    };
  }

  /**
   * Deep clone context data
   *
   * @param context Context to clone
   * @returns Cloned context
   */
  private deepClone(context: ContextData): ContextData {
    return JSON.parse(JSON.stringify(context));
  }
}
