import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenRouterProvider } from '../OpenRouterProvider';
import type { Message, ChatOptions } from '@clippyjs/ai';

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider();
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
        model: 'anthropic/claude-3-opus',
      });

      expect(provider.getModel()).toBe('anthropic/claude-3-opus');
    });

    it('should throw Security Error when initialized with API key but no endpoint', async () => {
      await expect(
        provider.initialize({
          apiKey: 'sk-or-test-api-key',
        })
      ).rejects.toThrow(
        'Security Error: Direct client-side API key usage is disabled. Please use a secure backend proxy endpoint.'
      );
    });

    it('should default to openai/gpt-4o model', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });

    it('should throw error if neither apiKey nor endpoint provided', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Proxy endpoint must be provided'
      );
    });
  });

  describe('model management', () => {
    beforeEach(async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        model: 'openai/gpt-4o',
      });
    });

    it('should get current model', () => {
      expect(provider.getModel()).toBe('openai/gpt-4o');
    });

    it('should change model', () => {
      provider.setModel('anthropic/claude-3-opus');
      expect(provider.getModel()).toBe('anthropic/claude-3-opus');
    });

    it('should change to any OpenRouter model format', () => {
      provider.setModel('meta-llama/llama-3-70b');
      expect(provider.getModel()).toBe('meta-llama/llama-3-70b');

      provider.setModel('google/gemini-pro-1.5');
      expect(provider.getModel()).toBe('google/gemini-pro-1.5');
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

    it('should support vision for openai/gpt-4o', () => {
      provider.setModel('openai/gpt-4o');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for openai/gpt-4-turbo', () => {
      provider.setModel('openai/gpt-4-turbo');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for openai/gpt-4-vision-preview', () => {
      provider.setModel('openai/gpt-4-vision-preview');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for anthropic/claude-3-opus', () => {
      provider.setModel('anthropic/claude-3-opus');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for anthropic/claude-3-sonnet', () => {
      provider.setModel('anthropic/claude-3-sonnet');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for google/gemini-pro-1.5', () => {
      provider.setModel('google/gemini-pro-1.5');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for llava models', () => {
      provider.setModel('haotian-liu/llava-13b');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should not support vision for text-only models', () => {
      provider.setModel('meta-llama/llama-3-70b');
      expect(provider.supportsVision()).toBe(false);
    });

    it('should not support vision for mistral models without vision', () => {
      provider.setModel('mistralai/mistral-7b-instruct');
      expect(provider.supportsVision()).toBe(false);
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
        { role: 'assistant', content: 'Hi there!' },
      ];

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n'),
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

      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });

      expect(chunks.some(c => c.type === 'content_delta')).toBe(true);
      expect(chunks.some(c => c.type === 'complete')).toBe(true);
    });

    it('should include system prompt in proxy request body', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const options: ChatOptions = { systemPrompt: 'You are a helpful assistant.' };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: [DONE]\n\n'),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const stream = provider.chat(messages, options);
      for await (const _ of stream) {}

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant.',
      });
    });

    it('should include httpReferer and xTitle headers in proxy request', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        model: 'openai/gpt-4o',
        httpReferer: 'https://myapp.com',
        xTitle: 'My Application',
      });

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
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
      expect(fetchCall[1].headers['HTTP-Referer']).toBe('https://myapp.com');
      expect(fetchCall[1].headers['X-Title']).toBe('My Application');
    });

    it('should handle proxy error responses', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      (global.fetch as any).mockResolvedValue({
        ok: false,
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

      expect(() => provider.getModel()).not.toThrow();
    });

    it('should clear config on destroy', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        httpReferer: 'https://myapp.com',
      });

      provider.destroy();

      await provider.initialize({
        endpoint: 'https://proxy2.example.com/api',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });
  });
});
