import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ZAIProvider, ZAIProviderConfig } from '../ZAIProvider';
import type { Message, Tool, ChatOptions } from '@clippyjs/ai';

// Mock the openai module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

// Mock fetch for proxy mode
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ZAIProvider', () => {
  let provider: ZAIProvider;

  beforeEach(() => {
    provider = new ZAIProvider();
    vi.clearAllMocks();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('initialization', () => {
    it('should throw security error when apiKey is provided without endpoint', async () => {
      await expect(
        provider.initialize({
          apiKey: 'test-api-key',
        })
      ).rejects.toThrow(/Security Error/);
    });

    it('should initialize with endpoint', async () => {
      await provider.initialize({
        endpoint: 'http://localhost:3000/api/zai',
      });

      expect(provider.getModel()).toBe('glm-4.6');
    });

    it('should initialize with custom model and endpoint', async () => {
      await provider.initialize({
        endpoint: 'http://localhost:3000/api/zai',
        model: 'glm-4.5v',
      });

      expect(provider.getModel()).toBe('glm-4.5v');
    });

    it('should throw error without endpoint', async () => {
      await expect(provider.initialize({} as any)).rejects.toThrow(
        'Proxy endpoint must be provided'
      );
    });

    it('should initialize with thinking mode enabled and endpoint', async () => {
      await provider.initialize({
        endpoint: 'http://localhost:3000/api/zai',
        thinkingEnabled: true,
      });

      expect(provider.isThinkingMode()).toBe(true);
    });

    it('should default thinking mode to disabled with endpoint', async () => {
      await provider.initialize({
        endpoint: 'http://localhost:3000/api/zai',
      });

      expect(provider.isThinkingMode()).toBe(false);
    });
  });

  describe('model management', () => {
    beforeEach(async () => {
      await provider.initialize({ endpoint: 'http://localhost:3000/api/zai' });
    });

    it('should get current model', () => {
      expect(provider.getModel()).toBe('glm-4.6');
    });

    it('should set model', () => {
      provider.setModel('glm-4.5v');
      expect(provider.getModel()).toBe('glm-4.5v');
    });
  });

  describe('thinking mode', () => {
    beforeEach(async () => {
      await provider.initialize({ endpoint: 'http://localhost:3000/api/zai' });
    });

    it('should toggle thinking mode', () => {
      expect(provider.isThinkingMode()).toBe(false);
      provider.setThinkingMode(true);
      expect(provider.isThinkingMode()).toBe(true);
      provider.setThinkingMode(false);
      expect(provider.isThinkingMode()).toBe(false);
    });
  });

  describe('feature support', () => {
    beforeEach(async () => {
      await provider.initialize({ endpoint: 'http://localhost:3000/api/zai' });
    });

    it('should support tools', () => {
      expect(provider.supportsTools()).toBe(true);
    });

    it('should support vision for glm-4.5v', () => {
      provider.setModel('glm-4.5v');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for vision models', () => {
      provider.setModel('some-vision-model');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should not support vision for non-vision models', () => {
      provider.setModel('glm-4.6');
      expect(provider.supportsVision()).toBe(false);
    });

    it('should support vision for glm-4v models', () => {
      provider.setModel('glm-4v-plus');
      expect(provider.supportsVision()).toBe(true);
    });
  });


  describe('proxy mode streaming', () => {
    it('should stream via proxy endpoint', async () => {
      await provider.initialize({ endpoint: 'http://localhost:3000/api/zai' });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n')
          );
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":" World"},"finish_reason":null}]}\n\n')
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const messages: Message[] = [{ role: 'user', content: 'Hi' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual({ type: 'content_delta', delta: 'Hello' });
      expect(chunks).toContainEqual({ type: 'content_delta', delta: ' World' });
      expect(chunks).toContainEqual({ type: 'complete' });
    });

    it('should handle proxy errors', async () => {
      await provider.initialize({ endpoint: 'http://localhost:3000/api/zai' });

      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const messages: Message[] = [{ role: 'user', content: 'Hi' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual(
        expect.objectContaining({
          type: 'error',
          error: expect.stringContaining('Proxy request failed'),
        })
      );
    });

    it('should include thinking parameter when enabled in proxy mode', async () => {
      await provider.initialize({
        endpoint: 'http://localhost:3000/api/zai',
        thinkingEnabled: true,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"Answer"},"finish_reason":null}]}\n\n')
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const messages: Message[] = [{ role: 'user', content: 'Think about this' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/zai',
        expect.objectContaining({
          body: expect.stringContaining('"thinking":{"type":"enabled"}'),
        })
      );
    });

    it('should handle reasoning_content in proxy mode', async () => {
      await provider.initialize({ endpoint: 'http://localhost:3000/api/zai' });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"reasoning_content":"Thinking..."},"finish_reason":null}]}\n\n')
          );
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"Answer"},"finish_reason":null}]}\n\n')
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: stream,
      });

      const messages: Message[] = [{ role: 'user', content: 'Think' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual({ type: 'content_delta', delta: 'Thinking...' });
      expect(chunks).toContainEqual({ type: 'content_delta', delta: 'Answer' });
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', async () => {
      await provider.initialize({ endpoint: 'http://localhost:3000/api/zai' });
      provider.destroy();

      // After destroy, trying to chat should fail
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      let error: Error | null = null;
      try {
        for await (const _ of provider.chat(messages)) {
          // Should not get here
        }
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
    });
  });
});
