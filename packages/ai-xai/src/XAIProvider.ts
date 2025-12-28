import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import {
  AIProvider,
  type AIProviderConfig,
  type Message,
  type ContentBlock,
  type StreamChunk,
  type ChatOptions,
  type ToolUseBlock,
  type Tool,
} from '@clippyjs/ai';

/**
 * xAI Provider
 *
 * Implements the AIProvider interface for xAI's Chat Completion API.
 * Supports Grok models with streaming, tools, and vision.
 *
 * xAI uses an OpenAI-compatible API, so this provider leverages the OpenAI SDK
 * with a custom baseURL pointing to xAI's API endpoint.
 */
export class XAIProvider extends AIProvider {
  private client: OpenAI | null = null;
  private config: AIProviderConfig | null = null;
  private isProxyMode = false;
  private currentModel = 'grok-4';

  /** xAI API base URL */
  private static readonly XAI_BASE_URL = 'https://api.x.ai/v1';

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;
    this.currentModel = config.model || 'grok-4';

    // Support both client-side and proxy mode
    if (config.endpoint) {
      // Proxy mode - use fetch for streaming
      this.isProxyMode = true;
    } else if (config.apiKey) {
      // Client-side mode - use SDK with xAI base URL
      this.isProxyMode = false;
      this.client = new OpenAI({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
        baseURL: config.baseURL || XAIProvider.XAI_BASE_URL,
      });
    } else {
      throw new Error('Either endpoint or apiKey must be provided');
    }
  }

  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk> {
    if (this.isProxyMode) {
      yield* this.chatProxy(messages, options);
    } else {
      yield* this.chatDirect(messages, options);
    }
  }

  /**
   * Direct xAI API streaming using SDK
   */
  private async *chatDirect(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk> {
    if (!this.client) {
      throw new Error('xAI client not initialized');
    }

    try {
      // Convert messages to OpenAI format
      const openaiMessages = this.convertMessages(messages, options?.systemPrompt);

      // Convert tools to OpenAI format
      const tools = options?.tools ? this.convertTools(options.tools) : undefined;

      // Create streaming completion
      const stream = await this.client.chat.completions.create({
        model: this.currentModel,
        messages: openaiMessages,
        tools,
        max_tokens: options?.maxTokens || this.config?.maxTokens,
        temperature: options?.temperature ?? this.config?.temperature ?? 1,
        stream: true,
      });

      // Track tool use state
      let currentToolUse: Partial<ToolUseBlock> | null = null;

      // Process stream
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (!delta) continue;

        // Handle content deltas
        if (delta.content) {
          yield {
            type: 'content_delta',
            delta: delta.content,
          };
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            // Tool call start
            if (toolCall.function?.name && !currentToolUse) {
              currentToolUse = {
                id: toolCall.id || `tool_${Date.now()}`,
                name: toolCall.function.name,
                input: {},
              };

              yield {
                type: 'tool_use_start',
                toolUse: currentToolUse as ToolUseBlock,
              };
            }

            // Tool call arguments (streamed)
            if (toolCall.function?.arguments && currentToolUse) {
              // Accumulate arguments as string temporarily
              const existingArgs = (currentToolUse.input as any)?._raw || '';
              (currentToolUse.input as any) = {
                _raw: existingArgs + toolCall.function.arguments,
              };

              yield {
                type: 'tool_use_delta',
                delta: toolCall.function.arguments,
              };
            }
          }
        }

        // Handle finish reasons
        if (chunk.choices[0]?.finish_reason) {
          // Complete any pending tool use
          if (currentToolUse && currentToolUse.id && currentToolUse.name) {
            // Parse accumulated arguments
            try {
              const rawArgs = (currentToolUse.input as any)?._raw || '{}';
              const parsedInput = JSON.parse(rawArgs);

              yield {
                type: 'tool_use',
                toolUse: {
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: parsedInput,
                },
              };
            } catch {
              yield {
                type: 'error',
                error: 'Failed to parse tool arguments',
              };
            }
            currentToolUse = null;
          }

          yield {
            type: 'complete',
          };
        }
      }
    } catch (error: any) {
      yield {
        type: 'error',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Proxy mode streaming using fetch
   */
  private async *chatProxy(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk> {
    if (!this.config?.endpoint) {
      throw new Error('Proxy endpoint not configured');
    }

    try {
      // Convert messages to OpenAI format
      const openaiMessages = this.convertMessages(messages, options?.systemPrompt);

      // Convert tools
      const tools = options?.tools ? this.convertTools(options.tools) : undefined;

      // Make proxy request
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel,
          messages: openaiMessages,
          tools,
          max_tokens: options?.maxTokens || this.config?.maxTokens,
          temperature: options?.temperature ?? this.config?.temperature ?? 1,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentToolUse: Partial<ToolUseBlock> | null = null;

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
              // Complete any pending tool use
              if (currentToolUse && currentToolUse.id && currentToolUse.name) {
                try {
                  const rawArgs = (currentToolUse.input as any)?._raw || '{}';
                  const parsedInput = JSON.parse(rawArgs);

                  yield {
                    type: 'tool_use',
                    toolUse: {
                      id: currentToolUse.id,
                      name: currentToolUse.name,
                      input: parsedInput,
                    },
                  };
                } catch {
                  // Failed to parse tool arguments
                }
                currentToolUse = null;
              }

              yield { type: 'complete' };
              return;
            }

            try {
              const chunk: ChatCompletionChunk = JSON.parse(data);
              const delta = chunk.choices[0]?.delta;

              if (!delta) continue;

              // Handle content
              if (delta.content) {
                yield {
                  type: 'content_delta',
                  delta: delta.content,
                };
              }

              // Handle tool calls
              if (delta.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  if (toolCall.function?.name && !currentToolUse) {
                    currentToolUse = {
                      id: toolCall.id || `tool_${Date.now()}`,
                      name: toolCall.function.name,
                      input: {},
                    };

                    yield {
                      type: 'tool_use_start',
                      toolUse: currentToolUse as ToolUseBlock,
                    };
                  }

                  if (toolCall.function?.arguments && currentToolUse) {
                    const existingArgs = (currentToolUse.input as any)?._raw || '';
                    (currentToolUse.input as any) = {
                      _raw: existingArgs + toolCall.function.arguments,
                    };

                    yield {
                      type: 'tool_use_delta',
                      delta: toolCall.function.arguments,
                    };
                  }
                }
              }
            } catch {
              // Failed to parse SSE chunk
            }
          }
        }
      }
    } catch (error: any) {
      yield {
        type: 'error',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Convert ClippyJS messages to OpenAI format
   */
  private convertMessages(
    messages: Message[],
    systemPrompt?: string
  ): ChatCompletionMessageParam[] {
    const openaiMessages: ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Convert messages
    for (const message of messages) {
      if (typeof message.content === 'string') {
        // Simple text message
        openaiMessages.push({
          role: message.role === 'system' ? 'system' :
                message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        });
      } else {
        // Multi-modal content
        const content: ChatCompletionContentPart[] = [];

        for (const block of message.content) {
          if (block.type === 'text') {
            content.push({
              type: 'text',
              text: block.text,
            });
          } else if (block.type === 'image') {
            // Convert image block
            if (block.source.type === 'url' && block.source.url) {
              content.push({
                type: 'image_url',
                image_url: {
                  url: block.source.url,
                },
              });
            } else if (block.source.type === 'base64' && block.source.data) {
              // OpenAI expects data URL format for base64
              const dataUrl = `data:${block.source.mediaType};base64,${block.source.data}`;
              content.push({
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              });
            }
          }
          // Note: tool_use and tool_result are handled differently in OpenAI
          // They're added as separate messages with 'tool' role after function calls
        }

        if (message.role === 'system') {
          // System messages must be text only
          const textContent = content.find(c => c.type === 'text');
          openaiMessages.push({
            role: 'system',
            content: (textContent as any)?.text || '',
          });
        } else if (message.role === 'assistant') {
          // Assistant messages are typically text only
          const textParts = content.filter(c => c.type === 'text');
          const combinedText = textParts.map(c => (c as any).text).join('\n');
          openaiMessages.push({
            role: 'assistant',
            content: combinedText,
          });
        } else {
          // User messages support multimodal content
          openaiMessages.push({
            role: 'user',
            content,
          });
        }
      }
    }

    return openaiMessages;
  }

  /**
   * Convert ClippyJS tools to OpenAI format
   */
  private convertTools(tools: Tool[]): ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }

  /**
   * Check if provider supports tool/function calling
   */
  supportsTools(): boolean {
    // Grok models support function calling
    return true;
  }

  /**
   * Check if provider supports vision (image input)
   */
  supportsVision(): boolean {
    // Grok-4 and vision-capable models support image input
    return this.currentModel.includes('grok-4') ||
           this.currentModel.includes('grok-vision') ||
           this.currentModel.includes('grok-2-vision');
  }

  /**
   * Clean up provider resources
   */
  destroy(): void {
    this.client = null;
    this.config = null;
  }

  /**
   * Get the current model being used
   */
  getModel(): string {
    return this.currentModel;
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    this.currentModel = model;
  }
}
