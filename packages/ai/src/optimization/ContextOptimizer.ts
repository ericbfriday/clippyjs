/**
 * Intelligent context optimization with priority system, compression, and summarization
 *
 * Manages context tokens through semantic compression, priority-based retention,
 * and intelligent conversation summarization to fit within model context limits.
 */

import type { Message } from '../providers/AIProvider';

/**
 * Context priority classification
 */
export interface ContextPriority {
  /** Essential context that must never be removed */
  essential: string[];
  /** Important context removed only if necessary */
  important: string[];
  /** Optional context removed first when space needed */
  optional: string[];
}

/**
 * Compression strategy type
 */
export type CompressionStrategy =
  | 'semantic-preserving'  // Maintain meaning while reducing tokens
  | 'lossy'                // Aggressive compression with potential information loss
  | 'selective'            // Keep only most relevant information
  | 'none';                // No compression

/**
 * Summarization strategy
 */
export type SummarizationStrategy =
  | 'extractive'   // Extract key sentences/phrases
  | 'abstractive'  // Generate new condensed summary
  | 'hybrid';      // Combination of both

/**
 * Context optimization configuration
 */
export interface ContextOptimizationConfig {
  /** Maximum tokens allowed in context */
  maxTokens?: number;
  /** Compression strategy to use */
  compressionStrategy?: CompressionStrategy;
  /** Summarization configuration */
  summarization?: {
    /** Enable automatic summarization */
    enabled?: boolean;
    /** Summarize after this many messages */
    threshold?: number;
    /** Strategy for summarization */
    strategy?: SummarizationStrategy;
    /** Keep this many recent messages unsummarized */
    keepRecentCount?: number;
  };
  /** Priority configuration */
  priority?: {
    /** Enable priority-based retention */
    enabled?: boolean;
    /** Default priority for new context */
    default?: 'essential' | 'important' | 'optional';
  };
  /** Token estimation function (defaults to rough word-based estimate) */
  estimateTokens?: (text: string) => number;
}

/**
 * Default context optimization configuration
 */
export const DEFAULT_OPTIMIZATION_CONFIG: Required<ContextOptimizationConfig> = {
  maxTokens: 4000,
  compressionStrategy: 'semantic-preserving',
  summarization: {
    enabled: true,
    threshold: 20,
    strategy: 'hybrid',
    keepRecentCount: 5,
  },
  priority: {
    enabled: true,
    default: 'optional',
  },
  estimateTokens: (text: string) => Math.ceil(text.split(/\s+/).length * 1.3), // ~1.3 tokens per word
};

/**
 * Optimization statistics
 */
export interface OptimizationStats {
  /** Original token count before optimization */
  originalTokens: number;
  /** Final token count after optimization */
  optimizedTokens: number;
  /** Percentage reduction */
  reductionPercentage: number;
  /** Number of messages summarized */
  messagesSummarized: number;
  /** Number of items compressed */
  itemsCompressed: number;
  /** Number of items removed */
  itemsRemoved: number;
}

/**
 * Context middleware for custom transformations
 */
export type ContextMiddleware = (
  context: string[],
  priority: ContextPriority
) => { context: string[]; priority: ContextPriority };

/**
 * Context optimizer
 *
 * Provides intelligent context management through:
 * - Priority-based retention (essential/important/optional)
 * - Semantic compression without information loss
 * - Conversation summarization
 * - Middleware system for custom transformations
 *
 * Usage:
 * ```ts
 * const optimizer = new ContextOptimizer({
 *   maxTokens: 4000,
 *   compressionStrategy: 'semantic-preserving',
 *   summarization: {
 *     enabled: true,
 *     threshold: 20,
 *   }
 * });
 *
 * // Optimize context
 * const result = await optimizer.optimize(context, priority);
 *
 * // Compress specific text
 * const compressed = optimizer.compress(text);
 *
 * // Summarize conversation
 * const summary = optimizer.summarizeConversation(messages);
 * ```
 */
export class ContextOptimizer {
  private config: Required<ContextOptimizationConfig>;
  private middleware: ContextMiddleware[] = [];

  constructor(config: ContextOptimizationConfig = {}) {
    this.config = {
      ...DEFAULT_OPTIMIZATION_CONFIG,
      ...config,
      summarization: {
        ...DEFAULT_OPTIMIZATION_CONFIG.summarization,
        ...config.summarization,
      },
      priority: {
        ...DEFAULT_OPTIMIZATION_CONFIG.priority,
        ...config.priority,
      },
    };
  }

