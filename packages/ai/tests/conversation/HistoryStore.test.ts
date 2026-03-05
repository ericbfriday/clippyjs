import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalStorageHistoryStore,
  SessionStorageHistoryStore,
  type ConversationHistory,
} from '../../src/conversation/HistoryStore';

describe('LocalStorageHistoryStore', () => {
  let store: LocalStorageHistoryStore;
  let mockHistory: ConversationHistory;

  beforeEach(() => {
    store = new LocalStorageHistoryStore();

    mockHistory = {
      messages: [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2025-01-01T10:00:00Z'),
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date('2025-01-01T10:00:01Z'),
        },
      ],
      agentName: 'Clippy',
      startedAt: new Date('2025-01-01T10:00:00Z'),
      lastInteraction: new Date('2025-01-01T10:00:01Z'),
    };
  });

  it('should save history to localStorage', async () => {
    await store.save(mockHistory);

    const key = 'clippy-ai-history:Clippy';
    const saved = localStorage.getItem(key);

    expect(saved).toBeDefined();
    // Saved data is now encrypted base64 string, not raw JSON
    expect(typeof saved).toBe('string');
    expect(saved!.length).toBeGreaterThan(0);
    // Let's verify it can be loaded back properly instead of trying to JSON.parse the encrypted string
    const loaded = await store.load('Clippy');
    expect(loaded).toBeDefined();
    expect(loaded!.agentName).toBe('Clippy');
  });

  it('should load history from localStorage', async () => {
    await store.save(mockHistory);

    const loaded = await store.load('Clippy');

    expect(loaded).toBeDefined();
    expect(loaded!.agentName).toBe('Clippy');
    expect(loaded!.messages).toHaveLength(2);
    expect(loaded!.messages[0].content).toBe('Hello');
  });

  it('should load unencrypted legacy plaintext history from localStorage', async () => {
    // Manually save plain JSON, simulating the old implementation
    const key = 'clippy-ai-history:LegacyClippy';
    const legacyHistory = { ...mockHistory, agentName: 'LegacyClippy' as any };
    localStorage.setItem(key, JSON.stringify(legacyHistory));

    const loaded = await store.load('LegacyClippy' as any);

    expect(loaded).toBeDefined();
    expect(loaded!.agentName).toBe('LegacyClippy');
    expect(loaded!.messages).toHaveLength(2);
    expect(loaded!.messages[0].content).toBe('Hello');
  });

  it('should return null for non-existent history', async () => {
    const loaded = await store.load('NonExistent');

    expect(loaded).toBeNull();
  });

  it('should convert date strings back to Date objects', async () => {
    await store.save(mockHistory);

    const loaded = await store.load('Clippy');

    expect(loaded!.startedAt).toBeInstanceOf(Date);
    expect(loaded!.lastInteraction).toBeInstanceOf(Date);
    expect(loaded!.messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('should clear history for specific agent', async () => {
    await store.save(mockHistory);

    await store.clear('Clippy');

    const loaded = await store.load('Clippy');
    expect(loaded).toBeNull();
  });

  it('should clear all histories', async () => {
    await store.save(mockHistory);
    await store.save({ ...mockHistory, agentName: 'Merlin' });

    await store.clearAll!();

    const clippyHistory = await store.load('Clippy');
    const merlinHistory = await store.load('Merlin');

    expect(clippyHistory).toBeNull();
    expect(merlinHistory).toBeNull();
  });
});

describe('SessionStorageHistoryStore', () => {
  let store: SessionStorageHistoryStore;
  let mockHistory: ConversationHistory;

  beforeEach(() => {
    store = new SessionStorageHistoryStore();

    mockHistory = {
      messages: [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ],
      agentName: 'Clippy',
      startedAt: new Date(),
      lastInteraction: new Date(),
    };
  });

  it('should save history to sessionStorage', async () => {
    await store.save(mockHistory);

    const key = 'clippy-ai-history:Clippy';
    const saved = sessionStorage.getItem(key);

    expect(saved).toBeDefined();
  });

  it('should load history from sessionStorage', async () => {
    await store.save(mockHistory);

    const loaded = await store.load('Clippy');

    expect(loaded).toBeDefined();
    expect(loaded!.agentName).toBe('Clippy');
  });

  it('should clear history from sessionStorage', async () => {
    await store.save(mockHistory);

    await store.clear('Clippy');

    const loaded = await store.load('Clippy');
    expect(loaded).toBeNull();
  });
});
