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
export type ContentBlockType = 'text' | 'image' | 'tool_use' | 'tool_result';

/**
 * Image source for vision-enabled messages
 */
export interface ImageSource {
  type: 'base64' | 'url';
  mediaType: string;
  data?: string;
  url?: string;
}

/**
 * Base content block
 */
interface BaseContentBlock {
  type: ContentBlockType;
}

/**
 * Text content block
 */
export interface TextBlock extends BaseContentBlock {
  type: 'text';
  text: string;
}

/**
 * Image content block
 */
export interface ImageBlock extends BaseContentBlock {
  type: 'image';
  source: ImageSource;
}

/**
 * Tool use content block
 */
export interface ToolUseContentBlock extends BaseContentBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * Tool result content block
 */
export interface ToolResultContentBlock extends BaseContentBlock {
  type: 'tool_result';
  toolUseId: string;
  content: string;
}

/**
 * Content block for multimodal messages
 */
export type ContentBlock =
  | TextBlock
  | ImageBlock
  | ToolUseContentBlock
  | ToolResultContentBlock;

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
export type StreamChunkType =
  | 'content_delta'
  | 'tool_use'
  | 'tool_use_start'
  | 'tool_use_delta'
  | 'complete'
  | 'error';

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
 * Compatible with Anthropic's Tool format
 */
export interface Tool {
  name: string;
  description: string;
  input_schema: {
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
