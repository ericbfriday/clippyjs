/**
 * Testing utilities for AI integration testing
 *
 * Provides helper functions for creating mock providers, simulating streaming responses,
 * generating test data, and testing various error scenarios.
 */

import type {
  AIProvider,
  Message,
  StreamChunk,
  ChatOptions,
  Tool,
  ToolUseBlock,
} from '../providers/AIProvider';

/**
 * Test scenario type
 */
export type TestScenario =
  | 'success'
  | 'network-error'
  | 'network-error-mid-stream'
  | 'timeout'
  | 'rate-limit'
  | 'invalid-response'
  | 'empty-response'
  | 'tool-error'
  | 'streaming-chunk-error';

/**
 * Mock provider configuration
 */
export interface MockProviderConfig {
  /** Scenario to simulate */
  scenario?: TestScenario;
  /** Delay before response (ms) */
  delay?: number;
  /** Error after N tokens (for mid-stream errors) */
  errorAfterTokens?: number;
  /** Custom response text */
  responseText?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Simulate tool use */
  includeToolUse?: boolean;
  /** Number of streaming chunks */
  chunkCount?: number;
  /** Chunk delay (ms) */
  chunkDelay?: number;
}

/**
 * Message generation options
 */
export interface MessageGenerationOptions {
  /** Number of messages to generate */
  count?: number;
  /** Include system messages */
  includeSystem?: boolean;
  /** Include tool messages */
  includeTools?: boolean;
  /** Message length (short, medium, long) */
  length?: 'short' | 'medium' | 'long';
  /** Include images */
  includeImages?: boolean;
}

/**
 * Streaming simulation options
 */
export interface StreamingSimulationOptions {
  /** Text to stream */
  text: string;
  /** Delay between chunks (ms) */
  chunkDelay?: number;
  /** Chunk size (characters) */
  chunkSize?: number;
  /** Include tool use */
  includeToolUse?: boolean;
  /** Error after N chunks */
  errorAfterChunks?: number;
}

/**
 * Create a mock AI provider for testing
 *
 * @example
 * ```ts
 * const provider = createTestProvider({
 *   scenario: 'network-error-mid-stream',
 *   errorAfterTokens: 50,
 * });
 *
 * const result = await provider.chat([{ role: 'user', content: 'Hello' }]);
 * ```
 */
export function createTestProvider(config: MockProviderConfig = {}): AIProvider {
  const {
    scenario = 'success',
    delay = 0,
    errorAfterTokens = 0,
    responseText = 'This is a test response from the mock provider.',
    errorMessage = 'Mock provider error',
    includeToolUse = false,
    chunkCount = 10,
    chunkDelay = 10,
  } = config;

  return {
    name: 'mock-test-provider',

    async chat(messages: Message[], options?: ChatOptions): Promise<Message> {
      // Simulate delay
      if (delay > 0) {
        await sleep(delay);
      }

      // Simulate scenarios
      switch (scenario) {
        case 'network-error':
          throw new Error(errorMessage || 'Network error');

        case 'timeout':
          await sleep(options?.maxTokens || 30000);
          throw new Error('Request timeout');

        case 'rate-limit':
          throw new Error('Rate limit exceeded. Please try again later.');

        case 'invalid-response':
          return { role: 'invalid' as any, content: '' };

        case 'empty-response':
          return { role: 'assistant', content: '' };

        case 'tool-error':
          if (includeToolUse && options?.tools) {
            throw new Error('Tool execution failed');
          }
          break;

        case 'success':
        default:
          break;
      }

      // Build response content
      let content: any = responseText;

      if (includeToolUse && options?.tools && options.tools.length > 0) {
        const tool = options.tools[0];
        content = [
          { type: 'text', text: responseText },
          {
            type: 'tool_use',
            id: 'test-tool-1',
            name: tool.name,
            input: { test: true },
          } as ToolUseBlock,
        ];
      }

      return {
        role: 'assistant',
        content,
      };
    },

    async *stream(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
      // Simulate delay
      if (delay > 0) {
        await sleep(delay);
      }

      // Handle network error before streaming
      if (scenario === 'network-error') {
        throw new Error(errorMessage || 'Network error');
      }

      const words = responseText.split(' ');
      const wordsPerChunk = Math.ceil(words.length / chunkCount);
      let tokenCount = 0;

      for (let i = 0; i < words.length; i += wordsPerChunk) {
        const chunk = words.slice(i, i + wordsPerChunk).join(' ');
        const chunkWithSpace = i + wordsPerChunk < words.length ? chunk + ' ' : chunk;

        tokenCount += wordsPerChunk;

        if (scenario === 'network-error-mid-stream' && tokenCount >= errorAfterTokens) {
          throw new Error(errorMessage || 'Network error during streaming');
        }

        if (scenario === 'streaming-chunk-error' && tokenCount >= errorAfterTokens) {
          yield {
            type: 'error',
            error: errorMessage || 'Chunk processing error',
          };
          break;
        }

        yield {
          type: 'content_delta',
          delta: chunkWithSpace,
        };

        if (chunkDelay > 0) {
          await sleep(chunkDelay);
        }
      }

      // Include tool use if requested
      if (includeToolUse && options?.tools && options.tools.length > 0) {
        const tool = options.tools[0];
        yield {
          type: 'tool_use_start',
          toolUse: {
            id: 'test-tool-1',
            name: tool.name,
            input: { test: true },
          },
        };
      }

      yield {
        type: 'complete',
      };
    },

    supportsStreaming(): boolean {
      return true;
    },
  };
}

