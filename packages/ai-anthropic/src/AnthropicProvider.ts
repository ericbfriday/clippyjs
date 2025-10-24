import Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  type AIProviderConfig,
  type Message,
  type StreamChunk,
  type ChatOptions,
} from '@clippyjs/ai';

/**
 * Anthropic Claude Provider
 *
 * Implements the AIProvider interface for Anthropic's Claude SDK.
 * Supports both client-side (browser) and proxy modes.
 *
 * Phase 1: Placeholder implementation
 * Phase 2: Full implementation with streaming
 */
export class AnthropicProvider extends AIProvider {
  private client: Anthropic | null = null;
  private config: AIProviderConfig | null = null;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;

    // Support both client-side and proxy mode
    if (config.endpoint) {
      // Proxy mode - no SDK needed (implemented in Phase 2)
      console.log('AnthropicProvider: Proxy mode configured');
    } else if (config.apiKey) {
      // Client-side mode (implemented in Phase 2)
      console.log('AnthropicProvider: Client-side mode configured');

      // Placeholder: Will initialize SDK in Phase 2
      // this.client = new Anthropic({
      //   apiKey: config.apiKey,
      //   dangerouslyAllowBrowser: true,
      // });
    } else {
      throw new Error('Either endpoint or apiKey must be provided');
    }
  }

  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk> {
    // Placeholder implementation for Phase 1
    // Full implementation in Phase 2
    console.log('AnthropicProvider.chat called with:', {
      messageCount: messages.length,
      hasSystemPrompt: !!options?.systemPrompt,
    });

    // Yield a placeholder response
    yield {
      type: 'content_delta',
      delta: 'This is a placeholder response from AnthropicProvider. ',
    };

    yield {
      type: 'content_delta',
      delta: 'Full implementation will be added in Phase 2.',
    };

    yield {
      type: 'complete',
    };
  }

  supportsTools(): boolean {
    // Will be true in Phase 2 and Phase 4
    return false;
  }

  supportsVision(): boolean {
    // Will be true in Phase 4
    return false;
  }

  destroy(): void {
    this.client = null;
    this.config = null;
  }
}
