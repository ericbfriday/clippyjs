import {
  AIProvider,
  type AIProviderConfig,
  type ChatOptions,
  type Message,
  type StreamChunk,
  type Tool,
  type ToolUseBlock,
} from '@clippyjs/ai';
import type {
  ChatCompletionChunk,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

/**
 * OpenRouter-specific configuration options
 */
export interface OpenRouterConfig extends AIProviderConfig {
  /** HTTP-Referer header for OpenRouter attribution */
  httpReferer?: string;
  /** X-Title header for OpenRouter app identification */
  xTitle?: string;
}

/**
 * OpenRouter Provider
 *
 * Implements the AIProvider interface for OpenRouter's multi-model gateway.
 * Supports any model available on OpenRouter with streaming, tools, and vision.
 *
 * Model format: provider/model-name (e.g., openai/gpt-4o, anthropic/claude-3-opus)
 */
export class OpenRouterProvider extends AIProvider {
  private config: OpenRouterConfig | null = null;
  private currentModel = 'openai/gpt-4o';

  async initialize(config: OpenRouterConfig): Promise<void> {
    this.config = config;
    this.currentModel = config.model || 'openai/gpt-4o';

    // Direct client-side usage with apiKey is disabled for security.
    // Must use a secure backend proxy endpoint.
    if (!config.endpoint) {
      if (config.apiKey) {
        throw new Error(
          'Security Error: Direct client-side API key usage is disabled. Please use a secure backend proxy endpoint.'
        );
      }
      throw new Error('Proxy endpoint must be provided');
    }
  }

  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk> {
    yield* this.chatProxy(messages, options);
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

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.config.httpReferer) {
        headers['HTTP-Referer'] = this.config.httpReferer;
      }
      if (this.config.xTitle) {
        headers['X-Title'] = this.config.xTitle;
      }

      // Make proxy request
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
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
                } catch (error) {
                  console.error('Failed to parse tool arguments:', error);
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
            } catch (error) {
              console.error('Failed to parse SSE chunk:', error);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Proxy streaming error:', error);
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
    // Most OpenRouter models support function calling
    // Specific model support depends on the underlying provider
    return true;
  }

  /**
   * Check if provider supports vision (image input)
   */
  supportsVision(): boolean {
    // OpenRouter model format: provider/model-name
    // Common vision-capable models across providers
    const visionPatterns = [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4-vision',
      'claude-3',
      'gemini',
      'llava',
      'vision',
    ];

    const modelLower = this.currentModel.toLowerCase();
    return visionPatterns.some(pattern => modelLower.includes(pattern));
  }

  /**
   * Clean up provider resources
   */
  destroy(): void {
    this.config = null;
  }

  /**
   * Get the current model being used
   */
  getModel(): string {
    return this.currentModel;
  }

  /**
   * Change the model
   * @param model Model in provider/model-name format (e.g., openai/gpt-4o)
   */
  setModel(model: string): void {
    this.currentModel = model;
  }
}