/**
 * Simulate a streaming response
 *
 * @example
 * ```ts
 * for await (const chunk of mockStreamingResponse({
 *   text: 'Hello world',
 *   chunkDelay: 50,
 *   chunkSize: 5
 * })) {
 *   console.log(chunk);
 * }
 * ```
 */
export async function* mockStreamingResponse(
  options: StreamingSimulationOptions
): AsyncGenerator<StreamChunk> {
  const {
    text,
    chunkDelay = 10,
    chunkSize = 5,
    includeToolUse = false,
    errorAfterChunks = 0,
  } = options;

  let chunkIndex = 0;

  // Stream text in chunks
  for (let i = 0; i < text.length; i += chunkSize) {
    chunkIndex++;

    if (errorAfterChunks > 0 && chunkIndex >= errorAfterChunks) {
      yield {
        type: 'error',
        error: 'Simulated streaming error',
      };
      break;
    }

    const chunk = text.slice(i, i + chunkSize);

    yield {
      type: 'content_delta',
      delta: chunk,
    };

    if (chunkDelay > 0) {
      await sleep(chunkDelay);
    }
  }

  // Add tool use if requested
  if (includeToolUse) {
    yield {
      type: 'tool_use_start',
      toolUse: {
        id: 'mock-tool-1',
        name: 'test_tool',
        input: { test: true },
      },
    };
  }

  yield {
    type: 'complete',
  };
}

/**
 * Generate test messages
 *
 * @example
 * ```ts
 * const messages = generateTestMessages({ count: 10, length: 'medium' });
 * ```
 */
export function generateTestMessages(
  options: MessageGenerationOptions = {}
): Message[] {
  const {
    count = 5,
    includeSystem = false,
    includeTools = false,
    length = 'medium',
    includeImages = false,
  } = options;

  const messages: Message[] = [];

  // Add system message if requested
  if (includeSystem) {
    messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant for testing purposes.',
    });
  }

  // Generate conversation messages
  for (let i = 0; i < count; i++) {
    const role = i % 2 === 0 ? 'user' : 'assistant';
    const text = generateTestText(length, role);

    // Simple text message
    if (!includeImages || role === 'assistant') {
      messages.push({
        role,
        content: text,
      });
    } else {
      // User message with image
      messages.push({
        role,
        content: [
          { type: 'text', text },
          {
            type: 'image',
            source: {
              type: 'base64',
              mediaType: 'image/png',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            },
          },
        ],
      });
    }
  }

  // Add tool messages if requested
  if (includeTools) {
    messages.push({
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me help you with that.' },
        {
          type: 'tool_use',
          id: 'test-tool-1',
          name: 'calculator',
          input: { operation: 'add', a: 5, b: 3 },
        } as ToolUseBlock,
      ],
    });

    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          toolUseId: 'test-tool-1',
          content: '8',
        },
      ],
    });
  }

  return messages;
}

/**
 * Generate test text of specified length
 */
function generateTestText(length: 'short' | 'medium' | 'long', role: string): string {
  const shortTexts = {
    user: 'Hello!',
    assistant: 'Hi there! How can I help you today?',
  };

  const mediumTexts = {
    user: 'Can you help me understand how to test AI integrations effectively?',
    assistant:
      'Certainly! Testing AI integrations requires a combination of unit tests, integration tests, and end-to-end tests. You should test various scenarios including success cases, error handling, and edge cases.',
  };

  const longTexts = {
    user: 'I\'m working on a complex AI-powered application that needs to handle multiple types of inputs, including text, images, and structured data. The application should be able to process these inputs in real-time, maintain context across multiple interactions, and provide accurate, helpful responses. I\'m particularly concerned about error handling, rate limiting, and ensuring the system remains responsive even under heavy load. Can you provide detailed guidance on best practices for implementing and testing such a system?',
    assistant:
      'That\'s an excellent question, and you\'re right to be thinking about these critical aspects from the start. Building a robust AI-powered application requires careful attention to several key areas:\n\n1. **Input Processing**: For handling multiple input types, you\'ll want to implement a flexible content pipeline that can normalize different formats while preserving important metadata. Consider using TypeScript discriminated unions to ensure type safety.\n\n2. **Real-time Processing**: Implement streaming responses to provide immediate feedback to users. This improves perceived performance and allows for progressive rendering of results.\n\n3. **Context Management**: Use a conversation manager with configurable history stores (memory, localStorage, IndexedDB) to maintain context across interactions while managing memory efficiently.\n\n4. **Error Handling**: Implement a comprehensive error classification system with retry policies, circuit breakers, and graceful degradation strategies. Different error types (network, rate limit, validation) should trigger appropriate recovery mechanisms.\n\n5. **Rate Limiting**: Use sliding window rate limiters with per-user and per-session tracking. Implement both client-side and server-side limiting for defense in depth.\n\n6. **Testing Strategy**: Create comprehensive test utilities including mock providers, streaming simulators, and scenario generators. Test happy paths, error conditions, and edge cases systematically.',
  };

  const texts = {
    short: shortTexts,
    medium: mediumTexts,
    long: longTexts,
  };

  return texts[length][role as 'user' | 'assistant'] || 'Test message';
}

