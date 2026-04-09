import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenCodeProvider } from '../OpenCodeProvider';
import type { Message, ChatOptions } from '@clippyjs/ai';

const mockClient = {
  session: {
    create: vi.fn(),
    prompt: vi.fn(),
    delete: vi.fn(),
  },
  global: {
    event: vi.fn()
  }
};

vi.mock('@opencode-ai/sdk', () => ({
  createOpencodeClient: vi.fn(() => mockClient),
  OpencodeClient: vi.fn()
}));

describe('OpenCodeProvider', () => {
  let provider: OpenCodeProvider;

  beforeEach(() => {
    provider = new OpenCodeProvider();
    vi.clearAllMocks();
    
    mockClient.session.create.mockReturnValue(Promise.resolve({ data: { id: 'session-123' } }));
    mockClient.session.prompt.mockReturnValue(Promise.resolve({ data: { info: { id: 'msg-123' } } }));
    mockClient.session.delete.mockReturnValue(Promise.resolve({}));
    mockClient.global.event.mockReturnValue(Promise.resolve({
      stream: (async function* () {
        yield { payload: { type: 'message.part.updated', properties: { part: { messageID: 'msg-123', type: 'text' }, delta: 'Hello' } } };
        yield { payload: { type: 'message.updated', properties: { info: { id: 'msg-123', time: { completed: Date.now() } } } } };
      })()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize in proxy mode with endpoint', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        model: 'gpt-4o',
      });
      expect(mockClient.session.create).toHaveBeenCalled();
    });

    it('should throw error when initialized with API key but no endpoint', async () => {
      await expect(
        provider.initialize({
          apiKey: 'test-api-key',
          model: 'gpt-4o',
        })
      ).rejects.toThrow('Security Error: Direct client-side API key usage is disabled. Please use a secure backend proxy endpoint.');
    });

    it('should throw error if neither apiKey nor endpoint provided', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Proxy endpoint must be provided'
      );
    });
  });

  describe('chat functionality', () => {
    beforeEach(async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
      });
    });

    it('should handle streaming output', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Say hello' }
      ];

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toEqual({ type: 'content_delta', delta: 'Hello' });
    });
  });

  describe('feature support', () => {
    it('should support tools', () => {
      expect(provider.supportsTools()).toBe(true);
    });

    it('should support vision', () => {
      expect(provider.supportsVision()).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should dispose resources and delete session', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
      });
      provider.destroy();
      expect(mockClient.session.delete).toHaveBeenCalledWith({ path: { id: 'session-123' } });
    });
  });
});
