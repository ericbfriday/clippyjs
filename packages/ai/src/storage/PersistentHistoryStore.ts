/**
 * Persistent Conversation History Store
 *
 * IndexedDB-backed conversation history with:
 * - Automatic compression for old conversations
 * - Configurable retention policies
 * - Efficient pagination and search
 * - Backward compatible with HistoryStore interface
 *
 * Performance targets:
 * - Save operation: <50ms (p95)
 * - Load operation: <100ms (p95)
 * - Search operation: <200ms (p95)
 */

import type { ConversationHistory, ConversationMessage, HistoryStore } from '../conversation/HistoryStore';
import type { AgentName } from '../personality/PersonalityProfiles';
import { IndexedDBStorage, type IndexedDBConfig, isIndexedDBSupported } from './IndexedDBStorage';

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  /**
   * Maximum number of messages to retain per conversation
   * @default 1000
   */
  maxMessages: number;

  /**
   * Maximum age of messages in days
   * @default 30
   */
  maxAgeDays: number;

  /**
   * Compress messages older than this many days
   * @default 7
   */
  compressAfterDays: number;

  /**
   * Enable automatic cleanup
   * @default true
   */
  enableAutoCleanup: boolean;

  /**
   * Cleanup interval in milliseconds
   * @default 3600000 (1 hour)
   */
  cleanupInterval: number;
}

/**
 * Compressed message format
 */
interface CompressedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string; // Summarized/compressed content
  timestamp: Date;
  compressed: true;
  originalLength: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  /**
   * Search query
   */
  query: string;

  /**
   * Agent name filter
   */
  agentName?: AgentName;

  /**
   * Start date filter
   */
  startDate?: Date;

  /**
   * End date filter
   */
  endDate?: Date;

  /**
   * Maximum number of results
   * @default 50
   */
  limit?: number;
}

/**
 * Search result
 */
export interface SearchResult {
  /**
   * Matching conversation
   */
  conversation: ConversationHistory;

  /**
   * Matching messages
   */
  matches: ConversationMessage[];

  /**
   * Relevance score (0-1)
   */
  score: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /**
   * Page size
   * @default 50
   */
  pageSize?: number;

  /**
   * Page number (0-based)
   * @default 0
   */
  page?: number;

  /**
   * Sort order
   * @default 'desc'
   */
  order?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  /**
   * Items for current page
   */
  items: T[];

  /**
   * Total number of items
   */
  total: number;

  /**
   * Current page (0-based)
   */
  page: number;

  /**
   * Page size
   */
  pageSize: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Has next page
   */
  hasNext: boolean;

  /**
   * Has previous page
   */
  hasPrev: boolean;
}

/**
 * Default retention policy
 */
export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  maxMessages: 1000,
  maxAgeDays: 30,
  compressAfterDays: 7,
  enableAutoCleanup: true,
  cleanupInterval: 3600000, // 1 hour
};

/**
 * Persistent conversation history store with IndexedDB
 *
 * Features:
 * - Stores conversation messages in IndexedDB
 * - Automatic compression for old conversations
 * - Configurable retention policies
 * - Efficient pagination and search
 * - Backward compatible with HistoryStore interface
 * - Graceful fallback to memory storage if IndexedDB unavailable
 *
 * @example
 * ```typescript
 * const store = new PersistentHistoryStore({
 *   maxMessages: 1000,
 *   maxAgeDays: 30,
 * });
 * await store.initialize();
 *
 * await store.save({
 *   agentName: 'Clippy',
 *   messages: [...],
 *   startedAt: new Date(),
 *   lastInteraction: new Date(),
 * });
 *
 * const history = await store.load('Clippy');
 * ```
 */
export class PersistentHistoryStore implements HistoryStore {
  private storage: IndexedDBStorage<ConversationHistory>;
  private policy: RetentionPolicy;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private destroyed = false;

  constructor(
    policy: Partial<RetentionPolicy> = {},
    storageConfig: Partial<IndexedDBConfig> = {}
  ) {
    this.policy = { ...DEFAULT_RETENTION_POLICY, ...policy };

    this.storage = new IndexedDBStorage<ConversationHistory>({
      dbName: 'clippy-history',
      storeName: 'conversations',
      version: 1,
      ...storageConfig,
    });
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    // Check if IndexedDB is supported
    if (!isIndexedDBSupported()) {
      console.warn('IndexedDB not supported. Conversation history will not persist.');
      return;
    }

    await this.storage.initialize();
    this.initialized = true;

    // Start automatic cleanup if enabled
    if (this.policy.enableAutoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Save conversation history
   */
  async save(history: ConversationHistory): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    // Apply retention policy
    const processedHistory = await this.applyRetentionPolicy(history);

    // Store in IndexedDB
    await this.storage.set(history.agentName, processedHistory);
  }

  /**
   * Load conversation history
   */
  async load(agentName: AgentName): Promise<ConversationHistory | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    const history = await this.storage.get(agentName);

    if (!history) {
      return null;
    }

    // Restore Date objects
    history.startedAt = new Date(history.startedAt);
    history.lastInteraction = new Date(history.lastInteraction);
    history.messages.forEach((msg) => {
      msg.timestamp = new Date(msg.timestamp);
      if (msg.context) {
        msg.context.forEach((ctx) => {
          ctx.timestamp = new Date(ctx.timestamp);
        });
      }
    });

    return history;
  }

