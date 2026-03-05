import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenRouterProvider } from '../OpenRouterProvider';
import type { Message, ChatOptions } from '@clippyjs/ai';

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider();
    vi.clearAllMocks();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('initialization', () => {
    it('should initialize in proxy mode with endpoint', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        model: 'anthropic/claude-3-opus',
      });

      expect(provider.getModel()).toBe('anthropic/claude-3-opus');
    });

    it('should throw security error if API key provided without endpoint', async () => {
      await expect(
        provider.initialize({ apiKey: 'sk-or-test-api-key' })
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

    it('should not support vision for text-only models', () => {
      provider.setModel('meta-llama/llama-3-70b');
      expect(provider.supportsVision()).toBe(false);
    });
  });

  describe('proxy mode execution', () => {
    const originalFetch = global.fetch;
    const mockFetch = vi.fn();

    beforeEach(async () => {
      global.fetch = mockFetch;
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        httpReferer: 'https://myapp.com',
        xTitle: 'My Application',
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should make a proxy request with headers and parameters', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      mockFetch.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true }),
          }),
        },
      });

      const stream = provider.chat(messages, { maxTokens: 100, temperature: 0.5 });
      await stream.next();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://proxy.example.com/api',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://myapp.com',
            'X-Title': 'My Application',
          }),
          body: expect.stringContaining('"temperature":0.5'),
        })
      );
    });
  });
});