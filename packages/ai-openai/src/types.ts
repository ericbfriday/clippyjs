/**
 * Type definitions for OpenAI provider
 *
 * This file contains all TypeScript interfaces and types for the OpenAI provider.
 */

/**
 * Configuration options for the OpenAI provider
 */
export interface OpenAIConfig {
  /** OpenAI API key */
  apiKey: string;

  /** Model to use for completions */
  model?: 'gpt-4' | 'gpt-4o' | 'gpt-3.5-turbo';

  /** Base URL for OpenAI API (for proxy support) */
  baseURL?: string;

  /** Maximum tokens in response */
  maxTokens?: number;

  /** Temperature for response generation (0-2) */
  temperature?: number;

  /** Top-p sampling parameter (0-1) */
  topP?: number;
}

/**
 * Stream chunk types from OpenAI
 */
export interface OpenAIStreamChunk {
  /** Type of chunk */
  type: 'text' | 'tool_use' | 'error';

  /** Text content (for type='text') */
  content?: string;

  /** Tool call information (for type='tool_use') */
  tool?: {
    id: string;
    name: string;
    input: any;
  };

  /** Error message (for type='error') */
  error?: string;
}

/**
 * Vision message format for OpenAI
 */
export interface OpenAIVisionMessage {
  /** Message role */
  role: string;

  /** Message content (text and/or images) */
  content: Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}
