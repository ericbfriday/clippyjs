import Anthropic from '@anthropic-ai/sdk';
import type { MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages.mjs';
import {
  AIProvider,
  type AIProviderConfig,
  type Message,
  type ContentBlock,
  type StreamChunk,
  type ChatOptions,
  type ToolUseBlock,
} from '@clippyjs/ai';

/**
 * Anthropic Claude Provider
 *
 * Implements the AIProvider interface for Anthropic's Claude SDK.
 * Supports both client-side (browser) and proxy modes with streaming.
 *
 * Phase 2: Full implementation with streaming support
 */
export class AnthropicProvider extends AIProvider {
  private client: Anthropic | null = null;
  private config: AIProviderConfig | null = null;
  private isProxyMode = false;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;

    // Support both client-side and proxy mode
    if (config.endpoint) {
      // Proxy mode - use fetch for streaming
      this.isProxyMode = true;
      console.log('AnthropicProvider: Proxy mode configured');
    } else if (config.apiKey) {
      // Client-side mode - use SDK
      this.isProxyMode = false;
      this.client = new Anthropic({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
      });
      console.log('AnthropicProvider: Client-side mode configured');
    } else {
      throw new Error('Either endpoint or apiKey must be provided');
    }
  }

  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk> {
    if (!this.config) {
      throw new Error('AnthropicProvider not initialized');
    }

    // Convert messages to Claude format
    const claudeMessages = this.convertMessages(messages);

    // Build request parameters
    const params: Anthropic.MessageCreateParams = {
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: this.config.maxTokens || 4096,
      messages: claudeMessages,
      stream: true,
    };

    // Add system prompt if provided
    if (options?.systemPrompt) {
      params.system = options.systemPrompt;
    }

    // Add temperature if provided
    if (options?.temperature !== undefined) {
      params.temperature = options.temperature;
    }

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      params.tools = options.tools as Anthropic.Tool[];
    }

    // Route to appropriate streaming implementation
    if (this.isProxyMode) {
      yield* this.streamViaProxy(params);
    } else {
      yield* this.streamViaSDK(params);
    }
  }

  /**
   * Stream responses using the Anthropic SDK (client-side mode)
   */
  private async *streamViaSDK(
    params: Anthropic.MessageCreateParams
  ): AsyncIterableIterator<StreamChunk> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const stream = await this.client.messages.create(params);

      for await (const event of stream) {
        const chunk = this.convertStreamEvent(event);
        if (chunk) {
          yield chunk;
        }
      }

      yield { type: 'complete' };
    } catch (error) {
      console.error('AnthropicProvider streaming error:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Stream responses using fetch to a proxy endpoint
   */
  private async *streamViaProxy(
    params: Anthropic.MessageCreateParams
  ): AsyncIterableIterator<StreamChunk> {
    if (!this.config?.endpoint) {
      throw new Error('Proxy endpoint not configured');
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.headers || {}),
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              yield { type: 'complete' };
              return;
            }

            try {
              const event = JSON.parse(data) as MessageStreamEvent;
              const chunk = this.convertStreamEvent(event);
              if (chunk) {
                yield chunk;
              }
            } catch (e) {
              console.warn('Failed to parse SSE event:', e);
            }
          }
        }
      }

      yield { type: 'complete' };
    } catch (error) {
      console.error('AnthropicProvider proxy streaming error:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert Anthropic stream events to our StreamChunk format
   */
  private convertStreamEvent(event: MessageStreamEvent): StreamChunk | null {
    switch (event.type) {
      case 'content_block_start':
        // New content block started
        if (event.content_block.type === 'text') {
          return null; // Text will come in deltas
        } else if (event.content_block.type === 'tool_use') {
          return {
            type: 'tool_use_start',
            toolUse: {
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            },
          };
        }
        return null;

      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          return {
            type: 'content_delta',
            delta: event.delta.text,
          };
        } else if (event.delta.type === 'input_json_delta') {
          return {
            type: 'tool_use_delta',
            delta: event.delta.partial_json,
          };
        }
        return null;

      case 'content_block_stop':
        // Content block finished
        return null;

      case 'message_start':
        // Message started
        return null;

      case 'message_delta':
        // Message-level delta (stop_reason, usage, etc.)
        return null;

      case 'message_stop':
        // Message finished
        return null;

      default:
        return null;
    }
  }

  /**
   * Convert our Message format to Claude's MessageParam format
   */
  private convertMessages(
    messages: Message[]
  ): Anthropic.MessageParam[] {
    return messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: this.convertContent(msg.content),
    }));
  }

  /**
   * Convert content to Claude's format
   */
  private convertContent(
    content: string | ContentBlock[]
  ): string | Anthropic.ContentBlock[] {
    if (typeof content === 'string') {
      return content;
    }

    return content.map((block): Anthropic.ContentBlock => {
      switch (block.type) {
        case 'text':
          return {
            type: 'text' as const,
            text: block.text,
          };

        case 'image': {
          const source = block.source;
          return {
            type: 'image' as const,
            source: {
              type: source.type as 'base64' | 'url',
              media_type: source.mediaType,
              ...(source.type === 'base64' && source.data
                ? { data: source.data }
                : {}),
              ...(source.type === 'url' && source.url
                ? { url: source.url }
                : {}),
            } as Anthropic.ImageBlockParam['source'],
          };
        }

        case 'tool_use':
          return {
            type: 'tool_use' as const,
            id: block.id,
            name: block.name,
            input: block.input,
          };

        case 'tool_result':
          return {
            type: 'tool_result' as const,
            tool_use_id: block.toolUseId,
            content: block.content,
          };

        default:
          throw new Error(`Unsupported content block type: ${(block as any).type}`);
      }
    });
  }

  supportsTools(): boolean {
    // Phase 2: Basic tool support (foundation)
    // Phase 4: Full tool integration
    return true;
  }

  supportsVision(): boolean {
    // Phase 2: Basic vision support (foundation)
    // Phase 4: Full multimodal integration
    return true;
  }

  destroy(): void {
    this.client = null;
    this.config = null;
  }
}