/**
 * Generate test tools
 */
export function generateTestTools(): Tool[] {
  return [
    {
      name: 'calculator',
      description: 'Perform basic arithmetic operations',
      input_schema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide'],
            description: 'The operation to perform',
          },
          a: {
            type: 'number',
            description: 'First number',
          },
          b: {
            type: 'number',
            description: 'Second number',
          },
        },
        required: ['operation', 'a', 'b'],
      },
    },
    {
      name: 'weather',
      description: 'Get weather information for a location',
      input_schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or coordinates',
          },
          units: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature units',
          },
        },
        required: ['location'],
      },
    },
    {
      name: 'search',
      description: 'Search for information',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
          },
        },
        required: ['query'],
      },
    },
  ];
}

/**
 * Create a test chat options object
 */
export function createTestChatOptions(overrides: Partial<ChatOptions> = {}): ChatOptions {
  return {
    systemPrompt: 'You are a helpful AI assistant for testing.',
    maxTokens: 1000,
    temperature: 0.7,
    tools: generateTestTools(),
    ...overrides,
  };
}

/**
 * Sleep utility for async delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate network latency
 */
export async function simulateNetworkLatency(
  minMs: number = 100,
  maxMs: number = 500
): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  await sleep(delay);
}

/**
 * Create test error scenarios
 */
export const testErrorScenarios = {
  networkError: {
    name: 'Network Error',
    config: { scenario: 'network-error' as TestScenario },
  },
  networkErrorMidStream: {
    name: 'Network Error During Streaming',
    config: { scenario: 'network-error-mid-stream' as TestScenario, errorAfterTokens: 50 },
  },
  timeout: {
    name: 'Request Timeout',
    config: { scenario: 'timeout' as TestScenario },
  },
  rateLimit: {
    name: 'Rate Limit Exceeded',
    config: { scenario: 'rate-limit' as TestScenario },
  },
  invalidResponse: {
    name: 'Invalid Response Format',
    config: { scenario: 'invalid-response' as TestScenario },
  },
  emptyResponse: {
    name: 'Empty Response',
    config: { scenario: 'empty-response' as TestScenario },
  },
  toolError: {
    name: 'Tool Execution Error',
    config: { scenario: 'tool-error' as TestScenario, includeToolUse: true },
  },
  streamingChunkError: {
    name: 'Streaming Chunk Error',
    config: { scenario: 'streaming-chunk-error' as TestScenario, errorAfterTokens: 30 },
  },
};

/**
 * Wait for condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, timeoutMessage = 'Condition timeout' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(timeoutMessage);
}

/**
 * Collect all chunks from a stream
 */
export async function collectStreamChunks(
  stream: AsyncGenerator<StreamChunk>
): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return chunks;
}

/**
 * Extract text from stream chunks
 */
export function extractTextFromChunks(chunks: StreamChunk[]): string {
  return chunks
    .filter((chunk) => chunk.type === 'content_delta')
    .map((chunk) => chunk.delta || '')
    .join('');
}

/**
 * Assert streaming behavior
 */
export function assertStreamingBehavior(chunks: StreamChunk[]): void {
  // Should have at least one content chunk
  const contentChunks = chunks.filter((c) => c.type === 'content_delta');
  if (contentChunks.length === 0) {
    throw new Error('Expected at least one content chunk');
  }

  // Should end with complete
  const lastChunk = chunks[chunks.length - 1];
  if (!lastChunk || lastChunk.type !== 'complete') {
    throw new Error('Expected stream to end with complete');
  }

  // Should not have errors (unless testing error scenarios)
  const errorChunks = chunks.filter((c) => c.type === 'error');
  if (errorChunks.length > 0) {
    throw new Error(`Unexpected error chunks: ${errorChunks.length}`);
  }
}