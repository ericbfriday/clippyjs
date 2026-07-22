import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenAIProvider } from '../OpenAIProvider';
import type { Message, ChatOptions } from '@clippyjs/ai';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
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
        model: 'gpt-4o',
      });

      expect(provider.getModel()).toBe('gpt-4o');
    });

    it('should throw error when initialized with API key but no endpoint', async () => {
      await expect(
        provider.initialize({
          apiKey: 'test-api-key',
          model: 'gpt-4o',
        })
      ).rejects.toThrow('Security Error: Direct client-side API key usage is disabled. Please use a secure backend proxy endpoint.');
    });

    it('should default to gpt-4o model', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
      });

      expect(provider.getModel()).toBe('gpt-4o');
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
        model: 'gpt-4o',
      });
    });

    it('should get current model', () => {
      expect(provider.getModel()).toBe('gpt-4o');
    });

    it('should change model', () => {
      provider.setModel('gpt-3.5-turbo');
      expect(provider.getModel()).toBe('gpt-3.5-turbo');
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

    it('should support vision for gpt-4o', () => {
      provider.setModel('gpt-4o');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for gpt-4-turbo', () => {
      provider.setModel('gpt-4-turbo');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should not support vision for gpt-3.5-turbo', () => {
      provider.setModel('gpt-3.5-turbo');
      expect(provider.supportsVision()).toBe(false);
    });

    it('should support vision for gpt-4-vision', () => {
      provider.setModel('gpt-4-vision-preview');
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

      expect(requestBody.messages[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({ type: 'content_delta', delta: 'Hi' });
      expect(chunks[1]).toEqual({ type: 'complete' });
    });

    it('should convert image messages with URL', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            {
              type: 'image',
              source: {
                type: 'url',
                mediaType: 'image/jpeg',
                url: 'https://example.com/image.jpg',
              },
            },
          ],
        },
      ];

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

      const stream = provider.chat(messages);
      await stream.next();

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.messages[0].content).toContainEqual({
        type: 'text',
        text: 'What is in this image?',
      });
      expect(requestBody.messages[0].content).toContainEqual({
        type: 'image_url',
        image_url: {
          url: 'https://example.com/image.jpg',
        },
      });
    });

    it('should convert tools to OpenAI format', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'What is the weather?' },
      ];

      const options: ChatOptions = {
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            input_schema: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
              required: ['location'],
            },
          },
        ],
      };

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
      await stream.next();

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.tools).toEqual([
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get current weather',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
              required: ['location'],
            },
          },
        },
      ]);
    });

    it('should handle streaming errors', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      (global.fetch as any).mockRejectedValue(new Error('API Error'));

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe('error');
      expect(chunks[0].error).toBe('API Error');
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
  });
});