  /**
   * Add middleware for custom context transformations
   */
  use(middleware: ContextMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Optimize context to fit within token limits
   *
   * Steps:
   * 1. Apply middleware transformations
   * 2. Estimate token counts
   * 3. Remove optional items if needed
   * 4. Compress important items if needed
   * 5. Only touch essential items as last resort
   */
  async optimize(
    context: string[],
    priority: ContextPriority
  ): Promise<{ context: string[]; priority: ContextPriority; stats: OptimizationStats }> {
    const originalTokens = this.estimateContextTokens(context);
    let currentContext = [...context];
    let currentPriority = this.deepClone(priority);

    // Apply middleware
    for (const mw of this.middleware) {
      const result = mw(currentContext, currentPriority);
      currentContext = result.context;
      currentPriority = result.priority;
    }

    let stats: OptimizationStats = {
      originalTokens,
      optimizedTokens: originalTokens,
      reductionPercentage: 0,
      messagesSummarized: 0,
      itemsCompressed: 0,
      itemsRemoved: 0,
    };

    // If within limits, return as-is
    if (originalTokens <= this.config.maxTokens) {
      stats.optimizedTokens = originalTokens;
      return { context: currentContext, priority: currentPriority, stats };
    }

    // Step 1: Remove optional items
    const { context: afterOptional, removed: optionalRemoved } = this.removeByPriority(
      currentContext,
      currentPriority.optional
    );
    stats.itemsRemoved += optionalRemoved;
    currentContext = afterOptional;

    let currentTokens = this.estimateContextTokens(currentContext);
    if (currentTokens <= this.config.maxTokens) {
      stats.optimizedTokens = currentTokens;
      stats.reductionPercentage = ((originalTokens - currentTokens) / originalTokens) * 100;
      return { context: currentContext, priority: currentPriority, stats };
    }

    // Step 2: Compress important items
    const { context: afterImportantCompress, compressed: importantCompressed } =
      this.compressByPriority(currentContext, currentPriority.important);
    stats.itemsCompressed += importantCompressed;
    currentContext = afterImportantCompress;

    currentTokens = this.estimateContextTokens(currentContext);
    if (currentTokens <= this.config.maxTokens) {
      stats.optimizedTokens = currentTokens;
      stats.reductionPercentage = ((originalTokens - currentTokens) / originalTokens) * 100;
      return { context: currentContext, priority: currentPriority, stats };
    }

    // Step 3: Remove important items if still over limit
    const { context: afterImportant, removed: importantRemoved } = this.removeByPriority(
      currentContext,
      currentPriority.important
    );
    stats.itemsRemoved += importantRemoved;
    currentContext = afterImportant;

    currentTokens = this.estimateContextTokens(currentContext);
    if (currentTokens <= this.config.maxTokens) {
      stats.optimizedTokens = currentTokens;
      stats.reductionPercentage = ((originalTokens - currentTokens) / originalTokens) * 100;
      return { context: currentContext, priority: currentPriority, stats };
    }

    // Step 4: Last resort - compress essential items
    const { context: afterEssentialCompress, compressed: essentialCompressed } =
      this.compressByPriority(currentContext, currentPriority.essential);
    stats.itemsCompressed += essentialCompressed;
    currentContext = afterEssentialCompress;

    const finalTokens = this.estimateContextTokens(currentContext);
    stats.optimizedTokens = finalTokens;
    stats.reductionPercentage = ((originalTokens - finalTokens) / originalTokens) * 100;

    return { context: currentContext, priority: currentPriority, stats };
  }

  /**
   * Compress text using configured strategy
   */
  compress(text: string): string {
    switch (this.config.compressionStrategy) {
      case 'semantic-preserving':
        return this.semanticCompress(text);
      case 'lossy':
        return this.lossyCompress(text);
      case 'selective':
        return this.selectiveCompress(text);
      case 'none':
      default:
        return text;
    }
  }

  /**
   * Summarize conversation maintaining key information
   */
  summarizeConversation(messages: Message[]): Message {
    const threshold = this.config.summarization.threshold;
    if (!this.config.summarization.enabled || messages.length < threshold) {
      // Return combined message if below threshold
      return this.combineMessages(messages);
    }

    // Keep recent messages, summarize older ones
    const keepCount = this.config.summarization.keepRecentCount;
    const toSummarize = messages.slice(0, -keepCount);
    const toKeep = messages.slice(-keepCount);

    const summary = this.generateSummary(toSummarize);

    return {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: `[Previous conversation summary: ${summary}]`,
        },
      ],
    };
  }

  /**
   * Prioritize context items
   */
  prioritize(items: string[]): ContextPriority {
    if (!this.config.priority.enabled) {
      return {
        essential: [],
        important: [],
        optional: items,
      };
    }

    // Simple heuristic-based prioritization
    // Can be customized via middleware for domain-specific logic
    const essential: string[] = [];
    const important: string[] = [];
    const optional: string[] = [];

    for (const item of items) {
      const lower = item.toLowerCase();

      // Essential: system prompts, critical instructions
      if (lower.includes('system') || lower.includes('critical') || lower.includes('must')) {
        essential.push(item);
      }
      // Important: user questions, key information
      else if (lower.includes('user:') || lower.includes('question') || lower.includes('important')) {
        important.push(item);
      }
      // Optional: everything else
      else {
        optional.push(item);
      }
    }

    return { essential, important, optional };
  }

  /**
   * Estimate token count for context array
   */
  private estimateContextTokens(context: string[]): number {
    return context.reduce((sum, item) => sum + this.config.estimateTokens(item), 0);
  }

  /**
   * Remove items by priority
   */
  private removeByPriority(
    context: string[],
    priorityItems: string[]
  ): { context: string[]; removed: number } {
    const set = new Set(priorityItems);
    const filtered = context.filter((item) => !set.has(item));
    return { context: filtered, removed: context.length - filtered.length };
  }

  /**
   * Compress items by priority
   */
  private compressByPriority(
    context: string[],
    priorityItems: string[]
  ): { context: string[]; compressed: number } {
    const set = new Set(priorityItems);
    let compressed = 0;

    const result = context.map((item) => {
      if (set.has(item)) {
        compressed++;
        return this.compress(item);
      }
      return item;
    });

    return { context: result, compressed };
  }

  /**
   * Semantic compression maintaining key information
   */
  private semanticCompress(text: string): string {
    // Remove redundant whitespace
    let compressed = text.replace(/\s+/g, ' ').trim();

    // Remove filler words while preserving meaning
    const fillers = /\b(just|really|very|actually|basically|literally)\b/gi;
    compressed = compressed.replace(fillers, '');

    // Condense repetitive phrases
    compressed = compressed.replace(/\b(\w+)\s+\1\b/gi, '$1');

    // Remove redundant punctuation
    compressed = compressed.replace(/[,;]+/g, ',').replace(/\.{2,}/g, '.');

    return compressed.trim();
  }

  /**
   * Lossy compression for aggressive reduction
   */
  private lossyCompress(text: string): string {
    // More aggressive than semantic
    let compressed = this.semanticCompress(text);

    // Keep only sentences with key information (questions, answers, important statements)
    const sentences = compressed.split(/[.!?]+/).filter(Boolean);
    const important = sentences.filter((s) => {
      const lower = s.toLowerCase();
      return (
        lower.includes('?') ||
        lower.includes('important') ||
        lower.includes('must') ||
        lower.includes('need') ||
        lower.includes('how') ||
        lower.includes('what') ||
        lower.includes('why')
      );
    });

    return important.length > 0 ? important.join('. ') + '.' : compressed;
  }

  /**
   * Selective compression keeping most relevant
   */
  private selectiveCompress(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(Boolean);

    // Score sentences by importance
    const scored = sentences.map((sentence) => {
      const lower = sentence.toLowerCase();
      let score = 0;

      // Questions are important
      if (lower.includes('?')) score += 3;

      // Keywords indicate importance
      const keywords = ['important', 'must', 'need', 'critical', 'key', 'main'];
      keywords.forEach((kw) => {
        if (lower.includes(kw)) score += 2;
      });

      // Technical terms suggest relevance
      if (/\b[A-Z][a-z]*(?:[A-Z][a-z]*)+\b/.test(sentence)) score += 1;

      return { sentence, score };
    });

    // Keep top 50% by score
    const sorted = scored.sort((a, b) => b.score - a.score);
    const keep = sorted.slice(0, Math.ceil(sorted.length / 2));

    return keep.map((item) => item.sentence).join('. ') + '.';
  }

  /**
   * Generate summary from messages
   */
  private generateSummary(messages: Message[]): string {
    const combined = this.combineMessages(messages);
    const content = this.extractTextContent(combined);

    // Use configured summarization strategy
    switch (this.config.summarization.strategy) {
      case 'extractive':
        return this.selectiveCompress(content);
      case 'abstractive':
        return this.lossyCompress(content);
      case 'hybrid':
      default:
        return this.semanticCompress(content);
    }
  }

  /**
   * Combine messages into single message
   */
  private combineMessages(messages: Message[]): Message {
    const texts: string[] = [];

    for (const msg of messages) {
      const text = this.extractTextContent(msg);
      if (text) {
        texts.push(`${msg.role}: ${text}`);
      }
    }

    return {
      role: 'assistant',
      content: [{ type: 'text', text: texts.join('\n') }],
    };
  }

  /**
   * Extract text content from message
   */
  private extractTextContent(message: Message): string {
    const texts: string[] = [];

    for (const block of message.content) {
      // Handle both string and ContentBlock types
      if (typeof block === 'string') {
        texts.push(block);
      } else if (block.type === 'text') {
        texts.push(block.text);
      }
    }

    return texts.join(' ');
  }

  /**
   * Deep clone priority object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}