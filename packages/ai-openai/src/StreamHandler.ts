import type { StreamChunk } from '@clippyjs/ai';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';

/**
 * Stream Handler for OpenAI responses
 *
 * Handles streaming responses from OpenAI API with error recovery.
 */

export interface StreamHandlerOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Handles streaming responses from OpenAI API
 *
 * Provides robust stream handling with error recovery, timeout management,
 * and graceful degradation.
 */
export class StreamHandler {
  private timeoutMs: number;
  private maxRetries: number;
  
  constructor(options: StreamHandlerOptions = {}) {
    this.timeoutMs = options.timeoutMs || 30000;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Main entry point to process an async stream
   */
  async *handleStream(
    stream: AsyncIterable<ChatCompletionChunk>
  ): AsyncIterableIterator<StreamChunk> {
    let chunkCount = 0;
    
    try {
      for await (const chunk of this.withTimeout(stream, this.timeoutMs)) {
        chunkCount++;
        const parsedChunks = this.processChunk(chunk);
        for (const c of parsedChunks) {
          yield c;
        }
      }
      
      yield { type: 'complete' };
    } catch (error) {
      const isRateLimit = this.isRateLimit(error);
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      
      // Attempt error recovery or yield error
      if (isRateLimit) {
        yield { type: 'error', error: 'Rate limit exceeded. Please try again later.' };
      } else if (isTimeout) {
        yield { type: 'error', error: 'Stream timed out.' };
      } else {
        yield { type: 'error', error: this.formatError(error) };
      }
    }
  }

  /**
   * Process a single chunk from OpenAI into standard StreamChunk formats
   */
  processChunk(chunk: ChatCompletionChunk): StreamChunk[] {
    const chunks: StreamChunk[] = [];
    const delta = chunk.choices[0]?.delta;

    if (!delta) return chunks;

    // Handle content deltas
    if (delta.content) {
      chunks.push({
        type: 'content_delta',
        delta: delta.content,
      });
    }

    // Tools handling would go here, matching OpenAIProvider implementation
    // For now we delegate tool tracking to OpenAIProvider directly, 
    // but processChunk can be expanded to parse them if StreamHandler takes over completely.

    return chunks;
  }

  /**
   * Standardizes errors
   */
  formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Detects if an error is a rate limit error
   */
  isRateLimit(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as Record<string, unknown>).status;
      return status === 429;
    }
    const message = this.formatError(error).toLowerCase();
    return message.includes('rate limit') || message.includes('429');
  }

  /**
   * Adds timeout management to an async iterable
   */
  private async *withTimeout<T>(
    iterable: AsyncIterable<T>,
    timeoutMs: number
  ): AsyncIterableIterator<T> {
    const iterator = iterable[Symbol.asyncIterator]();
    
    while (true) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const err = new Error('Stream timed out');
          err.name = 'TimeoutError';
          reject(err);
        }, timeoutMs);
      });

      const nextPromise = iterator.next();
      
      const result = await Promise.race([nextPromise, timeoutPromise]);
      
      if (result.done) {
        break;
      }
      
      yield result.value;
    }
  }
}
