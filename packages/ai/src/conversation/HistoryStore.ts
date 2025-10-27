import type { Message } from '../providers/AIProvider';
import type { ContextData } from '../context/ContextProvider';
import type { AgentName } from '../personality/PersonalityProfiles';

/**
 * Conversation message with metadata
 */
export interface ConversationMessage extends Message {
  id: string;
  timestamp: Date;
  context?: ContextData[];
}

/**
 * Conversation history structure
 */
export interface ConversationHistory {
  messages: ConversationMessage[];
  agentName: AgentName;
  startedAt: Date;
  lastInteraction: Date;
}

/**
 * Interface for conversation history storage
 */
export interface HistoryStore {
  /**
   * Save conversation history
   * @param history Conversation history to save
   */
  save(history: ConversationHistory): Promise<void>;

  /**
   * Load conversation history for an agent
   * @param agentName Name of the agent
   * @returns Conversation history or null if not found
   */
  load(agentName: AgentName): Promise<ConversationHistory | null>;

  /**
   * Clear conversation history for an agent
   * @param agentName Name of the agent
   */
  clear(agentName: AgentName): Promise<void>;

  /**
   * Clear all conversation histories
   */
  clearAll?(): Promise<void>;
}

/**
 * LocalStorage implementation of HistoryStore
 *
 * Stores conversation history in browser localStorage.
 * Suitable for most use cases with reasonable history sizes.
 */
export class LocalStorageHistoryStore implements HistoryStore {
  private prefix = 'clippy-ai-history';

  async save(history: ConversationHistory): Promise<void> {
    const key = this.getKey(history.agentName);
    try {
      localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
      // Silently fail if storage is full
    }
  }

  async load(agentName: AgentName): Promise<ConversationHistory | null> {
    const key = this.getKey(agentName);
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;

      const history = JSON.parse(data) as ConversationHistory;

      // Convert string dates back to Date objects
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
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      return null;
    }
  }

  async clear(agentName: AgentName): Promise<void> {
    const key = this.getKey(agentName);
    localStorage.removeItem(key);
  }

  async clearAll(): Promise<void> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }

  private getKey(agentName: string): string {
    return `${this.prefix}:${agentName}`;
  }
}

/**
 * SessionStorage implementation of HistoryStore
 *
 * Stores conversation history in browser sessionStorage.
 * History is cleared when the browser tab is closed.
 * Better for privacy-sensitive use cases.
 */
export class SessionStorageHistoryStore implements HistoryStore {
  private prefix = 'clippy-ai-history';

  async save(history: ConversationHistory): Promise<void> {
    const key = this.getKey(history.agentName);
    try {
      sessionStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }

  async load(agentName: AgentName): Promise<ConversationHistory | null> {
    const key = this.getKey(agentName);
    try {
      const data = sessionStorage.getItem(key);
      if (!data) return null;

      const history = JSON.parse(data) as ConversationHistory;

      // Convert string dates back to Date objects
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
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      return null;
    }
  }

  async clear(agentName: AgentName): Promise<void> {
    const key = this.getKey(agentName);
    sessionStorage.removeItem(key);
  }

  async clearAll(): Promise<void> {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }

  private getKey(agentName: string): string {
    return `${this.prefix}:${agentName}`;
  }
}

/**
 * IndexedDB implementation of HistoryStore
 *
 * Stores conversation history in browser IndexedDB.
 * Best for large conversation histories and better performance.
 * Provides more storage space than localStorage (typically 50MB+ vs 5-10MB).
 *
 * Usage:
 * ```typescript
 * const historyStore = new IndexedDBHistoryStore();
 * await historyStore.initialize(); // Must call before use
 * ```
 */
export class IndexedDBHistoryStore implements HistoryStore {
  private dbName = 'clippy-ai-history';
  private storeName = 'conversations';
  private version = 1;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB connection.
   * Must be called before using any other methods.
   * Safe to call multiple times - will reuse existing connection.
   */
  async initialize(): Promise<void> {
    if (this.db) return; // Already initialized
    if (this.initPromise) return this.initPromise; // Initialization in progress

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'agentName' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  async save(history: ConversationHistory): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Store with agentName as key
      const request = store.put({
        agentName: history.agentName,
        data: history,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to save conversation history:', request.error);
        reject(request.error);
      };
    });
  }

  async load(agentName: AgentName): Promise<ConversationHistory | null> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(agentName);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        const history = result.data as ConversationHistory;

        // Convert string dates back to Date objects
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

        resolve(history);
      };

      request.onerror = () => {
        console.error('Failed to load conversation history:', request.error);
        reject(request.error);
      };
    });
  }

  async clear(agentName: AgentName): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(agentName);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to clear conversation history:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to clear all conversation histories:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Close the IndexedDB connection.
   * Should be called when the store is no longer needed.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
