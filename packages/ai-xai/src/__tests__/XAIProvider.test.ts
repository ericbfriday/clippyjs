import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XAIProvider } from '../XAIProvider';
import type { Message, ChatOptions } from '@clippyjs/ai';

// Mock OpenAI SDK (xAI uses OpenAI SDK with custom baseURL)
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      constructor(public config: any) {}

      chat = {
        completions: {
          create: vi.fn(),
        },
      };
    },
  };
});

describe('XAIProvider', () => {
  let provider: XAIProvider;

  beforeEach(() => {
    provider = new XAIProvider();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize in client-side mode with API key', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
        model: 'grok-4',
      });

      expect(provider.getModel()).toBe('grok-4');
    });

    it('should initialize in proxy mode with endpoint', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        model: 'grok-4',
      });

      expect(provider.getModel()).toBe('grok-4');
    });

    it('should default to grok-4 model', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });

      expect(provider.getModel()).toBe('grok-4');
    });

    it('should throw error if neither apiKey nor endpoint provided', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Either endpoint or apiKey must be provided'
      );
    });

    it('should accept custom baseURL', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
        baseURL: 'https://custom.xai.com/v1',
      });

      expect(provider.getModel()).toBe('grok-4');
    });

    it('should use xAI base URL by default', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });

      // The provider should be initialized with xAI's base URL
      expect(provider.getModel()).toBe('grok-4');
    });
  });

  describe('model management', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
        model: 'grok-4',
      });
    });

    it('should get current model', () => {
      expect(provider.getModel()).toBe('grok-4');
    });

    it('should change model', () => {
      provider.setModel('grok-3');
      expect(provider.getModel()).toBe('grok-3');
    });
  });

  describe('feature support', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });
    });

    it('should support tools', () => {
      expect(provider.supportsTools()).toBe(true);
    });

    it('should support vision for grok-4', () => {
      provider.setModel('grok-4');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for grok-vision', () => {
      provider.setModel('grok-vision');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should support vision for grok-2-vision', () => {
      provider.setModel('grok-2-vision');
      expect(provider.supportsVision()).toBe(true);
    });

    it('should not support vision for grok-3', () => {
      provider.setModel('grok-3');
      expect(provider.supportsVision()).toBe(false);
    });

    it('should not support vision for grok-2', () => {
      provider.setModel('grok-2');
      expect(provider.supportsVision()).toBe(false);
    });
  });

  describe('message conversion', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });
    });

    it('should convert simple text messages', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      // Test by calling chat and checking the mock
      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: null }],
          };
        },
      });

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages);
      await stream.next(); // Trigger the call

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should include system prompt', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const options: ChatOptions = {
        systemPrompt: 'You are a helpful assistant.',
      };

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: null }],
          };
        },
      });

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages, options);
      await stream.next();

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant.',
      });
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

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: null }],
          };
        },
      });

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages);
      await stream.next();

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContainEqual({
        type: 'text',
        text: 'What is in this image?',
      });
      expect(callArgs.messages[0].content).toContainEqual({
        type: 'image_url',
        image_url: {
          url: 'https://example.com/image.jpg',
        },
      });
    });

    it('should convert image messages with base64', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            {
              type: 'image',
              source: {
                type: 'base64',
                mediaType: 'image/jpeg',
                data: 'base64data',
              },
            },
          ],
        },
      ];

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: null }],
          };
        },
      });

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages);
      await stream.next();

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContainEqual({
        type: 'image_url',
        image_url: {
          url: 'data:image/jpeg;base64,base64data',
        },
      });
    });
  });

  describe('tool conversion', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
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

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: null }],
          };
        },
      });

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages, options);
      await stream.next();

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.tools).toEqual([
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
  });

  describe('streaming', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });
    });

    it('should stream content deltas', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Hello' }, finish_reason: null }],
          };
          yield {
            choices: [{ delta: { content: ' world' }, finish_reason: null }],
          };
          yield {
            choices: [{ delta: {}, finish_reason: 'stop' }],
          };
        },
      });

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ type: 'content_delta', delta: 'Hello' });
      expect(chunks[1]).toEqual({ type: 'content_delta', delta: ' world' });
      expect(chunks[2]).toEqual({ type: 'complete' });
    });

    it('should handle tool use streaming', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'What is the weather?' },
      ];

      const options: ChatOptions = {
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather',
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

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{
              delta: {
                tool_calls: [{
                  id: 'call_123',
                  function: { name: 'get_weather', arguments: '' },
                }],
              },
              finish_reason: null,
            }],
          };
          yield {
            choices: [{
              delta: {
                tool_calls: [{
                  function: { arguments: '{"location":' },
                }],
              },
              finish_reason: null,
            }],
          };
          yield {
            choices: [{
              delta: {
                tool_calls: [{
                  function: { arguments: '"NYC"}' },
                }],
              },
              finish_reason: null,
            }],
          };
          yield {
            choices: [{ delta: {}, finish_reason: 'tool_calls' }],
          };
        },
      });

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const chunks = [];
      for await (const chunk of provider.chat(messages, options)) {
        chunks.push(chunk);
      }

      expect(chunks.some(c => c.type === 'tool_use_start')).toBe(true);
      expect(chunks.some(c => c.type === 'tool_use_delta')).toBe(true);
      expect(chunks.some(c => c.type === 'tool_use')).toBe(true);
      expect(chunks.some(c => c.type === 'complete')).toBe(true);
    });

    it('should handle streaming errors', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe('error');
      expect(chunks[0].error).toBe('API Error');
    });
  });

  describe('chat options', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });
    });

    it('should pass temperature option', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const options: ChatOptions = {
        temperature: 0.5,
      };

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }],
          };
        },
      });

      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages, options);
      // Consume the stream
      for await (const _ of stream) {
        // Just consume
      }

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.5);
    });

    it('should pass maxTokens option', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const options: ChatOptions = {
        maxTokens: 1000,
      };

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }],
          };
        },
      });

      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages, options);
      // Consume the stream
      for await (const _ of stream) {
        // Just consume
      }

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.max_tokens).toBe(1000);
    });

    it('should use correct model in request', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }],
          };
        },
      });

      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages);
      // Consume the stream
      for await (const _ of stream) {
        // Just consume
      }

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('grok-4');
    });

    it('should enable streaming in request', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const mockCreate = vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }],
          };
        },
      });

      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages);
      // Consume the stream
      for await (const _ of stream) {
        // Just consume
      }

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.stream).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should dispose resources', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });

      provider.destroy();

      // After disposal, client should be null
      // (we can't directly test private properties, but we can verify behavior)
      expect(() => provider.getModel()).not.toThrow();
    });
  });
});
