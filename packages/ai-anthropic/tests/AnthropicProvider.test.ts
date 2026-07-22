import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AnthropicProvider } from '../src/AnthropicProvider';
import type { Message, ChatOptions } from '@clippyjs/ai';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize in proxy mode with endpoint', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
      });
      // the provider should not throw
      expect(provider).toBeDefined();
    });

    it('should throw error when initialized with API key but no endpoint', async () => {
      await expect(
        provider.initialize({
          apiKey: 'test-api-key',
        })
      ).rejects.toThrow('Security Error: Direct client-side API key usage is disabled. Please use a secure backend proxy endpoint.');
    });

    it('should throw error if neither apiKey nor endpoint provided', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Proxy endpoint must be provided'
      );
    });
  });

  describe('feature support', () => {
    beforeEach(async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
      });
    });

    it('should support tools', () => {
      expect(provider.supportsTools()).toBe(true);
    });

    it('should support vision', () => {
      expect(provider.supportsVision()).toBe(true);
    });
  });

  describe('message conversion and streaming', () => {
    beforeEach(async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
      });
    });

    it('should stream content deltas correctly', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Hi"}}\n\n'),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: [DONE]\n\n'),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.messages[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({ type: 'content_delta', delta: 'Hi' });
      expect(chunks[1]).toEqual({ type: 'complete' });
    });

    it('should handle proxy error responses', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe('error');
      expect(chunks[0].error).toContain('Proxy request failed');
    });
  });

  describe('cleanup', () => {
    it('should dispose resources', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
      });

      provider.destroy();

      // Ensure config is cleared (chat throws if not initialized)
      const stream = provider.chat([{ role: 'user', content: 'Hello' }]);
      await expect(stream.next()).rejects.toThrow('AnthropicProvider not initialized');
    });
  });
});
