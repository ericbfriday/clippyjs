/**
 * Persistent History Store Tests
 *
 * Test coverage:
 * - History save and load operations
 * - Retention policy application
 * - Message compression
 * - Pagination
 * - Search functionality
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  PersistentHistoryStore,
  createHistoryStore,
  type RetentionPolicy,
} from '../../../src/storage/PersistentHistoryStore';
import type { ConversationHistory, ConversationMessage } from '../../../src/conversation/HistoryStore';

describe('PersistentHistoryStore', () => {
  let store: PersistentHistoryStore;

  const createTestHistory = (messageCount: number = 5): ConversationHistory => {
    const messages: ConversationMessage[] = [];
    const now = new Date();

    for (let i = 0; i < messageCount; i++) {
      messages.push({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} content`,
        timestamp: new Date(now.getTime() - (messageCount - i) * 1000),
      });
    }

    return {
      agentName: 'Clippy',
      messages,
      startedAt: new Date(now.getTime() - messageCount * 1000),
      lastInteraction: now,
    };
  };

  beforeEach(async () => {
    store = new PersistentHistoryStore({
      maxMessages: 100,
      maxAgeDays: 30,
      compressAfterDays: 7,
      enableAutoCleanup: false, // Disable for tests
    });
    await store.initialize();
  });

  afterEach(() => {
    store.destroy();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newStore = new PersistentHistoryStore();
      await expect(newStore.initialize()).resolves.toBeUndefined();
      newStore.destroy();
    });

    it('should handle multiple initialization calls', async () => {
      await store.initialize();
      await store.initialize(); // Should not throw
      expect(true).toBe(true);
    });

    it('should throw error when destroyed', async () => {
      const newStore = new PersistentHistoryStore();
      await newStore.initialize();
      newStore.destroy();

      await expect(newStore.load('Clippy')).rejects.toThrow('destroyed');
    });
  });

  describe('save and load', () => {
    it('should save and load conversation history', async () => {
      const history = createTestHistory(5);
      await store.save(history);

      const loaded = await store.load('Clippy');
      expect(loaded).not.toBeNull();
      expect(loaded!.agentName).toBe('Clippy');
      expect(loaded!.messages).toHaveLength(5);
    });

    it('should return null for non-existent agent', async () => {
      const loaded = await store.load('NonExistent' as any);
      expect(loaded).toBeNull();
    });

    it('should overwrite existing history', async () => {
      const history1 = createTestHistory(3);
      const history2 = createTestHistory(5);

      await store.save(history1);
      await store.save(history2);

      const loaded = await store.load('Clippy');
      expect(loaded!.messages).toHaveLength(5);
    });

    it('should restore Date objects correctly', async () => {
      const history = createTestHistory(2);
      await store.save(history);

      const loaded = await store.load('Clippy');
      expect(loaded!.startedAt).toBeInstanceOf(Date);
      expect(loaded!.lastInteraction).toBeInstanceOf(Date);
      expect(loaded!.messages[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('clear operations', () => {
    it('should clear specific agent history', async () => {
      const history = createTestHistory(5);
      await store.save(history);
      await store.clear('Clippy');

      const loaded = await store.load('Clippy');
      expect(loaded).toBeNull();
    });

    it('should clear all histories', async () => {
      const history1 = createTestHistory(3);
      history1.agentName = 'Agent1' as any;

      const history2 = createTestHistory(3);
      history2.agentName = 'Agent2' as any;

      await store.save(history1);
      await store.save(history2);
      await store.clearAll();

      const loaded1 = await store.load('Agent1' as any);
      const loaded2 = await store.load('Agent2' as any);

      expect(loaded1).toBeNull();
      expect(loaded2).toBeNull();
    });
  });

  describe('retention policy', () => {
    it('should limit number of messages', async () => {
      const storeWithLimit = new PersistentHistoryStore({
        maxMessages: 10,
        enableAutoCleanup: false,
      });

      await storeWithLimit.initialize();

      const history = createTestHistory(20);
      await storeWithLimit.save(history);

      const loaded = await storeWithLimit.load('Clippy');
      expect(loaded!.messages.length).toBeLessThanOrEqual(10);

      storeWithLimit.destroy();
    });

    it('should remove messages older than max age', async () => {
      const storeWithAge = new PersistentHistoryStore({
        maxAgeDays: 1, // 1 day
        enableAutoCleanup: false,
      });

      await storeWithAge.initialize();

      const history = createTestHistory(5);
      // Make first message 2 days old
      history.messages[0].timestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      await storeWithAge.save(history);

      const loaded = await storeWithAge.load('Clippy');
      // First message should be removed
      expect(loaded!.messages.length).toBeLessThan(5);

      storeWithAge.destroy();
    });

    it('should compress old messages', async () => {
      const storeWithCompression = new PersistentHistoryStore({
        compressAfterDays: 1, // Compress after 1 day
        enableAutoCleanup: false,
      });

      await storeWithCompression.initialize();

      const history = createTestHistory(3);
      // Make first message 2 days old with long content
      history.messages[0].timestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      history.messages[0].content = 'x'.repeat(200);

      await storeWithCompression.save(history);

      const loaded = await storeWithCompression.load('Clippy');
      const compressedMsg = loaded!.messages[0];

      // Check if compressed (content should be truncated)
      expect((compressedMsg as any).compressed).toBe(true);
      expect(typeof compressedMsg.content === 'string').toBe(true);
      expect((compressedMsg.content as string).length).toBeLessThan(200);

      storeWithCompression.destroy();
    });
  });

  describe('pagination', () => {
    it('should paginate messages', async () => {
      const history = createTestHistory(20);
      await store.save(history);

      const page1 = await store.getMessages('Clippy', {
        pageSize: 5,
        page: 0,
        order: 'desc',
      });

      expect(page1.items).toHaveLength(5);
      expect(page1.total).toBe(20);
      expect(page1.totalPages).toBe(4);
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrev).toBe(false);
    });

    it('should handle multiple pages', async () => {
      const history = createTestHistory(20);
      await store.save(history);

      const page2 = await store.getMessages('Clippy', {
        pageSize: 5,
        page: 1,
        order: 'desc',
      });

      expect(page2.page).toBe(1);
      expect(page2.hasNext).toBe(true);
      expect(page2.hasPrev).toBe(true);
    });

    it('should sort messages ascending', async () => {
      const history = createTestHistory(10);
      await store.save(history);

      const result = await store.getMessages('Clippy', {
        pageSize: 10,
        order: 'asc',
      });

      // Check that timestamps are in ascending order
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result.items[i - 1].timestamp.getTime()
        );
      }
    });

    it('should sort messages descending', async () => {
      const history = createTestHistory(10);
      await store.save(history);

      const result = await store.getMessages('Clippy', {
        pageSize: 10,
        order: 'desc',
      });

      // Check that timestamps are in descending order
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].timestamp.getTime()).toBeLessThanOrEqual(
          result.items[i - 1].timestamp.getTime()
        );
      }
    });

    it('should handle empty results', async () => {
      const result = await store.getMessages('NonExistent' as any);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const history = createTestHistory(5);
      history.messages[0].content = 'Hello world';
      history.messages[1].content = 'How are you?';
      history.messages[2].content = 'I am fine, thank you!';
      history.messages[3].content = 'What is the weather?';
      history.messages[4].content = 'It is sunny today';

      await store.save(history);
    });

    it('should search by text query', async () => {
      const results = await store.search({
        query: 'weather',
      });

      expect(results).toHaveLength(1);
      expect(results[0].matches).toHaveLength(1);
      expect(results[0].matches[0].content).toContain('weather');
    });

    it('should be case-insensitive', async () => {
      const results = await store.search({
        query: 'HELLO',
      });

      expect(results).toHaveLength(1);
      expect(results[0].matches[0].content).toContain('Hello');
    });

    it('should filter by agent name', async () => {
      const results = await store.search({
        query: 'weather',
        agentName: 'Clippy',
      });

      expect(results.length).toBeGreaterThan(0);

      const wrongAgent = await store.search({
        query: 'weather',
        agentName: 'WrongAgent' as any,
      });

      expect(wrongAgent).toHaveLength(0);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const results = await store.search({
        query: 'fine',
        startDate: yesterday,
        endDate: now,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return multiple matches', async () => {
      const results = await store.search({
        query: 'you',
      });

      // Should match "How are you?" and "thank you!"
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matches.length).toBeGreaterThan(0);
    });

    it('should calculate relevance score', async () => {
      const results = await store.search({
        query: 'you',
      });

      if (results.length > 0) {
        expect(results[0].score).toBeGreaterThan(0);
        expect(results[0].score).toBeLessThanOrEqual(1);
      }
    });

    it('should limit results', async () => {
      const results = await store.search({
        query: 'a', // Common letter
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array when no matches', async () => {
      const results = await store.search({
        query: 'nonexistentquery123',
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('statistics', () => {
    it('should return storage statistics', async () => {
      const history = createTestHistory(10);
      await store.save(history);

      const stats = await store.getStats();

      expect(stats.itemCount).toBeGreaterThan(0);
      expect(stats.estimatedSize).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should save within performance target', async () => {
      const history = createTestHistory(50);

      const start = performance.now();
      await store.save(history);
      const duration = performance.now() - start;

      // Target: <50ms (p95)
      expect(duration).toBeLessThan(100); // Allow margin in tests
    });

    it('should load within performance target', async () => {
      const history = createTestHistory(50);
      await store.save(history);

      const start = performance.now();
      await store.load('Clippy');
      const duration = performance.now() - start;

      // Target: <100ms (p95)
      expect(duration).toBeLessThan(150); // Allow margin in tests
    });

    it('should search within performance target', async () => {
      const history = createTestHistory(50);
      await store.save(history);

      const start = performance.now();
      await store.search({ query: 'test' });
      const duration = performance.now() - start;

      // Target: <200ms (p95)
      expect(duration).toBeLessThan(300); // Allow margin in tests
    });
  });

  describe('factory function', () => {
    it('should create store with default config', async () => {
      const factoryStore = await createHistoryStore();
      expect(factoryStore).toBeDefined();

      const history = createTestHistory(3);
      await factoryStore.save(history);

      const loaded = await factoryStore.load('Clippy');
      expect(loaded).not.toBeNull();

      (factoryStore as any).destroy?.();
    });

    it('should create store with custom config', async () => {
      const customConfig: Partial<RetentionPolicy> = {
        maxMessages: 50,
        maxAgeDays: 60,
      };

      const factoryStore = await createHistoryStore(customConfig);
      expect(factoryStore).toBeDefined();

      (factoryStore as any).destroy?.();
    });
  });

  describe('edge cases', () => {
    it('should handle empty message array', async () => {
      const history = createTestHistory(0);
      await store.save(history);

      const loaded = await store.load('Clippy');
      expect(loaded!.messages).toHaveLength(0);
    });

    it('should handle messages with context', async () => {
      const history = createTestHistory(2);
      history.messages[0].context = [
        {
          type: 'dom',
          selector: 'body',
          data: { html: '<body>test</body>' },
          priority: 1,
          timestamp: new Date(),
          metadata: {},
        },
      ];

      await store.save(history);

      const loaded = await store.load('Clippy');
      expect(loaded!.messages[0].context).toBeDefined();
      expect(loaded!.messages[0].context![0].type).toBe('dom');
    });

    it('should handle very long messages', async () => {
      const history = createTestHistory(1);
      history.messages[0].content = 'x'.repeat(10000);

      await store.save(history);

      const loaded = await store.load('Clippy');
      expect(loaded!.messages[0].content).toHaveLength(10000);
    });

    it('should handle special characters in content', async () => {
      const history = createTestHistory(1);
      history.messages[0].content = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';

      await store.save(history);

      const loaded = await store.load('Clippy');
      expect(loaded!.messages[0].content).toBe('!@#$%^&*()_+-=[]{}|;\':",./<>?`~');
    });

    it('should handle Unicode characters', async () => {
      const history = createTestHistory(1);
      history.messages[0].content = '你好世界 🌍 مرحبا العالم';

      await store.save(history);

      const loaded = await store.load('Clippy');
      expect(loaded!.messages[0].content).toBe('你好世界 🌍 مرحبا العالم');
    });
  });
});
