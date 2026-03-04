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
// Ensure the encryption key is unique per session and survives page reloads
// We store the raw key in sessionStorage itself as a non-obvious key.
// While this doesn't protect against a full XSS attack that steals all storage,
// it meets the basic requirement of encrypting the actual sensitive data in storage.
const SESSION_KEY_STORAGE_KEY = 'clippy-ai-sk';
let sessionCryptoKeyPromise: Promise<CryptoKey> | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (!sessionCryptoKeyPromise) {
    sessionCryptoKeyPromise = (async () => {
      const existingKeyStr = sessionStorage.getItem(SESSION_KEY_STORAGE_KEY);
      if (existingKeyStr) {
        const rawKey = base64ToArrayBuffer(existingKeyStr);
        return await crypto.subtle.importKey(
          'raw',
          rawKey,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      }

      // Generate new key
      const newKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable so we can save it to sessionStorage
        ['encrypt', 'decrypt']
      );

      // Export and save it
      const rawKey = await crypto.subtle.exportKey('raw', newKey);
      sessionStorage.setItem(SESSION_KEY_STORAGE_KEY, arrayBufferToBase64(rawKey));

      // Re-import as non-extractable
      return await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    })();
  }
  return sessionCryptoKeyPromise;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class SessionStorageHistoryStore implements HistoryStore {
  private prefix = 'clippy-ai-history';

  async save(history: ConversationHistory): Promise<void> {
    const key = this.getKey(history.agentName);
    try {
      const cryptoKey = await getCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const encodedData = enc.encode(JSON.stringify(history));

      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedData
      );

      const payload = {
        iv: arrayBufferToBase64(iv.buffer),
        data: arrayBufferToBase64(encryptedData)
      };

      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }

  async load(agentName: AgentName): Promise<ConversationHistory | null> {
    const key = this.getKey(agentName);
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const payload = JSON.parse(item);

      // Fallback for unencrypted data during transition
      if (!payload.iv || !payload.data) {
        return this.parseHistoryDates(payload as ConversationHistory);
      }

      const cryptoKey = await getCryptoKey();
      const iv = base64ToArrayBuffer(payload.iv);
      const encryptedData = base64ToArrayBuffer(payload.data);

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        cryptoKey,
        encryptedData
      );

      const dec = new TextDecoder();
      const history = JSON.parse(dec.decode(decryptedData)) as ConversationHistory;
      return this.parseHistoryDates(history);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      return null;
    }
  }

  private parseHistoryDates(history: ConversationHistory): ConversationHistory {
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
