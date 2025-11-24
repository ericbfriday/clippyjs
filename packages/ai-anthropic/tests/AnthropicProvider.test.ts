import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicProvider } from '../src/AnthropicProvider';
import type { Message } from '@clippyjs/ai';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
  });

  describe('Initialization', () => {
    it('should initialize in proxy mode', async () => {
      await provider.initialize({
        endpoint: 'https://api.example.com/chat',
      });

      expect(provider).toBeDefined();
    });

    it('should initialize in client-side mode', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });

      expect(provider).toBeDefined();
    });

    it('should throw error if neither endpoint nor apiKey provided', async () => {
      await expect(
        provider.initialize({})
      ).rejects.toThrow('Either endpoint or apiKey must be provided');
    });
  });

  describe('Tool and Vision Support', () => {
    it('should report tools support', () => {
      expect(provider.supportsTools()).toBe(true);
    });

    it('should report vision support', () => {
      expect(provider.supportsVision()).toBe(true);
    });
  });

  describe('Message Conversion', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });
    });

    it('should handle string content', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello, Claude!',
        },
      ];

      // Access private method via any cast for testing
      const converted = (provider as any).convertMessages(messages);

      expect(converted).toEqual([
        {
          role: 'user',
          content: 'Hello, Claude!',
        },
      ]);
    });

    it('should convert text blocks', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Hello, Claude!',
            },
          ],
        },
      ];

      const converted = (provider as any).convertMessages(messages);

      expect(converted).toEqual([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Hello, Claude!',
              citations: null,
            },
          ],
        },
      ]);
    });

    it('should convert image blocks with base64', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                mediaType: 'image/jpeg',
                data: 'base64data...',
              },
            },
          ],
        },
      ];

      const converted = (provider as any).convertMessages(messages);

      expect(converted[0].content[0]).toEqual({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: 'base64data...',
          url: undefined,
        },
      });
    });

    it('should convert image blocks with URL', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                mediaType: 'image/png',
                url: 'https://example.com/image.png',
              },
            },
          ],
        },
      ];

      const converted = (provider as any).convertMessages(messages);

      expect(converted[0].content[0]).toEqual({
        type: 'image',
        source: {
          type: 'url',
          media_type: 'image/png',
          data: undefined,
          url: 'https://example.com/image.png',
        },
      });
    });

    it('should convert tool_use blocks', () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'get_weather',
              input: { city: 'San Francisco' },
            },
          ],
        },
      ];

      const converted = (provider as any).convertMessages(messages);

      expect(converted[0].content[0]).toEqual({
        type: 'tool_use',
        id: 'tool_123',
        name: 'get_weather',
        input: { city: 'San Francisco' },
      });
    });

    it('should convert tool_result blocks', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              toolUseId: 'tool_123',
              content: '{"temp": 72, "condition": "sunny"}',
            },
          ],
        },
      ];

      const converted = (provider as any).convertMessages(messages);

      expect(converted[0].content[0]).toEqual({
        type: 'tool_result',
        tool_use_id: 'tool_123',
        content: '{"temp": 72, "condition": "sunny"}',
      });
    });
  });

  describe('Proxy Mode Streaming', () => {
    beforeEach(async () => {
      await provider.initialize({
        endpoint: 'https://api.example.com/chat',
      });
    });

    it('should stream responses from proxy', async () => {
      // Mock successful SSE stream
      const mockBody = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: mockBody,
      } as Response);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'content_delta', delta: 'Hello' },
        { type: 'content_delta', delta: ' world' },
        { type: 'complete' },
      ]);
    });

    it('should handle proxy errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe('error');
      expect(chunks[0].error).toContain('500');
    });

    it('should handle null response body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      } as Response);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe('error');
      expect(chunks[0].error).toContain('Response body is null');
    });
  });

  describe('Stream Event Conversion', () => {
    it('should convert text_delta events', () => {
      const event = {
        type: 'content_block_delta' as const,
        index: 0,
        delta: {
          type: 'text_delta' as const,
          text: 'Hello',
        },
      };

      const chunk = (provider as any).convertStreamEvent(event);

      expect(chunk).toEqual({
        type: 'content_delta',
        delta: 'Hello',
      });
    });

    it('should convert tool_use start events', () => {
      const event = {
        type: 'content_block_start' as const,
        index: 0,
        content_block: {
          type: 'tool_use' as const,
          id: 'tool_123',
          name: 'get_weather',
          input: {},
        },
      };

      const chunk = (provider as any).convertStreamEvent(event);

      expect(chunk).toEqual({
        type: 'tool_use_start',
        toolUse: {
          id: 'tool_123',
          name: 'get_weather',
          input: {},
        },
      });
    });

    it('should convert tool input delta events', () => {
      const event = {
        type: 'content_block_delta' as const,
        index: 0,
        delta: {
          type: 'input_json_delta' as const,
          partial_json: '{"city":',
        },
      };

      const chunk = (provider as any).convertStreamEvent(event);

      expect(chunk).toEqual({
        type: 'tool_use_delta',
        delta: '{"city":',
      });
    });

    it('should ignore other event types', () => {
      const events = [
        { type: 'message_start' as const },
        { type: 'content_block_stop' as const, index: 0 },
        { type: 'message_delta' as const, delta: { stop_reason: 'end_turn' } },
        { type: 'message_stop' as const },
      ];

      events.forEach((event) => {
        const chunk = (provider as any).convertStreamEvent(event);
        expect(chunk).toBeNull();
      });
    });
  });

  describe('Destroy', () => {
    it('should clean up resources', async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
      });

      provider.destroy();

      // Verify that attempting to chat throws error
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(async () => {
        for await (const chunk of provider.chat(messages)) {
          // Should throw before yielding
        }
      }).rejects.toThrow('not initialized');
    });
  });
});