  /**
   * Clear conversation history for an agent
   */
  async clear(agentName: AgentName): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    await this.storage.delete(agentName);
  }

  /**
   * Clear all conversation histories
   */
  async clearAll(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Store has been destroyed');
    }

    await this.storage.clear();
  }

  /**
   * Get paginated messages from a conversation
   */
  async getMessages(
    agentName: AgentName,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<ConversationMessage>> {
    const history = await this.load(agentName);

    if (!history) {
      return {
        items: [],
        total: 0,
        page: 0,
        pageSize: options.pageSize || 50,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
    }

    const pageSize = options.pageSize || 50;
    const page = options.page || 0;
    const order = options.order || 'desc';

    // Sort messages
    const sorted = [...history.messages].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return order === 'desc' ? bTime - aTime : aTime - bTime;
    });

    // Paginate
    const start = page * pageSize;
    const end = start + pageSize;
    const items = sorted.slice(start, end);

    const total = sorted.length;
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages - 1,
      hasPrev: page > 0,
    };
  }

  /**
   * Search conversations
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const keys = await this.storage.keys();
    const results: SearchResult[] = [];

    for (const key of keys) {
      const history = await this.load(key as AgentName);

      if (!history) continue;

      // Apply filters
      if (options.agentName && history.agentName !== options.agentName) {
        continue;
      }

      // Search messages
      const matches = history.messages.filter((msg) => {
        // Date filter
        if (options.startDate && msg.timestamp < options.startDate) {
          return false;
        }
        if (options.endDate && msg.timestamp > options.endDate) {
          return false;
        }

        // Text search
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return content.toLowerCase().includes(options.query.toLowerCase());
      });

      if (matches.length > 0) {
        results.push({
          conversation: history,
          matches,
          score: matches.length / history.messages.length,
        });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    const limit = options.limit || 50;
    return results.slice(0, limit);
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.storage.getStats();
  }

  /**
   * Destroy store and cleanup resources
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.stopCleanupTimer();
    this.storage.destroy();
  }

  /**
   * Apply retention policy to conversation history
   */
  private async applyRetentionPolicy(
    history: ConversationHistory
  ): Promise<ConversationHistory> {
    const now = Date.now();
    const maxAgeMs = this.policy.maxAgeDays * 24 * 60 * 60 * 1000;
    const compressAgeMs = this.policy.compressAfterDays * 24 * 60 * 60 * 1000;

    // Filter out messages older than max age
    let messages = history.messages.filter((msg) => {
      const age = now - new Date(msg.timestamp).getTime();
      return age <= maxAgeMs;
    });

    // Compress old messages
    messages = messages.map((msg) => {
      const age = now - new Date(msg.timestamp).getTime();

      if (age > compressAgeMs && !this.isCompressed(msg)) {
        return this.compressMessage(msg);
      }

      return msg;
    });

    // Limit number of messages
    if (messages.length > this.policy.maxMessages) {
      // Keep most recent messages
      messages = messages.slice(-this.policy.maxMessages);
    }

    return {
      ...history,
      messages,
    };
  }

  /**
   * Check if message is compressed
   */
  private isCompressed(msg: ConversationMessage): boolean {
    return 'compressed' in msg && (msg as any).compressed === true;
  }

  /**
   * Compress message content
   */
  private compressMessage(msg: ConversationMessage): ConversationMessage {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

    // Simple compression: truncate and summarize
    const summary = content.length > 100 ? content.substring(0, 100) + '...' : content;

    return {
      ...msg,
      content: summary,
      context: undefined, // Remove context to save space
      compressed: true,
      originalLength: content.length,
    } as any;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return; // Skip in SSR

    this.cleanupTimer = setInterval(() => {
      this.runCleanup().catch((error) => {
        console.error('Cleanup failed:', error);
      });
    }, this.policy.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Run cleanup on all conversations
   */
  private async runCleanup(): Promise<void> {
    if (this.destroyed) return;

    const keys = await this.storage.keys();

    for (const key of keys) {
      try {
        const history = await this.load(key as AgentName);

        if (history) {
          await this.save(history);
        }
      } catch (error) {
        console.error(`Failed to cleanup conversation: ${key}`, error);
      }
    }
  }
}

/**
 * Create history store with feature detection
 *
 * Returns PersistentHistoryStore if IndexedDB is supported,
 * otherwise returns a fallback in-memory store.
 */
export async function createHistoryStore(
  policy?: Partial<RetentionPolicy>,
  storageConfig?: Partial<IndexedDBConfig>
): Promise<HistoryStore> {
  if (isIndexedDBSupported()) {
    const store = new PersistentHistoryStore(policy, storageConfig);
    await store.initialize();
    return store;
  } else {
    // Fallback to memory storage
    console.warn('IndexedDB not supported. Using in-memory history store.');
    return new MemoryHistoryStore();
  }
}

/**
 * Simple in-memory history store fallback
 */
class MemoryHistoryStore implements HistoryStore {
  private histories = new Map<AgentName, ConversationHistory>();

  async save(history: ConversationHistory): Promise<void> {
    this.histories.set(history.agentName, history);
  }

  async load(agentName: AgentName): Promise<ConversationHistory | null> {
    return this.histories.get(agentName) || null;
  }

  async clear(agentName: AgentName): Promise<void> {
    this.histories.delete(agentName);
  }

  async clearAll(): Promise<void> {
    this.histories.clear();
  }
}
