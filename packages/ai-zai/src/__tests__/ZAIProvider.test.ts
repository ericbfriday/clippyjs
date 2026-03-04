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
    it('should initialize with apiKey', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });

      expect(provider.getModel()).toBe('glm-4.6');
    });

    it('should initialize with custom model', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
        model: 'glm-4.5v',
      });

      expect(provider.getModel()).toBe('glm-4.5v');
    });

    it('should initialize with endpoint (proxy mode)', async () => {
      await provider.initialize({
        endpoint: 'http://localhost:3000/api/zai',
      });

      expect(provider.getModel()).toBe('glm-4.6');
    });

    it('should throw error without apiKey or endpoint', async () => {
      await expect(provider.initialize({} as any)).rejects.toThrow(
        'Either endpoint or apiKey must be provided'
      );
    });

    it('should use custom baseURL when provided', async () => {
      const OpenAI = (await import('openai')).default as any;

      await provider.initialize({
        apiKey: 'test-api-key',
        baseURL: 'https://custom.z.ai/v1',
      });

      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.z.ai/v1',
        })
      );
    });

    it('should use default Z.AI base URL', async () => {
      const OpenAI = (await import('openai')).default as any;

      await provider.initialize({
        apiKey: 'test-api-key',
      });

      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.z.ai/api/paas/v4',
        })
      );
    });

    it('should initialize with thinking mode enabled', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
        thinkingEnabled: true,
      });

      expect(provider.isThinkingMode()).toBe(true);
    });

    it('should default thinking mode to disabled', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });

      expect(provider.isThinkingMode()).toBe(false);
    });
  });

  describe('model management', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
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
      await provider.initialize({ apiKey: 'test-key' });
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
      await provider.initialize({ apiKey: 'test-key' });
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

  describe('message conversion', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should convert simple text messages', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'Hello' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      // Re-initialize to use the new mock
      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const chunks: any[] = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Hello' }),
          ]),
        })
      );
    });

    it('should add system prompt when provided', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'Hi' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const options: ChatOptions = {
        systemPrompt: 'You are a helpful assistant.',
      };

      const chunks: any[] = [];
      for await (const chunk of provider.chat(messages, options)) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'You are a helpful assistant.',
            }),
          ]),
        })
      );
    });

    it('should convert multimodal messages with images', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'I see an image' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            {
              type: 'image',
              source: { type: 'url', url: 'https://example.com/image.jpg', mediaType: 'image/jpeg' },
            },
          ],
        },
      ];

      const chunks: any[] = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalled();
    });

    it('should convert base64 images correctly', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'Base64 image' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image' },
            {
              type: 'image',
              source: {
                type: 'base64',
                mediaType: 'image/png',
                data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              },
            },
          ],
        },
      ];

      const chunks: any[] = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('tool conversion', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should convert tools to OpenAI format', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'OK' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const tools: Tool[] = [
        {
          name: 'get_weather',
          description: 'Get the weather for a location',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string' },
            },
            required: ['location'],
          },
        },
      ];

      const messages: Message[] = [{ role: 'user', content: 'What is the weather?' }];

      const chunks: any[] = [];
      for await (const chunk of provider.chat(messages, { tools })) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({
              type: 'function',
              function: expect.objectContaining({
                name: 'get_weather',
                description: 'Get the weather for a location',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('streaming', () => {
    it('should yield content_delta chunks', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'Hello' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: { content: ' World' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [{ role: 'user', content: 'Hi' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual({ type: 'content_delta', delta: 'Hello' });
      expect(chunks).toContainEqual({ type: 'content_delta', delta: ' World' });
      expect(chunks).toContainEqual({ type: 'complete' });
    });

    it('should handle reasoning_content from thinking mode', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { reasoning_content: 'Thinking...' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: { content: 'Answer' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key', thinkingEnabled: true });

      const messages: Message[] = [{ role: 'user', content: 'Think about this' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual({ type: 'content_delta', delta: 'Thinking...' });
      expect(chunks).toContainEqual({ type: 'content_delta', delta: 'Answer' });
    });

    it('should handle tool use streaming', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    id: 'call_123',
                    function: { name: 'get_weather', arguments: '' },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        };
        yield {
          choices: [
            {
              delta: {
                tool_calls: [{ function: { arguments: '{"location":' } }],
              },
              finish_reason: null,
            },
          ],
        };
        yield {
          choices: [
            {
              delta: {
                tool_calls: [{ function: { arguments: '"NYC"}' } }],
              },
              finish_reason: null,
            },
          ],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'tool_calls' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [{ role: 'user', content: 'Weather in NYC' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual(
        expect.objectContaining({ type: 'tool_use_start' })
      );
      expect(chunks).toContainEqual(
        expect.objectContaining({ type: 'tool_use_delta' })
      );
      expect(chunks).toContainEqual(
        expect.objectContaining({
          type: 'tool_use',
          toolUse: expect.objectContaining({
            id: 'call_123',
            name: 'get_weather',
            input: { location: 'NYC' },
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        throw new Error('API Error');
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [{ role: 'user', content: 'Hi' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual(
        expect.objectContaining({
          type: 'error',
          error: 'API Error',
        })
      );
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

  describe('chat options', () => {
    it('should pass maxTokens to API', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'Hi' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [{ role: 'user', content: 'Hi' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages, { maxTokens: 100 })) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 100,
        })
      );
    });

    it('should pass temperature to API', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'Hi' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key' });

      const messages: Message[] = [{ role: 'user', content: 'Hi' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages, { temperature: 0.5 })) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
        })
      );
    });

    it('should include thinking option when enabled', async () => {
      const OpenAI = (await import('openai')).default as any;
      const mockCreate = vi.fn().mockImplementation(async function* () {
        yield {
          choices: [{ delta: { content: 'Hi' }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }],
        };
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      await provider.initialize({ apiKey: 'test-key', thinkingEnabled: true });

      const messages: Message[] = [{ role: 'user', content: 'Think about this' }];
      const chunks: any[] = [];

      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          thinking: { type: 'enabled' },
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', async () => {
      await provider.initialize({ apiKey: 'test-key' });
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
