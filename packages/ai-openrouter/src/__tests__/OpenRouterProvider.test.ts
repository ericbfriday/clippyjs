import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenRouterProvider } from '../OpenRouterProvider';
import type { Message, ChatOptions } from '@clippyjs/ai';

// Mock OpenAI SDK (OpenRouter uses OpenAI SDK)
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

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize in client-side mode with API key', async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
        model: 'openai/gpt-4o',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });

    it('should initialize in proxy mode with endpoint', async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        model: 'anthropic/claude-3-opus',
      });

      expect(provider.getModel()).toBe('anthropic/claude-3-opus');
    });

    it('should default to openai/gpt-4o model', async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });

    it('should throw error if neither apiKey nor endpoint provided', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Either endpoint or apiKey must be provided'
      );
    });

    it('should accept custom baseURL', async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
        baseURL: 'https://custom.openrouter.ai/v1',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });

    it('should accept httpReferer header', async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
        httpReferer: 'https://myapp.com',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });

    it('should accept xTitle header', async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
        xTitle: 'My Application',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });

    it('should accept both httpReferer and xTitle headers', async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
        httpReferer: 'https://myapp.com',
        xTitle: 'My Application',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });

    it('should warn but not fail on non-standard API key format', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await provider.initialize({
        apiKey: 'not-standard-format',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'OpenRouterProvider: API key does not start with "sk-or-", this may be invalid'
      );
      expect(provider.getModel()).toBe('openai/gpt-4o');

      warnSpy.mockRestore();
    });
  });

  describe('model management', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
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
        apiKey: 'sk-or-test-api-key',
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

  describe('message conversion', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
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
        apiKey: 'sk-or-test-api-key',
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
        apiKey: 'sk-or-test-api-key',
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

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages, options);
      for await (const _ of stream) {
        // consume stream
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

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages, options);
      for await (const _ of stream) {
        // consume stream
      }

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.max_tokens).toBe(1000);
    });

    it('should use correct model in API call', async () => {
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

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages);
      for await (const _ of stream) {
        // consume stream
      }

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('openai/gpt-4o');
    });

    it('should enable streaming in API call', async () => {
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

      // Mock the client instance's chat.completions.create method
      if ((provider as any).client) {
        (provider as any).client.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }

      const stream = provider.chat(messages);
      for await (const _ of stream) {
        // consume stream
      }

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.stream).toBe(true);
    });
  });

  describe('proxy mode', () => {
    beforeEach(async () => {
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        model: 'openai/gpt-4o',
      });
    });

    it('should use fetch in proxy mode', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      // Mock fetch for proxy mode
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

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(global.fetch).toHaveBeenCalled();
      expect(chunks.some(c => c.type === 'content_delta')).toBe(true);
      expect(chunks.some(c => c.type === 'complete')).toBe(true);
    });

    it('should handle proxy error responses', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
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

    it('should include httpReferer and xTitle headers in proxy request', async () => {
      // Re-initialize with headers
      await provider.initialize({
        endpoint: 'https://proxy.example.com/api',
        model: 'openai/gpt-4o',
        httpReferer: 'https://myapp.com',
        xTitle: 'My Application',
      });

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
                value: new TextEncoder().encode('data: [DONE]\n\n'),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['HTTP-Referer']).toBe('https://myapp.com');
      expect(fetchCall[1].headers['X-Title']).toBe('My Application');
    });
  });

  describe('cleanup', () => {
    it('should dispose resources', async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
      });

      provider.destroy();

      // After disposal, client should be null
      // (we can't directly test private properties, but we can verify behavior)
      expect(() => provider.getModel()).not.toThrow();
    });

    it('should clear config on destroy', async () => {
      await provider.initialize({
        apiKey: 'sk-or-test-api-key',
        httpReferer: 'https://myapp.com',
      });

      provider.destroy();

      // After destroy, we should be able to reinitialize
      await provider.initialize({
        apiKey: 'sk-or-another-key',
      });

      expect(provider.getModel()).toBe('openai/gpt-4o');
    });
  });
});
