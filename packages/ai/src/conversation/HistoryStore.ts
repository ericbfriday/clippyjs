import type { Message } from '../providers/AIProvider';
import type { ContextData } from '../context/ContextProvider';
import type { AgentName } from '../personality/PersonalityProfiles';

/**
 * Secure client-side encryption utilities to protect conversation history in localStorage/sessionStorage.
 * Generates a non-exportable key on first use and stores it securely in IndexedDB.
 */
const KEY_DB_NAME = 'clippy-ai-crypto-keys';
const KEY_STORE_NAME = 'keys';
const MASTER_KEY_ID = 'history-encryption-key';

let cachedKey: CryptoKey | null = null;

// IndexedDB helpers for the key store
function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME);
      }
    };
  });
}

async function loadKeyFromDB(): Promise<CryptoKey | null> {
  try {
    const db = await openKeyDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([KEY_STORE_NAME], 'readonly');
      const store = transaction.objectStore(KEY_STORE_NAME);
      const request = store.get(MASTER_KEY_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to load key from IndexedDB', err);
    return null;
  }
}

async function saveKeyToDB(key: CryptoKey): Promise<void> {
  try {
    const db = await openKeyDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([KEY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(KEY_STORE_NAME);
      const request = store.put(key, MASTER_KEY_ID);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to save key to IndexedDB', err);
  }
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  // Try to load an existing key from IndexedDB
  let key = await loadKeyFromDB();

  // If no key exists, generate a new one
  if (!key) {
    key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // non-exportable
      ['encrypt', 'decrypt']
    );
    // Save the new key for future use
    await saveKeyToDB(key);
  }

  cachedKey = key;
  return cachedKey;
}

// Convert ArrayBuffer to Base64 string
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 string to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptData(data: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Security vulnerability prevention: fail instead of falling back to insecure Base64
    throw new Error('Web Crypto API is not available. Cannot securely store history.');
  }

  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    const encryptedBytes = new Uint8Array(encryptedContent);
    const result = new Uint8Array(iv.length + encryptedBytes.length);
    result.set(iv, 0);
    result.set(encryptedBytes, iv.length);

    return bufferToBase64(result.buffer);
  } catch (err) {
    console.error('Encryption failed', err);
    throw new Error('Encryption failed. Cannot securely store history.');
  }
}

export async function decryptData(encryptedBase64: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is not available. Cannot decrypt history.');
  }

  // First, check if the string is just plain JSON from a legacy save
  try {
    if (encryptedBase64.startsWith('{') || encryptedBase64.startsWith('[')) {
      JSON.parse(encryptedBase64);
      return encryptedBase64; // It's legacy plaintext
    }
  } catch {
    // Not valid JSON, proceed to decryption or other decoding
  }

  let dataBuffer: ArrayBuffer;
  try {
    dataBuffer = base64ToBuffer(encryptedBase64);
  } catch (err) {
    // If it's not valid base64, check again if we should treat it as legacy text
    return encryptedBase64;
  }

  try {
    // Check if it looks like our AES-GCM format (iv 12 bytes + some data)
    if (dataBuffer.byteLength < 12) {
      // It might be old insecure fallback data
      try {
        const decoded = decodeURIComponent(atob(encryptedBase64));
        // Simple sanity check if it's JSON
        JSON.parse(decoded);
        return decoded;
      } catch {
        // If it's pure plaintext (very old version) or unreadable
        return encryptedBase64;
      }
    }

    const iv = new Uint8Array(dataBuffer.slice(0, 12));
    const encryptedContent = dataBuffer.slice(12);

    const key = await getEncryptionKey();
    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedContent
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  } catch (err) {
    // If decryption fails (e.g. wrong key because IndexedDB was cleared but localStorage wasn't)
    // we cannot recover the data. Let's return the string assuming it was an unencrypted legacy string
    // rather than fully breaking the app load if it happened to be invalid valid base64 string.
    try {
        JSON.parse(encryptedBase64);
        return encryptedBase64;
    } catch {
        console.error('Decryption failed', err);
        throw new Error('Failed to decrypt conversation history.');
    }
  }
}

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
      const serialized = JSON.stringify(history);
      const encrypted = await encryptData(serialized);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to save conversation history:', error);
      // Silently fail if storage is full
    }
  }

  async load(agentName: AgentName): Promise<ConversationHistory | null> {
    const key = this.getKey(agentName);
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) return null;

      const data = await decryptData(encryptedData);
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
      const serialized = JSON.stringify(history);
      const encrypted = await encryptData(serialized);
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }

  async load(agentName: AgentName): Promise<ConversationHistory | null> {
    const key = this.getKey(agentName);
    try {
      const encryptedData = sessionStorage.getItem(key);
      if (!encryptedData) return null;

      const data = await decryptData(encryptedData);
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
