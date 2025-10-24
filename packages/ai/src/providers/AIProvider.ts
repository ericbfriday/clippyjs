/**
 * Configuration options for AI provider initialization
 */
export interface AIProviderConfig {
  /** API key for direct client-side usage (optional) */
  apiKey?: string;
  /** Backend proxy endpoint URL (optional) */
  endpoint?: string;
  /** Model identifier (provider-specific) */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Additional provider-specific configuration */
  [key: string]: any;
}

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Content block types for multimodal messages
 */
export type ContentBlockType = 'text' | 'image';

/**
 * Image source for vision-enabled messages
 */
export interface ImageSource {
  type: 'base64' | 'url';
  media_type: string;
  data: string;
}

/**
 * Content block for multimodal messages
 */
export interface ContentBlock {
  type: ContentBlockType;
  text?: string;
  source?: ImageSource;
}

/**
 * Message structure for AI conversations
 */
export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

/**
 * Stream chunk types
 */
export type StreamChunkType = 'content_delta' | 'tool_use' | 'complete' | 'error';

/**
 * Tool use block for function calling
 */
export interface ToolUseBlock {
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * Streaming response chunk
 */
export interface StreamChunk {
  type: StreamChunkType;
  delta?: string;
  toolUse?: ToolUseBlock;
  error?: string;
}

/**
 * Tool definition for function calling
 */
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool execution result
 */
export interface ToolResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

/**
 * Chat options for AI provider
 */
export interface ChatOptions {
  systemPrompt?: string;
  tools?: Tool[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Abstract base class for AI providers
 *
 * This defines the plugin interface that all AI providers must implement.
 * Supports streaming chat, tool use, and vision capabilities.
 */
export abstract class AIProvider {
  /**
   * Initialize the provider with configuration
   * @param config Provider configuration
   */
  abstract initialize(config: AIProviderConfig): Promise<void>;

  /**
   * Stream chat responses from the AI
   * @param messages Conversation messages
   * @param options Chat options (system prompt, tools, etc.)
   * @returns Async iterator of stream chunks
   */
  abstract chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk>;

  /**
   * Check if provider supports tool/function calling
   * @returns True if tools are supported
   */
  abstract supportsTools(): boolean;

  /**
   * Check if provider supports vision (image input)
   * @returns True if vision is supported
   */
  abstract supportsVision(): boolean;

  /**
   * Clean up provider resources
   */
  abstract destroy(): void;
}
